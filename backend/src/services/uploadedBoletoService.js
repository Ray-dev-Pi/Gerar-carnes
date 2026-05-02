import { generateCarnePdfBuffer } from './pdfService.js';
import { createCarneId } from '../utils/ids.js';
import { env } from '../config/env.js';

let PDFParseClass;
let pdfJsWorkerReady;

const bankNames = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '077': 'Banco Inter',
  '104': 'Caixa',
  '237': 'Bradesco',
  '341': 'Itau',
  '748': 'Sicredi',
  '756': 'Sicoob'
};

export async function convertUploadedBoletoToCarne({ fileBuffer, fields }) {
  const text = await extractPdfText(fileBuffer);
  const linhaDigitavel = normalizeLinhaDigitavel(fields.linhaDigitavel) || findLinhaDigitavel(text);
  const codigoBarras =
    String(fields.codigoBarras || '').replace(/\D/g, '') || linhaDigitavelToBarcode(linhaDigitavel);
  const amount = parseAmount(fields.amount) || findLabeledAmount(text) || findAmount(text, linhaDigitavel);
  const dueDate =
    normalizeDate(fields.dueDate) || findDueDate(text) || new Date().toISOString().slice(0, 10);
  const bankCode = (codigoBarras || linhaDigitavel || '').slice(0, 3);
  const carneId = createCarneId();
  const beneficiaryName = fields.beneficiaryName || findBeneficiary(text) || 'Beneficiario';
  const pixCopiaECola =
    fields.pixCopiaECola ||
    fields.pixCopiaEColaManual ||
    findPixCopiaECola(text) ||
    createPixCopiaECola({
      pixKey: fields.pixKey || env.boleto.pixKey,
      amount,
      beneficiaryName,
      city: fields.pixCity || env.boleto.pixCity,
      txid: fields.pixTxid || carneId.split('-').at(-1)
    });

  if (!linhaDigitavel && !codigoBarras) {
    const error = new Error(
      'Nao consegui encontrar linha digitavel ou codigo de barras no PDF. Informe a linha digitavel manualmente.'
    );
    error.statusCode = 400;
    throw error;
  }

  const carne = {
    carneId,
    customerName: fields.customerName || findPayerName(text) || 'Pagador nao identificado',
    document: fields.document || findPayerDocument(text) || findDocument(text) || '',
    installments: 1,
    totalAmount: amount,
    firstDueDate: dueDate,
    createdAt: new Date(),
    updatedAt: new Date(),
    boletos: [
      {
        installmentNumber: 1,
        dueDate,
        amount,
        seuNumero: fields.documentNumber || findDocumentNumber(text) || carneId.split('-').at(-1),
        linhaDigitavel,
        codigoBarras,
        bankName: fields.bankName || bankNames[bankCode] || 'Banco Inter',
        bankCode: bankCode ? `${bankCode}-9` : '077-9',
        beneficiaryName,
        beneficiaryDocument: fields.beneficiaryDocument || findBeneficiaryDocument(text) || '',
        agencyCode: fields.agencyCode || findAgencyCode(text) || '',
        nossoNumero: fields.nossoNumero || findNossoNumero(text) || '',
        pixCopiaECola
      }
    ]
  };

  return {
    carne,
    pdf: await generateCarnePdfBuffer(carne)
  };
}

async function extractPdfText(fileBuffer) {
  const PDFParse = await loadPdfParser();
  const parser = new PDFParse({ data: fileBuffer });
  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    await parser.destroy();
  }
}

async function loadPdfParser() {
  if (PDFParseClass) return PDFParseClass;

  await installPdfJsDomPolyfills();
  await installPdfJsWorker();
  const { PDFParse } = await import('pdf-parse');
  PDFParseClass = PDFParse;
  return PDFParseClass;
}

async function installPdfJsWorker() {
  pdfJsWorkerReady ||= import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  await pdfJsWorkerReady;
}

async function installPdfJsDomPolyfills() {
  if (globalThis.DOMMatrix && globalThis.DOMPoint && globalThis.DOMRect) return;

  const { DOMMatrix, DOMPoint, DOMRect } = await import('@napi-rs/canvas');
  globalThis.DOMMatrix ||= DOMMatrix;
  globalThis.DOMPoint ||= DOMPoint;
  globalThis.DOMRect ||= DOMRect;
}

function normalizeLinhaDigitavel(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 47 || digits.length === 48) return digits;
  return '';
}

function findLinhaDigitavel(text) {
  const interLine = text.match(
    /\b077-9\s+(\d{5}\.?\d{5}\s+\d{5}\.?\d{6}\s+\d{5}\.?\d{6}\s+\d\s+\d{14})/i
  );
  if (interLine) return interLine[1].replace(/\D/g, '');

  const candidates = text.match(/\d(?:[\s. -]*\d){46,47}/g) || [];

  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, '');
    if (digits.length === 51 && digits.startsWith('0779')) return digits.slice(4);
    if (digits.length === 47 || digits.length === 48) return digits;
  }

  return '';
}

