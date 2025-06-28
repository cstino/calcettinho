'use client';

import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check, Loader2 } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'floating' | 'inline' | 'banner';
  className?: string;
  showIcon?: boolean;
  onInstallSuccess?: () => void;
  onInstallDismiss?: () => void;
}

export default function PWAInstallButton({
  variant = 'floating',
  className = '',
  showIcon = true,
  onInstallSuccess,
  onInstallDismiss,
}: PWAInstallButtonProps) {
  const {
    isInstallable,
    isInstalled,
    isInstalling,
    canShowPrompt,
    showInstallPrompt,
    dismissPrompt,
  } = usePWAInstall();

  const [isVisible, setIsVisible] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // Mostra il button solo quando appropriato
  useEffect(() => {
    if (isInstalled) {
      setIsVisible(false);
      return;
    }

    // Logica di visibilità basata sul variant
    if (variant === 'floating' || variant === 'banner') {
      // Per floating e banner, mostra solo quando il prompt è pronto
      setIsVisible(canShowPrompt);
    } else {
      // Per inline, mostra sempre se installabile
      setIsVisible(isInstallable);
    }
  }, [isInstallable, isInstalled, canShowPrompt, variant]);

  // Handle click installazione
  const handleInstallClick = async () => {
    try {
      const success = await showInstallPrompt();
      
      if (success) {
        setJustInstalled(true);
        onInstallSuccess?.();
        
        // Nascondi dopo animazione successo
        setTimeout(() => {
          setIsVisible(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    dismissPrompt();
    setIsVisible(false);
    onInstallDismiss?.();
  };

  // Se non deve essere visibile, non renderizzare
  if (!isVisible) return null;

  // Contenuto del button basato su stato
  const getButtonContent = () => {
    if (justInstalled) {
      return (
        <>
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-green-400 font-medium">Installata!</span>
        </>
      );
    }

    if (isInstalling) {
      return (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Installando...</span>
        </>
      );
    }

    return (
      <>
        {showIcon && <Download className="w-5 h-5" />}
        <span className="font-medium">Installa App</span>
      </>
    );
  };

  // Stili base condivisi
  const baseStyles = "transition-all duration-300 ease-in-out transform";
  
  // Variant-specific styles
  const variantStyles = {
    floating: `
      fixed bottom-6 right-6 z-50
      bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
      text-white shadow-2xl hover:shadow-green-500/25
      rounded-full px-6 py-4
      flex items-center gap-3
      hover:scale-105 active:scale-95
      border border-green-400/20
      backdrop-blur-sm
    `,
    
    inline: `
      bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
      text-white shadow-lg hover:shadow-green-500/25
      rounded-lg px-6 py-3
      flex items-center justify-center gap-3
      hover:scale-105 active:scale-95
      border border-green-400/20
      w-full
    `,
    
    banner: `
      bg-gradient-to-r from-gray-900 to-black border-t border-green-500/20
      text-white shadow-2xl
      fixed bottom-0 left-0 right-0 z-50
      px-6 py-4
      flex items-center justify-between
      backdrop-blur-md
    `
  };

  if (variant === 'banner') {
    return (
      <div className={`${baseStyles} ${variantStyles.banner} ${className}`}>
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-3">
            <div className="bg-green-500/20 rounded-full p-2">
              <Smartphone className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">
                Installa Calcettinho sul tuo dispositivo
              </p>
              <p className="text-gray-400 text-xs">
                Accesso rapido e funzionalità offline
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling || justInstalled}
            className={`
              bg-green-500 hover:bg-green-600 
              text-white text-sm font-medium
              px-4 py-2 rounded-lg
              flex items-center gap-2
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${justInstalled ? 'bg-green-400' : ''}
            `}
          >
            {getButtonContent()}
          </button>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      disabled={isInstalling || justInstalled}
      className={`
        ${baseStyles} 
        ${variantStyles[variant]}
        ${className}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${justInstalled ? 'from-green-400 to-green-500' : ''}
        group
      `}
      aria-label="Installa Calcettinho come app"
    >
      {getButtonContent()}
      
      {variant === 'floating' && (
        <button
          onClick={handleDismiss}
          className="ml-2 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Non ora"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </button>
  );
}

// Componente wrapper per diverse situazioni d'uso
export function PWAInstallPrompt() {
  const [promptType, setPromptType] = useState<'none' | 'floating' | 'banner'>('none');
  const { canShowPrompt } = usePWAInstall();

  useEffect(() => {
    if (!canShowPrompt) {
      setPromptType('none');
      return;
    }

    // Logica per decidere che tipo di prompt mostrare
    const isMobile = window.innerWidth < 768;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isInStandaloneMode) {
      setPromptType('none');
    } else if (isMobile) {
      setPromptType('banner');
    } else {
      setPromptType('floating');
    }
  }, [canShowPrompt]);

  if (promptType === 'none') return null;

  return <PWAInstallButton variant={promptType} />;
}

// Hook per integrare facilmente in altri componenti
export function usePWAInstallButton() {
  const { isInstallable, isInstalled, canShowPrompt } = usePWAInstall();
  
  return {
    shouldShowButton: isInstallable && !isInstalled,
    shouldShowPrompt: canShowPrompt,
    InstallButton: PWAInstallButton,
  };
} 