import { env } from '../config/env.js';

function maskMongoUri(uri) {
  if (!uri) return '';

  return uri
    .replace(/\/\/([^:]+):([^@]+)@/, (_, username) => `//${username}:***@`)
    .replace(/\?.*$/, '?...');
}

export function getConfigStatusHandler(req, res) {
  res.json({
    interMode: env.inter.mode,
    realInterReady: Boolean(
      env.inter.clientId &&
        env.inter.clientSecret &&
        ((env.inter.certBase64 && env.inter.keyBase64) ||
          (env.inter.certPath && env.inter.keyPath))
    ),
    hasMongoUri: Boolean(env.mongodbUri),
    mongoLooksLocal: env.mongodbUri.includes('127.0.0.1') || env.mongodbUri.includes('localhost'),
    mongodbUriSource: env.mongodbUriSource,
    mongodbUriPreview: maskMongoUri(env.mongodbUri),
    bankName: env.boleto.bankName,
    beneficiaryName: env.boleto.beneficiaryName
  });
}
