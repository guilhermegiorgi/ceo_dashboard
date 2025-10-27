import { Router } from "express";
import insightsRouter from "./insights.js";
import decisionsRouter from "./decisions.js";
import cognitoRouter from "./cognito.js";
import mcpRouter from "./mcp.js";
import projectsRouter from "./projects.js";
import feedbackActionsRouter from "./feedbackActions.js";
import authRouter from "./auth.js";
import healthRouter from "./health.js";
import brainRouter from "./brain.js";
import brainEventsRouter from "./brainEvents.js";
import obsidianRouter from "./obsidian.js"; // Importa as rotas do Obsidian
import vaultRouter from "./vault.js"; // Importa as rotas do Vault
import agentsRouter from "./agents.js"; // Importa as rotas dos Agentes
import providersRouter from "./providers.js"; // Importa as rotas dos Provedores
import toolsRouter from "./tools.js"; // Importa as rotas das Ferramentas
import settingsRouter from "./settings.js";
import dashboardRouter from "./dashboard.js";
import {
  authenticateJWT as authenticateToken,
  optionalAuth,
} from "../middleware/auth.js";

console.log("[routes/index] Auth middleware loaded:", typeof authenticateToken);
import inboxRouter from "./inbox.js";
import tasksRouter from "./tasks.js";
import conversationsRouter from "./conversations.js";
import aiProvidersRouter from "./aiProviders.js";
import aiConfigRouter from "./aiConfig.js";
import chatRouter from "./chat.js";
import workflowsRouter from "./workflows.js";
import prebuiltWorkflowsRouter from "./prebuiltWorkflows.js";
import knowledgeGraphRouter from "./knowledgeGraph.js";
import adminModeRouter from "./adminMode.js";

const router = Router();

// Rotas públicas
router.use("/auth", authRouter);
router.use("/health", healthRouter);

// Rotas Brain Cloud (requerem autenticação)
router.use("/brain", authenticateToken, brainRouter);
// TEMPORARILY DISABLED - keep connection open to prevent reconnect loop
router.get("/brain/events", (req, res) => {
  console.log(
    "[routes/index] /brain/events - keeping connection open (disabled)"
  );
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.status(200);
  // Send initial message and keep connection open
  res.write(
    'data: {"type":"disabled","message":"EventSource temporarily disabled"}\n\n'
  );
  // Send keepalive every 30 seconds
  const keepalive = setInterval(() => {
    res.write(":keepalive\n\n");
  }, 30000);
  // Cleanup on connection close
  req.on("close", () => {
    clearInterval(keepalive);
    console.log("[routes/index] /brain/events - connection closed");
  });
});
// router.use("/brain", authenticateToken, brainEventsRouter);

// Rotas protegidas por autenticação
router.use("/insights", authenticateToken, insightsRouter);
router.use("/decisions", authenticateToken, decisionsRouter);
router.use("/cognito", cognitoRouter);
router.use("/mcp", authenticateToken, mcpRouter);
router.use("/projects", authenticateToken, projectsRouter);
router.use("/feedback-actions", authenticateToken, feedbackActionsRouter);
router.use("/obsidian", authenticateToken, obsidianRouter); // Monta as rotas do Obsidian
router.use("/vault", authenticateToken, vaultRouter); // Monta as rotas do Vault
router.use("/agents", authenticateToken, agentsRouter); // Monta as rotas dos Agentes
router.use("/providers", authenticateToken, providersRouter); // Monta as rotas dos Provedores
router.use("/tools", authenticateToken, toolsRouter); // Monta as rotas das Ferramentas
router.use("/ai/config", optionalAuth, aiConfigRouter);
// DEBUG: Log before applying auth middleware
router.use(
  "/settings",
  (req, res, next) => {
    console.log("[routes/index] /settings route hit:", {
      path: req.path,
      url: req.url,
      isAuthenticated: req.isAuthenticated?.(),
    });
    next();
  },
  optionalAuth,
  settingsRouter
);
router.use("/dashboard", authenticateToken, dashboardRouter);
router.use("/inbox", authenticateToken, inboxRouter);
router.use("/tasks", authenticateToken, tasksRouter);
router.use("/conversations", authenticateToken, conversationsRouter);
router.use("/ai-providers", authenticateToken, aiProvidersRouter);
router.use("/chat", authenticateToken, chatRouter);
router.use("/admin-mode", authenticateToken, adminModeRouter);
router.use("/workflows", authenticateToken, workflowsRouter);
router.use("/prebuilt-workflows", authenticateToken, prebuiltWorkflowsRouter);
router.use("/knowledge-graph", authenticateToken, knowledgeGraphRouter);

// Rota de fallback para rotas não encontradas
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Rota não encontrada",
    path: req.originalUrl,
  });
});

export default router;
