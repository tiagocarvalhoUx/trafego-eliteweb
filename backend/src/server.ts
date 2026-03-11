import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { testConnection } from './config/database';
import { startDataCollectionCron } from './cron/dataCollection';
import { startReportCron } from './cron/reportGeneration';

// Routes
import authRoutes from './routes/auth';
import socialRoutes from './routes/social';
import analyticsRoutes from './routes/analytics';
import leadsRoutes from './routes/leads';
import automationRoutes from './routes/automation';

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.nodeEnv === 'development' ? 1000 : 100,
  message: { success: false, message: 'Muitas requisições, tente novamente mais tarde' },
});
app.use('/api/', limiter);

// Auth rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'Muitas tentativas de login, tente novamente em 1 hora' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/automation', automationRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Rota não encontrada' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Erro interno do servidor' });
});

// Start server
async function bootstrap(): Promise<void> {
  await testConnection();

  app.listen(env.port, () => {
    console.log(`🚀 Server running on port ${env.port} (${env.nodeEnv})`);
    console.log(`📡 API: http://localhost:${env.port}/api`);
  });

  // Start cron jobs
  if (env.nodeEnv !== 'test') {
    startDataCollectionCron();
    startReportCron();
  }
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

export default app;
