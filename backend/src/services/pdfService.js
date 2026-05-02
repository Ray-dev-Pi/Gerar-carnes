import fs from 'fs';
import path from 'path';
import bwipjs from 'bwip-js';
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

async function drawBarcode(doc, value, x, y) {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.length !== 44) {
    doc
      .fontSize(6.5)
      .fillColor('#111111')
      .text('Codigo de barras indisponivel', x, y + 16, { width: 260, align: 'center' });
    return;
  }

  const png = await bwipjs.toBuffer({
    bcid: 'interleaved2of5',
    text: digits,
    scale: 2,
    height: 12,
    includetext: false,
    paddingwidth: 0,
    paddingheight: 0
  });

  doc.image(png, x, y, { width: 260, height: 42 });
}

async function renderBoletoPage(doc, carne, boleto) {
  const left = 18;
  const top = 18;
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const receiptW = 178;
  const mainX = left + receiptW + 12;
  const mainW = pageW - mainX - 18;
  const bankName = boleto.bankName || env.boleto.bankName;
  const bankCode = boleto.bankCode || env.boleto.bankCode;
  const beneficiaryName = boleto.beneficiaryName || env.boleto.beneficiaryName;
  const beneficiaryDocument = boleto.beneficiaryDocument || env.boleto.beneficiaryDocument;
  const agencyCode = boleto.agencyCode || env.boleto.agencyCode;
  const linhaDigitavel = boleto.linhaDigitavel || 'Linha digitavel retornada pelo Banco Inter';

  doc.rect(left, top, receiptW, pageH - 48).stroke('#8a8a8a');
  doc.fontSize(8).fillColor('#111111').text('SEU LOGO AQUI', left + 8, top + 10);
  doc.fontSize(7).text('Recibo do Pagador', left + 86, top + 10);

  field(doc, 'Parcela/Plano', `${boleto.installmentNumber}/${carne.installments}`, left, top + 35, 62, 30);
  field(doc, 'Vencimento', boleto.dueDate, left + 62, top + 35, 58, 30);
  field(doc, 'Valor', formatCurrencyBRL(boleto.amount), left + 120, top + 35, 58, 30);
  field(doc, 'Agencia / Codigo do Beneficiario', agencyCode, left, top + 65, receiptW, 28);
  field(doc, 'Nosso Numero', boleto.nossoNumero || boleto.seuNumero, left, top + 93, receiptW, 28);
  field(doc, 'Numero Documento', boleto.seuNumero, left, top + 121, 112, 28);
  field(doc, 'Especie Doc.', 'DM', left + 112, top + 121, 66, 28);
  field(doc, '(=) Valor do Documento', formatCurrencyBRL(boleto.amount), left, top + 149, receiptW, 28);
  field(doc, '(-) Desconto / Abatimento', '', left, top + 177, receiptW, 28);
  field(doc, '(+) Mora / Multa', '', left, top + 205, receiptW, 28);
  field(doc, '(=) Valor Cobrado', '', left, top + 233, receiptW, 28);
  field(doc, 'Pagador', `${carne.customerName}\n${carne.document}`, left, top + 268, receiptW, 56);
  field(doc, 'Beneficiario', `${beneficiaryName}\n${beneficiaryDocument}`, left, top + 324, receiptW, 58);

  doc.rect(mainX, top, mainW, pageH - 48).stroke('#8a8a8a');
  doc.fontSize(16).fillColor('#f15a24').text(bankName, mainX + 8, top + 8, { width: 110 });
  doc.fontSize(10).fillColor('#111111').text(bankCode, mainX + 120, top + 12, { width: 45 });
  doc
    .moveTo(mainX + 170, top + 8)
    .lineTo(mainX + 170, top + 32)
    .stroke('#111111');
  doc.fontSize(9).text(linhaDigitavel, mainX + 178, top + 12, { width: mainW - 186 });

  const rowY = top + 40;
  field(doc, 'Local de Pagamento', 'Pagavel em qualquer banco ate a data de vencimento.', mainX, rowY, mainW - 150, 30);
  field(doc, 'Vencimento', boleto.dueDate, mainX + mainW - 150, rowY, 150, 30);
  field(doc, 'Beneficiario', `${beneficiaryName} - CPF/CNPJ ${beneficiaryDocument}`, mainX, rowY + 30, mainW - 150, 30);
  field(doc, 'Agencia / Codigo do Beneficiario', agencyCode, mainX + mainW - 150, rowY + 30, 150, 30);
  field(doc, 'Data Documento', new Date(carne.createdAt || Date.now()).toISOString().slice(0, 10), mainX, rowY + 60, 82, 30);
  field(doc, 'Numero Documento', boleto.seuNumero, mainX + 82, rowY + 60, 128, 30);
  field(doc, 'Especie Doc.', 'DM', mainX + 210, rowY + 60, 58, 30);
  field(doc, 'Aceite', 'N', mainX + 268, rowY + 60, 48, 30);
  field(doc, 'Data Processamento', new Date(carne.updatedAt || Date.now()).toISOString().slice(0, 10), mainX + 316, rowY + 60, 108, 30);
  field(doc, 'Nosso Numero', boleto.nossoNumero || boleto.seuNumero, mainX + mainW - 150, rowY + 60, 150, 30);
  field(doc, 'Uso do Banco', '', mainX, rowY + 90, 82, 30);
  field(doc, 'Carteira', '112', mainX + 82, rowY + 90, 62, 30);
  field(doc, 'Especie', 'R$', mainX + 144, rowY + 90, 52, 30);
  field(doc, 'Quantidade', '1', mainX + 196, rowY + 90, 76, 30);
  field(doc, 'Valor', formatCurrencyBRL(boleto.amount), mainX + 272, rowY + 90, 152, 30);
  field(doc, '(=) Valor do Documento', formatCurrencyBRL(boleto.amount), mainX + mainW - 150, rowY + 90, 150, 30);

  field(
    doc,
    'Instrucoes',
    'Nao receber apos 30 dias do vencimento.\nApos o vencimento cobrar multa e juros conforme contrato.\nAutenticacao mecanica no verso.',
    mainX,
    rowY + 120,
    mainW - 150,
    90,
    { fontSize: 7 }
  );
  field(doc, '(-) Desconto / Abatimento', '', mainX + mainW - 150, rowY + 120, 150, 30);
  field(doc, '(-) Outras Deducoes', '', mainX + mainW - 150, rowY + 150, 150, 30);
  field(doc, '(+) Mora / Multa', '', mainX + mainW - 150, rowY + 180, 150, 30);
  field(doc, '(=) Valor Cobrado', '', mainX + mainW - 150, rowY + 210, 150, 28);

  field(
    doc,
    'Pagador',
    `${carne.customerName}\nCPF/CNPJ: ${carne.document}`,
    mainX,
    rowY + 218,
    mainW - 150,
    56
  );
  field(doc, 'CPF/CNPJ', carne.document, mainX + mainW - 150, rowY + 238, 150, 36);

  if (boleto.pixCopiaECola) {
    const qr = await QRCode.toDataURL(boleto.pixCopiaECola, { margin: 1, width: 92 });
    doc.image(qr, mainX + mainW - 96, rowY + 284, { width: 82 });
    doc.fontSize(6.5).fillColor('#111111').text('QR Code PIX', mainX + mainW - 88, rowY + 368);
  }

  await drawBarcode(doc, boleto.codigoBarras, mainX + 12, rowY + 302);
  doc
    .fontSize(6.5)
    .fillColor('#111111')
    .text('Autenticacao Mecanica / FICHA DE COMPENSACAO', mainX + mainW - 190, rowY + 430, {
      width: 180,
      align: 'right'
    });

  doc
    .moveTo(left, pageH - 26)
    .lineTo(pageW - 18, pageH - 26)
    .dash(3, { space: 3 })
    .stroke('#c9c9c9')
    .undash();
  doc.fontSize(7).fillColor('#777777').text('Corte na linha pontilhada', left, pageH - 22, {
    lineBreak: false
  });
}

export async function generateCarnePdfBuffer(carne) {
  const doc = new PDFDocument({ margin: 18, size: 'A4', layout: 'landscape' });
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

  const doc = new PDFDocument({ margin: 18, size: 'A4', layout: 'landscape' });
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
