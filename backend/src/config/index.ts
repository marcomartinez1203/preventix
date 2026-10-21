import dotenv from 'dotenv';
dotenv.config();

export const config = {
  demoMode: process.env.DEMO_MODE ? process.env.DEMO_MODE === 'true' : process.env.NODE_ENV !== 'production',
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'changeme-secret-32-chars-minimum!!',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'changeme-refresh-32-chars-minimum!',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'Preventix <noreply@preventix.app>',
  },
};
