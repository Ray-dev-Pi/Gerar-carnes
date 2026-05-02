import { Router } from 'express';
import { downloadInterBoletoPdfHandler } from '../controllers/interController.js';

export const interRoutes = Router();

interRoutes.get('/boletos/:codigoSolicitacao/pdf', downloadInterBoletoPdfHandler);
