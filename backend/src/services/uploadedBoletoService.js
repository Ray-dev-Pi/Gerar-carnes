import { PDFParse } from 'pdf-parse';
import { generateCarnePdfBuffer } from './pdfService.js';
import { createCarneId } from '../utils/ids.js';

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
  const codigoBarras = fields.codigoBarras?.replace(/\D/g, '') || linhaDigitavelToBarcode(linhaDigitavel);
  const amount = parseAmount(fields.amount) || findAmount(text, linhaDigitavel);
  const dueDate = normalizeDate(fields.dueDate) || findDueDate(text) || new Date().toISOString().slice(0, 10);
  const bankCode = (codigoBarras || linhaDigitavel || '').slice(0, 3);
  const carneId = createCarneId();

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
    document: fields.document || findDocument(text) || '',
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
        bankName: fields.bankName || bankNames[bankCode] || 'Banco',
        bankCode: bankCode ? `${bankCode}` : '',
        beneficiaryName: fields.beneficiaryName || findBeneficiary(text) || 'Beneficiario',
        beneficiaryDocument: fields.beneficiaryDocument || '',
        agencyCode: fields.agencyCode || '',
        nossoNumero: fields.nossoNumero || ''
      }
    ]
  };

  return {
    carne,
    pdf: await generateCarnePdfBuffer(carne)
  };
}

async function extractPdfText(fileBuffer) {
  const parser = new PDFParse({ data: fileBuffer });
  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    await parser.destroy();
  }
}

function normalizeLinhaDigitavel(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 47 || digits.length === 48) return digits;
  return '';
}

function findLinhaDigitavel(text) {
  const compact = text.replace(/[^\d]/g, ' ');
  const candidates = compact.match(/\d(?:[\s. -]*\d){46,47}/g) || [];

  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, '');
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
  const match = text.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
  return match ? match[0].replace(/\D/g, '') : '';
}

function findPayerName(text) {
  const match = text.match(/Pagador\s*:?\s*([^\n\r]+)/i);
  return match?.[1]?.trim() || '';
}

function findBeneficiary(text) {
  const match = text.match(/Benefici[aá]rio\s*:?\s*([^\n\r]+)/i);
  return match?.[1]?.trim() || '';
}

function findDocumentNumber(text) {
  const match = text.match(/N[uú]mero Documento\s*:?\s*([A-Z0-9.-]+)/i);
  return match?.[1]?.trim() || '';
}
