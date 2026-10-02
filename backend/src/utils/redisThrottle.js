// src/utils/redisThrottle.js
/** Simplified import of p-limit (single version enforced via npm overrides) */
const pLimit = require('p-limit');
// Maximum concurrent Redis operations (adjust as needed)
const limit = pLimit(100);

module.exports = async function throttle(fn, ...args) {
  // Wrap the call in the concurrency limiter
  return limit(() => fn(...args));
};