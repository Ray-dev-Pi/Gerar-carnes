import { Router } from 'express';
import {
  createCarneHandler,
  downloadCarnePdfHandler,
  getCarneHandler,
  listCarnesHandler
} from '../controllers/carneController.js';

export const carneRoutes = Router();

carneRoutes.post('/', createCarneHandler);
carneRoutes.get('/', listCarnesHandler);
carneRoutes.get('/:carneId', getCarneHandler);
carneRoutes.get('/:carneId/pdf', downloadCarnePdfHandler);
