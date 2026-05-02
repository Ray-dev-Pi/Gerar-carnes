import { verifySessionToken } from '../services/authService.js';

export function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const token = bearerToken || req.query.token;
  const session = verifySessionToken(token);

  if (!session) {
    return res.status(401).json({ message: 'Autenticacao obrigatoria' });
  }

  req.session = session;
  return next();
}
