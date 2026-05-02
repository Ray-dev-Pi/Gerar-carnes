import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { formatCurrencyBRL } from '../utils/money.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageDir = path.resolve(__dirname, '../../storage/carnes');

export async function generateCarnePdf(carne) {
  await fs.promises.mkdir(storageDir, { recursive: true });
  const pdfPath = path.join(storageDir, `${carne.carneId}.pdf`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  doc.fontSize(18).text(`Carne ${carne.carneId}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Cliente: ${carne.customerName}`);
  doc.text(`Documento: ${carne.document}`);
  doc.text(`Valor total: ${formatCurrencyBRL(carne.totalAmount)}`);
  doc.text(`Parcelas: ${carne.installments}`);
  doc.moveDown();

  for (const boleto of carne.boletos) {
    if (doc.y > 690) doc.addPage();

    doc
      .roundedRect(35, doc.y, 525, 135, 6)
      .strokeColor('#dddddd')
      .lineWidth(1)
      .stroke();

    const blockTop = doc.y + 12;
    doc.fontSize(12).fillColor('#111111').text(`Parcela ${boleto.installmentNumber}`, 50, blockTop);
    doc.fontSize(10).text(`Vencimento: ${boleto.dueDate}`, 50, blockTop + 22);
    doc.text(`Valor: ${formatCurrencyBRL(boleto.amount)}`, 50, blockTop + 40);
    doc.text(`Linha digitavel: ${boleto.linhaDigitavel || 'Aguardando banco'}`, 50, blockTop + 58, {
      width: 360
    });
    doc.text(`Codigo solicitacao: ${boleto.codigoSolicitacao || '-'}`, 50, blockTop + 92);

    if (boleto.pixCopiaECola) {
      const qr = await QRCode.toDataURL(boleto.pixCopiaECola, { margin: 1, width: 90 });
      doc.image(qr, 460, blockTop, { width: 80 });
      doc.fontSize(8).text('PIX', 487, blockTop + 84);
    }

    doc.moveDown(7);
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return pdfPath;
}
