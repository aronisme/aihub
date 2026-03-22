import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createKeyPool } from '@/lib/kv';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apiKeys } = body;

    // Validate input
    if (!apiKeys || !Array.isArray(apiKeys) || apiKeys.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of valid Groq API keys.' },
        { status: 400 }
      );
    }

    // Filter out empty strings
    const validKeys = apiKeys.filter((key: string) => typeof key === 'string' && key.trim() !== '');

    if (validKeys.length === 0) {
      return NextResponse.json(
        { error: 'No valid keys found.' },
        { status: 400 }
      );
    }

    // Generate Master Key
    const masterKey = `sk-groq-${uuidv4().replace(/-/g, '')}`;

    // Store in KV
    await createKeyPool(masterKey, validKeys);

    return NextResponse.json({
      success: true,
      masterKey,
      totalKeys: validKeys.length,
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
