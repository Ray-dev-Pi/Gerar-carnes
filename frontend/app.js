const API_BASE_URL =
  window.location.protocol === 'file:' ? 'http://localhost:3000/api' : '/api';

const form = document.querySelector('#carneForm');
const submitButton = document.querySelector('#submitButton');
const message = document.querySelector('#message');
const boletosEl = document.querySelector('#boletos');
const resultTitle = document.querySelector('#resultTitle');
const pdfLink = document.querySelector('#pdfLink');
const firstDueDate = document.querySelector('#firstDueDate');

firstDueDate.value = new Date().toISOString().slice(0, 10);

function setMessage(text, type = 'info') {
  message.textContent = text;
  message.classList.toggle('error', type === 'error');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function getPayload() {
  const data = new FormData(form);

  return {
    customerName: data.get('customerName'),
    document: data.get('document'),
    totalAmount: Number(data.get('totalAmount')),
    installments: Number(data.get('installments')),
    firstDueDate: data.get('firstDueDate')
  };
}

function renderBoletos(result) {
  resultTitle.textContent = `Carne ${result.carneId}`;
  boletosEl.innerHTML = '';

  if (result.pdfUrl) {
    pdfLink.href = result.pdfUrl;
    pdfLink.classList.remove('hidden');
  }

  for (const boleto of result.boletos) {
    const item = document.createElement('article');
    item.className = 'boleto';
    item.innerHTML = `
      <div class="boleto-top">
        <div>
          <p class="boleto-title">Parcela ${boleto.installmentNumber}</p>
          <span>Vencimento: ${boleto.dueDate}</span>
        </div>
        <div class="boleto-amount">${formatCurrency(boleto.amount)}</div>
      </div>
      <div class="line">${boleto.linhaDigitavel || 'Linha digitavel indisponivel'}</div>
      <div class="actions">
        ${boleto.bankPdfUrl ? `<a href="${boleto.bankPdfUrl}" target="_blank" rel="noreferrer">Visualizar boleto</a>` : ''}
        ${boleto.pixCopiaECola ? '<span>PIX disponivel no PDF do carne</span>' : ''}
      </div>
    `;
    boletosEl.appendChild(item);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = 'Gerando...';
  pdfLink.classList.add('hidden');
  boletosEl.innerHTML = '';
  setMessage('Criando parcelas e registrando boletos...');

  try {
    const response = await fetch(`${API_BASE_URL}/carnes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getPayload())
    });

    const result = await response.json();

    if (!response.ok) {
      const details = result.issues?.map((issue) => issue.message).join(', ');
      throw new Error(details || result.message || 'Falha ao gerar carne');
    }

    setMessage(result.reused ? 'Carne ja existia; exibindo registro existente.' : 'Carne gerado com sucesso.');
    renderBoletos(result);
  } catch (error) {
    setMessage(error.message, 'error');
    resultTitle.textContent = 'Falha ao gerar carne';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Gerar Carne';
  }
});
