import { Carne } from '../models/Carne.js';
import { buildInstallmentSchedule } from './installmentScheduler.js';
import { createInterClient } from './inter/index.js';
import { getInterConfigStatus } from './inter/interConfigStatus.js';
import { upsertCustomerFromCarne } from './customerService.js';
import { generateCarnePdf } from './pdfService.js';
import { createCarneId, createIdempotencyHash } from '../utils/ids.js';
import { env } from '../config/env.js';

export async function createCarne(payload) {
  ensureRealInterReady();

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
    const customer = await upsertCustomerFromCarne(payload);
    carne.customerId = customer._id;

    const interClient = createInterClient();
    const payer = {
      name: payload.customerName,
      document: payload.document,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      addressNumber: payload.addressNumber,
      complement: payload.complement,
      neighborhood: payload.neighborhood,
      city: payload.city,
      state: payload.state,
      zipCode: payload.zipCode
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

export async function syncCarneWithBank(carneId) {
  ensureRealInterReady();

  const carne = await Carne.findOne({ carneId });
  if (!carne) return null;

  const interClient = createInterClient();
  const syncedBoletos = [];

  for (const boleto of carne.boletos) {
    const existingBoleto = boleto.toObject?.() || boleto;
    const updated = await interClient.refreshBoleto(boleto);
    syncedBoletos.push({
      ...existingBoleto,
      ...updated
    });
  }

  carne.boletos = syncedBoletos;
  const pdf = await generateCarnePdf(carne);
  carne.pdfPath = pdf.path;
  carne.pdfBase64 = pdf.base64;
  await carne.save();

  return formatCarneResponse(carne);
}

export async function listCarnes({ customerId } = {}) {
  const filter = customerId ? { customerId } : {};
  const carnes = await Carne.find(filter).sort({ createdAt: -1 }).limit(100);
  return carnes.map((carne) => formatCarneResponse(carne));
}

function ensureRealInterReady() {
  const interStatus = getInterConfigStatus();

  if (!env.inter.requireReal && interStatus.realInterReady) return;
  if (!env.inter.requireReal && !interStatus.usesInterApi) return;
  if (interStatus.realInterReady) return;

  const error = new Error(
    `Banco Inter real nao esta pronto. Faltam: ${interStatus.missing.join(', ')}.`
  );
  error.statusCode = 503;
  throw error;
}

export function formatCarneResponse(carne, reused = false) {
  return {
    carneId: carne.carneId,
    customerId: carne.customerId?.toString?.() || carne.customerId || null,
    reused,
    status: carne.status,
    customerName: carne.customerName,
    document: carne.document,
    address: carne.address,
    addressNumber: carne.addressNumber,
    neighborhood: carne.neighborhood,
    city: carne.city,
    state: carne.state,
    zipCode: carne.zipCode,
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
