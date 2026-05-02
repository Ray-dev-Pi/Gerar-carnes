import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer
} from '../services/customerService.js';
import { customerSchema, updateCustomerSchema } from '../validators/customerValidator.js';

export async function listCustomersHandler(req, res, next) {
  try {
    res.json({ customers: await listCustomers({ search: req.query.search || '' }) });
  } catch (error) {
    next(error);
  }
}

export async function createCustomerHandler(req, res, next) {
  try {
    const payload = customerSchema.parse(req.body);
    res.status(201).json(await createCustomer(payload));
  } catch (error) {
    next(error);
  }
}

export async function updateCustomerHandler(req, res, next) {
  try {
    const payload = updateCustomerSchema.parse(req.body);
    const customer = await updateCustomer(req.params.customerId, payload);

    if (!customer) {
      return res.status(404).json({ message: 'Cliente nao encontrado' });
    }

    return res.json(customer);
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomerHandler(req, res, next) {
  try {
    const deleted = await deleteCustomer(req.params.customerId);

    if (!deleted) {
      return res.status(404).json({ message: 'Cliente nao encontrado' });
    }

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
