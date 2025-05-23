import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/utils/googleSheets';
import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import fs from 'fs/promises';

// Se vuoi un font custom, aggiungi qui il percorso e registra il font
// registerFont(path.join(process.cwd(), 'public/fonts/YourFont.ttf'), { family: 'CustomFont' });

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const CARD_WIDTH = 600;
const CARD_HEIGHT = 900;

const STAT_LABELS = ['ATT', 'DEF', 'VEL', 'FIS', 'PAS', 'POR'];

export async function GET(
  req: NextRequest,
  { params }: { params: { email: string } }
) {
  const email = decodeURIComponent(params.email);
  const sheets = getSheetsClient();

  // Prendi dati giocatore
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'players!A2:I',
  });
  const row = (res.data.values || []).find((r) => r[1] === email);
  if (!row) return NextResponse.json({ error: 'Giocatore non trovato' }, { status: 404 });

  const [nome, , foto, ATT, DEF, VEL, FIS, PAS, POR] = row;
  const stats = [Number(ATT), Number(DEF), Number(VEL), Number(FIS), Number(PAS), Number(POR)];
  const overall = Math.round((stats.reduce((a, b) => a + b, 0) / 6) * 10) / 10;

  // Scegli template
  let template = 'bronzo';
  if (overall >= 9.0) template = 'ultimate';
  else if (overall >= 7.0) template = 'oro';
  else if (overall >= 4.6) template = 'argento';

  // Percorsi immagini
  const cardPath = path.join(process.cwd(), 'public/cards', `${template}.png`);
  const playerPath = path.join(process.cwd(), 'public/players', `${email}.jpg`);

  // Carica immagini
  const [cardImg, playerImg] = await Promise.all([
    loadImage(cardPath),
    loadImage(playerPath)
  ]);

  // Canvas
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Disegna template
  ctx.drawImage(cardImg, 0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Disegna foto giocatore (centrata, crop su viso/spalle)
  const faceSize = 420;
  ctx.save();
  ctx.beginPath();
  ctx.arc(CARD_WIDTH / 2, 370, faceSize / 2, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(playerImg, CARD_WIDTH / 2 - faceSize / 2, 160, faceSize, faceSize);
  ctx.restore();

  // Overall
  ctx.font = 'bold 80px Arial';
  ctx.fillStyle = '#2d2d1d';
  ctx.textAlign = 'left';
  ctx.fillText(String(overall), 60, 140);

  // Nome
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(nome, CARD_WIDTH / 2, 650);

  // Sigle stats
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2d2d1d';
  STAT_LABELS.forEach((label, i) => {
    ctx.fillText(label, 120 + i * 80, 730);
  });

  // Valori stats
  ctx.font = 'bold 38px Arial';
  stats.forEach((val, i) => {
    ctx.fillText(String(val), 120 + i * 80, 780);
  });

  // Output PNG
  const buffer = canvas.toBuffer('image/png');
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="${nome}_card.png"`,
    },
  });
} 