import { createInterClient } from '../services/inter/index.js';
import { getInterConfigStatus } from '../services/inter/interConfigStatus.js';
import { env } from '../config/env.js';

async function main() {
  const status = getInterConfigStatus();

  console.log(
    JSON.stringify(
      {
        mode: env.inter.mode,
        baseUrl: env.inter.baseUrl,
        ready: status.realInterReady,
        missing: status.missing
      },
      null,
      2
    )
  );

  if (!status.realInterReady) {
    process.exitCode = 1;
    return;
  }

  const client = createInterClient();
  const result = await client.testConnection();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
