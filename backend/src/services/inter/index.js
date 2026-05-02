import { env } from '../../config/env.js';
import { InterMockClient } from './interMockClient.js';
import { InterRealClient } from './interRealClient.js';

export function createInterClient() {
  if (['real', 'sandbox'].includes(env.inter.mode)) {
    return new InterRealClient();
  }

  if (env.inter.requireReal) {
    throw new Error(
      'Banco Inter real obrigatorio. Configure INTER_MODE=real e as credenciais/certificado antes de gerar carnes.'
    );
  }

  return new InterMockClient();
}
