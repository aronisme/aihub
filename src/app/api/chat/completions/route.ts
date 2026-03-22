import { NextResponse } from 'next/server';
import { 
  getMasterKey, 
  getGlobalPoolKeys, 
  updateGlobalGroqKey, 
  incrementGlobalGroqKeyUsage,
  incrementMasterKeyUsage
} from '@/lib/kv';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max allowed for hobby plan

export async function POST(req: Request) {
  try {
    // 1. Authenticate Master Key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header.' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1].trim();
    const masterKeyObj = await getMasterKey(token);

    if (!masterKeyObj) {
      return NextResponse.json({ error: 'Invalid Master Key.' }, { status: 401 });
    }

    // Capture the request body once to reuse across retries
    const requestText = await req.text();
    let requestedModel = '';
    
    try {
       const parsedBody = JSON.parse(requestText);
       requestedModel = parsedBody.model || '';
    } catch {
       return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Enforce Phase 3 Model Binding
    if (masterKeyObj.allowedModels && masterKeyObj.allowedModels.length > 0) {
       if (!masterKeyObj.allowedModels.includes(requestedModel)) {
          return NextResponse.json(
            { error: `This Master Key '${masterKeyObj.name}' is not permitted to use model '${requestedModel}'. Allowed models: ${masterKeyObj.allowedModels.join(', ')}` },
            { status: 403 }
          );
       }
    }

    // 2. Fetch Global Pool
    let globalKeys = await getGlobalPoolKeys();

    if (!globalKeys || globalKeys.length === 0) {
      return NextResponse.json({ error: 'Global Pool is empty. Please ask the Admin to add Groq keys.' }, { status: 503 });
    }

    // 3. Failover Loop
    let attempts = 0;
    const maxAttempts = Math.min(globalKeys.length, 5); // Don't loop infinitely

    while (attempts < maxAttempts) {
      attempts++;

      // Find an active key
      const activeKeys = globalKeys.filter(k => k.status === 'active');

      if (activeKeys.length === 0) {
        // Check if any cooldowns have expired
        const now = Date.now();
        let reactivatedAny = false;
        for (const k of globalKeys) {
          if (k.status === 'cooldown' && k.cooldownUntil && now > k.cooldownUntil) {
            k.status = 'active';
            k.cooldownUntil = null;
            await updateGlobalGroqKey(k.key, { status: 'active', cooldownUntil: null });
            reactivatedAny = true;
          }
        }
        if (!reactivatedAny) {
          return NextResponse.json({ error: 'All Groq api keys in the Global Pool are currently rate limited/on cooldown.' }, { status: 429 });
        }
        continue; // Restart loop with reactivated keys
      }

      // Simple round-robin: pick a random active key, or the one with the lowest totalRequests
      activeKeys.sort((a, b) => (a.totalRequests || 0) - (b.totalRequests || 0));
      const selectedKey = activeKeys[0];
      const groqKey = selectedKey.key;

      // 4. Send request to Groq
      const groqReq = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: requestText,
      });

      // 5. Handle Groq response
      if (groqReq.ok) {
        // Success! Await stats correctly for serverless environments
        await Promise.all([
          incrementGlobalGroqKeyUsage(groqKey).catch(console.error),
          incrementMasterKeyUsage(masterKeyObj.masterKey).catch(console.error)
        ]);

        // Map headers for streaming or standard json
        const headers = new Headers();
        groqReq.headers.forEach((value, key) => headers.set(key, value));

        return new NextResponse(groqReq.body, {
          status: groqReq.status,
          statusText: groqReq.statusText,
          headers,
        });
      }

      // Check for Rate Limit (429) or Server Error (5xx)
      if (groqReq.status === 429 || groqReq.status >= 500) {
        // Put key on cooldown (1 minute)
        selectedKey.status = 'cooldown';
        selectedKey.cooldownUntil = Date.now() + 60 * 1000;
        await updateGlobalGroqKey(groqKey, { status: 'cooldown', cooldownUntil: selectedKey.cooldownUntil });
        console.warn(`Key ${groqKey.substring(0,8)}... hit rate limit. Placed on cooldown. Attempt ${attempts}/${maxAttempts}`);
        // Go to next loop iteration
      } else {
        // For other errors (e.g. 400 Bad Request), return immediately back to client
        const errJson = await groqReq.json().catch(() => ({}));
        return NextResponse.json(errJson, { status: groqReq.status });
      }
    }

    return NextResponse.json({ error: 'Failed to process request after multiple routing retries. Global pool is exhausted.' }, { status: 500 });
  } catch (error: any) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Proxy Error', details: error.message }, { status: 500 });
  }
}
