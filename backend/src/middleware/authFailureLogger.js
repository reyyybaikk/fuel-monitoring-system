const express = require('express');
const router = express.Router();

// Simple in‑memory counter for 401 responses (auth failures)
let authFailureCount = 0;

// Middleware that increments the counter when a 401 is sent
function authFailureCounter(err, req, res, next) {
  if (res.statusCode === 401 || (err && err.status === 401)) {
    authFailureCount += 1;
  }
  next(err);
}

// Expose a small endpoint for monitoring/alerting tools
router.get('/auth-failures', (req, res) => {
  res.json({ success: true, authFailureCount });
});

module.exports = { authFailureCounter, authFailureRouter: router };
