import { Router } from 'express';
import { getConfigStatusHandler } from '../controllers/configController.js';

export const configRoutes = Router();

configRoutes.get('/status', getConfigStatusHandler);
