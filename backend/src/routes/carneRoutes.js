import { Router } from 'express';
import {
  createCarneHandler,
  downloadCarnePdfHandler,
  getCarneHandler
} from '../controllers/carneController.js';

export const carneRoutes = Router();

carneRoutes.post('/', createCarneHandler);
carneRoutes.get('/:carneId', getCarneHandler);
carneRoutes.get('/:carneId/pdf', downloadCarnePdfHandler);
