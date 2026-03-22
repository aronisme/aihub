import { NextResponse } from 'next/server';
import { getKeyPool, getNextAvailableKeyAndRotate, updateKeyState } from '@/lib/kv';

export const maxDuration = 60; // Extra time for failovers
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Authenticate Master Key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const masterKey = authHeader.split(' ')[1];
    
    // 2. Retrieve Pool
    const pool = await getKeyPool(masterKey);
    if (!pool) {
      return NextResponse.json({ error: 'Invalid Master Key or pool not found' }, { status: 401 });
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

    // Enforce Phase 2 Model Binding
    if (pool.allowedModels && pool.allowedModels.length > 0) {
       // If wildcard * is somehow allowed, we could skip. But we strictly enforce selected strings.
       if (!pool.allowedModels.includes(requestedModel)) {
          return NextResponse.json(
            { error: `This Master Key is not permitted to use model '${requestedModel}'. Allowed models: ${pool.allowedModels.join(', ')}` },
            { status: 403 }
          );
       }
    }
    
    // 3. Failover Loop
    let attempts = 0;
    const maxAttempts = pool.groqKeys.length;

    while (attempts < maxAttempts) {
      attempts++;
      
      const apiKeyObj = await getNextAvailableKeyAndRotate(masterKey, pool);
      
      if (!apiKeyObj) {
        return NextResponse.json(
          { error: 'All Groq API keys are currently rate-limited (cooling down) or dead.' },
          { status: 429 }
        );
      }

      const groqKey = apiKeyObj.key;

      // 4. Forward to Groq
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: requestText,
      });

      // 5. Handle Groq response
      if (groqResponse.ok) {
        // Success! Pipe the response directly back to the client (handles streaming automatically)
        return new Response(groqResponse.body, {
          status: groqResponse.status,
          headers: groqResponse.headers,
        });
      }

      // If it failed due to Rate Limit or Server Error, cool it down and retry
      if (groqResponse.status === 429 || groqResponse.status >= 500) {
        const state = groqResponse.status === 429 ? 'cooldown' : 'dead';
        console.warn(`[Failover] Key ending in ...${groqKey.slice(-4)} failed with ${groqResponse.status}. Marking as ${state}. Attempt ${attempts}/${maxAttempts}`);
        await updateKeyState(masterKey, groqKey, state);
        
        // Loop will continue and try the next key
        continue;
      }

      // If it failed due to a bad request (400, 401, 404, etc), return the error directly
      return new Response(groqResponse.body, {
        status: groqResponse.status,
        headers: groqResponse.headers,
      });
    }

    return NextResponse.json({ error: 'Max rotation attempts reached. All keys failed.' }, { status: 500 });
    
  } catch (error: any) {
    console.error('Proxy Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
