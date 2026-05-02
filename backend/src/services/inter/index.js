import { env } from '../../config/env.js';
import { InterRealClient } from './interRealClient.js';

export function createInterClient() {
  if (['real', 'sandbox'].includes(env.inter.mode)) {
    return new InterRealClient();
  }

  throw new Error(
    `Modo INTER_MODE=${env.inter.mode} nao permitido. Use INTER_MODE=real com credenciais do Banco Inter.`
  );
}
