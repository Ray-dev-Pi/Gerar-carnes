import { Router } from 'express';
import {
  convertBoletoHandler,
  uploadConverterMiddleware
} from '../controllers/converterController.js';

export const converterRoutes = Router();

converterRoutes.post('/boleto', uploadConverterMiddleware, convertBoletoHandler);
