import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import studentRoutes from './routes/student.routes';
import learningRoutes from './routes/learning.routes';
import paymentRoutes from './routes/payment.routes';
import { errorHandler } from './middleware/error.middleware';

export const app = express();

// Security HTTP headers with comprehensive Content Security Policy & protections
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true,
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching dev origin
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.options('*', cors());

// Body parsing with strict payload size guards (prevent denial of service)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Input sanitization middleware: scrubs XSS & script tags from body, query, and params
import { sanitizeInputs } from './middleware/sanitize.middleware';
app.use(sanitizeInputs);

// General API rate limiter across standard endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 5000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP. Please slow down.',
  },
});
app.use('/api', apiLimiter);

// Auth rate limiter to protect against credential stuffing & brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 5000 : 100, // 100 auth attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// API Root Welcome
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Apex Institute Learning Management Platform (LMS) - API Backend',
    version: '1.0.0',
    status: 'ACTIVE',
    frontend: 'https://sathish9042.github.io/ONLINE-COURSE/',
    endpoints: {
      health: '/health',
      ready: '/ready',
      api: '/api/v1',
    },
  });
});

// Liveness health check probe (orchestrator heartbeat)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    state: 'UP',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: '1.0.0',
  });
});

// Readiness probe (verifies database connectivity and infrastructure health)
import { db } from './database/db';
app.get('/ready', async (req, res) => {
  try {
    const dbStart = Date.now();
    await db.query('SELECT 1');
    const dbLatencyMs = Date.now() - dbStart;
    const mem = process.memoryUsage();

    res.status(200).json({
      status: 'READY',
      checks: {
        database: {
          status: 'CONNECTED',
          latencyMs: dbLatencyMs,
        },
        memory: {
          heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
          rssMB: Math.round(mem.rss / 1024 / 1024),
        },
      },
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'UNAVAILABLE',
      error: 'DATABASE_DISCONNECTED',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/student/learning', learningRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/faqs', (req, res, next) => {
  // Shortcut to public FAQs
  const { StudentDashboardController } = require('./controllers/student.dashboard.controller');
  StudentDashboardController.getFaqs(req, res, next);
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'ROUTE_NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handling
app.use(errorHandler);
