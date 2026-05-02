import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { formatCurrencyBRL } from '../utils/money.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageDir = process.env.VERCEL
  ? '/tmp/gerar-carnes'
  : path.resolve(__dirname, '../../storage/carnes');

async function renderCarnePdf(doc, carne) {
  doc.fontSize(16).text(`Carne ${carne.carneId}`, { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(9).text(`Cliente: ${carne.customerName} | Documento: ${carne.document}`, {
    align: 'center'
  });
  doc.moveDown(0.7);

  for (const [index, boleto] of carne.boletos.entries()) {
    if (index > 0) doc.addPage();
    await renderBoletoPage(doc, carne, boleto);
  }
}

function field(doc, label, value, x, y, w, h, options = {}) {
  doc.rect(x, y, w, h).stroke('#b7b7b7');
  doc.fontSize(5.6).fillColor('#333333').text(label, x + 3, y + 2, { width: w - 6 });
  doc
    .fontSize(options.fontSize || 7.5)
    .fillColor('#111111')
    .text(value || '-', x + 3, y + 12, { width: w - 6, height: h - 13 });
}

function barcodePattern(value) {
  const digits = String(value || '00000000000000000000000000000000000000000000').replace(/\D/g, '');
  return digits.padEnd(44, '0').slice(0, 44);
}

function drawBarcode(doc, value, x, y) {
  const pattern = barcodePattern(value);
  let cursor = x;

  for (const digit of pattern) {
    const width = Number(digit) % 3 === 0 ? 1.5 : 0.7;
    const height = Number(digit) % 2 === 0 ? 42 : 36;
    doc.rect(cursor, y, width, height).fill('#111111');
    cursor += width + 1.4;
  }
}

async function renderBoletoPage(doc, carne, boleto) {
  const left = 24;
  const top = 30;
  const receiptW = 150;
  const mainX = left + receiptW + 12;
  const mainW = 560 - mainX;
  const bankName = boleto.bankName || env.boleto.bankName;
  const bankCode = boleto.bankCode || env.boleto.bankCode;
  const beneficiaryName = boleto.beneficiaryName || env.boleto.beneficiaryName;
  const beneficiaryDocument = boleto.beneficiaryDocument || env.boleto.beneficiaryDocument;
  const agencyCode = boleto.agencyCode || env.boleto.agencyCode;
  const linhaDigitavel = boleto.linhaDigitavel || 'Linha digitavel retornada pelo Banco Inter';

  doc.fontSize(7).fillColor('#777777').text('Corte na linha pontilhada', left, top - 10);
  doc
    .moveTo(left, top - 2)
    .lineTo(560, top - 2)
    .dash(3, { space: 3 })
    .stroke('#c9c9c9')
    .undash();

  doc.rect(left, top, receiptW, 720).stroke('#8a8a8a');
  doc.fontSize(8).fillColor('#111111').text('SEU LOGO AQUI', left + 8, top + 10);
  doc.fontSize(7).text('Recibo do Pagador', left + 86, top + 10);

  field(doc, 'Parcela/Plano', `${boleto.installmentNumber}/${carne.installments}`, left, top + 35, 54, 34);
  field(doc, 'Vencimento', boleto.dueDate, left + 54, top + 35, 48, 34);
  field(doc, 'Valor', formatCurrencyBRL(boleto.amount), left + 102, top + 35, 48, 34);
  field(doc, 'Agencia / Codigo do Beneficiario', agencyCode, left, top + 69, receiptW, 32);
  field(doc, 'Nosso Numero', boleto.nossoNumero || boleto.seuNumero, left, top + 101, receiptW, 32);
  field(doc, 'Numero Documento', boleto.seuNumero, left, top + 133, 95, 32);
  field(doc, 'Especie Doc.', 'DM', left + 95, top + 133, 55, 32);
  field(doc, '(=) Valor do Documento', formatCurrencyBRL(boleto.amount), left, top + 165, receiptW, 32);
  field(doc, '(-) Desconto / Abatimento', '', left, top + 197, receiptW, 32);
  field(doc, '(+) Mora / Multa', '', left, top + 229, receiptW, 32);
  field(doc, '(=) Valor Cobrado', '', left, top + 261, receiptW, 32);
  field(doc, 'Pagador', `${carne.customerName}\n${carne.document}`, left, top + 303, receiptW, 72);
  field(doc, 'Beneficiario', `${beneficiaryName}\n${beneficiaryDocument}`, left, top + 375, receiptW, 72);

  doc.rect(mainX, top, mainW, 720).stroke('#8a8a8a');
  doc.fontSize(16).fillColor('#f15a24').text(bankName, mainX + 8, top + 8, { width: 110 });
  doc.fontSize(10).fillColor('#111111').text(bankCode, mainX + 120, top + 12, { width: 45 });
  doc
    .moveTo(mainX + 170, top + 8)
    .lineTo(mainX + 170, top + 32)
    .stroke('#111111');
  doc.fontSize(9).text(linhaDigitavel, mainX + 178, top + 12, { width: mainW - 186 });

  const rowY = top + 40;
  field(doc, 'Local de Pagamento', 'Pagavel em qualquer banco ate a data de vencimento.', mainX, rowY, mainW - 125, 34);
  field(doc, 'Vencimento', boleto.dueDate, mainX + mainW - 125, rowY, 125, 34);
  field(doc, 'Beneficiario', `${beneficiaryName} - CPF/CNPJ ${beneficiaryDocument}`, mainX, rowY + 34, mainW - 125, 34);
  field(doc, 'Agencia / Codigo do Beneficiario', agencyCode, mainX + mainW - 125, rowY + 34, 125, 34);
  field(doc, 'Data Documento', new Date(carne.createdAt || Date.now()).toISOString().slice(0, 10), mainX, rowY + 68, 72, 34);
  field(doc, 'Numero Documento', boleto.seuNumero, mainX + 72, rowY + 68, 108, 34);
  field(doc, 'Especie Doc.', 'DM', mainX + 180, rowY + 68, 55, 34);
  field(doc, 'Aceite', 'N', mainX + 235, rowY + 68, 45, 34);
  field(doc, 'Data Processamento', new Date(carne.updatedAt || Date.now()).toISOString().slice(0, 10), mainX + 280, rowY + 68, 95, 34);
  field(doc, 'Nosso Numero', boleto.nossoNumero || boleto.seuNumero, mainX + mainW - 125, rowY + 68, 125, 34);
  field(doc, 'Uso do Banco', '', mainX, rowY + 102, 72, 34);
  field(doc, 'Carteira', '112', mainX + 72, rowY + 102, 54, 34);
  field(doc, 'Especie', 'R$', mainX + 126, rowY + 102, 45, 34);
  field(doc, 'Quantidade', '1', mainX + 171, rowY + 102, 70, 34);
  field(doc, 'Valor', formatCurrencyBRL(boleto.amount), mainX + 241, rowY + 102, 134, 34);
  field(doc, '(=) Valor do Documento', formatCurrencyBRL(boleto.amount), mainX + mainW - 125, rowY + 102, 125, 34);

  field(
    doc,
    'Instrucoes',
    'Nao receber apos 30 dias do vencimento.\nApos o vencimento cobrar multa e juros conforme contrato.\nAutenticacao mecanica no verso.',
    mainX,
    rowY + 136,
    mainW - 125,
    118,
    { fontSize: 7 }
  );
  field(doc, '(-) Desconto / Abatimento', '', mainX + mainW - 125, rowY + 136, 125, 30);
  field(doc, '(-) Outras Deducoes', '', mainX + mainW - 125, rowY + 166, 125, 30);
  field(doc, '(+) Mora / Multa', '', mainX + mainW - 125, rowY + 196, 125, 30);
  field(doc, '(=) Valor Cobrado', '', mainX + mainW - 125, rowY + 226, 125, 28);

  field(
    doc,
    'Pagador',
    `${carne.customerName}\nCPF/CNPJ: ${carne.document}`,
    mainX,
    rowY + 254,
    mainW - 125,
    70
  );
  field(doc, 'CPF/CNPJ', carne.document, mainX + mainW - 125, rowY + 254, 125, 70);

  if (boleto.pixCopiaECola) {
    const qr = await QRCode.toDataURL(boleto.pixCopiaECola, { margin: 1, width: 92 });
    doc.image(qr, mainX + mainW - 95, rowY + 335, { width: 82 });
    doc.fontSize(6.5).fillColor('#111111').text('QR Code PIX', mainX + mainW - 88, rowY + 419);
  }

  drawBarcode(doc, boleto.codigoBarras, mainX + 10, rowY + 370);
  doc
    .fontSize(6.5)
    .fillColor('#111111')
    .text('Autenticacao Mecanica / FICHA DE COMPENSACAO', mainX + mainW - 190, rowY + 430, {
      width: 180,
      align: 'right'
    });
}

export async function generateCarnePdfBuffer(carne) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  await renderCarnePdf(doc, carne);
  doc.end();

  return finished;
}

export async function generateCarnePdf(carne) {
  await fs.promises.mkdir(storageDir, { recursive: true });
  const pdfPath = path.join(storageDir, `${carne.carneId}.pdf`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  await renderCarnePdf(doc, carne);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const buffer = await fs.promises.readFile(pdfPath);

  return {
    path: pdfPath,
    base64: buffer.toString('base64')
  };
}
