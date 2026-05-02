const API_BASE_URL =
  window.location.protocol === 'file:' ||
  ['127.0.0.1', 'localhost'].includes(window.location.hostname)
    ? 'http://localhost:3000/api'
    : '/api';

const converterForm = document.querySelector('#converterForm');
const convertButton = document.querySelector('#convertButton');
const message = document.querySelector('#message');
const resultTitle = document.querySelector('#resultTitle');
const pdfLink = document.querySelector('#pdfLink');

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

converterForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  convertButton.disabled = true;
  convertButton.textContent = 'Convertendo...';
  pdfLink.classList.add('hidden');
  setMessage('Lendo o boleto e montando o carnê...');

  try {
    const data = new FormData(converterForm);
    const response = await fetch(`${API_BASE_URL}/converter/boleto`, {
      method: 'POST',
      body: data
    });

    if (!response.ok) {
      const error = await readJsonResponse(response);
      throw new Error(error.message || 'Não foi possível converter o boleto.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    pdfLink.href = url;
    pdfLink.classList.remove('hidden');
    resultTitle.textContent = 'Carnê convertido';
    setMessage('Carnê gerado com sucesso. Abra o PDF para conferir impressão, Pix e código de barras.', 'success');
    window.open(url, '_blank', 'noreferrer');
  } catch (error) {
    resultTitle.textContent = 'Falha na conversão';
    setMessage(error.message, 'error');
  } finally {
    convertButton.disabled = false;
    convertButton.textContent = 'Converter para carnê';
  }
});
