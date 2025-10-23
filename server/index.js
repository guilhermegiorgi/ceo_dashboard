import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import session from "express-session";
import { createServer } from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { WebSocketServer } from "ws";
import passport from "passport";
import { configurePassport } from "./config/passport.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import apiRouter from "./routes/index.js";
import { initializeCache } from "./services/cache.js";
import { setupWebSocketHandlers } from "./services/websocket.js";
import { startBackgroundServices } from "./services/background.js";
import { seedInitialAgent } from "./services/agentService.js";
import { closePool } from "./database/pg-pool.js";
import { workflowManager } from "./services/brainCloud/WorkflowManager.ts";
import WorkflowScheduler from "./services/workflowScheduler.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inicializa o aplicativo Express
const app = express();
const server = createServer(app);

// Configuração da porta
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

// Middleware de segurança
app.use(helmet());
app.use(helmet.hidePoweredBy());
app.use(helmet.noSniff());
app.use(helmet.xssFilter());

// Configuração do CORS
const corsOptions = {
  origin:
    NODE_ENV === "production"
      ? process.env.ALLOWED_ORIGINS?.split(",") || []
      : [
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:5175",
          "http://localhost:3000",
          "http://127.0.0.1:3000",
        ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  credentials: true,
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Adiciona headers CORS manualmente para garantir compatibilidade total
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (NODE_ENV !== "production" || corsOptions.origin.includes(origin))
  ) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
  }

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Rate limiting - DESATIVADO TEMPORARIAMENTE PARA TESTES
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000000000, // Limite muito alto para testes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Muitas requisições deste IP. Tente novamente mais tarde.",
  },
});

// Middleware para análise de JSON e URL-encoded
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session configuration (for Passport OAuth)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Allow cookies over HTTP in development
      httpOnly: true,
      sameSite: 'lax', // Allow cookies in cross-origin requests from same site
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/', // Ensure cookie is sent for all paths
    },
    proxy: NODE_ENV === 'production', // Trust proxy in production
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport strategies
configurePassport();

// Logging de requisições
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${
        res.statusCode
      } - ${duration}ms`
    );
  });

  next();
});

// Rotas da API
app.use("/api", apiLimiter, apiRouter);

// Servir arquivos estáticos em produção
if (NODE_ENV === "production") {
  const staticPath = join(__dirname, "../../client/dist");
  app.use(express.static(staticPath));

  // Rota para SPA (Single Page Application)
  app.get("*", (req, res) => {
    res.sendFile(join(staticPath, "index.html"));
  });
}

// WebSocket será inicializado após o servidor HTTP estar escutando

// Inicialização assíncrona do servidor
async function initializeServer() {
  try {
    console.log("🚀 Inicializando GG.AI Labs Dashboard Server...");

    // PostgreSQL pool já está inicializado automaticamente
    console.log("✅ Pool PostgreSQL (Supabase) pronto");

    // Popula dados iniciais (se necessário)
    // await seedInitialAgent();
    // console.log('✅ Verificação de agente inicial concluída');

    // Inicializa o cache
    await initializeCache();
    console.log("✅ Cache inicializado");

    await workflowManager.start();
    console.log("✅ Workflow Manager inicializado");

    // Inicializa o scheduler de workflows
    WorkflowScheduler.initialize();
    console.log("✅ Workflow Scheduler inicializado");

    // Inicia o servidor
    server.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌐 Ambiente: ${NODE_ENV}`);
      console.log(`📅 ${new Date().toLocaleString()}`);
      console.log(`📊 Dashboard API: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);

      // Inicializa o WebSocket server APÓS o servidor HTTP estar rodando
      const wss = new WebSocketServer({ server });
      setupWebSocketHandlers(wss);
      console.log("✅ WebSocket server inicializado");

      // Inicia serviços em background
      startBackgroundServices();
      console.log("✅ Serviços em background iniciados");
    });

    // Tratamento de erros do servidor
    server.on("error", (error) => {
      console.error("❌ Erro no servidor:", error);
      if (error.code === "EADDRINUSE") {
        console.error(
          `❌ A porta ${PORT} já está em uso. Outra instância do servidor está rodando?`
        );
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("❌ Falha ao inicializar o servidor:", error);
    process.exit(1);
  }
}

// Tratamento de erros não capturados
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ Rejeição não tratada:", reason);
  // Aqui você pode adicionar lógica para registrar o erro em um serviço de monitoramento
});

process.on("uncaughtException", (error) => {
  console.error("⚠️ Exceção não capturada:", error);
  // Aqui você pode adicionar lógica para encerrar o processo de forma limpa
  process.exit(1);
});

// Encerramento gracioso
const gracefulShutdown = () => {
  console.log("\n🛑 Recebido sinal de encerramento. Encerrando servidor...");

  workflowManager
    .stop()
    .then(() => {
      console.log("✅ Workflow Manager encerrado");
    })
    .catch((error) => {
      console.error("❌ Erro ao encerrar Workflow Manager:", error);
    })
    .finally(() => {
      // Stop workflow scheduler
      try {
        WorkflowScheduler.stopAll();
        console.log("✅ Workflow Scheduler encerrado");
      } catch (error) {
        console.error("❌ Erro ao encerrar Workflow Scheduler:", error);
      }
      server.close(async () => {
        console.log("✅ Servidor HTTP encerrado");

        try {
          await closePool();
          console.log("✅ Pool PostgreSQL encerrado");
        } catch (error) {
          console.error("❌ Erro ao encerrar pool PostgreSQL:", error);
        }

        console.log("👋 Tchau!");
        process.exit(0);
      });
    });

  setTimeout(() => {
    console.error("❌ Forçando encerramento...");
    process.exit(1);
  }, 10000);
};

// Middleware para tratamento de erros (deve ser o último middleware a ser adicionado)
app.use(notFoundHandler); // Para rotas não encontradas
app.use(errorHandler); // Para tratamento de erros gerais

// Captura sinais de encerramento
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Inicializa o servidor apenas se este arquivo for executado diretamente
const scriptPath = process.argv[1];
const modulePath = new URL(import.meta.url).pathname;

if (scriptPath === modulePath) {
  initializeServer();
}
