import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'API funzionante!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
} 