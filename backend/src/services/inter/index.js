import { env } from '../../config/env.js';
import { InterMockClient } from './interMockClient.js';
import { InterRealClient } from './interRealClient.js';

export function createInterClient() {
  return ['real', 'sandbox'].includes(env.inter.mode) ? new InterRealClient() : new InterMockClient();
}
