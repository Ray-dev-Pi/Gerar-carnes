import { env } from '../../config/env.js';

function randomDigits(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

export class InterMockClient {
  async createBoleto({ payer, installment }) {
    const codigoSolicitacao = `MOCK-${installment.seuNumero}`;
    const linhaDigitavel = `${randomDigits(5)}.${randomDigits(5)} ${randomDigits(5)}.${randomDigits(6)} ${randomDigits(5)}.${randomDigits(6)} ${randomDigits(1)} ${randomDigits(14)}`;

    return {
      codigoSolicitacao,
      linhaDigitavel,
      codigoBarras: randomDigits(44),
      bankPdfUrl: `${env.appUrl}/api/inter/boletos/${codigoSolicitacao}/pdf`,
      pixCopiaECola: `00020101021226880014br.gov.bcb.pix2566mock.inter/${codigoSolicitacao}520400005303986540${installment.amount.toFixed(2)}5802BR5913${payer.name.slice(0, 13)}6009SAO PAULO62070503***6304ABCD`,
      bankName: env.boleto.bankName,
      bankCode: env.boleto.bankCode,
      beneficiaryName: env.boleto.beneficiaryName,
      beneficiaryDocument: env.boleto.beneficiaryDocument,
      agencyCode: env.boleto.agencyCode,
      nossoNumero: randomDigits(12),
      status: 'generated',
      rawResponse: {
        mock: true,
        payer,
        installment
      }
    };
  }

  async getBoletoPdf(codigoSolicitacao) {
    return Buffer.from(`PDF simulado do boleto ${codigoSolicitacao}`);
  }
}
