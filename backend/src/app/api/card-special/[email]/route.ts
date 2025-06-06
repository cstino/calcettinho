import { NextRequest, NextResponse } from 'next/server';
import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import { promises as fs } from 'fs';
import Airtable from 'airtable';
import { getPlayerByEmail, getSpecialCardData } from '@/utils/airtable';

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

const CARD_WIDTH = 600;
const CARD_HEIGHT = 900;

// Funzione per calcolare la luminosità di un pixel RGB
function calculatePixelBrightness(r: number, g: number, b: number): number {
  // Formula standard per luminosità percepita
  return (0.299 * r + 0.587 * g + 0.114 * b);
}

// Funzione per analizzare la luminosità media di un'area dell'immagine
function analyzeAreaBrightness(ctx: any, x: number, y: number, width: number, height: number): number {
  try {
    const imageData = ctx.getImageData(x, y, width, height);
    const pixels = imageData.data;
    let totalBrightness = 0;
    let pixelCount = 0;

    // Analizza ogni pixel nell'area
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      // Ignora pixel trasparenti
      if (pixels[i + 3] > 0) {
        totalBrightness += calculatePixelBrightness(r, g, b);
        pixelCount++;
      }
    }

    return pixelCount > 0 ? totalBrightness / pixelCount : 128;
  } catch (error) {
    console.log('Errore analisi luminosità:', error);
    return 128; // Valore neutro in caso di errore
  }
}

