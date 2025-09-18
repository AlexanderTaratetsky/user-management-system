import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30m',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  pgUrl: process.env.DATABASE_URL,
  mongoUri: process.env.MONGODB_URI,
  enableMetrics: String(process.env.ENABLE_METRICS) === 'true',
  adminInviteSecret: process.env.ADMIN_INVITE_SECRET
};