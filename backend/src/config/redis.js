// src/config/redis.js
const { createClient } = require('redis');   // npm i redis@4 (versi modern)

let redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error('[Redis] REDIS_URL environment variable is not set. Exiting.');
  process.exit(1);
}
// If URL uses plain redis://, upgrade to rediss:// for TLS (Upstash requires TLS)
if (redisUrl.startsWith('redis://')) {
// No TLS conversion: keep the URL as provided (supports both redis:// and rediss://)
  console.warn('[Redis] Converting redis:// to rediss:// for TLS');
  redisUrl = redisUrl.replace('redis://', 'rediss://');
}



// createClient secara otomatis membaca schema rediss:// (TLS) atau redis://
const client = createClient({
  url: redisUrl,
  // When using rediss:// (TLS) we disable strict cert verification so that
  // self‑signed certificates (common in Render/Upstash dev environments) do not
  // cause a crash. For plain redis:// connections this option is ignored.
  socket: {
    tls: redisUrl.startsWith('rediss://'),
    rejectUnauthorized: false,
  },
});

client.on('error', (err) => console.error('[Redis] Connection error:', err));

(async () => {
  try {
    await client.connect();
    console.info('[Redis] Connected successfully');
  } catch (e) {
    console.error('[Redis] Failed to connect:', e);
  }
})();

module.exports = client;