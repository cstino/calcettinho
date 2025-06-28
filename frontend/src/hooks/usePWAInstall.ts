'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isInstalling: boolean;
  canShowPrompt: boolean;
  installPromptEvent: BeforeInstallPromptEvent | null;
}

interface PWAInstallActions {
  showInstallPrompt: () => Promise<boolean>;
  dismissPrompt: () => void;
  checkInstallationStatus: () => boolean;
}

// Configurazione intelligente per timing install prompt
const INSTALL_PROMPT_CONDITIONS = {
  visitCount: 3,           // Minimo 3 visite
  engagementTime: 120000,  // Almeno 2 minuti di utilizzo (in ms)
  actionCompleted: false,  // Ha completato almeno 1 azione (voto, navigazione)
  minTimeBetweenPrompts: 86400000, // 24 ore tra prompts (in ms)
};

export function usePWAInstall(): PWAInstallState & PWAInstallActions {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [userEngagement, setUserEngagement] = useState({
    startTime: Date.now(),
    visitCount: 0,
    lastPromptTime: 0,
    actionCompleted: false,
  });

  // Stato derivato
  const isInstallable = installPromptEvent !== null;
  const isInstalled = checkIsInstalled();
  const canShowPrompt = isInstallable && !isInstalled && shouldShowPrompt();

  // Verifica se l'app è già installata
  function checkIsInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Verifica modalità standalone (PWA installata)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Verifica iOS Safari PWA
    const isiOSPWA = (window.navigator as any).standalone === true;
    
    // Verifica Chrome PWA
    const isChromeInstalled = (window as any).chrome?.app?.isInstalled;
    
    return isStandalone || isiOSPWA || isChromeInstalled;
  }

  // Logica intelligente per decidere quando mostrare il prompt
  function shouldShowPrompt(): boolean {
    const now = Date.now();
    const timeSinceStart = now - userEngagement.startTime;
    const timeSinceLastPrompt = now - userEngagement.lastPromptTime;
    
    // Condizioni per mostrare il prompt
    const hasMinEngagement = timeSinceStart >= INSTALL_PROMPT_CONDITIONS.engagementTime;
    const hasMinVisits = userEngagement.visitCount >= INSTALL_PROMPT_CONDITIONS.visitCount;
    const enoughTimeBetweenPrompts = timeSinceLastPrompt >= INSTALL_PROMPT_CONDITIONS.minTimeBetweenPrompts;
    const hasCompletedAction = userEngagement.actionCompleted;
    
    return hasMinEngagement && hasMinVisits && enoughTimeBetweenPrompts && hasCompletedAction;
  }

  // Gestione eventi beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Previene il prompt automatico del browser
      e.preventDefault();
      
      // Salva l'evento per usarlo dopo
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
      
      console.log('PWA Install prompt ready');
    };

    const handleAppInstalled = () => {
      console.log('PWA installed successfully');
      setInstallPromptEvent(null);
      
      // Analytics tracking (opzionale)
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'pwa_installed', {
          event_category: 'engagement',
          event_label: 'pwa_installation'
        });
      }
    };

    // Event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Tracking engagement utente
  useEffect(() => {
    // Incrementa visit count da localStorage
    const storedVisits = localStorage.getItem('pwa_visit_count');
    const storedLastPrompt = localStorage.getItem('pwa_last_prompt');
    
    const visitCount = storedVisits ? parseInt(storedVisits) + 1 : 1;
    const lastPromptTime = storedLastPrompt ? parseInt(storedLastPrompt) : 0;
    
    localStorage.setItem('pwa_visit_count', visitCount.toString());
    
    setUserEngagement(prev => ({
      ...prev,
      visitCount,
      lastPromptTime
    }));

    // Listener per azioni utente (aumenta engagement)
    const handleUserAction = () => {
      setUserEngagement(prev => ({
        ...prev,
        actionCompleted: true
      }));
    };

    // Eventi che indicano engagement
    const engagementEvents = ['click', 'scroll', 'keydown', 'touchstart'];
    engagementEvents.forEach(event => {
      document.addEventListener(event, handleUserAction, { once: true });
    });

    return () => {
      engagementEvents.forEach(event => {
        document.removeEventListener(event, handleUserAction);
      });
    };
  }, []);

  // Mostra prompt di installazione
  const showInstallPrompt = useCallback(async (): Promise<boolean> => {
    if (!installPromptEvent || isInstalling) {
      return false;
    }

    try {
      setIsInstalling(true);

      // Mostra il prompt nativo
      await installPromptEvent.prompt();

      // Aspetta la scelta dell'utente
      const choiceResult = await installPromptEvent.userChoice;

      // Salva timestamp del prompt
      localStorage.setItem('pwa_last_prompt', Date.now().toString());

      // Reset dell'evento
      setInstallPromptEvent(null);

      // Analytics tracking
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'pwa_install_prompt_shown', {
          event_category: 'engagement',
          event_label: choiceResult.outcome
        });
      }

      return choiceResult.outcome === 'accepted';

    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, [installPromptEvent, isInstalling]);

  // Dismissal del prompt (user non interessato)
  const dismissPrompt = useCallback(() => {
    setInstallPromptEvent(null);
    
    // Delay prossimo prompt di 7 giorni
    const nextPromptTime = Date.now() + (7 * 24 * 60 * 60 * 1000);
    localStorage.setItem('pwa_last_prompt', nextPromptTime.toString());
    
    console.log('PWA install prompt dismissed by user');
  }, []);

  // Check installazione status
  const checkInstallationStatus = useCallback(() => {
    return checkIsInstalled();
  }, []);

  return {
    // State
    isInstallable,
    isInstalled,
    isInstalling,
    canShowPrompt,
    installPromptEvent,
    
    // Actions
    showInstallPrompt,
    dismissPrompt,
    checkInstallationStatus,
  };
} 