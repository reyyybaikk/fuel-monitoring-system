const requestLogger = (req, res, next) => {
  const startTimestamp = Date.now();

  // Event listener saat respons selesai dikirim ke klien
  res.on('finish', () => {
    const duration = Date.now() - startTimestamp;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
  });

  next();
};

module.exports = requestLogger;