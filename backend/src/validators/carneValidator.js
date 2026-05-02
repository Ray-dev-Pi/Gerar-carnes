import { z } from 'zod';

const documentRegex = /^\d{11}$|^\d{14}$/;

export const createCarneSchema = z.object({
  customerName: z.string().trim().min(3, 'Informe o nome do cliente'),
  email: z.string().trim().email('E-mail invalido').optional().or(z.literal('')),
  phone: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .optional(),
  document: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => documentRegex.test(value), 'CPF/CNPJ deve ter 11 ou 14 digitos'),
  address: z.string().trim().min(3, 'Informe o endereco'),
  addressNumber: z.string().trim().min(1, 'Informe o numero'),
  complement: z.string().trim().optional().or(z.literal('')),
  neighborhood: z.string().trim().min(2, 'Informe o bairro'),
  city: z.string().trim().min(2, 'Informe a cidade'),
  state: z.string().trim().length(2, 'UF deve ter 2 letras').transform((value) => value.toUpperCase()),
  zipCode: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => value.length === 8, 'CEP deve ter 8 digitos'),
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
