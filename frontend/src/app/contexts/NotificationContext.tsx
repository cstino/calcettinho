'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  hasUnseenEvolutions: boolean;
  checkForNewEvolutions: () => Promise<void>;
  markEvolutionsAsSeen: () => void;
  evolutionCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { userEmail } = useAuth();
  const [hasUnseenEvolutions, setHasUnseenEvolutions] = useState(false);
  const [evolutionCount, setEvolutionCount] = useState(0);

  // Chiave per LocalStorage specifica per utente
  const getStorageKey = () => `lastSeenEvolutions_${userEmail}`;

  // Controlla se ci sono nuove evoluzioni
  const checkForNewEvolutions = async () => {
    if (!userEmail) return;

    try {
      const response = await fetch(`/api/player-awards/${encodeURIComponent(userEmail)}`);
      if (response.ok) {
        const data = await response.json();
        const pendingCount = data.pending || 0;
        
        setEvolutionCount(pendingCount);
        
        if (pendingCount > 0) {
          // Controlla se l'utente ha già visto queste notifiche
          const lastSeenKey = getStorageKey();
          const lastSeenCount = parseInt(localStorage.getItem(lastSeenKey) || '0');
          
          // Se ci sono più premi pending di quanti ne ha visti l'ultima volta
          if (pendingCount > lastSeenCount) {
            setHasUnseenEvolutions(true);
            console.log('🔔 Nuove evoluzioni disponibili:', pendingCount - lastSeenCount);
          } else {
            setHasUnseenEvolutions(false);
          }
        } else {
          setHasUnseenEvolutions(false);
        }
      }
    } catch (error) {
      console.log('Errore controllo evoluzioni:', error);
    }
  };

  // Marca le evoluzioni come viste
  const markEvolutionsAsSeen = () => {
    if (!userEmail) return;
    
    const lastSeenKey = getStorageKey();
    localStorage.setItem(lastSeenKey, evolutionCount.toString());
    setHasUnseenEvolutions(false);
    console.log('✅ Evoluzioni marcate come viste');
  };

  // Controllo iniziale e periodico
  useEffect(() => {
    if (!userEmail) return;

    // Controllo immediato
    checkForNewEvolutions();

    // Controllo ogni 30 secondi
    const interval = setInterval(checkForNewEvolutions, 30000);

    return () => clearInterval(interval);
  }, [userEmail]);

  // Controllo quando l'utente torna sulla tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && userEmail) {
        checkForNewEvolutions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userEmail]);

  return (
    <NotificationContext.Provider value={{
      hasUnseenEvolutions,
      checkForNewEvolutions,
      markEvolutionsAsSeen,
      evolutionCount
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 