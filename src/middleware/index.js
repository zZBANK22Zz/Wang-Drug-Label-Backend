// Middleware สำหรับ logging requests
const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Body:', req.body);
  next();
};

// Middleware สำหรับ error handling
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Database errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry found',
      error: err.message
    });
  }

  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      success: false,
      message: 'Referenced record not found',
      error: err.message
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: err.message
    });
  }

  // Default error
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

// Middleware สำหรับ handle 404
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    data: null
  });
};

// Middleware สำหรับ validate JSON
const validateJSON = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format',
      error: err.message
    });
  }
  next();
};

module.exports = {
  requestLogger,
  errorHandler,
  notFound,
  validateJSON
};