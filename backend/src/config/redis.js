// src/config/redis.js
const { createClient } = require('redis');   // npm i redis@4 (versi modern)

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error('[Redis] REDIS_URL environment variable is not set. Exiting.');
  process.exit(1);
}
// If URL uses plain redis://, upgrade to rediss:// for TLS (Upstash requires TLS)
if (redisUrl.startsWith('redis://')) {
  console.warn('[Redis] Converting redis:// to rediss:// for TLS');
  redisUrl = redisUrl.replace('redis://', 'rediss://');
}



// createClient secara otomatis membaca schema rediss:// (TLS) atau redis://
const client = createClient({
  url: redisUrl,
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