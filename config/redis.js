// config/redis.js
const IORedis = require('ioredis');

const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,     // recommended by BullMQ docs for some Redis providers
});

connection.on('connect', () => {
  console.log('Redis connected successfully');
});

connection.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

module.exports = connection;