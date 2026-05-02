import { createInterClient } from '../services/inter/index.js';

export async function testInterConnectionHandler(req, res, next) {
  try {
    const client = createInterClient();

    return res.json(await client.testConnection());
  } catch (error) {
    next(error);
  }
}

export async function downloadInterBoletoPdfHandler(req, res, next) {
  try {
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
