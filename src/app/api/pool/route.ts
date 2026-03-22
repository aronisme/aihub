import { NextResponse } from 'next/server';
import { getKeyPool } from '@/lib/kv';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const masterKey = searchParams.get('key');

    if (!masterKey) {
      return NextResponse.json({ error: 'Missing Master Key' }, { status: 400 });
    }

    const pool = await getKeyPool(masterKey);
    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // Mask the keys before sending to the client
    const maskedKeys = pool.groqKeys.map((k) => ({
      keyObj: `gsk_...${k.key.slice(-4)}`,
      status: k.status,
      cooldownUntil: k.cooldownUntil,
      totalRequests: k.totalRequests
    }));

    return NextResponse.json({
      success: true,
      createdAt: pool.createdAt,
      totalKeys: pool.groqKeys.length,
      keys: maskedKeys
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
