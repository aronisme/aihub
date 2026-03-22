import { NextResponse } from 'next/server';
import { getAllMasterKeys } from '@/lib/kv';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Admin Auth
    if (adminPassword && adminPassword.length > 0) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
        return NextResponse.json({ error: 'Unauthorized: Invalid Admin Password' }, { status: 401 });
      }
    }

    const history = await getAllMasterKeys();

    return NextResponse.json({
      success: true,
      history
    });
  } catch (error: any) {
    console.error('Admin History Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
