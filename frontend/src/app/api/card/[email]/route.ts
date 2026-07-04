import { NextRequest, NextResponse } from 'next/server';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { getPlayerByEmail } from '@/utils/supabase';

// Nel runtime serverless non esistono font di sistema: oltre a Nebulax va
// registrato anche un font per la famiglia "Arial" usata dalle statistiche,
// altrimenti quei testi non vengono renderizzati.
try {
  GlobalFonts.registerFromPath(path.join(process.cwd(), 'public/fonts/Nebulax-3lqLp.ttf'), 'Nebulax');
  GlobalFonts.registerFromPath(path.join(process.cwd(), 'public/fonts/Oswald-Bold.ttf'), 'Arial');
} catch (error) {
  console.log('Errore nella registrazione font:', error);
}

const CARD_WIDTH = 600;
const CARD_HEIGHT = 864;

export async function GET(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);

    const playerData = await getPlayerByEmail(email);

    if (!playerData) {
      return NextResponse.json({ error: `Giocatore con email ${email} non trovato` }, { status: 404 });
    }

    const stats = [playerData.ATT, playerData.DEF, playerData.VEL, playerData.FOR, playerData.PAS, playerData.POR];
    const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
    const overall = Math.round(top5Stats.reduce((a, b) => a + b, 0) / 5);

    const template = overall >= 90 ? 'ultimate' : overall >= 78 ? 'oro' : overall >= 65 ? 'argento' : 'bronzo';
    const cardPath = path.join(process.cwd(), 'public/cards', `${template}.png`);

    const hasPlayerPhoto = !!(playerData.photoUrl && playerData.photoUrl.trim() !== '');

    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx = canvas.getContext('2d');

    if (!hasPlayerPhoto) {
      ctx.fillStyle = template === 'ultimate' ? '#4C1D95' : template === 'oro' ? '#B45309' : template === 'argento' ? '#374151' : '#92400E';
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

      ctx.strokeStyle = template === 'ultimate' ? '#8B5CF6' : template === 'oro' ? '#FFD700' : template === 'argento' ? '#C0C0C0' : '#CD7F32';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, CARD_WIDTH - 8, CARD_HEIGHT - 8);

      ctx.fillStyle = '#6B7280';
      ctx.fillRect(90, 150, 420, 420);
      ctx.fillStyle = '#F3F4F6';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('FOTO', CARD_WIDTH / 2, 380);

      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#F3F4F6';
      ctx.textAlign = 'center';
      ctx.fillText(template.toUpperCase(), CARD_WIDTH / 2, 50);

      ctx.font = 'bold 20px Arial';
      ctx.fillText('OVERALL', 90, 140);
      ctx.font = 'bold 70px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(String(overall), 90, 210);

      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = '#F3F4F6';
      ctx.fillText(playerData.nome, CARD_WIDTH / 2, 620);

      const statsData = [
        { label: 'ATT', value: Math.round(playerData.ATT) },
        { label: 'VEL', value: Math.round(playerData.VEL) },
        { label: 'PAS', value: Math.round(playerData.PAS) },
        { label: 'FOR', value: Math.round(playerData.FOR) },
        { label: 'DIF', value: Math.round(playerData.DEF) },
        { label: 'POR', value: Math.round(playerData.POR) },
      ];

      const leftLabelX = 100;
      const leftValueX = 220;
      const rightLabelX = 360;
      const rightValueX = 480;
      const startY = 689;
      const statSpacing = 45;

      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F3F4F6';
      statsData.slice(0, 3).forEach((stat, i) => ctx.fillText(`${stat.label}`, leftLabelX, startY + i * statSpacing));

      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      statsData.slice(0, 3).forEach((stat, i) => ctx.fillText(String(stat.value), leftValueX, startY + i * statSpacing));

      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F3F4F6';
      statsData.slice(3, 6).forEach((stat, i) => ctx.fillText(`${stat.label}`, rightLabelX, startY + i * statSpacing));

      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      statsData.slice(3, 6).forEach((stat, i) => ctx.fillText(String(stat.value), rightValueX, startY + i * statSpacing));
    } else {
      const [cardImg, playerImg] = await Promise.all([loadImage(cardPath), loadImage(playerData.photoUrl)]);

      ctx.drawImage(cardImg, 0, 0, CARD_WIDTH, CARD_HEIGHT);

      const maxFaceSize = 420;
      const faceY = template === 'ultimate' ? 138 : 136;

      let faceWidth, faceHeight;
      if (playerImg.width > playerImg.height) {
        faceWidth = maxFaceSize;
        faceHeight = (playerImg.height / playerImg.width) * maxFaceSize;
      } else {
        faceHeight = maxFaceSize;
        faceWidth = (playerImg.width / playerImg.height) * maxFaceSize;
      }

      const faceX = CARD_WIDTH / 2 - faceWidth / 2;
      ctx.drawImage(playerImg, faceX, faceY, faceWidth, faceHeight);

      const textColor = template === 'ultimate' ? '#C0C0C0' : '#2B2B2B';
      const valueColor = template === 'ultimate' ? '#FFD700' : '#404040';

      const overallX = template === 'ultimate' ? 90 : 80;
      const overallTextY = template === 'ultimate' ? 155 : 140;
      const overallValueY = template === 'ultimate' ? 225 : 210;

      ctx.font = 'bold 20px Nebulax, Arial';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText('OVERALL', overallX, overallTextY);

      ctx.font = 'bold 70px Nebulax, Arial';
      ctx.fillStyle = valueColor;
      ctx.fillText(String(overall), overallX, overallValueY);

      ctx.font = 'bold 56px Nebulax, Arial';
      ctx.fillStyle = textColor;
      ctx.fillText(playerData.nome, CARD_WIDTH / 2, 618);

      const leftStats = [
        { label: 'ATT', value: Math.round(playerData.ATT) },
        { label: 'VEL', value: Math.round(playerData.VEL) },
        { label: 'PAS', value: Math.round(playerData.PAS) },
      ];
      const rightStats = [
        { label: 'FOR', value: Math.round(playerData.FOR) },
        { label: 'DIF', value: Math.round(playerData.DEF) },
        { label: 'POR', value: Math.round(playerData.POR) },
      ];

      const startY = 689;
      const statSpacing = 45;

      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = textColor;
      leftStats.forEach((stat, i) => ctx.fillText(`${stat.label}`, 100, startY + i * statSpacing));

      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = valueColor;
      leftStats.forEach((stat, i) => ctx.fillText(String(stat.value), 220, startY + i * statSpacing));

      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = textColor;
      rightStats.forEach((stat, i) => ctx.fillText(`${stat.label}`, 360, startY + i * statSpacing));

      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = valueColor;
      rightStats.forEach((stat, i) => ctx.fillText(String(stat.value), 480, startY + i * statSpacing));
    }

    const buffer = canvas.toBuffer('image/png');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Last-Modified': new Date().toUTCString(),
      },
    });
  } catch (error) {
    console.error('Errore nella generazione della card:', error);
    return NextResponse.json(
      { error: 'Errore nella generazione della card', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}
