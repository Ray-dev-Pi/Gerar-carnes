import { env } from '../config/env.js';
import { getInterConfigStatus } from '../services/inter/interConfigStatus.js';

function maskMongoUri(uri) {
  if (!uri) return '';

  return uri
    .replace(/\/\/([^:]+):([^@]+)@/, (_, username) => `//${username}:***@`)
    .replace(/\?.*$/, '?...');
}

export function getConfigStatusHandler(req, res) {
  const interConfig = getInterConfigStatus();

  res.json({
    interMode: env.inter.mode,
    realInterReady: interConfig.realInterReady,
    missingInterConfig: interConfig.missing,
    hasMongoUri: Boolean(env.mongodbUri),
    mongoLooksLocal: env.mongodbUri.includes('127.0.0.1') || env.mongodbUri.includes('localhost'),
    mongodbUriSource: env.mongodbUriSource,
    mongodbUriPreview: maskMongoUri(env.mongodbUri),
    bankName: env.boleto.bankName,
    beneficiaryName: env.boleto.beneficiaryName,
    hasInterContaCorrente: Boolean(env.inter.contaCorrente)
  });
}
