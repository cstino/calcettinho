import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/utils/googleSheets';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email richiesta' }, { status: 400 });

  const sheets = getSheetsClient();

  // Controlla se l'email è in whitelist
  const whitelistRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'whitelist!A:A',
  });
  const whitelist = whitelistRes.data.values?.flat() || [];
  if (whitelist.includes(email)) {
    return NextResponse.json({ allowed: true });
  }

  // Se non è in whitelist, aggiungi a pending_requests
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'pending_requests!A:B',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[email, now]],
    },
  });
  return NextResponse.json({ allowed: false, requested: true });
} 