import { Carne } from '../models/Carne.js';
import { buildInstallmentSchedule } from './installmentScheduler.js';
import { createInterClient } from './inter/index.js';
import { generateCarnePdf } from './pdfService.js';
import { createCarneId, createIdempotencyHash } from '../utils/ids.js';
import { env } from '../config/env.js';

export async function createCarne(payload) {
  const idempotencyHash = createIdempotencyHash(payload);
  const existing = await Carne.findOne({ idempotencyHash });

  if (existing) {
    return formatCarneResponse(existing, true);
  }

  const carneId = createCarneId();
  const schedule = buildInstallmentSchedule({ ...payload, carneId });

  const carne = await Carne.create({
    carneId,
    idempotencyHash,
    ...payload,
    status: 'processing',
    boletos: []
  });

  try {
    const interClient = createInterClient();
    const payer = {
      name: payload.customerName,
      document: payload.document
    };

    const boletos = [];

    for (const installment of schedule) {
      const bankResponse = await interClient.createBoleto({ payer, installment });
      boletos.push({
        ...installment,
        ...bankResponse
      });
    }

    carne.boletos = boletos;
    carne.status = 'generated';
    const pdf = await generateCarnePdf(carne);
    carne.pdfPath = pdf.path;
    carne.pdfBase64 = pdf.base64;
    await carne.save();

    return formatCarneResponse(carne, false);
  } catch (error) {
    carne.status = 'failed';
    carne.errorMessage = error.message;
    await carne.save();
    throw error;
  }
}

export async function getCarneById(carneId) {
  return Carne.findOne({ carneId });
}

export function formatCarneResponse(carne, reused = false) {
  return {
    carneId: carne.carneId,
    reused,
    status: carne.status,
    customerName: carne.customerName,
    document: carne.document,
    totalAmount: carne.totalAmount,
    installments: carne.installments,
    firstDueDate: carne.firstDueDate,
    pdfUrl:
      carne.pdfPath || carne.pdfBase64 ? `${env.appUrl}/api/carnes/${carne.carneId}/pdf` : null,
    boletos: carne.boletos.map((boleto) => ({
      installmentNumber: boleto.installmentNumber,
      dueDate: boleto.dueDate,
      amount: boleto.amount,
      seuNumero: boleto.seuNumero,
      codigoSolicitacao: boleto.codigoSolicitacao,
      linhaDigitavel: boleto.linhaDigitavel,
      codigoBarras: boleto.codigoBarras,
      bankPdfUrl: boleto.bankPdfUrl,
      pixCopiaECola: boleto.pixCopiaECola,
      bankName: boleto.bankName,
      bankCode: boleto.bankCode,
      beneficiaryName: boleto.beneficiaryName,
      beneficiaryDocument: boleto.beneficiaryDocument,
      agencyCode: boleto.agencyCode,
      nossoNumero: boleto.nossoNumero,
      status: boleto.status
    }))
  };
}