function linhaDigitavelToBarcode(linhaDigitavel) {
  const digits = normalizeLinhaDigitavel(linhaDigitavel);
  if (digits.length !== 47) return '';

  return [
    digits.slice(0, 4),
    digits.slice(32, 33),
    digits.slice(33, 47),
    digits.slice(4, 9),
    digits.slice(10, 20),
    digits.slice(21, 31)
  ].join('');
}

function parseAmount(value) {
  if (!value) return 0;
  const normalized = String(value).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  return Number(normalized) || 0;
}

function findAmount(text, linhaDigitavel) {
  const barcodeAmount = normalizeLinhaDigitavel(linhaDigitavel).slice(37, 47);
  if (barcodeAmount && Number(barcodeAmount) > 0) {
    return Number(barcodeAmount) / 100;
  }

  const matches = [...text.matchAll(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g)];
  const values = matches.map((match) => parseAmount(match[1])).filter((value) => value > 0);
  return values.length ? Math.max(...values) : 0;
}

function findLabeledAmount(text) {
  const match = text.match(/Valor do Documento\s*\n?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i);
  return match ? parseAmount(match[1]) : 0;
}

function normalizeDate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = String(value).match(/(\d{2})[/-](\d{2})[/-](\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

function findDueDate(text) {
  const nearby = text.match(/vencimento[\s\S]{0,80}?(\d{2}[/-]\d{2}[/-]\d{4})/i);
  if (nearby) return normalizeDate(nearby[1]);
  const firstDate = text.match(/(\d{2}[/-]\d{2}[/-]\d{4})/);
  return firstDate ? normalizeDate(firstDate[1]) : '';
}

function findDocument(text) {
  const match = text.match(
    /\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/
  );
  return match ? match[0].replace(/\D/g, '') : '';
}

function findPayerName(text) {
  const match = text.match(/Pagador\s*:?\s*([^\n\r]+)/i);
  return match?.[1]?.trim() || '';
}

function findPayerDocument(text) {
  const payerBlock = text.match(/Pagador[\s\S]{0,220}?CNPJ\/CPF:\s*([0-9./-]+)/i);
  return payerBlock ? payerBlock[1].replace(/\D/g, '') : '';
}

function findBeneficiary(text) {
  const match = text.match(/Benefici[aá]rio\s*\n?([^\n\r]+)/i);
  if (!match) return '';
  if (/^Final\b/i.test(match[1].trim())) {
    const next = text.match(/Benefici[aá]rio\s+Final[\s\S]{0,220}?Autentica/i);
    const named = next?.[0]?.match(/Final\s+[0-9\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s]+)\s+CNPJ\/CPF/i);
    if (named) return named[1].trim();
  }
  return match[1].replace(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\s*-\s*/, '').trim();
}

function findBeneficiaryDocument(text) {
  const match = text.match(/Benefici[aá]rio\s*\n?([0-9./-]{14,18})/i);
  return match ? match[1].replace(/\D/g, '') : '';
}

function findAgencyCode(text) {
  const match = text.match(/Ag[eê]ncia\s*\/\s*C[oó]digo do Benefici[aá]rio\s*\n?\s*([0-9/-]+)/i);
  return match?.[1]?.trim() || '';
}

function findNossoNumero(text) {
  const match = text.match(/Nosso N[uú]mero\s*\/\s*C[oó]d\. do Documento\s*\n?\s*([0-9/-]+)/i);
  return match?.[1]?.trim() || '';
}

function findDocumentNumber(text) {
  const match = text.match(/N[°º]?\s*do Documento\s*\n?\s*([A-Z0-9.-]+)/i);
  return match?.[1]?.trim() || '';
}

function findPixCopiaECola(text) {
  const match = text.match(/000201[0-9A-Z./:+-]{40,}/i);
  return match?.[0]?.trim() || '';
}

function createPixCopiaECola({ pixKey, amount, beneficiaryName, city, txid }) {
  const key = String(pixKey || '').trim();
  if (!key) return '';

  const merchantAccountInfo = emv('00', 'br.gov.bcb.pix') + emv('01', key);
  const payload =
    emv('00', '01') +
    emv('26', merchantAccountInfo) +
    emv('52', '0000') +
    emv('53', '986') +
    (amount > 0 ? emv('54', amount.toFixed(2)) : '') +
    emv('58', 'BR') +
    emv('59', normalizePixText(beneficiaryName, 25) || 'BENEFICIARIO') +
    emv('60', normalizePixText(city, 15) || 'FORTALEZA') +
    emv('62', emv('05', normalizePixText(txid, 25) || '***'));

  return `${payload}6304${crc16Ccitt(`${payload}6304`)}`;
}

function emv(id, value) {
  const text = String(value || '');
  return `${id}${String(text.length).padStart(2, '0')}${text}`;
}

function normalizePixText(value, maxLength) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 $%*+\-./:]/gi, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

function crc16Ccitt(value) {
  let crc = 0xffff;

  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}
