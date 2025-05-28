'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Loader2 } from 'lucide-react';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerEmail: string;
  playerName: string;
}

export default function CardModal({ isOpen, onClose, playerEmail, playerName }: CardModalProps) {
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch della card quando il modal si apre
  useEffect(() => {
    if (isOpen && playerEmail) {
      fetchCard();
    }
  }, [isOpen, playerEmail]);

  const fetchCard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Chiamata all'API del backend per generare/recuperare la card
      const response = await fetch(`/api/card/${encodeURIComponent(playerEmail)}`);
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento della card');
      }

      // L'API restituisce direttamente l'immagine PNG
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setCardImageUrl(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (cardImageUrl) {
      const link = document.createElement('a');
      link.href = cardImageUrl;
      link.download = `${playerName.replace(/\s+/g, '_')}_card.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleClose = () => {
    // Cleanup dell'URL dell'immagine
    if (cardImageUrl) {
      URL.revokeObjectURL(cardImageUrl);
      setCardImageUrl(null);
    }
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-600/50 max-w-md w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-600/50">
              <h2 className="text-xl font-bold text-white font-runtime">
                Card di {playerName}
              </h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-green-400 animate-spin mb-4" />
                  <p className="text-gray-300 font-runtime">Generazione card in corso...</p>
                </div>
              )}

              {error && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-900/50 rounded-full flex items-center justify-center">
                    <X className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-red-400 font-runtime mb-4">{error}</p>
                  <button
                    onClick={fetchCard}
                    className="bg-green-600/80 hover:bg-green-700/80 text-white px-4 py-2 rounded-lg transition-colors font-runtime"
                  >
                    Riprova
                  </button>
                </div>
              )}

              {cardImageUrl && !loading && !error && (
                <div className="text-center">
                  <div className="relative mb-6">
                    <img
                      src={cardImageUrl}
                      alt={`Card di ${playerName}`}
                      className="w-full max-w-sm mx-auto rounded-lg shadow-lg"
                    />
                  </div>
                  
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 bg-green-600/80 hover:bg-green-700/80 text-white px-6 py-3 rounded-lg transition-colors font-runtime font-semibold"
                  >
                    <Download className="w-5 h-5" />
                    Scarica Card
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 