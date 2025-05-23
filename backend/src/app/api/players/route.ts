import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/utils/googleSheets';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

export async function GET() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'players!A2:I',
  });
  const players = (res.data.values || []).map((row) => ({
    nome: row[0],
    email: row[1],
    foto: row[2],
    ATT: Number(row[3]),
    DIF: Number(row[4]),
    VEL: Number(row[5]),
    PAS: Number(row[6]),
    FOR: Number(row[7]),
    POR: Number(row[8]),
  }));
  return NextResponse.json(players);
} 