import { Router } from 'express';
import {
  createCarneHandler,
  downloadCarnePdfHandler,
  getCarneHandler,
  listCarnesHandler,
  syncCarneHandler
} from '../controllers/carneController.js';

export const carneRoutes = Router();

carneRoutes.post('/', createCarneHandler);
carneRoutes.get('/', listCarnesHandler);
carneRoutes.post('/:carneId/sync', syncCarneHandler);
carneRoutes.get('/:carneId', getCarneHandler);
carneRoutes.get('/:carneId/pdf', downloadCarnePdfHandler);
