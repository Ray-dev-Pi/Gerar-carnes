import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
  frontendOrigin: process.env.FRONTEND_ORIGIN || '*',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gerar-carnes',
  inter: {
    mode: process.env.INTER_MODE || 'mock',
    baseUrl: process.env.INTER_BASE_URL || 'https://cdpj.partners.bancointer.com.br',
    clientId: process.env.INTER_CLIENT_ID || '',
    clientSecret: process.env.INTER_CLIENT_SECRET || '',
    scope: process.env.INTER_SCOPE || 'boleto-cobranca.write boleto-cobranca.read',
    certPath: process.env.INTER_CERT_PATH || '',
    keyPath: process.env.INTER_KEY_PATH || ''
  }
};
