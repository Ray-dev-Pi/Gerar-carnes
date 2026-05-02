import { z } from 'zod';

const documentRegex = /^\d{11}$|^\d{14}$/;

export const createCarneSchema = z.object({
  customerName: z.string().trim().min(3, 'Informe o nome do cliente'),
  document: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => documentRegex.test(value), 'CPF/CNPJ deve ter 11 ou 14 digitos'),
  totalAmount: z.coerce.number().positive('Valor total deve ser maior que zero'),
  installments: z.coerce
    .number()
    .int()
    .min(1, 'Informe pelo menos 1 parcela')
    .max(60, 'Limite maximo de 60 parcelas'),
  firstDueDate: z.string().refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00`)), {
    message: 'Data inicial invalida'
  })
});
