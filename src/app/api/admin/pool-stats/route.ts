import { NextResponse } from 'next/server';
import { getGlobalPoolKeys, getAllMasterKeys } from '@/lib/kv';

export const dynamic = 'force-dynamic';

function isAdmin(req: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return true;
  
  const authHeader = req.headers.get('Authorization');
  if (authHeader === `Bearer ${adminPassword}`) return true;

  const cookieHeader = req.headers.get('cookie') || '';
  if (cookieHeader.includes(`admin_token=${adminPassword}`)) return true;

  return false;
}

export async function GET(req: Request) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const poolKeys = await getGlobalPoolKeys();
    const masterKeys = await getAllMasterKeys();

    const stats = {
      globalPoolSize: poolKeys.length,
      activeKeys: poolKeys.filter(k => k.status === 'active').length,
      cooldownKeys: poolKeys.filter(k => k.status === 'cooldown').length,
      deadKeys: poolKeys.filter(k => k.status === 'dead').length,
      totalMasterKeys: masterKeys.length,
      totalRoutedRequests: poolKeys.reduce((acc, curr) => acc + (curr.totalRequests || 0), 0)
    };

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
