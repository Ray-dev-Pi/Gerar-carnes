import PDFDocument from 'pdfkit';
import { createInterClient } from '../services/inter/index.js';
import { env } from '../config/env.js';

export async function testInterConnectionHandler(req, res, next) {
  try {
    const client = createInterClient();

    if (!['real', 'sandbox'].includes(env.inter.mode)) {
      return res.json({
        ok: true,
        mode: 'mock',
        message: 'Modo simulacao ativo. Configure INTER_MODE=real para testar o Banco Inter.'
      });
    }

    return res.json(await client.testConnection());
  } catch (error) {
    next(error);
  }
}

export async function downloadInterBoletoPdfHandler(req, res, next) {
  try {
    if (env.inter.mode === 'mock') {
      const doc = new PDFDocument({ margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${req.params.codigoSolicitacao}.pdf"`
      );
      doc.pipe(res);
      doc.fontSize(18).text('Boleto Simulado Banco Inter', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Codigo solicitacao: ${req.params.codigoSolicitacao}`);
      doc.text('Este arquivo existe apenas para desenvolvimento local.');
      doc.end();
      return;
    }

    const client = createInterClient();
    const pdf = await client.getBoletoPdf(req.params.codigoSolicitacao);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${req.params.codigoSolicitacao}.pdf"`
    );
    res.send(pdf);
  } catch (error) {
    next(error);
  }
}
