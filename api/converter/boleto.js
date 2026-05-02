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
    const { fileBuffer, fields } = await readMultipart(req);

    if (!fileBuffer) {
      sendJson(res, 400, { message: 'Envie um boleto em PDF no campo boleto' });
      return;
    }

    const { convertUploadedBoletoToCarne } = await import(
      '../../backend/src/services/uploadedBoletoService.js'
    );
    const { carne, pdf } = await convertUploadedBoletoToCarne({ fileBuffer, fields });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${carne.carneId}.pdf"`);
    res.end(pdf);
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
    let fileBuffer = null;

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
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
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on('error', reject);
    busboy.on('finish', () => resolve({ fileBuffer, fields }));
    req.pipe(busboy);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}
