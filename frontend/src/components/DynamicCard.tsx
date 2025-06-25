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
  // Card base (dal backend Next.js)
  cardTemplateUrl?: string;
  // Special cards (da Netlify functions)
  specialCardTemplateUrl?: string;
  hasTemplate?: boolean;
  photoUrl: string | null;
  // Colori personalizzati per special cards
  specialCard?: {
    color_1?: string; // Colore nome giocatore
    color_2?: string; // Colore nomi abilità
    color_3?: string; // Colore valori abilità
    color_4?: string; // Colore scritta "overall"
    color_5?: string; // Colore valore overall
  };
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
        // Determina quale template URL usare (card base o special)
        const templateUrl = cardData.specialCardTemplateUrl || cardData.cardTemplateUrl;
        
        console.log('🎯 DynamicCard Debug - Generating:', {
          template: cardData.template,
          playerName: cardData.player.nome,
          hasPhoto: cardData.hasPhoto,
          photoUrl: cardData.photoUrl,
          cardTemplateUrl: cardData.cardTemplateUrl,
          specialCardTemplateUrl: cardData.specialCardTemplateUrl,
          templateUrl: templateUrl,
          canUseFullCard: !!(cardData.hasPhoto && cardData.photoUrl && templateUrl)
        });
        
        if (cardData.hasPhoto && cardData.photoUrl && templateUrl) {
          // **CARD COMPLETA CON TEMPLATE E FOTO**
          console.log(`🎨 Loading template from: ${templateUrl}`);
          console.log(`📸 Loading photo from: ${cardData.photoUrl}`);
          
          const [templateImg, playerImg] = await Promise.all([
            loadImage(templateUrl),
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

          // Colori in base al template o personalizzati per special cards
          let textColor, valueColor, nameColor, overallTextColor, overallValueColor;
          
          if (cardData.specialCard && (cardData.specialCard.color_1 || cardData.specialCard.color_2 || cardData.specialCard.color_3 || cardData.specialCard.color_4 || cardData.specialCard.color_5)) {
            // USA COLORI PERSONALIZZATI PER SPECIAL CARDS
            const defaultTextColor = cardData.template === 'ultimate' ? '#C0C0C0' : '#2B2B2B';
            const defaultValueColor = cardData.template === 'ultimate' ? '#FFD700' : '#404040';
            
            nameColor = cardData.specialCard.color_1 || defaultTextColor;
            textColor = cardData.specialCard.color_2 || defaultTextColor;
            valueColor = cardData.specialCard.color_3 || defaultValueColor;
            overallTextColor = cardData.specialCard.color_4 || defaultTextColor;
            overallValueColor = cardData.specialCard.color_5 || defaultValueColor;
          } else {
            // USA COLORI DEFAULT BASATI SUL TEMPLATE
            const defaultTextColor = cardData.template === 'ultimate' ? '#C0C0C0' : '#2B2B2B';
            const defaultValueColor = cardData.template === 'ultimate' ? '#FFD700' : '#404040';
            
            nameColor = defaultTextColor;
            textColor = defaultTextColor;
            valueColor = defaultValueColor;
            overallTextColor = defaultTextColor;
            overallValueColor = defaultValueColor;
          }

          // Overall
          const overallX = cardData.template === 'ultimate' ? 90 : 80;
          const overallTextY = cardData.template === 'ultimate' ? 155 : 140;
          const overallValueY = cardData.template === 'ultimate' ? 225 : 210;

          ctx.font = 'bold 20px Nebulax, Arial';
          ctx.fillStyle = overallTextColor;
          ctx.textAlign = 'center';
          ctx.fillText('OVERALL', overallX, overallTextY);

          ctx.font = 'bold 70px Nebulax, Arial';
          ctx.fillStyle = overallValueColor;
          ctx.fillText(String(cardData.overall), overallX, overallValueY);

          // Nome
          ctx.font = 'bold 56px Nebulax, Arial';
          ctx.fillStyle = nameColor;
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
      img.onload = () => {
        console.log(`✅ Image loaded successfully: ${src.split('/').pop()}`);
        resolve(img);
      };
      img.onerror = (error) => {
        console.error(`❌ Failed to load image: ${src}`);
        console.error('Error details:', error);
        reject(new Error(`Failed to load image: ${src}`));
      };
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
    ctx.font = 'bold 20px Nebulax, Arial';
    ctx.fillText('OVERALL', 90, 140);
    ctx.font = 'bold 70px Nebulax, Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(String(cardData.overall), 90, 210);

    // Nome
    ctx.font = 'bold 48px Nebulax, Arial';
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