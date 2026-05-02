import { app } from './app.js';
import { env } from './config/env.js';

async function bootstrap() {
  app.listen(env.port, () => {
    console.log(`API rodando em http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Falha ao iniciar servidor:', error);
  process.exit(1);
});
