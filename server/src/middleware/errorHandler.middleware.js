const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(statusCode).json({
    code: statusCode,
    message,
    errors: err.errors || [],
  });
}

module.exports = errorHandler;
