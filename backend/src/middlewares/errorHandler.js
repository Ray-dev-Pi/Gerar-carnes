import { ZodError } from 'zod';

export function errorHandler(error, req, res, next) {
  console.error(error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Dados invalidos',
      issues: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }

  return res.status(error.statusCode || 500).json({
    message: error.message || 'Erro interno'
  });
}
