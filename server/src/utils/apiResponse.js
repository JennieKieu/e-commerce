const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    code: statusCode,
    message,
    data,
  });
};

const error = (res, message = 'Internal Server Error', statusCode = 500, errors = []) => {
  return res.status(statusCode).json({
    code: statusCode,
    message,
    errors,
  });
};

const paginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    code: 200,
    message,
    data,
    pagination,
  });
};

module.exports = { success, error, paginated };
