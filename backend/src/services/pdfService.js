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
const logoPath = path.resolve(__dirname, '../../assets/informatica.png');
const carnePageSize = [980, 410];
const boletosPerPage = 4;
const a4PageSize = [595.28, 841.89];

async function renderCarnePdf(doc, carne) {
  const pageMargin = 8;
  const slotHeight = (a4PageSize[1] - pageMargin * 2) / boletosPerPage;
  const scaleX = (a4PageSize[0] - pageMargin * 2) / carnePageSize[0];
  const scaleY = slotHeight / carnePageSize[1];
  const scaledWidth = carnePageSize[0] * scaleX;
  const xOffset = pageMargin + (a4PageSize[0] - pageMargin * 2 - scaledWidth) / 2;

  for (const [index, boleto] of carne.boletos.entries()) {
    if (index > 0 && index % boletosPerPage === 0) doc.addPage();

    const slotIndex = index % boletosPerPage;
    const yOffset = pageMargin + slotIndex * slotHeight;

    doc.save();
    doc.translate(xOffset, yOffset);
    doc.scale(scaleX, scaleY);
    await renderBoletoPage(doc, carne, boleto, 0, { scaleX, scaleY });
    doc.restore();
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

function drawLogo(doc, x, y, size) {
  if (!fs.existsSync(logoPath)) {
    doc.fontSize(8).fillColor('#111111').text('INFOTMATICA-DEV', x, y + 8, { width: size * 2 });
    return;
  }

  doc.image(logoPath, x, y, {
    fit: [size, size],
    align: 'center',
    valign: 'center'
  });
}

function pixPaymentBox(doc, pixCode, x, y, w, h) {
  if (!pixCode) return;

  doc.rect(x, y, w, h).stroke('#b7b7b7');
  doc.fontSize(5.8).fillColor('#333333').text('Codigo Pix copia e cola', x + 3, y + 3, {
    width: w - 6
  });
  doc
    .font('Courier')
    .fontSize(5.4)
    .fillColor('#111111')
    .text(pixCode, x + 3, y + 13, {
      width: w - 6,
      height: h - 16,
      lineGap: 0.6
    })
    .font('Helvetica');
}

async function drawBarcode(doc, value, x, y, options = {}) {
  const digits = String(value || '').replace(/\D/g, '');
  const width = options.width || 360;
  const height = options.height || 56;
  const textFontSize = options.textFontSize || 10;

  if (digits.length !== 44) {
    doc
      .fontSize(textFontSize)
      .fillColor('#111111')
      .text('Codigo de barras indisponivel', x, y + 18, { width, align: 'center' });
    return;
  }

  const png = await bwipjs.toBuffer({
    bcid: 'interleaved2of5',
    text: digits,
    scale: 3,
    height: 14,
    includetext: false,
    paddingwidth: 0,
    paddingheight: 0
  });

  doc.image(png, x, y, { width, height });
  doc
    .font('Courier')
    .fontSize(textFontSize)
    .fillColor('#111111')
    .text(digits, x, y + height + 5, {
      width,
      align: 'center',
      characterSpacing: 0.25
    })
    .font('Helvetica');
}

async function renderBoletoPage(doc, carne, boleto, yOffset = 0, renderScale = { scaleX: 1, scaleY: 1 }) {
  const left = 18;
  const top = yOffset + 18;
  const pageW = carnePageSize[0];
  const pageH = carnePageSize[1];
  const bottomY = yOffset + pageH;
  const receiptW = 178;
  const mainX = left + receiptW + 12;
  const mainW = pageW - mainX - 18;
  const bankName = boleto.bankName || env.boleto.bankName;
  const bankCode = boleto.bankCode || env.boleto.bankCode;
  const beneficiaryName = boleto.beneficiaryName || env.boleto.beneficiaryName;
  const beneficiaryDocument = boleto.beneficiaryDocument || env.boleto.beneficiaryDocument;
  const agencyCode = boleto.agencyCode || env.boleto.agencyCode;
  const linhaDigitavel = boleto.linhaDigitavel || 'Linha digitavel retornada pelo Banco Inter';
  const pixCode = boleto.pixCopiaECola || '';
  const payerName = boleto.customerName || carne.customerName;
  const payerDocument = boleto.document || carne.document;

  doc.rect(left, top, receiptW, pageH - 48).stroke('#8a8a8a');
  drawLogo(doc, left + 10, top + 8, 34);
  doc.fontSize(7).fillColor('#111111').text('Recibo do Pagador', left + 62, top + 20);

  const receiptY = top + 50;
  field(doc, 'Parcela/Plano', `${boleto.installmentNumber}/${carne.installments}`, left, receiptY, 62, 24);
  field(doc, 'Vencimento', boleto.dueDate, left + 62, receiptY, 58, 24);
  field(doc, 'Valor', formatCurrencyBRL(boleto.amount), left + 120, receiptY, 58, 24);
  field(doc, 'Agencia / Codigo do Beneficiario', agencyCode, left, receiptY + 24, receiptW, 22);
  field(doc, 'Nosso Numero', boleto.nossoNumero || boleto.seuNumero, left, receiptY + 46, receiptW, 22);
  field(doc, 'Numero Documento', boleto.seuNumero, left, receiptY + 68, 112, 22);
  field(doc, 'Especie Doc.', 'DM', left + 112, receiptY + 68, 66, 22);
  field(doc, '(=) Valor do Documento', formatCurrencyBRL(boleto.amount), left, receiptY + 90, receiptW, 22);
  field(doc, '(-) Desconto / Abatimento', '', left, receiptY + 112, receiptW, 22);
  field(doc, '(+) Mora / Multa', '', left, receiptY + 134, receiptW, 22);
  field(doc, '(=) Valor Cobrado', '', left, receiptY + 156, receiptW, 22);
  field(doc, 'Pagador', `${payerName}\n${payerDocument}`, left, receiptY + 182, receiptW, 34);
  field(doc, 'Beneficiario', `${beneficiaryName}\n${beneficiaryDocument}`, left, receiptY + 216, receiptW, 34);
  pixPaymentBox(doc, pixCode, left, receiptY + 250, receiptW, 44);

  doc.rect(mainX, top, mainW, pageH - 48).stroke('#8a8a8a');
  drawLogo(doc, mainX + 10, top + 8, 34);
  doc.fontSize(15).fillColor('#f15a24').text(bankName, mainX + 58, top + 13, { width: 98 });
  doc.fontSize(10).fillColor('#111111').text(bankCode, mainX + 158, top + 14, { width: 45 });
  doc
    .moveTo(mainX + 205, top + 8)
    .lineTo(mainX + 205, top + 42)
    .stroke('#111111');
  doc.fontSize(9).text(linhaDigitavel, mainX + 214, top + 15, { width: mainW - 222 });

  const rowY = top + 44;
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
    'Nao receber apos 30 dias do vencimento.\nApos o vencimento cobrar multa e juros conforme contrato.',
    mainX,
    rowY + 120,
    mainW - 150,
    54,
    { fontSize: 7 }
  );
  field(doc, '(-) Desconto / Abatimento', '', mainX + mainW - 150, rowY + 120, 150, 30);
  field(doc, '(-) Outras Deducoes', '', mainX + mainW - 150, rowY + 150, 150, 30);
  field(doc, '(+) Mora / Multa', '', mainX + mainW - 150, rowY + 180, 150, 24);

  field(
    doc,
    'Pagador',
    `${payerName}\nCPF/CNPJ: ${payerDocument}`,
    mainX,
    rowY + 184,
    mainW - 150,
    34
  );
  if (!pixCode) {
    field(doc, 'CPF/CNPJ', payerDocument, mainX + mainW - 150, rowY + 204, 150, 26);
  }

  let qrDrawWidth = 0;
  let qrX = mainX + mainW;

  if (pixCode) {
    const qrSize = 98;
    qrDrawWidth = qrSize * (renderScale.scaleY / renderScale.scaleX);
    qrX = mainX + mainW - qrDrawWidth - 8;
    pixPaymentBox(doc, pixCode, mainX, rowY + 218, qrX - mainX - 12, 26);
    const qr = await QRCode.toDataURL(pixCode, { margin: 1, width: 180 });
    doc.image(qr, qrX, rowY + 212, {
      width: qrDrawWidth,
      height: qrSize
    });
    doc.fontSize(7).fillColor('#111111').text('QR Code PIX', qrX, rowY + 310, {
      width: qrDrawWidth,
      align: 'center'
    });
  }

  const barcodeX = mainX + 10;
  const barcodeWidth = pixCode ? Math.min(620, qrX - barcodeX - 12) : 650;

  await drawBarcode(doc, boleto.codigoBarras, barcodeX, rowY + 246, {
    width: barcodeWidth,
    height: 58,
    textFontSize: 10.5
  });
  doc
    .fontSize(8)
    .fillColor('#111111')
    .text('Autenticacao Mecanica / FICHA DE COMPENSACAO', barcodeX, bottomY - 36, {
      width: barcodeWidth,
      align: 'right'
    });

  doc
    .moveTo(left, bottomY - 26)
    .lineTo(pageW - 18, bottomY - 26)
    .dash(3, { space: 3 })
    .stroke('#c9c9c9')
    .undash();
  doc.fontSize(7).fillColor('#777777').text('Corte na linha pontilhada', left, bottomY - 22, {
    lineBreak: false
  });
}

export async function generateCarnePdfBuffer(carne) {
  const doc = new PDFDocument({ margin: 0, size: a4PageSize });
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

  const doc = new PDFDocument({ margin: 0, size: a4PageSize });
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
