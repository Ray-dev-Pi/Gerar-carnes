import multer from 'multer';
import { convertUploadedBoletosToCarnePdfs } from '../services/uploadedBoletoService.js';

export const uploadConverterMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 12
  },
  fileFilter(req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Envie um boleto em PDF'));
      return;
    }

    cb(null, true);
  }
}).array('boleto', 12);

export async function convertBoletoHandler(req, res, next) {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ message: 'Envie pelo menos um boleto em PDF no campo boleto' });
    }

    const { files } = await convertUploadedBoletosToCarnePdfs({
      fileBuffers: req.files.map((file) => file.buffer),
      fields: req.body || {}
    });

    res.json({
      files: files.map((file) => ({
        filename: file.filename,
        pdfBase64: file.pdf.toString('base64')
      }))
    });
  } catch (error) {
    next(error);
  }
}
