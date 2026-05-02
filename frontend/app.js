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

function friendlyNetworkError(error) {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return `Nao consegui conectar em ${API_BASE_URL}. Se voce abriu o HTML localmente, rode o backend em localhost:3000. Se esta na Vercel, confirme que o deploy mais recente contem a pasta api/ e teste /api/health.`;
  }

  return error.message;
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

    const isMock = !['real', 'sandbox'].includes(status.interMode);
    if (status.mongoLooksLocal) {
      configStatus.textContent =
        `MongoDB local configurado (${status.mongodbUriSource}). Na Vercel use MONGODB_URI do MongoDB Atlas. Valor atual: ${status.mongodbUriPreview}`;
      configStatus.classList.add('warning');
      return;
    }

    configStatus.textContent = isMock
      ? 'Modo simulacao ativo: nao registra boletos reais no Banco Inter.'
      : status.realInterReady
        ? `Banco Inter ${status.interMode} ativo: ${status.bankName}.`
        : 'Banco Inter selecionado, mas credenciais/certificado nao estao completos.';
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

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getPayload() {
  const data = new FormData(form);

  return {
    customerName: data.get('customerName'),
    email: data.get('email'),
    phone: data.get('phone'),
    document: data.get('document'),
    address: data.get('address'),
    addressNumber: data.get('addressNumber'),
    complement: data.get('complement'),
    neighborhood: data.get('neighborhood'),
    city: data.get('city'),
    state: data.get('state'),
    zipCode: data.get('zipCode'),
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
    const pixCode = boleto.pixCopiaECola || '';
    item.innerHTML = `
      <div class="boleto-top">
        <div>
          <p class="boleto-title">Parcela ${boleto.installmentNumber}</p>
          <span>Vencimento: ${boleto.dueDate}</span>
        </div>
        <div class="boleto-amount">${formatCurrency(boleto.amount)}</div>
      </div>
      <div class="line">${boleto.linhaDigitavel || 'Linha digitavel indisponivel'}</div>
      ${
        pixCode
          ? `<div class="pix-box">
              <span>Pix copia e cola</span>
              <div class="line">${escapeHtml(pixCode)}</div>
              <button class="copy-pix" type="button" data-pix="${escapeHtml(pixCode)}">Copiar Pix</button>
            </div>`
          : ''
      }
      <div class="actions">
        ${boleto.bankPdfUrl ? `<a href="${withToken(boleto.bankPdfUrl)}" target="_blank" rel="noreferrer">Visualizar boleto</a>` : ''}
      </div>
    `;
    boletosEl.appendChild(item);
  }
}

boletosEl.addEventListener('click', async (event) => {
  const button = event.target.closest('.copy-pix');
  if (!button) return;

  try {
    await navigator.clipboard.writeText(button.dataset.pix);
    button.textContent = 'Pix copiado';
    setTimeout(() => {
      button.textContent = 'Copiar Pix';
    }, 1600);
  } catch {
    setMessage('Nao foi possivel copiar automaticamente. Selecione o codigo Pix manualmente.', 'error');
  }
});

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
    loginMessage.textContent = friendlyNetworkError(error);
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
    setMessage(friendlyNetworkError(error), 'error');
    resultTitle.textContent = 'Falha ao gerar carne';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Gerar Carne';
  }
});

setLoggedIn(Boolean(getToken()));
loadConfigStatus();