// Funzione per determinare i colori ottimali in base alla luminosità
function getOptimalColors(ctx: any): { textColor: string, valueColor: string } {
  // Punti strategici da campionare (dove verranno posizionate le scritte)
  const sampleAreas = [
    { x: 90, y: 705, width: 60, height: 40 },   // Area statistiche sinistra
    { x: 370, y: 705, width: 60, height: 40 },  // Area statistiche destra  
    { x: 70, y: 170, width: 40, height: 40 },   // Area overall
    { x: 250, y: 620, width: 100, height: 40 }  // Area nome
  ];

  let totalBrightness = 0;
  let areaCount = 0;

  // Analizza ogni area e calcola la luminosità media totale
  sampleAreas.forEach(area => {
    const brightness = analyzeAreaBrightness(ctx, area.x, area.y, area.width, area.height);
    totalBrightness += brightness;
    areaCount++;
    console.log(`📊 Luminosità area (${area.x},${area.y}): ${brightness.toFixed(1)}`);
  });

  const averageBrightness = totalBrightness / areaCount;
  console.log(`🎨 Luminosità media totale: ${averageBrightness.toFixed(1)}`);

  // Determina colori in base alla luminosità
  if (averageBrightness > 128) {
    // Sfondo chiaro → testo scuro
    console.log('✅ Sfondo chiaro rilevato: uso testo scuro');
    return {
      textColor: '#2B2B2B',    // Grigio scuro per nomi stats e "OVERALL"
      valueColor: '#8B0000'    // Rosso scuro per valori stats e valore overall
    };
  } else {
    // Sfondo scuro → testo chiaro
    console.log('✅ Sfondo scuro rilevato: uso testo chiaro');
    return {
      textColor: '#FFFFFF',    // Bianco per nomi stats e "OVERALL"
      valueColor: '#FFD700'    // Oro per valori stats e valore overall
    };
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Await dei parametri per Next.js 15
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);
    
    // Ottieni template dalla query string (default: '1presenza')
    const { searchParams } = new URL(req.url);
    const template = searchParams.get('template') || '1presenza';
    
    console.log('EMAIL PARAM estratto:', email, 'Template:', template);
    
    // Recupera dati da Airtable
    const playerData = await getPlayerByEmail(email);
    const specialCardData = await getSpecialCardData(template);
    
    console.log('Dati giocatore recuperati:', playerData);
    console.log('Dati card special recuperati:', specialCardData);
    
    if (!playerData) {
      return NextResponse.json({ 
        error: `Giocatore con email ${email} non trovato` 
      }, { status: 404 });
    }

    if (!specialCardData) {
      return NextResponse.json({ 
        error: `Card special con template ${template} non trovata` 
      }, { status: 404 });
    }

    const stats = [playerData.ATT, playerData.DEF, playerData.VEL, playerData.FOR, playerData.PAS, playerData.POR];
    
    // Calcola overall come media delle 5 migliori statistiche
    const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
    const overall = Math.round(top5Stats.reduce((a, b) => a + b, 0) / 5);

    console.log(`Overall: ${overall}, Template special: ${template}`);

    // MODIFICATO: Usa template da Airtable invece di file locale
    let useSimpleCard = false;
    let hasPlayerPhoto = false;
    let hasTemplateImage = false;
    
    // Verifica se esiste l'URL del template da Airtable
    if (specialCardData.templateUrl && typeof specialCardData.templateUrl === 'string' && specialCardData.templateUrl.trim() !== '') {
      hasTemplateImage = true;
      console.log(`Template immagine trovata su Airtable: ${specialCardData.templateUrl}`);
    } else {
      console.log('Nessuna template immagine trovata su Airtable');
      useSimpleCard = true;
    }
    
    // Verifica se esiste l'URL della foto di Airtable
    if (playerData.photoUrl && typeof playerData.photoUrl === 'string' && playerData.photoUrl.trim() !== '') {
      hasPlayerPhoto = true;
      console.log(`Foto giocatore trovata su Airtable: ${playerData.photoUrl}`);
    } else {
      console.log('Nessuna foto trovata su Airtable');
    }

    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx = canvas.getContext('2d');

    if (useSimpleCard || !hasPlayerPhoto || !hasTemplateImage) {
      console.log(`⚠️ USANDO CARD SPECIAL SEMPLIFICATA - Template: ${hasTemplateImage}, Foto: ${hasPlayerPhoto}`);
      
      // **CARD SPECIAL SEMPLIFICATA SENZA FILE ESTERNI**
      
      // Background dorato per achievement
      ctx.fillStyle = '#B45309';
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
      
      // Border dorato
      ctx.strokeStyle = '#FFD700';
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
      ctx.fillText(`SPECIAL: ${template.toUpperCase()}`, CARD_WIDTH / 2, 50);

      // Overall
      ctx.font = 'bold 20px Arial';
      ctx.fillText('OVERALL', 90, 140);
      ctx.font = 'bold 70px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(String(overall), 90, 210);

      // Nome
      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = '#F3F4F6';
      ctx.fillText(playerData.nome, CARD_WIDTH / 2, 660); // Abbassato di altri 20 punti (era 640)

      // Stats - versione semplificata
      const statsData = [
        { label: 'ATT', value: Math.round(playerData.ATT) },
        { label: 'VEL', value: Math.round(playerData.VEL) },
        { label: 'PAS', value: Math.round(playerData.PAS) },
        { label: 'FOR', value: Math.round(playerData.FOR) },
        { label: 'DIF', value: Math.round(playerData.DEF) },
        { label: 'POR', value: Math.round(playerData.POR) }
      ];

      // POSIZIONI AGGIUSTATE PER FONT NEBULAX
      const leftLabelX = 85;       // Colonna 1: Labels sinistra (era 100)
      const leftValueX = 185;      // Colonna 2: Valori sinistra (era 200)
      const rightLabelX = 365;     // Colonna 3: Labels destra (era 380)
      const rightValueX = 465;     // Colonna 4: Valori destra (era 480)

      const startY = 714; // Alzato di 15 pixel (era 729)
      const statSpacing = 45;

      // Scritte statistiche colonna sinistra (ATT, VEL, PAS) - POSIZIONI AGGIUSTATE
      ctx.font = 'bold 32px Nebulax, Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F3F4F6';
      statsData.slice(0, 3).forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(`${stat.label}`, leftLabelX, y);
      });

      // Valori statistiche colonna sinistra (centrati nella colonna) - POSIZIONI AGGIUSTATE
      ctx.font = 'bold 32px Nebulax, Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      statsData.slice(0, 3).forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(String(stat.value), leftValueX, y);
      });

      // Scritte statistiche colonna destra (FOR, DIF, POR) - POSIZIONI AGGIUSTATE
      ctx.font = 'bold 32px Nebulax, Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F3F4F6';
      statsData.slice(3, 6).forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(`${stat.label}`, rightLabelX, y);
      });

      // Valori statistiche colonna destra (centrati nella colonna) - POSIZIONI AGGIUSTATE
      ctx.font = 'bold 32px Nebulax, Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      statsData.slice(3, 6).forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(String(stat.value), rightValueX, y);
      });

    } else {
      // **CARD SPECIAL COMPLETA CON FILE**
      
      // Carica immagini
      const [cardImg, playerImg] = await Promise.all([
        loadImage(specialCardData.templateUrl),
        loadImage(playerData.photoUrl) // Usa l'URL di Airtable
      ]);

      // Disegna template special
      ctx.drawImage(cardImg, 0, 0, CARD_WIDTH, CARD_HEIGHT);

      // ANALISI AUTOMATICA DEI COLORI in base alla luminosità dello sfondo
      const optimalColors = getOptimalColors(ctx);
      const textColor = optimalColors.textColor;   // Per nomi stats e "OVERALL"
      const valueColor = optimalColors.valueColor; // Per valori stats e valore overall

      console.log(`🎨 Colori determinati automaticamente: text=${textColor}, value=${valueColor}`);

      // Disegna foto giocatore - posizioni specifiche per template special
      const maxFaceSize = 420;
      let faceY = 156; // Alzato di 5 pixel (era 161)
      
      // Adjust position based on special template if needed
      switch(template) {
        case '1presenza':
          faceY = 158; // Alzato di 5 pixel (era 163)
          break;
        case 'goleador':
          faceY = 160; // Alzato di 5 pixel (era 165)
          break;
        // Add more template-specific positions as needed
        default:
          faceY = 156; // Alzato di 5 pixel (era 161)
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

      // Overall
      const overallX = 80;
      const overallTextY = 140;
      const overallValueY = 210;

      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText('OVERALL', overallX, overallTextY);

      ctx.font = 'bold 70px Arial';
      ctx.fillStyle = valueColor;
      ctx.fillText(String(overall), overallX, overallValueY);

      // Nome giocatore - alzato di 5 pixel
      ctx.font = 'bold 56px Arial';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(playerData.nome, CARD_WIDTH / 2, 638); // Alzato di 5 pixel (era 643)

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

      const startY = 714; // Alzato di 15 pixel (era 729)
      const statSpacing = 45;

      // POSIZIONI AGGIUSTATE PER FONT NEBULAX
      const leftLabelX = 85;       // Colonna 1: Labels sinistra (era 100)
      const leftValueX = 185;      // Colonna 2: Valori sinistra (era 200)
      const rightLabelX = 365;     // Colonna 3: Labels destra (era 380)
      const rightValueX = 465;     // Colonna 4: Valori destra (era 480)

      // Scritte statistiche colonna sinistra (ATT, VEL, PAS) - POSIZIONI AGGIUSTATE
      ctx.font = 'bold 32px Nebulax, Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = textColor;
      leftStats.forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(`${stat.label}`, leftLabelX, y);
      });

      // Valori statistiche colonna sinistra (centrati nella colonna) - POSIZIONI AGGIUSTATE
      ctx.font = 'bold 32px Nebulax, Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = valueColor;
      leftStats.forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(String(stat.value), leftValueX, y);
      });

      // Scritte statistiche colonna destra (FOR, DIF, POR) - POSIZIONI AGGIUSTATE
      ctx.font = 'bold 32px Nebulax, Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = textColor;
      rightStats.forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(`${stat.label}`, rightLabelX, y);
      });

      // Valori statistiche colonna destra (centrati nella colonna) - POSIZIONI AGGIUSTATE
      ctx.font = 'bold 32px Nebulax, Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = valueColor;
      rightStats.forEach((stat, i) => {
        const y = startY + i * statSpacing;
        ctx.fillText(String(stat.value), rightValueX, y);
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
    console.error('Errore nella generazione della card special:', error);
    return NextResponse.json({ 
      error: 'Errore nella generazione della card special',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 