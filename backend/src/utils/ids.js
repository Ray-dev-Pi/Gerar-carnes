import crypto from 'crypto';

export function createCarneId(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CARNE-${stamp}-${suffix}`;
}

export function createIdempotencyHash(payload) {
  const stablePayload = JSON.stringify({
    customerName: payload.customerName.trim().toUpperCase(),
    document: payload.document,
    address: payload.address?.trim().toUpperCase(),
    addressNumber: payload.addressNumber?.trim().toUpperCase(),
    zipCode: payload.zipCode,
    totalAmount: Number(payload.totalAmount).toFixed(2),
    installments: payload.installments,
    firstDueDate: payload.firstDueDate
  });

  return crypto.createHash('sha256').update(stablePayload).digest('hex');
}
