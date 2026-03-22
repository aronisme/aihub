import { Redis } from '@upstash/redis';

// @upstash/redis automatically picks up UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from process.env
// We also fallback to KV_REST_API... just in case they used the old one somehow.
export const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '',
});

export interface GroqKey {
  key: string;
  status: 'active' | 'cooldown' | 'dead';
  cooldownUntil: number | null; // Timestamp
  totalRequests: number;
}

export interface KeyPool {
  masterKey: string;
  groqKeys: GroqKey[];
  allowedModels: string[]; // <-- Phase 2: Lock Master Key to specific models
  createdAt: number;
}

export interface MasterKeyHistory {
  masterKey: string;
  createdAt: number;
  totalPoolSize: number;
  allowedModels: string[];
}

/**
 * Check if a key exists in the global set of used Groq keys
 */
export async function isKeyUsedGlobally(key: string): Promise<boolean> {
  const isMember = await kv.sismember('global:used_groq_keys', key);
  return isMember === 1;
}

/**
 * Creates a new key pool and saves it to KV
 */
export async function createKeyPool(masterKey: string, apiKeys: string[], allowedModels: string[]): Promise<KeyPool> {
  const newKeys: GroqKey[] = [];
  
  for (const key of apiKeys) {
    const k = key.trim();
    // Add to global set of used keys
    await kv.sadd('global:used_groq_keys', k);
    newKeys.push({
      key: k,
      status: 'active',
      cooldownUntil: null,
      totalRequests: 0,
    });
  }

  const pool: KeyPool = {
    masterKey,
    groqKeys: newKeys,
    allowedModels,
    createdAt: Date.now(),
  };

  await kv.set(`pool:${masterKey}`, pool);

  // Add to master key history
  const historyEntry: MasterKeyHistory = {
    masterKey,
    createdAt: pool.createdAt,
    totalPoolSize: newKeys.length,
    allowedModels
  };
  await kv.lpush('global:master_keys', historyEntry);

  return pool;
}

/**
 * Retrieves the history of all generated Master Keys
 */
export async function getAllMasterKeys(): Promise<MasterKeyHistory[]> {
  const keys = await kv.lrange('global:master_keys', 0, -1);
  return (keys as unknown) as MasterKeyHistory[];
}

/**
 * Retrieves a key pool by Master Key
 */
export async function getKeyPool(masterKey: string): Promise<KeyPool | null> {
  return await kv.get<KeyPool>(`pool:${masterKey}`);
}

/**
 * Updates an entire key pool in KV
 */
export async function updateKeyPool(masterKey: string, pool: KeyPool): Promise<void> {
  await kv.set(`pool:${masterKey}`, pool);
}

/**
 * Marks a specific key as rate-limited (cooldown for 1 minute) or dead (500 errors)
 */
export async function updateKeyState(
  masterKey: string,
  failedKey: string,
  newState: 'cooldown' | 'dead'
): Promise<void> {
  const pool = await getKeyPool(masterKey);
  if (!pool) return;

  const keyIndex = pool.groqKeys.findIndex((k) => k.key === failedKey);
  if (keyIndex === -1) return;

  if (newState === 'cooldown') {
    // 60 seconds cooldown
    pool.groqKeys[keyIndex].status = 'cooldown';
    pool.groqKeys[keyIndex].cooldownUntil = Date.now() + 60 * 1000;
  } else if (newState === 'dead') {
    pool.groqKeys[keyIndex].status = 'dead';
    pool.groqKeys[keyIndex].cooldownUntil = null;
  }

  await updateKeyPool(masterKey, pool);
}

/**
 * Finds the next available key that is not on cooldown or dead,
 * and rotates the pool for round-robin load balancing.
 */
export async function getNextAvailableKeyAndRotate(masterKey: string, pool: KeyPool): Promise<GroqKey | null> {
  const now = Date.now();
  let availableKeyIndex = -1;

  // First, check for expired cooldowns and reset them to active
  let updatedPool = false;
  for (const key of pool.groqKeys) {
    if (key.status === 'cooldown' && key.cooldownUntil && now > key.cooldownUntil) {
      key.status = 'active';
      key.cooldownUntil = null;
      updatedPool = true;
    }
  }

  // Find the first active key
  availableKeyIndex = pool.groqKeys.findIndex((k) => k.status === 'active');

  if (availableKeyIndex !== -1) {
    const selectedKey = pool.groqKeys.splice(availableKeyIndex, 1)[0];
    selectedKey.totalRequests += 1;
    // Push it to the back of the queue (Round Robin)
    pool.groqKeys.push(selectedKey);
    // Save updated pool back to KV
    await updateKeyPool(masterKey, pool);
    return selectedKey;
  }

  // If no active keys, save the updated cooldowns anyway
  if (updatedPool) {
    await updateKeyPool(masterKey, pool);
  }

  return null;
}
