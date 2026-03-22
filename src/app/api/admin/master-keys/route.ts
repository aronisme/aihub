import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { 
  createMasterKey, 
  getAllMasterKeys,
  getMasterKeyUsage,
  deleteMasterKey
} from '@/lib/kv';

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

export async function POST(req: Request) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, allowedModels } = await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Please provide a descriptive name for this Master Key.' }, { status: 400 });
    }

    if (!allowedModels || !Array.isArray(allowedModels) || allowedModels.length === 0) {
      return NextResponse.json({ error: 'Please select at least one permitted model.' }, { status: 400 });
    }

    const masterKeyString = `sk-groq-${uuidv4().replace(/-/g, '')}`;
    const newMasterKey = await createMasterKey(masterKeyString, name, allowedModels);

    return NextResponse.json({
      success: true,
      masterKey: newMasterKey,
      message: 'Master Key generated successfully.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const masterKey = searchParams.get('masterKey');
    
    if (!masterKey) {
      return NextResponse.json({ error: 'Missing masterKey parameter' }, { status: 400 });
    }
    
    await deleteMasterKey(masterKey);
    
    return NextResponse.json({ message: 'Master Key deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete Master Key', details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const history = await getAllMasterKeys();

    return NextResponse.json({
      success: true,
      history
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
