import { app } from '../backend/src/app.js';
import { connectDatabase } from '../backend/src/config/database.js';

let databasePromise;

export default async function handler(req, res) {
  try {
    if (req.url === '/api/index.js') {
      req.url = req.headers['x-original-url'] || '/api/health';
    }

    const needsDatabase =
      req.url?.startsWith('/api/carnes') || req.url?.startsWith('/api/inter');

    if (needsDatabase) {
      databasePromise ||= connectDatabase();
      await databasePromise;
    }

    return app(req, res);
  } catch (error) {
    console.error('Erro na function /api:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        message: error.message || 'Erro interno na Function da Vercel',
        code: 'FUNCTION_ERROR'
      })
    );
  }
}
