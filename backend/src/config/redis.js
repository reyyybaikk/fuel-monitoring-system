// src/config/redis.js
const { createClient } = require('redis');   // npm i redis@4 (versi modern)

const redisUrl = process.env.REDIS_URL;   // nilai dari .env

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