const API_BASE_URL =
  window.location.protocol === 'file:' ||
  ['127.0.0.1', 'localhost'].includes(window.location.hostname)
    ? 'http://localhost:3000/api'
    : '/api';

const form = document.querySelector('#carneForm');
const uploadBoletoForm = document.querySelector('#uploadBoletoForm');
const appShell = document.querySelector('#appShell');
const loginView = document.querySelector('#loginView');
const loginForm = document.querySelector('#loginForm');
const loginButton = document.querySelector('#loginButton');
const loginMessage = document.querySelector('#loginMessage');
const logoutButton = document.querySelector('#logoutButton');
const submitButton = document.querySelector('#submitButton');
const uploadBoletoButton = document.querySelector('#uploadBoletoButton');
const saveCustomerButton = document.querySelector('#saveCustomerButton');
const clearCustomerButton = document.querySelector('#clearCustomerButton');
const refreshCustomersButton = document.querySelector('#refreshCustomersButton');
const refreshCarnesButton = document.querySelector('#refreshCarnesButton');
const message = document.querySelector('#message');
const boletosEl = document.querySelector('#boletos');
const resultTitle = document.querySelector('#resultTitle');
const pdfLink = document.querySelector('#pdfLink');
const firstDueDate = document.querySelector('#firstDueDate');
const configStatus = document.querySelector('#configStatus');
const customerSelect = document.querySelector('#customerSelect');
const customerId = document.querySelector('#customerId');
const customersMessage = document.querySelector('#customersMessage');
const customersList = document.querySelector('#customersList');
const carnesList = document.querySelector('#carnesList');

let customers = [];
let carnes = [];
let interReadyForProduction = false;

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
  appShell.inert = !isLoggedIn;
  appShell.setAttribute('aria-hidden', String(!isLoggedIn));
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

function setCustomersMessage(text, type = 'info') {
  customersMessage.textContent = text;
  customersMessage.classList.toggle('error', type === 'error');
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
    interReadyForProduction = Boolean(status.realInterReady);
    if (status.mongoLooksLocal) {
      configStatus.textContent =
        `MongoDB local configurado (${status.mongodbUriSource}). Na Vercel use MONGODB_URI do MongoDB Atlas. Valor atual: ${status.mongodbUriPreview}`;
      configStatus.classList.add('warning');
      return;
    }

    configStatus.textContent = isMock
      ? 'Banco Inter real nao configurado. Defina INTER_MODE=real e as credenciais da API.'
      : status.realInterReady
        ? `Banco Inter ${status.interMode} ativo: ${status.bankName}.`
        : `Banco Inter selecionado, mas faltam: ${(status.missingInterConfig || []).join(', ')}.`;
    configStatus.classList.toggle('warning', isMock || !status.realInterReady);
    submitButton.disabled = !status.realInterReady;
    submitButton.title = status.realInterReady
      ? ''
      : 'Configure o Banco Inter real antes de gerar carnes em producao.';
  } catch (error) {
    interReadyForProduction = false;
    submitButton.disabled = true;
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
    customerId: data.get('customerId') || undefined,
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

function getCustomerPayload() {
  const payload = getPayload();

  return {
    name: payload.customerName,
    email: payload.email,
    phone: payload.phone,
    document: payload.document,
    address: payload.address,
    addressNumber: payload.addressNumber,
    complement: payload.complement,
    neighborhood: payload.neighborhood,
    city: payload.city,
    state: payload.state,
    zipCode: payload.zipCode
  };
}

function fillCustomerForm(customer) {
  customerId.value = customer?.id || '';
  form.customerName.value = customer?.name || '';
  form.document.value = customer?.document || '';
  form.email.value = customer?.email || '';
  form.phone.value = customer?.phone || '';
  form.address.value = customer?.address || '';
  form.addressNumber.value = customer?.addressNumber || '';
  form.complement.value = customer?.complement || '';
  form.neighborhood.value = customer?.neighborhood || '';
  form.city.value = customer?.city || '';
  form.state.value = customer?.state || '';
  form.zipCode.value = customer?.zipCode || '';
  customerSelect.value = customer?.id || '';
  renderCustomers();
}

function renderCustomerOptions() {
  const currentValue = customerSelect.value;
  customerSelect.innerHTML = '<option value="">Novo cliente</option>';

  for (const customer of customers) {
    const option = document.createElement('option');
    option.value = customer.id;
    option.textContent = `${customer.name} - ${customer.document}`;
    customerSelect.appendChild(option);
  }

  customerSelect.value = customers.some((customer) => customer.id === currentValue)
    ? currentValue
    : customerId.value;
}

function renderCustomers() {
  customersList.innerHTML = '';
  renderCustomerOptions();

  if (!customers.length) {
    setCustomersMessage('Nenhum cliente cadastrado ainda.');
    return;
  }

  setCustomersMessage(`${customers.length} cliente(s) no cadastro.`);

  for (const customer of customers) {
    const card = document.createElement('article');
    card.className = `customer-card${customer.id === customerId.value ? ' active' : ''}`;
    card.innerHTML = `
      <p class="customer-name">${escapeHtml(customer.name)}</p>
      <p class="customer-meta">${escapeHtml(customer.document)} - ${escapeHtml(customer.city)}/${escapeHtml(customer.state)}</p>
      <p class="customer-meta">${escapeHtml(customer.email || customer.phone || 'Sem contato informado')}</p>
      <div class="customer-actions">
        <button type="button" data-action="select" data-id="${customer.id}">Usar</button>
        <button type="button" class="danger-button" data-action="delete" data-id="${customer.id}">Excluir</button>
      </div>
    `;
    customersList.appendChild(card);
  }
}

async function loadCustomers() {
  if (!getToken()) return;

  try {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const result = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(result.message || 'Nao foi possivel carregar clientes');
    }

    customers = result.customers || [];
    renderCustomers();
  } catch (error) {
    setCustomersMessage(friendlyNetworkError(error), 'error');
  }
}

