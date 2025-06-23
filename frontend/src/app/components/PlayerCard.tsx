'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getCardUrl, getSpecialCardUrl } from '../../utils/api';
import DynamicCard from '../../components/DynamicCard';

interface PlayerCardProps {
  player: {
    id: string;
    name: string;
    email: string;
    overall: number;
    att: number;
    vel: number;
    pas: number;
    for: number;
    dif: number;
    por: number;
  };
}

interface SelectedCard {
  id: string;
  awardType: string;
  status: string;
  selected: boolean;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [cardBackImage, setCardBackImage] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Nuovo stato per gestire dati JSON
  const [cardData, setCardData] = useState<any>(null);
  const [backCardData, setBackCardData] = useState<any>(null);
  const [isJsonResponse, setIsJsonResponse] = useState(false);
  const [isBackJsonResponse, setIsBackJsonResponse] = useState(false);
  const [frontCardImageUrl, setFrontCardImageUrl] = useState<string>('');
  
  const router = useRouter();

  // ✅ Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(isTouchDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Funzione per caricare card con gestione PNG/JSON
  const loadCard = async (url: string, isBack = false) => {
    if (!url) return;
    
    try {
      console.log(`🎯 Loading card: ${url} (isBack: ${isBack})`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      console.log(`📋 Content-Type: ${contentType}`);

      if (contentType?.includes('application/json')) {
        // Risposta JSON da Netlify functions
        const data = await response.json();
        console.log(`🎉 JSON data received:`, data);
        
        if (isBack) {
          setBackCardData(data);
          setIsBackJsonResponse(true);
        } else {
          setCardData(data);
          setIsJsonResponse(true);
        }
      } else {
        // Risposta immagine PNG da backend Next.js
        if (isBack) {
          setCardBackImage(url);
          setIsBackJsonResponse(false);
        } else {
          setFrontCardImageUrl(url);
          setIsJsonResponse(false);
        }
      }
      
      setImageLoading(false);
      setImageError(false);
      
    } catch (error) {
      console.error(`❌ Error loading card: ${error}`);
      setImageLoading(false);
      setImageError(true);
    }
  };

  // Carica la card fronte e retro del giocatore
  useEffect(() => {
    const fetchCards = async () => {
      if (!player.email || player.email === 'email@non-disponibile.com') return;
      
      // Carica sempre la card base come fronte
      const baseCardUrl = getCardUrl(player.email);
      await loadCard(baseCardUrl, false);
      
      try {
        // Controlla se ha una card speciale selezionata
        const response = await fetch(`/api/player-awards/${encodeURIComponent(player.email)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.selectedCard) {
            setSelectedCard(data.selectedCard);
            // Usa la card speciale selezionata come retro
            const specialCardUrl = getSpecialCardUrl(player.email, data.selectedCard.awardType);
            await loadCard(specialCardUrl, true);
          } else {
            // Nessuna card selezionata, usa la card base anche come retro
            await loadCard(baseCardUrl, true);
          }
        }
      } catch (error) {
        // Fallback alla card base come retro
        await loadCard(baseCardUrl, true);
      }
    };

    fetchCards();
  }, [player.email]);

  // ✅ Gestione stato drag per evitare conflitti con click
  const handleCardClick = () => {
    // Solo se non stiamo dragging
    if (!isDragging && player.email && player.email !== 'email@non-disponibile.com') {
      router.push(`/profile/${encodeURIComponent(player.email)}`);
    }
  };

  // Callback memoizzati per quando DynamicCard genera l'immagine
  const handleFrontCardImageReady = useCallback((imageUrl: string) => {
    setFrontCardImageUrl(imageUrl);
  }, []);

  const handleBackCardImageReady = useCallback((imageUrl: string) => {
    setCardBackImage(imageUrl);
  }, []);

  const getCardType = (overall: number) => {
    if (overall >= 90) return 'Ultimate';
    if (overall >= 78) return 'Gold';
    if (overall >= 65) return 'Silver';
    return 'Bronze';
  };

  const getCardLabel = () => {
    if (selectedCard) {
      const labels: Record<string, string> = {
        '1presenza': 'Prima Presenza',
        'goleador': 'Goleador',
        'assistman': 'Assist Man',
        'motm': 'Man of the Match',
        'win3': 'Streak Winner 3',
        'win5': 'Streak Winner 5',
        'win10': 'Streak Winner 10'
      };
      return labels[selectedCard.awardType] || selectedCard.awardType.toUpperCase();
    }
    return 'Card Base';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={!isMobile ? { 
        scale: 1.05,
        rotateY: 5,
        transition: { duration: 0.3 }
      } : {}}
      className={`relative group cursor-pointer w-full max-w-xs sm:max-w-sm mx-auto ${
        player.email && player.email !== 'email@non-disponibile.com'
          ? ''
          : 'cursor-not-allowed opacity-60'
      }`}
      onClick={handleCardClick}
      onMouseEnter={!isMobile ? () => setIsFlipped(true) : undefined}
      onMouseLeave={!isMobile ? () => setIsFlipped(false) : undefined}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* ✅ Card Container con swipe gesture e flip */}
      <motion.div 
        className="relative w-full"
        style={{
          transformStyle: 'preserve-3d',
        }}
        animate={{
          rotateY: isFlipped ? 180 : 0,
        }}
        transition={{
          duration: 0.8,
          ease: "easeInOut"
        }}
        // ✅ Gesture di swipe per mobile
        drag={isMobile ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={() => {
          setIsDragging(true);
        }}
        onDragEnd={(event, info) => {
          setIsDragging(false);
          
          // Threshold per swipe (80px di movimento)
          if (Math.abs(info.offset.x) > 80) {
            setIsFlipped(!isFlipped);
          }
        }}
        whileDrag={{ 
          scale: 1.02,
          rotateZ: 0,
        }}
      >
        {/* FRONTE - Card Normale */}
        <div 
          className="w-full"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)'
          }}
        >
          {/* Loading State */}
          {imageLoading && !imageError && (
            <div className="w-full aspect-[5/7] bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mb-2"></div>
                <p className="text-gray-300 text-sm font-runtime">Caricamento card...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {imageError && (
            <div className="w-full aspect-[5/7] bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg flex flex-col items-center justify-center p-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-900/50 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white font-runtime mb-2">{player.name}</h3>
                <div className="text-center mb-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-gray-600 text-gray-300 text-sm font-runtime">
                    {player.overall} • {getCardType(player.overall)}
                  </span>
                </div>
                <p className="text-gray-400 text-sm font-runtime">Card non disponibile</p>
              </div>
            </div>
          )}

          {/* Card Fronte - PNG o JSON dinamica */}
          {player.email && player.email !== 'email@non-disponibile.com' && !imageLoading && !imageError && (
            <>
              {/* Card PNG (da backend Next.js) */}
              {!isJsonResponse && frontCardImageUrl && (
                <img
                  src={frontCardImageUrl}
                  alt={`Card di ${player.name}`}
                  className="w-full h-auto"
                />
              )}

              {/* Card Dinamica (da dati JSON Netlify) */}
              {isJsonResponse && cardData && (
                <DynamicCard 
                  cardData={cardData}
                  className="w-full"
                  onImageReady={handleFrontCardImageReady}
                />
              )}
            </>
          )}
        </div>

        {/* RETRO - Card Selezionata o Base */}
        <div 
          className="absolute inset-0 w-full"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {player.email && player.email !== 'email@non-disponibile.com' && !imageLoading && !imageError && (
            <>
              {/* Card PNG (da backend Next.js) */}
              {!isBackJsonResponse && cardBackImage && (
                <img
                  src={cardBackImage}
                  alt={selectedCard ? `Card ${selectedCard.awardType} di ${player.name}` : `Card di ${player.name}`}
                  className="w-full h-auto"
                />
              )}

              {/* Card Dinamica (da dati JSON Netlify) */}
              {isBackJsonResponse && backCardData && (
                <DynamicCard 
                  cardData={backCardData}
                  className="w-full"
                  onImageReady={handleBackCardImageReady}
                />
              )}
            </>
          )}
        </div>

        {/* Card Info Footer (solo se non disponibile) */}
        {(!player.email || player.email === 'email@non-disponibile.com') && !isFlipped && (
          <div className="mt-4 text-center">
            <h3 className="text-lg font-bold text-white font-runtime mb-1">{player.name}</h3>
            <div className="inline-block px-3 py-1 rounded-full bg-gray-600 text-gray-300 text-sm font-runtime">
              {player.overall} • {getCardType(player.overall)}
            </div>
          </div>
        )}
      </motion.div>

      {/* ✅ AGGIORNATO: Flip Hint con istruzioni per mobile */}
      {player.email && player.email !== 'email@non-disponibile.com' && (
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 transition-opacity duration-300">
          <div className={`text-black px-2 py-1 rounded-full text-xs font-runtime font-bold shadow-lg ${
            selectedCard 
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
              : 'bg-gradient-to-r from-blue-400 to-purple-500'
          }`}>
            {getCardLabel()}
          </div>
        </div>
      )}
    </motion.div>
  );
} 