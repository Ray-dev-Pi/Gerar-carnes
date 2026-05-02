import { Customer } from '../models/Customer.js';

export function formatCustomer(customer) {
  return {
    id: customer._id.toString(),
    name: customer.name,
    document: customer.document,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    addressNumber: customer.addressNumber,
    complement: customer.complement,
    neighborhood: customer.neighborhood,
    city: customer.city,
    state: customer.state,
    zipCode: customer.zipCode,
    notes: customer.notes,
    status: customer.status,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt
  };
}

export async function listCustomers({ search = '' } = {}) {
  const cleanSearch = search.trim();
  const filter = cleanSearch
    ? {
        $or: [
          { name: new RegExp(cleanSearch, 'i') },
          { document: cleanSearch.replace(/\D/g, '') }
        ]
      }
    : {};

  const customers = await Customer.find(filter).sort({ updatedAt: -1 }).limit(100);
  return customers.map(formatCustomer);
}

export async function upsertCustomerFromCarne(payload) {
  const customer = await Customer.findOneAndUpdate(
    { document: payload.document },
    {
      $set: {
        name: payload.customerName,
        email: payload.email || '',
        phone: payload.phone || '',
        address: payload.address,
        addressNumber: payload.addressNumber,
        complement: payload.complement || '',
        neighborhood: payload.neighborhood,
        city: payload.city,
        state: payload.state,
        zipCode: payload.zipCode,
        status: 'active'
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return customer;
}

export async function createCustomer(payload) {
  const customer = await Customer.findOneAndUpdate(
    { document: payload.document },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return formatCustomer(customer);
}

export async function updateCustomer(id, payload) {
  const customer = await Customer.findByIdAndUpdate(id, { $set: payload }, { new: true });
  return customer ? formatCustomer(customer) : null;
}

export async function deleteCustomer(id) {
  const customer = await Customer.findByIdAndDelete(id);
  return Boolean(customer);
}
