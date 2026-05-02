import { env } from '../../config/env.js';
import { InterMockClient } from './interMockClient.js';
import { InterRealClient } from './interRealClient.js';

export function createInterClient() {
  return env.inter.mode === 'real' ? new InterRealClient() : new InterMockClient();
}
