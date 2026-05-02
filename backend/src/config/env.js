import dotenv from 'dotenv';

dotenv.config();

const mongodbUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL ||
  'mongodb://127.0.0.1:27017/gerar-carnes';
const interMode = process.env.INTER_MODE || 'mock';

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl:
    process.env.APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT || 3000}`),
  frontendOrigin: process.env.FRONTEND_ORIGIN || '*',
  mongodbUri,
  mongodbUriSource: process.env.MONGODB_URI
    ? 'MONGODB_URI'
    : process.env.MONGO_URI
      ? 'MONGO_URI'
      : process.env.DATABASE_URL
        ? 'DATABASE_URL'
        : 'default-local',
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
    mode: interMode,
    requireReal:
      process.env.REQUIRE_INTER_REAL === 'true' ||
      (process.env.NODE_ENV === 'production' && process.env.INTER_MODE !== 'sandbox'),
    baseUrl:
      process.env.INTER_BASE_URL ||
      (interMode === 'sandbox'
        ? 'https://cdpj-sandbox.partners.uatinter.co'
        : 'https://cdpj.partners.bancointer.com.br'),
    clientId: process.env.INTER_CLIENT_ID || '',
    clientSecret: process.env.INTER_CLIENT_SECRET || '',
    contaCorrente: (process.env.INTER_CONTA_CORRENTE || '').replace(/\D/g, '').replace(/^0+/, ''),
    scope: process.env.INTER_SCOPE || 'boleto-cobranca.write boleto-cobranca.read',
    certPath: process.env.INTER_CERT_PATH || '',
    keyPath: process.env.INTER_KEY_PATH || '',
    certBase64: process.env.INTER_CERT_BASE64 || '',
    keyBase64: process.env.INTER_KEY_BASE64 || '',
    pfxPath: process.env.INTER_PFX_PATH || '',
    pfxBase64: process.env.INTER_PFX_BASE64 || '',
    pfxPassphrase: process.env.INTER_PFX_PASSPHRASE || '',
    multaPercentual: Number(process.env.INTER_MULTA_PERCENTUAL || 2),
    moraPercentual: Number(process.env.INTER_MORA_PERCENTUAL || 1)
  }
};
