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
import videoRoutes from './routes/video';

const app = express();

// Trust proxy (required for Render, Heroku, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: true,
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { success: false, message: 'Muitas tentativas de login, tente novamente em 15 minutos' },
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
app.use('/api/video', videoRoutes);

// Health check (also pings DB to keep Supabase alive)
app.get('/health', async (_req, res) => {
  try {
    const pool = (await import('./config/database')).default;
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'disconnected', timestamp: new Date().toISOString() });
  }
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
