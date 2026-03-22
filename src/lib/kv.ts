import { Redis } from '@upstash/redis';

// @upstash/redis automatically picks up UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from process.env
// We also fallback to KV_REST_API... just in case they used the old one somehow.
export const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '',
});

/* =========================================
   PHASE 3: GLOBAL POOL ARCHITECTURE
   ========================================= */

export interface GroqKeyGlobal {
  key: string;
  status: 'active' | 'cooldown' | 'dead';
  cooldownUntil: number | null; // Timestamp
  totalRequests: number;
}

export interface MasterKeyGlobal {
  masterKey: string;
  name: string;
  createdAt: number;
  allowedModels: string[];
  totalRequests: number; // requests specifically routed through this Master Key
}

/* --- GROQ KEYS POOL --- */

/**
 * Add new Groq Keys to the Global Pool.
 * Automatically skips duplicates by using a Redis Set.
 * @returns Number of successfully added new keys.
 */
export async function addKeysToGlobalPool(apiKeys: string[]): Promise<number> {
  let addedCount = 0;
  for (const k of apiKeys) {
    const key = k.trim();
    if (!key) continue;

    // Sadd returns 1 if added, 0 if it was already in the set
    const isNew = await kv.sadd('global:groq_pool_keys', key);
    if (isNew === 1) {
      const newGlobalKey: GroqKeyGlobal = {
        key,
        status: 'active',
        cooldownUntil: null,
        totalRequests: 0,
      };
      await kv.hset('global:groq_pool_status', { [key]: newGlobalKey });
      addedCount++;
    }
  }
  return addedCount;
}

/**
 * Retrieve all keys from the Global Pool
 */
export async function getGlobalPoolKeys(): Promise<GroqKeyGlobal[]> {
  const statusHash = await kv.hgetall('global:groq_pool_status');
  if (!statusHash) return [];
  // Return array of GroqKeyGlobal objects
  return Object.values(statusHash) as GroqKeyGlobal[];
}

/**
 * Update the status of a specific Groq Key in the Global Pool
 */
export async function updateGlobalGroqKey(
  key: string,
  updates: Partial<Omit<GroqKeyGlobal, 'key'>>
) {
  const current = await kv.hget<GroqKeyGlobal>('global:groq_pool_status', key);
  if (!current) return;

  const updated = { ...current, ...updates };
  await kv.hset('global:groq_pool_status', { [key]: updated });
}

/**
 * Increments the request count for a Groq Key
 */
export async function incrementGlobalGroqKeyUsage(key: string) {
  const current = await kv.hget<GroqKeyGlobal>('global:groq_pool_status', key);
  if (!current) return;
  current.totalRequests = (current.totalRequests || 0) + 1;
  await kv.hset('global:groq_pool_status', { [key]: current });
}


/* --- MASTER KEYS REGISTRY --- */

/**
 * Creates a new independent Master Key
 */
export async function createMasterKey(masterKey: string, name: string, allowedModels: string[]): Promise<MasterKeyGlobal> {
  const entry: MasterKeyGlobal = {
    masterKey,
    name: name.trim() || 'Unnamed Key',
    createdAt: Date.now(),
    allowedModels,
    totalRequests: 0
  };
  
  // Save to the ordered list
  await kv.lpush('global:master_keys_registry', entry);
  
  return entry;
}

/**
 * Retrieves all Master Keys
 */
export async function getAllMasterKeys(): Promise<MasterKeyGlobal[]> {
  const keys = await kv.lrange('global:master_keys_registry', 0, -1);
  return (keys as unknown) as MasterKeyGlobal[];
}

/**
 * Retrieves a specific Master Key to validate it
 */
export async function getMasterKey(masterKey: string): Promise<MasterKeyGlobal | null> {
  const allKeys = await getAllMasterKeys();
  return allKeys.find(k => k.masterKey === masterKey) || null;
}

/**
 * Increments the usage count of a Master Key in the list
 * Since Upstash lists don't support direct object item updates easily without reading all, 
 * we'll fetch all, find it, update it, and rewrite the list if necessary, 
 * OR to be highly scalable, we store master keys in a Hash instead and just keep the list for ordering.
 * Let's just use a separate Hash for master key stats to avoid race conditions.
 */
export async function incrementMasterKeyUsage(masterKey: string) {
  await kv.hincrby('global:master_key_stats', masterKey, 1);
}

/**
 * Get total requests for a specific master key from the stats hash
 */
export async function getMasterKeyUsage(masterKey: string): Promise<number> {
  const count = await kv.hget<number>('global:master_key_stats', masterKey);
  return count || 0;
}
