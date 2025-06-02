'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function EvolutionToast() {
  const { hasUnseenEvolutions, evolutionCount } = useNotifications();
  const { userEmail } = useAuth();
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);
  const [lastEvolutionCount, setLastEvolutionCount] = useState(0);

  useEffect(() => {
    // Mostra toast solo se il numero di evoluzioni è aumentato
    if (hasUnseenEvolutions && evolutionCount > lastEvolutionCount && evolutionCount > 0) {
      setShowToast(true);
      setLastEvolutionCount(evolutionCount);
      
      // Auto-hide dopo 5 secondi
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [hasUnseenEvolutions, evolutionCount, lastEvolutionCount]);

  const handleToastClick = () => {
    setShowToast(false);
    if (userEmail) {
      router.push(`/profile/${encodeURIComponent(userEmail)}`);
    }
  };

  return (
    <AnimatePresence>
      {showToast && hasUnseenEvolutions && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.4 
          }}
          className="fixed top-24 right-4 z-50 max-w-sm"
        >
          <div 
            onClick={handleToastClick}
            className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white p-4 rounded-lg shadow-2xl cursor-pointer border border-yellow-400/50 hover:from-yellow-700 hover:to-orange-700 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-xl">🏆</span>
                </div>
              </div>
              
              <div className="flex-1">
                <h4 className="font-bold text-sm mb-1 font-runtime">
                  Nuove Evoluzioni!
                </h4>
                <p className="text-xs text-yellow-100 font-runtime">
                  {evolutionCount} evoluzion{evolutionCount === 1 ? 'e' : 'i'} da sbloccare
                </p>
              </div>
              
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            
            {/* Pulsante chiudi */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowToast(false);
              }}
              className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-yellow-200 hover:text-white hover:bg-black/20 rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 