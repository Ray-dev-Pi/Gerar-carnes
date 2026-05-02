import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
const envPath = path.join(projectRoot, '.env');

function usage() {
  console.log(`Uso:
  npm run inter:cert -- --cert C:/caminho/certificado.crt --key C:/caminho/chave.key
  npm run inter:cert -- --pfx C:/caminho/certificado.pfx --passphrase senha-opcional

O script atualiza o .env com INTER_CERT_BASE64/INTER_KEY_BASE64 ou INTER_PFX_BASE64.`);
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    args[item.slice(2)] = argv[index + 1];
    index += 1;
  }

  return args;
}

function readBase64(filePath) {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Arquivo nao encontrado: ${resolved}`);
  }

  return fs.readFileSync(resolved).toString('base64');
}

function readEnv() {
  if (!fs.existsSync(envPath)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        if (separator === -1) return [line, ''];
        return [line.slice(0, separator), line.slice(separator + 1)];
      })
  );
}

function writeEnv(values) {
  const orderedKeys = [
    'MONGODB_URI',
    'MONGODB_DB_NAME',
    'INTER_MODE',
    'REQUIRE_INTER_REAL',
    'INTER_BASE_URL',
    'INTER_CLIENT_ID',
    'INTER_CLIENT_SECRET',
    'INTER_CONTA_CORRENTE',
    'INTER_CERT_BASE64',
    'INTER_KEY_BASE64',
    'INTER_PFX_BASE64',
    'INTER_PFX_PASSPHRASE',
    'BOLETO_BENEFICIARY_NAME',
    'BOLETO_BENEFICIARY_DOCUMENT',
    'BOLETO_AGENCY_CODE',
    'APP_USERNAME',
    'APP_PASSWORD',
    'APP_TOKEN_SECRET'
  ];

  const seen = new Set();
  const lines = [];

  for (const key of orderedKeys) {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      lines.push(`${key}=${values[key] || ''}`);
      seen.add(key);
    }
  }

  for (const [key, value] of Object.entries(values)) {
    if (!seen.has(key)) lines.push(`${key}=${value || ''}`);
  }

  fs.writeFileSync(envPath, `${lines.join('\n')}\n`);
}

const args = parseArgs(process.argv.slice(2));

try {
  if ((!args.cert || !args.key) && !args.pfx) {
    usage();
    process.exit(1);
  }

  const env = {
    ...readEnv(),
    INTER_MODE: 'real',
    REQUIRE_INTER_REAL: 'true',
    INTER_BASE_URL: 'https://cdpj.partners.bancointer.com.br'
  };

  if (args.pfx) {
    env.INTER_PFX_BASE64 = readBase64(args.pfx);
    env.INTER_PFX_PASSPHRASE = args.passphrase || env.INTER_PFX_PASSPHRASE || '';
    env.INTER_CERT_BASE64 = '';
    env.INTER_KEY_BASE64 = '';
  } else {
    env.INTER_CERT_BASE64 = readBase64(args.cert);
    env.INTER_KEY_BASE64 = readBase64(args.key);
    env.INTER_PFX_BASE64 = '';
    env.INTER_PFX_PASSPHRASE = '';
  }

  writeEnv(env);
  console.log('Certificado do Banco Inter gravado no .env em base64.');
  console.log('Agora preencha INTER_CLIENT_ID, INTER_CLIENT_SECRET, INTER_CONTA_CORRENTE e dados do beneficiario.');
  console.log('Depois rode: npm run inter:status');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
