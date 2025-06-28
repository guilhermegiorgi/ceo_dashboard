import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import route handlers
import obsidianRoutes from './routes/obsidian.js';
import insightsRoutes from './routes/insights.js';
import projectsRoutes from './routes/projects.js';
import mcpRoutes from './routes/mcp.js';
import decisionsRoutes from './routes/decisions.js';
import sessionsRoutes from './routes/sessions.js';
import knowledgeGraphRoutes from './routes/knowledgeGraph.js';

// Import services
import { initializeDatabase } from './services/database.js';
import { initializeCache } from './services/cache.js';
import { setupWebSocketHandlers } from './services/websocket.js';
import { startBackgroundServices } from './services/background.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/obsidian', obsidianRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/decisions', decisionsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/knowledge-graph', knowledgeGraphRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize services
async function initializeServer() {
  try {
    console.log('🚀 Initializing GG.AI Labs Dashboard Server...');
    
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    // Initialize cache
    await initializeCache();
    console.log('✅ Cache initialized');
    
    // Setup WebSocket handlers
    setupWebSocketHandlers(wss);
    console.log('✅ WebSocket handlers setup');
    
    // Start background services
    startBackgroundServices();
    console.log('✅ Background services started');
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🌟 Server running on port ${PORT}`);
      console.log(`📊 Dashboard API: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
initializeServer();