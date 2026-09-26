import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_institute_lms_secure_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresDays: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  bcryptSaltRounds: 12,
  dbDataDir: path.resolve(__dirname, '../../../database/pgdata'),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_institute_mock_key',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_mock_secret_2026',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_mock_2026',
};
