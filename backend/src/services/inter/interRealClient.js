import fs from 'fs';
import https from 'https';
import { URL } from 'url';
import { env } from '../../config/env.js';

export class InterRealClient {
  constructor() {
    if (!env.inter.clientId || !env.inter.clientSecret) {
      throw new Error('Credenciais INTER_CLIENT_ID e INTER_CLIENT_SECRET nao configuradas');
    }

    const cert = env.inter.certBase64
      ? Buffer.from(env.inter.certBase64, 'base64')
      : env.inter.certPath
        ? fs.readFileSync(env.inter.certPath)
        : null;
    const key = env.inter.keyBase64
      ? Buffer.from(env.inter.keyBase64, 'base64')
      : env.inter.keyPath
        ? fs.readFileSync(env.inter.keyPath)
        : null;

    if (!cert || !key) {
      throw new Error(
        'Configure INTER_CERT_PATH/INTER_KEY_PATH ou INTER_CERT_BASE64/INTER_KEY_BASE64'
      );
    }

    this.baseUrl = env.inter.baseUrl;
    this.agentOptions = {
      cert,
      key
    };
    this.cachedToken = null;
  }

  async getAccessToken() {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 30000) {
      return this.cachedToken.accessToken;
    }

    const body = new URLSearchParams({
      client_id: env.inter.clientId,
      client_secret: env.inter.clientSecret,
      grant_type: 'client_credentials',
      scope: env.inter.scope
    });

    const response = await this.request('/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    this.cachedToken = {
      accessToken: response.access_token,
      expiresAt: Date.now() + Number(response.expires_in || 3600) * 1000
    };

    return response.access_token;
  }

  async createBoleto({ payer, installment }) {
    const token = await this.getAccessToken();
    const payload = this.buildChargePayload({ payer, installment });

    const created = await this.request('/cobranca/v3/cobrancas', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const codigoSolicitacao = created.codigoSolicitacao;
    const detail = codigoSolicitacao
      ? await this.getBoletoDetail(token, codigoSolicitacao).catch(() => ({}))
      : {};

    return {
      codigoSolicitacao,
      linhaDigitavel: detail.linhaDigitavel || created.linhaDigitavel,
      codigoBarras: detail.codigoBarras || created.codigoBarras,
      bankPdfUrl: codigoSolicitacao
        ? `${env.appUrl}/api/inter/boletos/${codigoSolicitacao}/pdf`
        : undefined,
      pixCopiaECola:
        detail.pix?.pixCopiaECola || detail.pixCopiaECola || created.pixCopiaECola,
      status: 'generated',
      rawResponse: { created, detail }
    };
  }

  async getBoletoDetail(token, codigoSolicitacao) {
    return this.request(`/cobranca/v3/cobrancas/${codigoSolicitacao}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async getBoletoPdf(codigoSolicitacao) {
    const token = await this.getAccessToken();
    return this.requestBuffer(`/cobranca/v3/cobrancas/${codigoSolicitacao}/pdf`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  buildChargePayload({ payer, installment }) {
    const personType = payer.document.length === 11 ? 'FISICA' : 'JURIDICA';

    return {
      seuNumero: installment.seuNumero,
      valorNominal: installment.amount,
      dataVencimento: installment.dueDate,
      numDiasAgenda: 60,
      pagador: {
        cpfCnpj: payer.document,
        tipoPessoa: personType,
        nome: payer.name
      },
      mensagem: {
        linha1: `Parcela ${installment.installmentNumber}`,
        linha2: 'Carne gerado automaticamente'
      }
    };
  }

  async request(path, options) {
    const { statusCode, body } = await this.rawRequest(path, options);
    const text = body.toString('utf8');
    const data = text ? JSON.parse(text) : {};

    if (statusCode < 200 || statusCode >= 300) {
      const message = data?.message || data?.title || text || 'Erro na API Banco Inter';
      throw new Error(`Banco Inter ${statusCode}: ${message}`);
    }

    return data;
  }

  async requestBuffer(path, options) {
    const { statusCode, body } = await this.rawRequest(path, options);

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`Banco Inter ${statusCode}: erro ao baixar PDF`);
    }

    return body;
  }

  async rawRequest(path, options) {
    const url = new URL(`${this.baseUrl}${path}`);
    const body = options.body;
    const bodyBuffer = body ? Buffer.from(body.toString()) : null;

    const requestOptions = {
      ...this.agentOptions,
      method: options.method,
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      port: url.port || 443,
      headers: {
        ...(options.headers || {}),
        ...(bodyBuffer ? { 'Content-Length': bodyBuffer.length } : {})
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(requestOptions, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            body: Buffer.concat(chunks)
          });
        });
      });

      req.on('error', reject);
      if (bodyBuffer) req.write(bodyBuffer);
      req.end();
    });
  }
}
