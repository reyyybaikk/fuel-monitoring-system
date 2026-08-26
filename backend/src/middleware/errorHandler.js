// Middleware untuk menangani URL yang tidak ditemukan (404)
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found - ${req.originalUrl}`
  });
};

// Middleware global untuk menangani semua jenis error
const errorHandler = (err, req, res, next) => {
  console.error('Global Error Caught:', err.stack);

  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Kita hanya menampilkan stack trace error jika aplikasi sedang dalam mode development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};