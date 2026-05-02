import { app } from '../backend/src/app.js';
import { connectDatabase } from '../backend/src/config/database.js';

let databasePromise;

export default async function handler(req, res) {
  databasePromise ||= connectDatabase();
  await databasePromise;
  return app(req, res);
}
