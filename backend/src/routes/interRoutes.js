import { Router } from 'express';
import {
  downloadInterBoletoPdfHandler,
  testInterConnectionHandler
} from '../controllers/interController.js';

export const interRoutes = Router();

interRoutes.get('/status', testInterConnectionHandler);
interRoutes.get('/boletos/:codigoSolicitacao/pdf', downloadInterBoletoPdfHandler);
