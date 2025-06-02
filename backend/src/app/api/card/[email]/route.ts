import { NextRequest, NextResponse } from 'next/server';
import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import fs from 'fs/promises';
import { getPlayerByEmail } from '@/utils/airtable';

// Registra font Nebulax
try {
  registerFont(path.join(process.cwd(), 'public/fonts/Nebulax-3lqLp.ttf'), { family: 'Nebulax' });
} catch (error) {
  console.log('Font Nebulax non trovato, uso Arial come fallback');
}

const CARD_WIDTH = 600;
const CARD_HEIGHT = 900;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Await dei parametri per Next.js 15
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);
    console.log('EMAIL PARAM estratto:', email);
    
    // Recupera dati da Airtable
    const playerData = await getPlayerByEmail(email);
    console.log('Dati giocatore recuperati da Airtable:', playerData);
    
    if (!playerData) {
      return NextResponse.json({ 
        error: `Giocatore con email ${email} non trovato in Airtable` 
      }, { status: 404 });
    }

    const stats = [playerData.ATT, playerData.DEF, playerData.VEL, playerData.FOR, playerData.PAS, playerData.POR];
    
    // Calcola overall come media delle 5 migliori statistiche
    const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
    const overall = Math.round(top5Stats.reduce((a, b) => a + b, 0) / 5);

    // Scegli template in base ai criteri del backend
    let template = 'bronzo';
    if (overall >= 90) template = 'ultimate';      // ≥ 90
    else if (overall >= 78) template = 'oro';      // 78-89 (Backend originale)
    else if (overall >= 65) template = 'argento';  // 65-77 (Backend originale)
    // else rimane 'bronzo' per < 65

    console.log(`Overall: ${overall}, Template: ${template}`);

    // **GENERA CARD SEMPLIFICATA SE I FILE NON ESISTONO**
    const cardPath = path.join(process.cwd(), 'public/cards', `${template}.png`);
    const playerPath = path.join(process.cwd(), 'public/players', `${email}.jpg`);

    // Verifica esistenza file
    let useSimpleCard = false;
    try {
      await fs.access(cardPath);
      await fs.access(playerPath);
      console.log(`File trovati, generazione card completa`);
    } catch {
      console.log('File template/foto non trovati, generazione card semplificata');
      useSimpleCard = true;
    }

    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx = canvas.getContext('2d');

    if (useSimpleCard) {
      // **CARD SEMPLIFICATA SENZA FILE ESTERNI**
      
      // Background colorato in base al template
      ctx.fillStyle = template === 'ultimate' ? '#4C1D95' : template === 'oro' ? '#B45309' : template === 'argento' ? '#374151' : '#92400E';
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
      
      // Border
      ctx.strokeStyle = template === 'ultimate' ? '#8B5CF6' : template === 'oro' ? '#FFD700' : template === 'argento' ? '#C0C0C0' : '#CD7F32';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, CARD_WIDTH - 8, CARD_HEIGHT - 8);

      // Player photo placeholder
      ctx.fillStyle = '#6B7280';
      ctx.fillRect(90, 150, 420, 420);
      ctx.fillStyle = '#F3F4F6';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('FOTO', CARD_WIDTH / 2, 380);

      // Template label
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#F3F4F6';
      ctx.textAlign = 'center';
      ctx.fillText(template.toUpperCase(), CARD_WIDTH / 2, 50);

      // Overall
      ctx.font = 'bold 20px Arial';
      ctx.fillText('OVERALL', 90, 140);
      ctx.font = 'bold 70px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(String(overall), 90, 210);

      // Nome
      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = '#F3F4F6';
      ctx.fillText(playerData.nome, CARD_WIDTH / 2, 640);

      // Stats - versione semplificata
      const statsData = [
        { label: 'ATT', value: Math.round(playerData.ATT) },
        { label: 'VEL', value: Math.round(playerData.VEL) },
        { label: 'PAS', value: Math.round(playerData.PAS) },
        { label: 'FOR', value: Math.round(playerData.FOR) },
        { label: 'DIF', value: Math.round(playerData.DEF) },
        { label: 'POR', value: Math.round(playerData.POR) }
      ];

      // Posizioni delle 4 colonne - gap simmetrico di 80px dal centro
      const leftLabelX = 100;      // Colonna 1: Labels sinistra
      const leftValueX = 200;      // Colonna 2: Valori sinistra (parte destra arriva a ~220px)
      const rightLabelX = 380;     // Colonna 3: Labels destra (iniziano a +80px dal centro)
      const rightValueX = 480;     // Colonna 4: Valori destra (parte destra arriva a ~500px)
      const startY = 715;
      const statSpacing = 45;

      ctx.font = 'bold 28px Arial';
      
      // Prima colonna (ATT, VEL, PAS)
      for (let i = 0; i < 3; i++) {
        const stat = statsData[i];
        const y = startY + i * statSpacing;
        
        // Label
        ctx.fillStyle = '#F3F4F6';
        ctx.textAlign = 'left';
        ctx.fillText(stat.label, leftLabelX, y);
        
        // Valore (centrato nella colonna)
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText(String(stat.value), leftValueX, y);
      }
      
      // Seconda colonna (FOR, DIF, POR)
      for (let i = 3; i < 6; i++) {
        const stat = statsData[i];
        const y = startY + (i - 3) * statSpacing;
        
        // Label
        ctx.fillStyle = '#F3F4F6';
        ctx.textAlign = 'left';
        ctx.fillText(stat.label, rightLabelX, y);
        
        // Valore (centrato nella colonna)
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText(String(stat.value), rightValueX, y);
      }

    } else {
      // **CARD COMPLETA CON FILE**
      
      // Carica immagini
      const [cardImg, playerImg] = await Promise.all([
        loadImage(cardPath),
        loadImage(playerPath)
      ]);

      // Disegna template
      ctx.drawImage(cardImg, 0, 0, CARD_WIDTH, CARD_HEIGHT);

      // Disegna foto giocatore mantenendo le proporzioni originali
      const maxFaceSize = 420;
      const faceY = template === 'ultimate' ? 158 : 156;
      
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

      // Colori fissi in base al template (come era in origine)
      let textColor = template === 'ultimate' ? '#C0C0C0' : '#2B2B2B';
      let valueColor = template === 'ultimate' ? '#FFD700' : '#404040';

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
      ctx.fillText(playerData.nome, CARD_WIDTH / 2, 638);

      // Stats - Colonna sinistra: ATT, VEL, PAS
      const leftStats = [
        { label: 'ATT', value: Math.round(playerData.ATT) },
        { label: 'VEL', value: Math.round(playerData.VEL) },
        { label: 'PAS', value: Math.round(playerData.PAS) }
      ];

      // Stats - Colonna destra: FOR, DIF, POR  
      const rightStats = [
        { label: 'FOR', value: Math.round(playerData.FOR) },
        { label: 'DIF', value: Math.round(playerData.DEF) },
        { label: 'POR', value: Math.round(playerData.POR) }
      ];

      const startY = 715;
      const statSpacing = 45;

      // Scritte statistiche colonna sinistra
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = textColor;
      leftStats.forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(`${stat.label}`, 100, y);  // Etichette sinistra
      });

      // Valori statistiche colonna sinistra
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = valueColor;
      leftStats.forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(String(stat.value), 200, y);  // Valori centrati, parte destra arriva a ~220px
      });

      // Scritte statistiche colonna destra
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = textColor;
      rightStats.forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(`${stat.label}`, 380, y);  // Etichette destra iniziano a +80px dal centro
      });

      // Valori statistiche colonna destra
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = valueColor;
      rightStats.forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(String(stat.value), 480, y);  // Spostati a destra, parte destra arriva a ~500px
      });
    }

    console.log('Card generata con successo!');

    // Output PNG
    const buffer = canvas.toBuffer('image/png');
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${playerData.nome}_card.png"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Errore nella generazione della card:', error);
    return NextResponse.json({ 
      error: 'Errore interno nella generazione della card',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 