function renderCarnes() {
  carnesList.innerHTML = '';

  if (!carnes.length) {
    carnesList.innerHTML = '<div class="message compact">Nenhum carne gerado ainda.</div>';
    return;
  }

  for (const carne of carnes) {
    const card = document.createElement('article');
    card.className = 'carne-card';
    card.innerHTML = `
      <p class="customer-name">${escapeHtml(carne.carneId)}</p>
      <p class="customer-meta">${escapeHtml(carne.customerName)} - ${formatCurrency(carne.totalAmount)} - ${carne.installments} parcela(s)</p>
      <p class="customer-meta">Status: ${escapeHtml(carne.status)}</p>
      <div class="carne-actions">
        ${carne.pdfUrl ? `<a href="${withToken(carne.pdfUrl)}" target="_blank" rel="noreferrer">Abrir carne</a>` : ''}
        <button type="button" data-action="sync-carne" data-id="${escapeHtml(carne.carneId)}">Sincronizar Inter</button>
      </div>
    `;
    carnesList.appendChild(card);
  }
}

async function loadCarnes() {
  if (!getToken()) return;

  try {
    const response = await fetch(`${API_BASE_URL}/carnes`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const result = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(result.message || 'Nao foi possivel carregar carnes');
    }

    carnes = result.carnes || [];
    renderCarnes();
  } catch (error) {
    carnesList.innerHTML = `<div class="message compact error">${escapeHtml(friendlyNetworkError(error))}</div>`;
  }
}

function renderBoletos(result) {
  resultTitle.textContent = `Carne ${result.carneId}`;
  boletosEl.innerHTML = '';

  if (result.pdfUrl) {
    pdfLink.href = withToken(result.pdfUrl);
    pdfLink.textContent = 'Baixar carne';
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
        ${boleto.bankPdfUrl ? `<a href="${withToken(boleto.bankPdfUrl)}" target="_blank" rel="noreferrer">PDF oficial Inter</a>` : ''}
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
    loadCustomers();
    loadCarnes();
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
  customers = [];
  carnes = [];
  renderCustomers();
  renderCarnes();
});

refreshCustomersButton.addEventListener('click', loadCustomers);
refreshCarnesButton.addEventListener('click', loadCarnes);

