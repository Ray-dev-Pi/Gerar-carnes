const API_BASE_URL =
  window.location.protocol === 'file:' ? 'http://localhost:3000/api' : '/api';

const form = document.querySelector('#carneForm');
const loginView = document.querySelector('#loginView');
const loginForm = document.querySelector('#loginForm');
const loginButton = document.querySelector('#loginButton');
const loginMessage = document.querySelector('#loginMessage');
const logoutButton = document.querySelector('#logoutButton');
const submitButton = document.querySelector('#submitButton');
const message = document.querySelector('#message');
const boletosEl = document.querySelector('#boletos');
const resultTitle = document.querySelector('#resultTitle');
const pdfLink = document.querySelector('#pdfLink');
const firstDueDate = document.querySelector('#firstDueDate');
const configStatus = document.querySelector('#configStatus');

firstDueDate.value = new Date().toISOString().slice(0, 10);

function getToken() {
  return sessionStorage.getItem('authToken');
}

function setToken(token) {
  sessionStorage.setItem('authToken', token);
}

function clearToken() {
  sessionStorage.removeItem('authToken');
}

function setLoggedIn(isLoggedIn) {
  loginView.classList.toggle('hidden', isLoggedIn);
  document.body.classList.toggle('locked', !isLoggedIn);
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`
  };
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      message:
        cleanText ||
        'A Vercel retornou uma resposta inesperada. Veja os logs da Function no painel da Vercel.'
    };
  }
}

function withToken(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(getToken())}`;
}

function setMessage(text, type = 'info') {
  message.textContent = text;
  message.classList.toggle('error', type === 'error');
}

async function loadConfigStatus() {
  if (!getToken()) return;

  try {
    const response = await fetch(`${API_BASE_URL}/config/status`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const status = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(status.message || 'Nao foi possivel carregar configuracao');
    }

    const isMock = status.interMode !== 'real';
    configStatus.textContent = isMock
      ? 'Modo simulacao ativo: nao registra boletos reais no Banco Inter.'
      : status.realInterReady
        ? `Banco Inter real ativo: ${status.bankName}.`
        : 'Banco Inter real selecionado, mas credenciais/certificado nao estao completos.';
    configStatus.classList.toggle('warning', isMock || !status.realInterReady);
  } catch (error) {
    configStatus.textContent = error.message;
    configStatus.classList.add('warning');
  }
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
    pdfLink.href = withToken(result.pdfUrl);
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
        ${boleto.bankPdfUrl ? `<a href="${withToken(boleto.bankPdfUrl)}" target="_blank" rel="noreferrer">Visualizar boleto</a>` : ''}
        ${boleto.pixCopiaECola ? '<span>PIX disponivel no PDF do carne</span>' : ''}
      </div>
    `;
    boletosEl.appendChild(item);
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginButton.disabled = true;
  loginButton.textContent = 'Entrando...';
  loginMessage.classList.add('hidden');

  const data = new FormData(loginForm);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: data.get('username'),
        password: data.get('password')
      })
    });
    const result = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(result.message || 'Falha ao autenticar');
    }

    setToken(result.token);
    setLoggedIn(true);
    loadConfigStatus();
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.classList.remove('hidden');
    loginMessage.classList.add('error');
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Entrar';
  }
});

logoutButton.addEventListener('click', () => {
  clearToken();
  setLoggedIn(false);
});

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
      headers: authHeaders(),
      body: JSON.stringify(getPayload())
    });

    const result = await readJsonResponse(response);

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

setLoggedIn(Boolean(getToken()));
loadConfigStatus();
