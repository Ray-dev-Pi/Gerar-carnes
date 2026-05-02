# Sistema de Geracao de Carnes - Banco Inter

Sistema web completo para gerar carnes com boletos parcelados usando Node.js, Express, MongoDB e frontend HTML/CSS/JS.

Por padrao, o projeto roda em modo simulado (`INTER_MODE=mock`), sem precisar de credenciais bancarias. Para producao, configure `INTER_MODE=real` e informe as credenciais/certificados da API do Banco Inter Empresas.

## Estrutura

```text
.
|-- backend/
|   |-- package.json
|   |-- .env.example
|   |-- src/
|   |   |-- app.js
|   |   |-- server.js
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- utils/
|   |   `-- validators/
|   `-- storage/
|       `-- carnes/
`-- frontend/
    |-- index.html
    |-- styles.css
    `-- app.js
```

## Requisitos

- Node.js 18+
- MongoDB local ou Atlas
- Conta PJ Banco Inter com API de Cobrancas habilitada, somente para modo real
- Certificado e chave da API do Inter, somente para modo real

## Como Rodar

1. Suba o MongoDB local, se nao tiver outro banco configurado:

```bash
docker compose up -d
```

2. Entre no backend:

```bash
cd backend
npm install
cp .env.example .env
```

3. Ajuste o `.env`.

Para testar sem Inter:

```env
INTER_MODE=mock
MONGODB_URI=mongodb://127.0.0.1:27017/gerar-carnes
```

Para usar Inter real:

```env
INTER_MODE=real
INTER_CLIENT_ID=seu_client_id
INTER_CLIENT_SECRET=seu_client_secret
INTER_CERT_PATH=C:/caminho/certificado.crt
INTER_KEY_PATH=C:/caminho/chave.key
INTER_CONTA_CORRENTE=123456789
INTER_BASE_URL=https://cdpj.partners.bancointer.com.br
INTER_SCOPE=boleto-cobranca.write boleto-cobranca.read
```

4. Inicie:

```bash
npm run dev
```

5. Abra o frontend:

```text
frontend/index.html
```

Ou sirva a pasta `frontend` com qualquer servidor estatico. A API padrao usada pelo frontend e `http://localhost:3000/api`.

## Deploy na Vercel

Este projeto ja possui `vercel.json`, `api/index.js` e `package.json` na raiz para funcionar na Vercel.

Na Vercel, configure:

- Framework Preset: `Other`
- Root Directory: raiz do repositorio
- Build Command: `npm run build`
- Output Directory: deixe vazio

Variaveis obrigatorias em Production/Preview:

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/gerar-carnes
MONGODB_DB_NAME=gerar-carnes
INTER_MODE=mock
APP_URL=https://seu-projeto.vercel.app
APP_USERNAME=admin
APP_PASSWORD=uma-senha-forte
APP_TOKEN_SECRET=um-segredo-longo-aleatorio
BOLETO_BENEFICIARY_NAME=Nome da sua empresa
BOLETO_BENEFICIARY_DOCUMENT=00000000000100
BOLETO_AGENCY_CODE=0001/00000000-0
```

Para usar Banco Inter real na Vercel:

```env
INTER_MODE=real
INTER_CLIENT_ID=seu_client_id
INTER_CLIENT_SECRET=seu_client_secret
INTER_SCOPE=boleto-cobranca.write boleto-cobranca.read
INTER_CONTA_CORRENTE=123456789
INTER_CERT_BASE64=conteudo_base64_do_certificado
INTER_KEY_BASE64=conteudo_base64_da_chave
```

Para testar no ambiente sandbox do Inter, use:

```env
INTER_MODE=sandbox
```

Nesse modo, se `INTER_BASE_URL` nao for informado, o sistema usa automaticamente `https://cdpj-sandbox.partners.uatinter.co`.

Use MongoDB Atlas ou outro Mongo acessivel pela internet. `mongodb://127.0.0.1:27017` nao funciona na Vercel, porque la o servidor nao enxerga o seu computador.

## Exemplo de Requisicao

```bash
curl -X POST http://localhost:3000/api/carnes \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Maria Silva",
    "document": "12345678909",
    "totalAmount": 1200,
    "installments": 6,
    "firstDueDate": "2026-06-10"
  }'
```

Resposta resumida:

```json
{
  "carneId": "CARNE-20260502-8F3A1C2B",
  "status": "generated",
  "totalAmount": 1200,
  "installments": 6,
  "pdfUrl": "http://localhost:3000/api/carnes/...",
  "boletos": [
    {
      "installmentNumber": 1,
      "dueDate": "2026-06-10",
      "amount": 200,
      "linhaDigitavel": "34191...",
      "bankPdfUrl": "https://..."
    }
  ]
}
```

## Observacoes Sobre a API Banco Inter

O Inter Empresas informa que a API de Cobrancas permite emitir, consultar, cancelar e gerar PDF de cobrancas, com autenticacao segura para clientes PJ. A implementacao real deste projeto usa OAuth2 e certificado/chave mTLS. Confirme no portal do desenvolvedor do Inter se seu app esta usando a versao e os scopes liberados na sua conta.

Endpoints usados pelo adaptador real:

- `POST /oauth/v2/token`
- `POST /cobranca/v3/cobrancas`
- `GET /cobranca/v3/cobrancas/{codigoSolicitacao}`
- `GET /cobranca/v3/cobrancas/{codigoSolicitacao}/pdf`

Caso sua conta esteja em uma versao diferente da API, ajuste apenas `backend/src/services/inter/interRealClient.js`.

## Seguranca

- Credenciais ficam no `.env`, que nao deve ser versionado.
- Entrada validada com Zod.
- O sistema cria uma assinatura de idempotencia para evitar duplicar o mesmo carne.
- Em producao, use HTTPS, configure CORS para seu dominio e proteja os endpoints com autenticacao.
