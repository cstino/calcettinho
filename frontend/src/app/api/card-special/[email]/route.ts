import { NextRequest, NextResponse } from 'next/server';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { getPlayerByEmail, getSpecialCardData } from '@/utils/supabase';

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
const CARD_HEIGHT = 900;

function calculatePixelBrightness(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function analyzeAreaBrightness(ctx: any, x: number, y: number, width: number, height: number): number {
  try {
    const imageData = ctx.getImageData(x, y, width, height);
    const pixels = imageData.data;
    let totalBrightness = 0;
    let pixelCount = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      if (pixels[i + 3] > 0) {
        totalBrightness += calculatePixelBrightness(r, g, b);
        pixelCount++;
      }
    }

    return pixelCount > 0 ? totalBrightness / pixelCount : 128;
  } catch (error) {
    return 128;
  }
}

function getOptimalColors(ctx: any): { textColor: string; valueColor: string } {
  const sampleAreas = [
    { x: 90, y: 705, width: 60, height: 40 },
    { x: 370, y: 705, width: 60, height: 40 },
    { x: 70, y: 170, width: 40, height: 40 },
    { x: 250, y: 620, width: 100, height: 40 },
  ];

  let totalBrightness = 0;
  sampleAreas.forEach((area) => {
    totalBrightness += analyzeAreaBrightness(ctx, area.x, area.y, area.width, area.height);
  });

  const averageBrightness = totalBrightness / sampleAreas.length;

  if (averageBrightness > 128) {
    return { textColor: '#2B2B2B', valueColor: '#8B0000' };
  }
  return { textColor: '#FFFFFF', valueColor: '#FFD700' };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);

    const { searchParams } = new URL(req.url);
    const template = searchParams.get('template') || '1presenza';

    const playerData = await getPlayerByEmail(email);
    const specialCardData = await getSpecialCardData(template);

    if (!playerData) {
      return NextResponse.json({ error: `Giocatore con email ${email} non trovato` }, { status: 404 });
    }

    if (!specialCardData) {
      return NextResponse.json({ error: `Card special con template ${template} non trovata` }, { status: 404 });
    }

    const stats = [playerData.ATT, playerData.DEF, playerData.VEL, playerData.FOR, playerData.PAS, playerData.POR];
    const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
    const overall = Math.round(top5Stats.reduce((a, b) => a + b, 0) / 5);

    const hasPlayerPhoto = !!(playerData.photoUrl && playerData.photoUrl.trim() !== '');
    const hasTemplateImage = !!(specialCardData.templateUrl && specialCardData.templateUrl.trim() !== '');

    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx = canvas.getContext('2d');

    if (!hasPlayerPhoto || !hasTemplateImage) {
      ctx.fillStyle = '#B45309';
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, CARD_WIDTH - 8, CARD_HEIGHT - 8);

      ctx.fillStyle = '#6B7280';
      ctx.fillRect(90, 150, 420, 420);
      ctx.fillStyle = '#F3F4F6';
      ctx.font = 'bold 48px Nebulax, Arial';
      ctx.textAlign = 'center';
      ctx.fillText('FOTO', CARD_WIDTH / 2, 380);

      ctx.font = 'bold 20px Nebulax, Arial';
      ctx.fillStyle = '#F3F4F6';
      ctx.textAlign = 'center';
      ctx.fillText(`SPECIAL: ${template.toUpperCase()}`, CARD_WIDTH / 2, 50);

      ctx.font = 'bold 20px Nebulax, Arial';
      ctx.fillText('OVERALL', 90, 140);
      ctx.font = 'bold 70px Nebulax, Arial';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(String(overall), 90, 210);

      ctx.font = 'bold 48px Nebulax, Arial';
      ctx.fillStyle = '#F3F4F6';
      ctx.fillText(playerData.nome, CARD_WIDTH / 2, 660);

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
      const startY = 714;
      const statSpacing = 45;

      ctx.font = 'bold 32px Nebulax, Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F3F4F6';
      statsData.slice(0, 3).forEach((stat, i) => ctx.fillText(`${stat.label}`, leftLabelX, startY + i * statSpacing));

      ctx.font = 'bold 32px Nebulax, Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      statsData.slice(0, 3).forEach((stat, i) => ctx.fillText(String(stat.value), leftValueX, startY + i * statSpacing));

      ctx.font = 'bold 32px Nebulax, Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F3F4F6';
      statsData.slice(3, 6).forEach((stat, i) => ctx.fillText(`${stat.label}`, rightLabelX, startY + i * statSpacing));

      ctx.font = 'bold 32px Nebulax, Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      statsData.slice(3, 6).forEach((stat, i) => ctx.fillText(String(stat.value), rightValueX, startY + i * statSpacing));
    } else {
      const [cardImg, playerImg] = await Promise.all([
        loadImage(specialCardData.templateUrl),
        loadImage(playerData.photoUrl),
      ]);

      ctx.drawImage(cardImg, 0, 0, CARD_WIDTH, CARD_HEIGHT);

      let textColor: string, valueColor: string, nameColor: string, overallTextColor: string, overallValueColor: string;

      if (specialCardData.color_1 || specialCardData.color_2 || specialCardData.color_3 || specialCardData.color_4 || specialCardData.color_5) {
        const optimalColors = getOptimalColors(ctx);
        nameColor = specialCardData.color_1 || optimalColors.textColor;
        textColor = specialCardData.color_2 || optimalColors.textColor;
        valueColor = specialCardData.color_3 || optimalColors.valueColor;
        overallTextColor = specialCardData.color_4 || optimalColors.textColor;
        overallValueColor = specialCardData.color_5 || optimalColors.valueColor;
      } else {
        const optimalColors = getOptimalColors(ctx);
        nameColor = optimalColors.textColor;
        textColor = optimalColors.textColor;
        valueColor = optimalColors.valueColor;
        overallTextColor = optimalColors.textColor;
        overallValueColor = optimalColors.valueColor;
      }

      if (template === 'regista') {
        nameColor = '#F3F4F6';
        textColor = '#F3F4F6';
        valueColor = '#FFD700';
        overallTextColor = '#F3F4F6';
        overallValueColor = '#FFD700';
      }

      const maxFaceSize = 420;
      let faceY = 156;
      switch (template) {
        case '1presenza':
          faceY = 158;
          break;
        case 'goleador':
          faceY = 160;
          break;
        default:
          faceY = 156;
      }

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

      const overallX = 80;
      const overallTextY = 140;
      const overallValueY = 210;

      ctx.font = 'bold 20px Nebulax, Arial';
      ctx.fillStyle = overallTextColor;
      ctx.textAlign = 'center';
      ctx.fillText('OVERALL', overallX, overallTextY);

      ctx.font = 'bold 70px Nebulax, Arial';
      ctx.fillStyle = overallValueColor;
      ctx.fillText(String(overall), overallX, overallValueY);

      ctx.font = 'bold 56px Nebulax, Arial';
      ctx.fillStyle = nameColor;
      ctx.textAlign = 'center';
      ctx.fillText(playerData.nome, CARD_WIDTH / 2, 638);

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

      const startY = 714;
      const statSpacing = 45;
      const leftLabelX = 100;
      const leftValueX = 220;
      const rightLabelX = 360;
      const rightValueX = 480;

      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = textColor;
      leftStats.forEach((stat, i) => ctx.fillText(`${stat.label}`, leftLabelX, startY + i * statSpacing));

      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = valueColor;
      leftStats.forEach((stat, i) => ctx.fillText(String(stat.value), leftValueX, startY + i * statSpacing));

      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = textColor;
      rightStats.forEach((stat, i) => ctx.fillText(`${stat.label}`, rightLabelX, startY + i * statSpacing));

      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = valueColor;
      rightStats.forEach((stat, i) => ctx.fillText(String(stat.value), rightValueX, startY + i * statSpacing));
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
    console.error('Errore nella generazione della card special:', error);
    return NextResponse.json(
      { error: 'Errore nella generazione della card special', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}