carnesList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="sync-carne"]');
  if (!button) return;

  button.disabled = true;
  button.textContent = 'Sincronizando...';

  try {
    const response = await fetch(`${API_BASE_URL}/carnes/${button.dataset.id}/sync`, {
      method: 'POST',
      headers: authHeaders()
    });
    const result = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(result.message || 'Nao foi possivel sincronizar com o Inter');
    }

    renderBoletos(result);
    await loadCarnes();
    setMessage('Dados atualizados a partir do Banco Inter.');
  } catch (error) {
    setMessage(friendlyNetworkError(error), 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Sincronizar Inter';
  }
});

customerSelect.addEventListener('change', () => {
  const selected = customers.find((customer) => customer.id === customerSelect.value);
  fillCustomerForm(selected || null);
});

clearCustomerButton.addEventListener('click', () => {
  fillCustomerForm(null);
});

customersList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const selected = customers.find((customer) => customer.id === button.dataset.id);
  if (!selected) return;

  if (button.dataset.action === 'select') {
    fillCustomerForm(selected);
    return;
  }

  if (button.dataset.action === 'delete') {
    const response = await fetch(`${API_BASE_URL}/customers/${selected.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (!response.ok) {
      const result = await readJsonResponse(response);
      setCustomersMessage(result.message || 'Nao foi possivel excluir cliente', 'error');
      return;
    }

    if (customerId.value === selected.id) {
      fillCustomerForm(null);
    }

    await loadCustomers();
  }
});

saveCustomerButton.addEventListener('click', async () => {
  saveCustomerButton.disabled = true;
  saveCustomerButton.textContent = 'Salvando...';

  try {
    const payload = getCustomerPayload();
    const editingId = customerId.value;
    const response = await fetch(
      editingId ? `${API_BASE_URL}/customers/${editingId}` : `${API_BASE_URL}/customers`,
      {
        method: editingId ? 'PATCH' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      }
    );
    const result = await readJsonResponse(response);

    if (!response.ok) {
      const details = result.issues?.map((issue) => issue.message).join(', ');
      throw new Error(details || result.message || 'Falha ao salvar cliente');
    }

    await loadCustomers();
    fillCustomerForm(result);
    setCustomersMessage('Cliente salvo.');
  } catch (error) {
    setCustomersMessage(friendlyNetworkError(error), 'error');
  } finally {
    saveCustomerButton.disabled = false;
    saveCustomerButton.textContent = 'Salvar cliente';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!interReadyForProduction) {
    setMessage('Configure e valide o Banco Inter real antes de gerar carnes.', 'error');
    return;
  }

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
    loadCustomers();
    loadCarnes();
  } catch (error) {
    setMessage(friendlyNetworkError(error), 'error');
    resultTitle.textContent = 'Falha ao gerar carne';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Gerar Carne';
  }
});

uploadBoletoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  uploadBoletoButton.disabled = true;
  uploadBoletoButton.textContent = 'Convertendo...';
  setMessage('Convertendo boleto enviado para formato de carne...');

  try {
    const data = new FormData(uploadBoletoForm);
    const customerPayload = getPayload();

    data.append('customerName', customerPayload.customerName || '');
    data.append('document', customerPayload.document || '');
    data.append('beneficiaryName', '');

    const response = await fetch(`${API_BASE_URL}/carnes/upload-boleto`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: data
    });

    if (!response.ok) {
      const error = await readJsonResponse(response);
      throw new Error(error.message || 'Nao foi possivel converter o boleto');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    pdfLink.href = url;
    pdfLink.textContent = 'Abrir carne convertido';
    pdfLink.classList.remove('hidden');
    resultTitle.textContent = 'Boleto convertido';
    setMessage('Boleto convertido para formato de carne.');
    window.open(url, '_blank', 'noreferrer');
  } catch (error) {
    setMessage(friendlyNetworkError(error), 'error');
  } finally {
    uploadBoletoButton.disabled = false;
    uploadBoletoButton.textContent = 'Converter boleto';
  }
});

setLoggedIn(Boolean(getToken()));
loadConfigStatus();
loadCustomers();
loadCarnes();
