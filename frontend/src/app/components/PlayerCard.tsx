'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

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
  const router = useRouter();

  // Carica la card selezionata del giocatore
  useEffect(() => {
    const fetchSelectedCard = async () => {
      if (!player.email || player.email === 'email@non-disponibile.com') return;
      
      try {
        const response = await fetch(`/api/player-awards/${encodeURIComponent(player.email)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.selectedCard) {
            setSelectedCard(data.selectedCard);
            // Usa la card speciale selezionata
            setCardBackImage(`http://localhost:3001/api/card-special/${encodeURIComponent(player.email)}?template=${data.selectedCard.awardType}`);
          } else {
            // Nessuna card selezionata, usa la card base normale come retro
            setCardBackImage(`http://localhost:3001/api/card/${encodeURIComponent(player.email)}`);
          }
        }
      } catch (error) {
        console.log('Errore nel caricamento card selezionata:', error);
        // Fallback alla card base
        setCardBackImage(`http://localhost:3001/api/card/${encodeURIComponent(player.email)}`);
      }
    };

    fetchSelectedCard();
  }, [player.email]);

  const handleCardClick = () => {
    if (player.email && player.email !== 'email@non-disponibile.com') {
      router.push(`/profile/${encodeURIComponent(player.email)}`);
    }
  };

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
      whileHover={{ 
        scale: 1.05,
        rotateY: 5,
        transition: { duration: 0.3 }
      }}
      className={`relative group cursor-pointer ${
        player.email && player.email !== 'email@non-disponibile.com'
          ? ''
          : 'cursor-not-allowed opacity-60'
      }`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Card Container con effetto flip */}
      <div 
        className="relative w-full max-w-xs mx-auto"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)'
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

          {/* Actual Card */}
          {player.email && player.email !== 'email@non-disponibile.com' && (
            <img
              src={`http://localhost:3001/api/card/${encodeURIComponent(player.email)}`}
              alt={`Card di ${player.name}`}
              className={`w-full h-auto transition-all duration-300 ${
                imageLoading ? 'opacity-0 absolute' : 'opacity-100'
              }`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
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
          {player.email && player.email !== 'email@non-disponibile.com' && cardBackImage && (
            <img
              src={cardBackImage}
              alt={selectedCard ? `Card ${selectedCard.awardType} di ${player.name}` : `Card di ${player.name}`}
              className="w-full h-auto"
            />
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
      </div>

      {/* Flip Hint - dinamico in base alla card selezionata */}
      {player.email && player.email !== 'email@non-disponibile.com' && (
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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