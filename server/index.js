import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import setupWebSocket, { emitToUser } from './websocket.js';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/apis.js';
import projectRoutes from './routes/projects.js';
import costRoutes from './routes/costs.js';
import dashboardRoutes from './routes/dashboard.js';
import webhookRoutes from './routes/webhooks.js';
import alertRoutes from './routes/alerts.js';
import reportRoutes from './routes/reports.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Setup WebSocket
const io = setupWebSocket(server);
app.set('io', io); // Fazer io disponível nas rotas

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());

// Rotas de Autenticação
app.use('/api/auth', authRoutes);

// Rotas da API (todas requerem autenticação)
app.use('/api/apis', apiRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/costs', costRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    features: ['auth', 'websocket', 'webhooks', 'alerts', 'reports']
  });
});

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../dist')));

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

server.listen(PORT, () => {
  console.log(`\n🚀 MyTokenCost Server Running`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔐 Auth: /api/auth/login`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📧 Webhooks: /api/webhooks`);
  console.log(`🚨 Alerts: /api/alerts`);
  console.log(`📊 Reports: /api/reports\n`);
});
