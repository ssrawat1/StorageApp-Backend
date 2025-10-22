import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on('error', (err) => {
  console.log('Redis Connection Error', err);
  process.exit(1);
});

await redisClient.connect();

export default redisClient;

process.on('SIGINT', async () => {
  console.log('Database Disconnected');
  await redisClient.quit();
  process.exit(0);
});
