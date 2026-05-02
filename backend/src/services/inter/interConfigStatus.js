import { env } from '../../config/env.js';

export function getInterConfigStatus() {
  const usesInterApi = ['real', 'sandbox'].includes(env.inter.mode);
  const hasCertificatePair = Boolean(
    (env.inter.certBase64 && env.inter.keyBase64) || (env.inter.certPath && env.inter.keyPath)
  );
  const hasPfx = Boolean(env.inter.pfxBase64 || env.inter.pfxPath);

  const missing = [];

  if (!usesInterApi) missing.push('INTER_MODE=real');
  if (!env.inter.clientId) missing.push('INTER_CLIENT_ID');
  if (!env.inter.clientSecret) missing.push('INTER_CLIENT_SECRET');
  if (!hasCertificatePair && !hasPfx) {
    missing.push('INTER_CERT_BASE64/INTER_KEY_BASE64 ou INTER_PFX_BASE64');
  }
  if (!env.inter.contaCorrente) missing.push('INTER_CONTA_CORRENTE');
  if (!env.boleto.beneficiaryName || env.boleto.beneficiaryName === 'Sua empresa') {
    missing.push('BOLETO_BENEFICIARY_NAME');
  }
  if (!env.boleto.beneficiaryDocument) missing.push('BOLETO_BENEFICIARY_DOCUMENT');
  if (!env.boleto.agencyCode) missing.push('BOLETO_AGENCY_CODE');

  return {
    usesInterApi,
    realInterReady: usesInterApi && missing.length === 0,
    missing,
    hasCertificatePair,
    hasPfx
  };
}
