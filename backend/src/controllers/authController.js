import { createSessionToken, validateCredentials } from '../services/authService.js';

export function loginHandler(req, res) {
  const { username, password } = req.body || {};

  if (!validateCredentials({ username, password })) {
    return res.status(401).json({ message: 'Usuario ou senha invalidos' });
  }

  return res.json({
    token: createSessionToken(username),
    user: { username }
  });
}

export function meHandler(req, res) {
  return res.json({ user: { username: req.session.sub } });
}
