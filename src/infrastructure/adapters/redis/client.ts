
import Redis from 'ioredis';

// Use environment variable or default to localhost
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl);

export default redis;
