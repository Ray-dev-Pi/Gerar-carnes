import { createSessionToken, validateCredentials } from '../../backend/src/services/authService.js';

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { message: 'Metodo nao permitido' });
  }

  let body = req.body;

  if (!body || typeof body === 'string') {
    try {
      body = body ? JSON.parse(body) : {};
    } catch {
      return sendJson(res, 400, { message: 'JSON invalido' });
    }
  }

  const { username, password } = body || {};

  if (!validateCredentials({ username, password })) {
    return sendJson(res, 401, { message: 'Usuario ou senha invalidos' });
  }

  return sendJson(res, 200, {
    token: createSessionToken(username),
    user: { username }
  });
}
