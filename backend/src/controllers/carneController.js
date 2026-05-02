import fs from 'fs';
import multer from 'multer';
import {
  createCarne,
  formatCarneResponse,
  getCarneById,
  listCarnes,
  syncCarneWithBank
} from '../services/carneService.js';
import { convertUploadedBoletoToCarne } from '../services/uploadedBoletoService.js';
import { createCarneSchema } from '../validators/carneValidator.js';

export const uploadBoletoMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1
  },
  fileFilter(req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Envie um arquivo PDF de boleto'));
      return;
    }

    cb(null, true);
  }
}).single('boleto');

export async function createCarneHandler(req, res, next) {
  try {
    const payload = createCarneSchema.parse(req.body);
    const result = await createCarne(payload);
    res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listCarnesHandler(req, res, next) {
  try {
    const carnes = await listCarnes({ customerId: req.query.customerId || '' });
    res.json({ carnes });
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

export async function syncCarneHandler(req, res, next) {
  try {
    const carne = await syncCarneWithBank(req.params.carneId);

    if (!carne) {
      return res.status(404).json({ message: 'Carne nao encontrado' });
    }

    return res.json(carne);
  } catch (error) {
    next(error);
  }
}

export async function uploadBoletoCarneHandler(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Envie um arquivo PDF no campo boleto' });
    }

    const { carne, pdf } = await convertUploadedBoletoToCarne({
      fileBuffer: req.file.buffer,
      fields: req.body || {}
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${carne.carneId}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
}

export async function downloadCarnePdfHandler(req, res, next) {
  try {
    const carne = await getCarneById(req.params.carneId);
    if (!carne) {
      return res.status(404).json({ message: 'Carne nao encontrado' });
    }

    if (carne.pdfBase64) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${carne.carneId}.pdf"`);
      return res.send(Buffer.from(carne.pdfBase64, 'base64'));
    }

    if (!carne.pdfPath || !fs.existsSync(carne.pdfPath)) {
      return res.status(404).json({ message: 'PDF do carne nao encontrado' });
    }

    res.download(carne.pdfPath, `${carne.carneId}.pdf`);
  } catch (error) {
    next(error);
  }
}
