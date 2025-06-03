import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: "Backend API funziona!", 
    timestamp: new Date().toISOString(),
    env: {
      hasAirtableKey: !!process.env.AIRTABLE_API_KEY,
      hasBaseId: !!process.env.AIRTABLE_BASE_ID
    }
  });
} 