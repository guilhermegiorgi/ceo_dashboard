import { createClient } from 'redis';

let redisClient = null;

export async function initializeCache() {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    redisClient.on('error', (err) => {
      console.warn('Redis Client Error (using memory cache):', err.message);
    });
    
    await redisClient.connect();
    console.log('Connected to Redis cache');
  } catch (error) {
    console.warn('Redis not available, using memory cache:', error.message);
    // Fallback to memory cache
    redisClient = new Map();
  }
}

export async function cacheGet(key) {
  try {
    if (redisClient instanceof Map) {
      const item = redisClient.get(key);
      if (item && item.expiry > Date.now()) {
        return JSON.parse(item.value);
      }
      return null;
    }
    
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    if (redisClient instanceof Map) {
      redisClient.set(key, {
        value: JSON.stringify(value),
        expiry: Date.now() + (ttlSeconds * 1000)
      });
      return;
    }
    
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export async function cacheDel(key) {
  try {
    if (redisClient instanceof Map) {
      redisClient.delete(key);
      return;
    }
    
    await redisClient.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}