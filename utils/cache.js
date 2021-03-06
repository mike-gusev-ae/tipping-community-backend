const redis = require('redis');
const { promisify } = require('util');
const AsyncLock = require('async-lock');
const logger = require('./logger')(module);

if (!process.env.REDIS_URL) throw Error('REDIS_URL is not set');

const client = redis.createClient(process.env.REDIS_URL);
const get = promisify(client.get).bind(client);
const set = promisify(client.set).bind(client);
const del = promisify(client.del).bind(client);
const cacheKeys = promisify(client.keys).bind(client);

const lock = new AsyncLock({ timeout: 30 * 1000 });
const lockNoTimeout = new AsyncLock();

const cache = {};
cache.wsconnection = null;

cache.shortCacheTime = process.env.SHORT_CACHE_TIME || 5 * 60;
cache.longCacheTime = process.env.LONG_CACHE_TIME || 60 * 60;
cache.keepHotInterval = process.env.KEEP_HOT_INTERVAL || 20 * 1000;
cache.networkKey = '';

cache.init = async (aeternity, keepHotFunction) => {
  cache.networkKey = await aeternity.networkId();
  logger.info(`cache networkKey ${cache.networkKey}`);
  if (process.env.NODE_ENV !== 'test') cache.keepHot(keepHotFunction);
};

const buildKey = keys => [cache.networkKey, ...keys].join(':');

cache.getOrSet = async (keys, asyncFetchData, expire = null) => {
  const key = buildKey(keys);
  const value = await get(key);
  if (value) return JSON.parse(value);

  const startLock = new Date().getTime();
  return lock.acquire(key, async () => {
    const lockedValue = await get(key);
    if (lockedValue) {
      logger.info(`lock.acquire ${key} ${new Date().getTime() - startLock}ms`);
      return JSON.parse(lockedValue);
    }

    const start = new Date().getTime();
    const data = await asyncFetchData();
    cache.set(keys, data, expire);
    logger.info(`cache ${key} ${new Date().getTime() - start}ms`);

    return data;
  }).catch(e => {
    logger.error(e);
    return asyncFetchData();
  });
};

cache.set = async (keys, data, expire = null) => {
  const key = buildKey(keys);

  if (expire) {
    await set(key, JSON.stringify(data), 'EX', expire);
  } else {
    await set(key, JSON.stringify(data));
  }
};

cache.delByPrefix = async prefixes => {
  const prefix = buildKey(prefixes);
  logger.info(`cache keys ${prefix}*`);
  const rows = await cacheKeys(`${prefix}*`);
  if (rows.length) logger.info(`cache delByPrefix ${rows}`);
  await Promise.all(rows.map(key => del(key)));
};

cache.del = async keys => {
  const key = buildKey(keys);
  logger.info(`cache del ${key}`);
  await del(key);
};

cache.keepHot = keepHotFunction => {
  const keepHotLogic = async () => lockNoTimeout.acquire('keepHotLogic', async () => {
    const start = new Date().getTime();
    await keepHotFunction();
    logger.info(`cache keepHot ${new Date().getTime() - start}ms`);
  });

  keepHotLogic();
  setInterval(keepHotLogic, cache.keepHotInterval);
};

module.exports = cache;
