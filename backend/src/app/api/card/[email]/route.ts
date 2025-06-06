import { NextRequest, NextResponse } from 'next/server';
import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import { promises as fs } from 'fs';
import Airtable from 'airtable';

// Configurazione Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Credenziali Airtable mancanti nelle variabili d\'ambiente');
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: apiKey
});

const base = Airtable.base(baseId);

// Registra font Nebulax
try {
  registerFont(path.join(process.cwd(), 'public/fonts/Nebulax-3lqLp.ttf'), { family: 'Nebulax' });
} catch (error) {
  console.log('Font Nebulax non trovato, uso Arial come fallback');
}

// Funzione per ottenere i dati del giocatore direttamente da Airtable
async function getPlayerByEmail(email: string) {
  try {
    console.log('Recupero dati giocatore per email:', email);
    
    // Accesso diretto ad Airtable invece di chiamata HTTP ricorsiva
    const records = await base('players').select({
      filterByFormula: `{email} = '${email}'`
    }).all();
    
    if (records.length === 0) {
      console.log('Giocatore non trovato per email:', email);
      return null;
    }
    
    const record = records[0];
    
    // Gestisce il campo photoUrl come attachment di Airtable
    const photoAttachments = record.get('photoUrl') as any[];
    let fotoUrl = '';
    
    if (photoAttachments && Array.isArray(photoAttachments) && photoAttachments.length > 0) {
      fotoUrl = photoAttachments[0].url || '';
      console.log(`Foto trovata per email ${email}: ${fotoUrl}`);
    } else {
      console.log(`Nessuna foto per email ${email}`);
    }
    
    const playerData = {
      nome: record.get('name') as string || 'Giocatore Sconosciuto',
      email: record.get('email') as string || email,
      photoUrl: fotoUrl,
      ATT: Number(record.get('Attacco')) || 50,
      DEF: Number(record.get('Difesa')) || 50,
      VEL: Number(record.get('Velocità')) || 50,
      FOR: Number(record.get('Forza')) || 50,
      PAS: Number(record.get('Passaggio')) || 50,
      POR: Number(record.get('Portiere')) || 50
    };
    
    console.log('Dati giocatore trovati:', playerData);
    return playerData;
  } catch (error) {
    console.error('Errore nel recupero dati giocatore:', error);
    return null;
  }
}

const CARD_WIDTH = 600;
const CARD_HEIGHT = 864;

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
    console.log('Dati giocatore recuperati:', playerData);
    
    if (!playerData) {
      return NextResponse.json({ 
        error: `Giocatore con email ${email} non trovato` 
      }, { status: 404 });
    }

    const stats = [playerData.ATT, playerData.DEF, playerData.VEL, playerData.FOR, playerData.PAS, playerData.POR];
    
    // Calcola overall come media delle 5 migliori statistiche
    const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
    const overall = Math.round(top5Stats.reduce((a, b) => a + b, 0) / 5);

    const template = overall >= 90 ? 'ultimate' : overall >= 78 ? 'oro' : overall >= 65 ? 'argento' : 'bronzo';
    console.log(`Overall: ${overall}, Template: ${template}`);

    // Percorsi per template card
    const cardPath = path.join(process.cwd(), 'public/cards', `${template}.png`);

    // Verifica esistenza template e foto
    let useSimpleCard = false;
    let hasPlayerPhoto = false;
    
    try {
      await fs.access(cardPath);
      console.log(`Template trovato: ${template}.png`);
    } catch {
      console.log('Template non trovato, userò card semplificata');
      useSimpleCard = true;
    }
    
    // Verifica se esiste l'URL della foto di Airtable
    if (playerData.photoUrl && playerData.photoUrl.trim() !== '') {
      hasPlayerPhoto = true;
      console.log(`Foto giocatore trovata su Airtable: ${playerData.photoUrl}`);
    } else {
      console.log('Nessuna foto trovata su Airtable');
    }

    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx = canvas.getContext('2d');

    if (useSimpleCard || !hasPlayerPhoto) {
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
      ctx.fillText(playerData.nome, CARD_WIDTH / 2, 620); // Alzato di 7 punti

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
      const leftValueX = 200;      // Colonna 2: Valori sinistra
      const rightLabelX = 380;     // Colonna 3: Labels destra
      const rightValueX = 480;     // Colonna 4: Valori destra

      const startY = 689; // Alzato di 2 punti
      const statSpacing = 45;

      // Scritte statistiche colonna sinistra (ATT, VEL, PAS)
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F3F4F6';
      statsData.slice(0, 3).forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(`${stat.label}`, leftLabelX, y);
      });

      // Valori statistiche colonna sinistra
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      statsData.slice(0, 3).forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(String(stat.value), leftValueX, y);
      });

      // Scritte statistiche colonna destra (FOR, DIF, POR)
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F3F4F6';
      statsData.slice(3, 6).forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(`${stat.label}`, rightLabelX, y);
      });

      // Valori statistiche colonna destra
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      statsData.slice(3, 6).forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(String(stat.value), rightValueX, y);
      });

    } else {
      // **CARD COMPLETA CON FILE**
      
      // Carica immagini
      const [cardImg, playerImg] = await Promise.all([
        loadImage(cardPath),
        loadImage(playerData.photoUrl) // Usa l'URL di Airtable
      ]);

      // Disegna template
      ctx.drawImage(cardImg, 0, 0, CARD_WIDTH, CARD_HEIGHT);

      // Disegna foto giocatore mantenendo le proporzioni originali
      const maxFaceSize = 420;
      const faceY = template === 'ultimate' ? 138 : 136; // Alzato di 7 punti
      
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
      ctx.fillText(playerData.nome, CARD_WIDTH / 2, 618); // Alzato di 7 punti

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

      const startY = 689; // Alzato di 2 punti
      const statSpacing = 45;

      // Scritte statistiche colonna sinistra (ATT, VEL, PAS)
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = textColor;
      leftStats.forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(`${stat.label}`, 100, y);
      });

      // Valori statistiche colonna sinistra (centrati nella colonna)
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = valueColor;
      leftStats.forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(String(stat.value), 200, y);
      });

      // Scritte statistiche colonna destra (FOR, DIF, POR)
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = textColor;
      rightStats.forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(`${stat.label}`, 380, y);
      });

      // Valori statistiche colonna destra (centrati nella colonna)
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = valueColor;
      rightStats.forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(String(stat.value), 480, y);
      });
    }

    // Converti canvas in PNG Buffer
    const buffer = canvas.toBuffer('image/png');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString()
      },
    });

  } catch (error) {
    console.error('Errore nella generazione della card:', error);
    return NextResponse.json({ 
      error: 'Errore nella generazione della card',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 