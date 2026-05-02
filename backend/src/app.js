import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { authRoutes } from './routes/authRoutes.js';
import { carneRoutes } from './routes/carneRoutes.js';
import { configRoutes } from './routes/configRoutes.js';
import { interRoutes } from './routes/interRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requireAuth } from './middlewares/authMiddleware.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.frontendOrigin === '*' ? true : env.frontendOrigin
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: env.inter.mode });
});

app.use('/api/auth', authRoutes);
app.use('/api/config', requireAuth, configRoutes);
app.use('/api/carnes', requireAuth, carneRoutes);
app.use('/api/inter', requireAuth, interRoutes);
app.use(errorHandler);
