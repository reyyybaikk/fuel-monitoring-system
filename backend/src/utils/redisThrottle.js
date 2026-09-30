// src/utils/redisThrottle.js
const pLimit = require('p-limit');
const limit = pLimit(100);   // maksimal 100 operasi bersamaan

module.exports = async function throttle(fn, ...args) {
  return limit(() => fn(...args));
};