import { Router } from 'express';
import {
  createCustomerHandler,
  deleteCustomerHandler,
  listCustomersHandler,
  updateCustomerHandler
} from '../controllers/customerController.js';

export const customerRoutes = Router();

customerRoutes.get('/', listCustomersHandler);
customerRoutes.post('/', createCustomerHandler);
customerRoutes.patch('/:customerId', updateCustomerHandler);
customerRoutes.delete('/:customerId', deleteCustomerHandler);
