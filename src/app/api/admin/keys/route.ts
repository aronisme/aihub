import { NextResponse } from 'next/server';
import { addKeysToGlobalPool, getGlobalPoolKeys } from '@/lib/kv';

export const dynamic = 'force-dynamic';

function isAdmin(req: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return true; // No password = open
  
  // Check Bearer Token
  const authHeader = req.headers.get('Authorization');
  if (authHeader === `Bearer ${adminPassword}`) return true;

  // Check Cookie
  const cookieHeader = req.headers.get('cookie') || '';
  if (cookieHeader.includes(`admin_token=${adminPassword}`)) return true;

  return false;
}

export async function POST(req: Request) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { apiKeys } = await req.json();

    if (!apiKeys || !Array.isArray(apiKeys)) {
      return NextResponse.json({ error: 'Invalid input. Expected an array of apiKeys.' }, { status: 400 });
    }

    const addedCount = await addKeysToGlobalPool(apiKeys);

    return NextResponse.json({ 
      message: `Successfully processed ${apiKeys.length} keys. ${addedCount} new keys added to the global pool.`,
      addedCount 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add keys to global pool.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }
    
    const { deleteGroqKeyFromPool } = await import('@/lib/kv');
    await deleteGroqKeyFromPool(key);
    
    return NextResponse.json({ message: 'Key deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const keys = await getGlobalPoolKeys();

    // Mask the keys before sending to the client
    const maskedKeys = keys.map(k => ({
      keyObj: k.key.substring(0, 8) + '...' + k.key.substring(k.key.length - 4),
      status: k.status,
      cooldownUntil: k.cooldownUntil,
      totalRequests: k.totalRequests
    }));

    return NextResponse.json({
      success: true,
      totalKeys: keys.length,
      keys: maskedKeys
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
