import { app } from '../backend/src/app.js';
import { connectDatabase } from '../backend/src/config/database.js';

let databasePromise;

export default async function handler(req, res) {
  const needsDatabase = !req.url?.startsWith('/api/auth') && !req.url?.startsWith('/api/health');

  if (needsDatabase) {
    databasePromise ||= connectDatabase();
    await databasePromise;
  }

  return app(req, res);
}
