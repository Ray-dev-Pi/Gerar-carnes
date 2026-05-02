import multer from 'multer';
import { convertUploadedBoletoToCarne } from '../services/uploadedBoletoService.js';

export const uploadConverterMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1
  },
  fileFilter(req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Envie um boleto em PDF'));
      return;
    }

    cb(null, true);
  }
}).single('boleto');

export async function convertBoletoHandler(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Envie um boleto em PDF no campo boleto' });
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
