const API_BASE_URL =
  window.location.protocol === 'file:' ||
  ['127.0.0.1', 'localhost'].includes(window.location.hostname)
    ? 'http://localhost:3000/api'
    : '/api';

const converterForm = document.querySelector('#converterForm');
const convertButton = document.querySelector('#convertButton');
const message = document.querySelector('#message');
const resultTitle = document.querySelector('#resultTitle');
const pdfLinks = document.querySelector('#pdfLinks');
const boletoFile = document.querySelector('#boletoFile');

const MAX_FILES = 12;

function setMessage(text, type = 'info') {
  message.textContent = text;
  message.classList.toggle('error', type === 'error');
  message.classList.toggle('success', type === 'success');
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() };
  }
}

function clearPdfLinks() {
  pdfLinks.innerHTML = '';
  pdfLinks.classList.add('hidden');
}

function base64ToBlob(base64, type = 'application/pdf') {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type });
}

function createPdfLinks(files) {
  clearPdfLinks();

  files.forEach((file, index) => {
    const blob = base64ToBlob(file.pdfBase64);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = file.filename || `carne-${index + 1}.pdf`;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.className = 'pdf-link';
    link.textContent = `Baixar carne ${index + 1}`;
    pdfLinks.appendChild(link);
  });

  pdfLinks.classList.remove('hidden');
}

converterForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const selectedFiles = Array.from(boletoFile.files || []);

  if (selectedFiles.length > MAX_FILES) {
    resultTitle.textContent = 'Limite excedido';
    setMessage('Envie no maximo 12 arquivos PDF por conversao.', 'error');
    return;
  }

  convertButton.disabled = true;
  convertButton.textContent = 'Convertendo...';
  clearPdfLinks();
  setMessage('Lendo os boletos, procurando QR Code Pix e montando os carnes...');

  try {
    const data = new FormData(converterForm);
    const response = await fetch(`${API_BASE_URL}/converter/boleto`, {
      method: 'POST',
      body: data
    });

    if (!response.ok) {
      const error = await readJsonResponse(response);
      throw new Error(
        error.message ||
          'Nao foi possivel converter os boletos. Tente novamente ou envie PDFs com texto selecionavel.'
      );
    }

    const { files = [] } = await response.json();

    if (!files.length) {
      throw new Error('Nenhum PDF foi retornado pela conversao.');
    }

    createPdfLinks(files);
    resultTitle.textContent = files.length === 1 ? 'Carne convertido' : 'Carnes convertidos';
    setMessage(
      `${files.length} download${files.length > 1 ? 's' : ''} gerado${files.length > 1 ? 's' : ''} com ate 4 boletos por PDF.`,
      'success'
    );
  } catch (error) {
    resultTitle.textContent = 'Falha na conversao';
    setMessage(error.message, 'error');
  } finally {
    convertButton.disabled = false;
    convertButton.textContent = 'Converter para carnes';
  }
});
