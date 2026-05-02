import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl:
    process.env.APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT || 3000}`),
  frontendOrigin: process.env.FRONTEND_ORIGIN || '*',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gerar-carnes',
  mongodbDbName: process.env.MONGODB_DB_NAME || 'gerar-carnes',
  auth: {
    username: process.env.APP_USERNAME || 'admin',
    password: process.env.APP_PASSWORD || 'admin123',
    tokenSecret: process.env.APP_TOKEN_SECRET || 'troque-este-segredo-em-producao'
  },
  boleto: {
    beneficiaryName: process.env.BOLETO_BENEFICIARY_NAME || 'Sua empresa',
    beneficiaryDocument: process.env.BOLETO_BENEFICIARY_DOCUMENT || '',
    agencyCode: process.env.BOLETO_AGENCY_CODE || '',
    bankCode: process.env.BOLETO_BANK_CODE || '077-9',
    bankName: process.env.BOLETO_BANK_NAME || 'Banco Inter'
  },
  inter: {
    mode: process.env.INTER_MODE || 'mock',
    baseUrl: process.env.INTER_BASE_URL || 'https://cdpj.partners.bancointer.com.br',
    clientId: process.env.INTER_CLIENT_ID || '',
    clientSecret: process.env.INTER_CLIENT_SECRET || '',
    scope: process.env.INTER_SCOPE || 'boleto-cobranca.write boleto-cobranca.read',
    certPath: process.env.INTER_CERT_PATH || '',
    keyPath: process.env.INTER_KEY_PATH || '',
    certBase64: process.env.INTER_CERT_BASE64 || '',
    keyBase64: process.env.INTER_KEY_BASE64 || ''
  }
};
