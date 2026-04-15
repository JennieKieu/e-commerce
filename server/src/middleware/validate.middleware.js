const { validationResult } = require('express-validator');
const { error } = require('../utils/apiResponse');

/**
 * Run express-validator checks and return 422 if any fail.
 */
function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return error(res, 'Validation failed', 422, result.array());
  }
  next();
}

module.exports = { validate };
