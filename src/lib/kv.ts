import { kv } from '@vercel/kv';

export interface GroqKey {
  key: string;
  status: 'active' | 'cooldown' | 'dead';
  cooldownUntil: number | null; // Timestamp
  totalRequests: number;
}

export interface KeyPool {
  masterKey: string;
  groqKeys: GroqKey[];
  createdAt: number;
}

/**
 * Creates a new key pool and saves it to KV
 */
export async function createKeyPool(masterKey: string, apiKeys: string[]): Promise<KeyPool> {
  const groqKeys: GroqKey[] = apiKeys.map((key) => ({
    key: key.trim(),
    status: 'active',
    cooldownUntil: null,
    totalRequests: 0,
  }));

  const pool: KeyPool = {
    masterKey,
    groqKeys,
    createdAt: Date.now(),
  };

  await kv.set(`pool:${masterKey}`, pool);
  return pool;
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
