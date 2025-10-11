import pkg from '@hapi/joi';
const { ValidationError } = pkg;

/**
 * Middleware para tratamento de erros
 * @param {Error} err - Objeto de erro
 * @param {Object} req - Objeto de requisição do Express
 * @param {Object} res - Objeto de resposta do Express
 * @param {Function} next - Próxima função de middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Erro:', err);

  // Erro de validação Joi
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: 'Erro de validação',
      details: err.details.map(detail => ({
        message: detail.message,
        path: detail.path,
        type: detail.type
      })),
      timestamp: new Date().toISOString()
    });
  }

  // Erro de autenticação
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Não autorizado',
      message: err.message || 'Token inválido ou expirado',
      timestamp: new Date().toISOString()
    });
  }

  // Erro de rota não encontrada
  if (err.status === 404) {
    return res.status(404).json({
      success: false,
      error: 'Rota não encontrada',
      message: 'O recurso solicitado não existe',
      timestamp: new Date().toISOString()
    });
  }

  // Erro de conflito (ex: registro duplicado)
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Conflito',
      message: 'Já existe um registro com estes dados',
      timestamp: new Date().toISOString()
    });
  }

  // Erro padrão
  const statusCode = err.statusCode || 500;
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Ocorreu um erro no servidor'
    : err.message || 'Erro interno do servidor';

  res.status(statusCode).json({
    success: false,
    error: 'Erro interno do servidor',
    message: errorMessage,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    }),
    timestamp: new Date().toISOString()
  });
};

/**
 * Middleware para rotas não encontradas
 * @param {Object} req - Objeto de requisição do Express
 * @param {Object} res - Objeto de resposta do Express
 * @param {Function} next - Próxima função de middleware
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Não encontrado - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

export { errorHandler, notFoundHandler };
