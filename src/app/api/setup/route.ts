import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createKeyPool, isKeyUsedGlobally } from '@/lib/kv';

export async function POST(req: Request) {
  try {
    // 1. Admin Authentication
    const authHeader = req.headers.get('Authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminPassword && adminPassword.length > 0) {
      if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
        return NextResponse.json({ error: 'Unauthorized: Invalid Admin Password' }, { status: 401 });
      }
    }

    const body = await req.json();
    const { apiKeys, allowedModels } = body;

    // Validate Models
    if (!allowedModels || !Array.isArray(allowedModels) || allowedModels.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one permitted model.' },
        { status: 400 }
      );
    }

    // Validate Input
    if (!apiKeys || !Array.isArray(apiKeys) || apiKeys.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of valid Groq API keys.' },
        { status: 400 }
      );
    }

    // Process keys and check for global duplicates
    const incomingKeys = apiKeys.filter((key: string) => typeof key === 'string' && key.trim() !== '');
    const validNewKeys: string[] = [];
    let duplicatesSkipped = 0;

    for (const k of incomingKeys) {
      const isUsed = await isKeyUsedGlobally(k);
      if (isUsed) {
        duplicatesSkipped++;
      } else {
        validNewKeys.push(k);
      }
    }

    if (validNewKeys.length === 0) {
      return NextResponse.json(
        { error: 'All provided keys have already been used in previous Master Keys.' },
        { status: 400 }
      );
    }

    // Generate Master Key
    const masterKey = `sk-groq-${uuidv4().replace(/-/g, '')}`;

    // Store in KV
    await createKeyPool(masterKey, validNewKeys, allowedModels);

    return NextResponse.json({
      success: true,
      masterKey,
      totalKeys: validNewKeys.length,
      duplicatesSkipped,
      allowedModels,
      message: 'Master Key generated successfully.',
    });
  } catch (error: any) {
    console.error('Setup API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
