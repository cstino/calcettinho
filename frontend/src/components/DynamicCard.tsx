'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';

interface CardData {
  player: {
    nome: string;
    email: string;
    photoUrl: string;
    ATT: number;
    DEF: number;
    VEL: number;
    FOR: number;
    PAS: number;
    POR: number;
  };
  stats: {
    ATT: number;
    VEL: number;
    PAS: number;
    FOR: number;
    DIF: number;
    POR: number;
  };
  overall: number;
  template: string;
  hasPhoto: boolean;
  cardTemplateUrl: string;
  photoUrl: string | null;
}

interface DynamicCardProps {
  cardData: CardData;
  className?: string;
  onImageReady?: (imageUrl: string) => void;
}

const CARD_WIDTH = 600;
const CARD_HEIGHT = 864;

const DynamicCard: React.FC<DynamicCardProps> = ({ cardData, className = '', onImageReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedData, setLastGeneratedData] = useState<string | null>(null);

  // Serialize cardData per confronto stabile
  const cardDataKey = cardData ? JSON.stringify({
    template: cardData.template,
    overall: cardData.overall,
    playerName: cardData.player.nome,
    hasPhoto: cardData.hasPhoto,
    photoUrl: cardData.photoUrl,
    cardTemplateUrl: cardData.cardTemplateUrl,
    stats: cardData.stats
  }) : null;

  useEffect(() => {
    if (!cardData || !canvasRef.current || isGenerating || cardDataKey === lastGeneratedData) return;

    const generateCard = async () => {
      if (isGenerating) return;
      
      setIsGenerating(true);
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;

      try {
        console.log('🎯 DynamicCard Debug - Generating:', {
          template: cardData.template,
          playerName: cardData.player.nome,
          hasPhoto: cardData.hasPhoto,
          photoUrl: cardData.photoUrl,
          cardTemplateUrl: cardData.cardTemplateUrl,
          canUseFullCard: !!(cardData.hasPhoto && cardData.photoUrl && cardData.cardTemplateUrl)
        });
        
        if (cardData.hasPhoto && cardData.photoUrl && cardData.cardTemplateUrl) {
          // **CARD COMPLETA CON TEMPLATE E FOTO**
          const [templateImg, playerImg] = await Promise.all([
            loadImage(cardData.cardTemplateUrl),
            loadImage(cardData.photoUrl)
          ]);

          // Disegna template
          ctx.drawImage(templateImg, 0, 0, CARD_WIDTH, CARD_HEIGHT);

          // Disegna foto giocatore
          const maxFaceSize = 420;
          const faceY = cardData.template === 'ultimate' ? 138 : 136;
          
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

          // Colori in base al template
          const textColor = cardData.template === 'ultimate' ? '#C0C0C0' : '#2B2B2B';
          const valueColor = cardData.template === 'ultimate' ? '#FFD700' : '#404040';

          // Overall
          const overallX = cardData.template === 'ultimate' ? 90 : 80;
          const overallTextY = cardData.template === 'ultimate' ? 155 : 140;
          const overallValueY = cardData.template === 'ultimate' ? 225 : 210;

          ctx.font = 'bold 20px Arial';
          ctx.fillStyle = textColor;
          ctx.textAlign = 'center';
          ctx.fillText('OVERALL', overallX, overallTextY);

          ctx.font = 'bold 70px Arial';
          ctx.fillStyle = valueColor;
          ctx.fillText(String(cardData.overall), overallX, overallValueY);

          // Nome
          ctx.font = 'bold 56px Arial';
          ctx.fillStyle = textColor;
          ctx.fillText(cardData.player.nome, CARD_WIDTH / 2, 618);

          // Stats
          drawStats(ctx, cardData.stats, textColor, valueColor);

        } else {
          // **CARD SEMPLIFICATA SENZA FOTO**
          drawSimpleCard(ctx, cardData);
        }

        // Notifica che l'immagine è pronta
        if (onImageReady) {
          canvas.toBlob((blob) => {
            if (blob) {
              const imageUrl = URL.createObjectURL(blob);
              onImageReady(imageUrl);
            }
          }, 'image/png');
        }

        // Segna come completata
        setLastGeneratedData(cardDataKey);

      } catch (error) {
        console.error('🚨 Errore nella generazione della card:', error);
        // Fallback alla card semplificata
        drawSimpleCard(ctx, cardData);
        
        if (onImageReady) {
          canvas.toBlob((blob) => {
            if (blob) {
              const imageUrl = URL.createObjectURL(blob);
              onImageReady(imageUrl);
            }
          }, 'image/png');
        }
        
        setLastGeneratedData(cardDataKey);
      } finally {
        setIsGenerating(false);
      }
    };

    generateCard();
  }, [cardDataKey, isGenerating, lastGeneratedData]);

  // Funzione helper per caricare immagini
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Funzione per disegnare le statistiche
  const drawStats = (ctx: CanvasRenderingContext2D, stats: CardData['stats'], textColor: string, valueColor: string) => {
    const leftStats = [
      { label: 'ATT', value: stats.ATT },
      { label: 'VEL', value: stats.VEL },
      { label: 'PAS', value: stats.PAS }
    ];

    const rightStats = [
      { label: 'FOR', value: stats.FOR },
      { label: 'DIF', value: stats.DIF },
      { label: 'POR', value: stats.POR }
    ];

    const startY = 689;
    const statSpacing = 45;

    // Statistiche colonna sinistra
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    leftStats.forEach((stat, i) => {
      const y = startY + i * statSpacing;
      ctx.fillText(stat.label, 100, y);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = valueColor;
    leftStats.forEach((stat, i) => {
      const y = startY + i * statSpacing;
      ctx.fillText(String(stat.value), 220, y);
    });

    // Statistiche colonna destra
    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    rightStats.forEach((stat, i) => {
      const y = startY + i * statSpacing;
      ctx.fillText(stat.label, 360, y);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = valueColor;
    rightStats.forEach((stat, i) => {
      const y = startY + i * statSpacing;
      ctx.fillText(String(stat.value), 480, y);
    });
  };

  // Funzione per disegnare card semplificata
  const drawSimpleCard = (ctx: CanvasRenderingContext2D, cardData: CardData) => {
    // Background in base al template
    const bgColor = cardData.template === 'ultimate' ? '#4A1D96' : 
                   cardData.template === 'oro' ? '#B45309' :
                   cardData.template === 'argento' ? '#6B7280' : 
                   cardData.template === 'bronzo' ? '#92400E' : '#374151';
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    // Border
    ctx.strokeStyle = cardData.template === 'ultimate' ? '#7C3AED' : '#FFD700';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, CARD_WIDTH - 8, CARD_HEIGHT - 8);

    // Photo placeholder
    ctx.fillStyle = '#6B7280';
    ctx.fillRect(90, 150, 420, 420);
    ctx.fillStyle = '#F3F4F6';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FOTO', CARD_WIDTH / 2, 380);

    // Template label
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#F3F4F6';
    ctx.fillText(cardData.template.toUpperCase(), CARD_WIDTH / 2, 50);

    // Overall
    ctx.font = 'bold 20px Arial';
    ctx.fillText('OVERALL', 90, 140);
    ctx.font = 'bold 70px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(String(cardData.overall), 90, 210);

    // Nome
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#F3F4F6';
    ctx.fillText(cardData.player.nome, CARD_WIDTH / 2, 620);

    // Stats semplificati
    drawStats(ctx, cardData.stats, '#F3F4F6', '#FFD700');
  };

  return (
    <div className={className}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-auto rounded-lg shadow-lg"
        style={{ maxWidth: '300px' }}
      />
    </div>
  );
};

export default DynamicCard; 