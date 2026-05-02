import fs from 'fs';
import { createCarne, formatCarneResponse, getCarneById } from '../services/carneService.js';
import { createCarneSchema } from '../validators/carneValidator.js';

export async function createCarneHandler(req, res, next) {
  try {
    const payload = createCarneSchema.parse(req.body);
    const result = await createCarne(payload);
    res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCarneHandler(req, res, next) {
  try {
    const carne = await getCarneById(req.params.carneId);
    if (!carne) return res.status(404).json({ message: 'Carne nao encontrado' });
    return res.json(formatCarneResponse(carne));
  } catch (error) {
    next(error);
  }
}

export async function downloadCarnePdfHandler(req, res, next) {
  try {
    const carne = await getCarneById(req.params.carneId);
    if (!carne || !carne.pdfPath || !fs.existsSync(carne.pdfPath)) {
      return res.status(404).json({ message: 'PDF do carne nao encontrado' });
    }

    res.download(carne.pdfPath, `${carne.carneId}.pdf`);
  } catch (error) {
    next(error);
  }
}
