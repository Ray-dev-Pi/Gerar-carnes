import Busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    res.end(JSON.stringify({ message: 'Metodo nao permitido' }));
    return;
  }

  try {
    const { fileBuffers, fields } = await readMultipart(req);

    if (!fileBuffers.length) {
      sendJson(res, 400, { message: 'Envie pelo menos um boleto em PDF no campo boleto' });
      return;
    }

    const { convertUploadedBoletosToCarnePdfs } = await import(
      '../../backend/src/services/uploadedBoletoService.js'
    );
    const { files } = await convertUploadedBoletosToCarnePdfs({ fileBuffers, fields });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        files: files.map((file) => ({
          filename: file.filename,
          pdfBase64: file.pdf.toString('base64')
        }))
      })
    );
  } catch (error) {
    console.error('Erro no conversor de boleto:', error);
    sendJson(res, error.statusCode || 500, {
      message: error.message || 'Nao foi possivel converter o boleto'
    });
  }
}

function readMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const fileBuffers = [];

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 12,
        fileSize: 8 * 1024 * 1024
      }
    });

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (name, file, info) => {
      if (name !== 'boleto') {
        file.resume();
        return;
      }

      if (info.mimeType !== 'application/pdf') {
        file.resume();
        reject(new Error('Envie um boleto em PDF'));
        return;
      }

      const chunks = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('limit', () => reject(new Error('PDF muito grande. Envie arquivo de ate 8MB.')));
      file.on('end', () => {
        fileBuffers.push(Buffer.concat(chunks));
      });
    });

    busboy.on('filesLimit', () => reject(new Error('Envie no maximo 12 arquivos PDF.')));
    busboy.on('error', reject);
    busboy.on('finish', () => resolve({ fileBuffers, fields }));
    req.pipe(busboy);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}
