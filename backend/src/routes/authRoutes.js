import { Router } from 'express';
import { loginHandler, meHandler } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

export const authRoutes = Router();

authRoutes.post('/login', loginHandler);
authRoutes.get('/me', requireAuth, meHandler);
