'use client';

import { useState, useEffect, useReducer, useCallback, memo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import Navigation from "../../components/Navigation";
import Logo from "../../components/Logo";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from "../../components/ProtectedRoute";
import { getCardUrl, getSpecialCardUrl } from '../../../utils/api';
import ProfileTiltCard from '../../components/ProfileTiltCard';

interface Player {
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
  photo?: string;
}

interface PlayerStats {
  gol: number;
  partiteDisputate: number;
  partiteVinte: number;
  partitePareggiate: number;
  partitePerse: number;
  assistenze: number;
  cartelliniGialli: number;
  cartelliniRossi: number;
  minutiGiocati: number;
}

interface VoteHistory {
  votes: Array<{
    id: string;
    voterEmail: string;
    voteType: string; // 'UP' o 'DOWN'
    matchId: string;
    toPlayerId: string;
  }>;
  statistics: {
    totalVotes: number;
    upVotes: number;
    downVotes: number;
    netVotes: number;
    upPercentage: number;
    totalMatches: number;
    actualMotm: number;
  };
  matchResults: Array<{
    matchId: string;
    upVotes: number;
    downVotes: number;
    netVotes: number;
    isMotm: boolean;
  }>;
}

interface PlayerAward {
  id: string;
  awardType: string;
  matchId: string;
  status: string; // 'pending' o 'unlocked'
  unlockedAt: string;
  selected: boolean;
  createdAt: string;
}

interface PlayerAwards {
  total: number;
  pending: number;
  unlocked: number;
  awards: PlayerAward[];
  pendingAwards: PlayerAward[];
  unlockedAwards: PlayerAward[];
  selectedCard: PlayerAward | null;
}

// ✅ Cache globale per le immagini delle card - persiste tra i re-render
const globalImageCache = new Set<string>();

// ✅ Cache globale per lo stato di caricamento delle immagini - evita ricaricamenti
const globalImageLoadedCache = new Set<string>();

// ✅ Sistema di notifica per aggiornamenti immagini
const imageLoadListeners = new Map<string, Set<() => void>>();

// Hook per animazione contatori
const useCountUp = (end: number, duration: number = 2000, startWhen: boolean = true, decimals: number = 0) => {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    // Reset se end cambia
    if (!hasStarted) {
      setCount(0);
    }
  }, [end, hasStarted]);

  useEffect(() => {
    if (!startWhen || hasStarted) return;

    setHasStarted(true);
    setIsAnimating(true);
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function per un'animazione più fluida (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentCount = end * easeOut;
      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, startWhen, hasStarted]);

  // Formatta il numero in base ai decimali richiesti
  const displayValue = decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toString();
  
  return { value: displayValue, isAnimating };
};

// Hook per rilevare quando un elemento entra nel viewport
const useInView = (threshold: number = 0.1) => {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect(); // Attiva l'animazione solo una volta
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
};

// Componente per statistiche animate
const AnimatedStat = ({ 
  value, 
  label, 
  color, 
  decimals = 0, 
  duration = 2000, 
  startAnimation = false 
}: { 
  value: number; 
  label: string; 
  color: string; 
  decimals?: number; 
  duration?: number; 
  startAnimation?: boolean; 
}) => {
  const { value: animatedValue, isAnimating } = useCountUp(value, duration, startAnimation, decimals);

  return (
    <div className="text-center transform transition-all duration-300 hover:scale-105">
      <div className={`text-3xl font-bold font-runtime transition-all duration-300 ${color} ${isAnimating ? 'animate-pulse' : ''}`}>
        {animatedValue}
        {isAnimating && (
          <span className="inline-block w-1 h-8 bg-current ml-1 animate-pulse"></span>
        )}
      </div>
      <div className="text-gray-300 font-runtime">{label}</div>
    </div>
  );
};

// Componente per Net Votes con segno
const AnimatedNetVotes = ({ 
  value, 
  startAnimation = false, 
  duration = 2400 
}: { 
  value: number; 
  startAnimation?: boolean; 
  duration?: number; 
}) => {
  const { value: animatedValue, isAnimating } = useCountUp(Math.abs(value), duration, startAnimation);
  
  const color = value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-400';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';

  return (
    <div className="text-center transform transition-all duration-300 hover:scale-105">
      <div className={`text-3xl font-bold font-runtime transition-all duration-300 ${color} ${isAnimating ? 'animate-pulse' : ''}`}>
        {sign}{animatedValue}
        {isAnimating && (
          <span className="inline-block w-1 h-8 bg-current ml-1 animate-pulse"></span>
        )}
      </div>
      <div className="text-gray-300 font-runtime">Net Votes</div>
    </div>
  );
};

// Componente per percentuale con simbolo %
const AnimatedPercentage = ({ 
  value, 
  startAnimation = false, 
  duration = 2500 
}: { 
  value: number; 
  startAnimation?: boolean; 
  duration?: number; 
}) => {
  const { value: animatedValue, isAnimating } = useCountUp(value, duration, startAnimation);

  return (
    <div className="text-center transform transition-all duration-300 hover:scale-105">
      <div className={`text-4xl font-bold text-purple-400 font-runtime transition-all duration-300 ${isAnimating ? 'animate-pulse' : ''}`}>
        {animatedValue}%
        {isAnimating && (
          <span className="inline-block w-1 h-10 bg-current ml-1 animate-pulse"></span>
        )}
      </div>
      <div className="text-gray-300 font-runtime">Percentuale UP</div>
    </div>
  );
};

export default function PlayerProfile() {
  const params = useParams();
  const router = useRouter();
  const { userEmail } = useAuth(); // ✅ Ottieni l'utente corrente
  const { markEvolutionsAsSeen, checkForNewEvolutions } = useNotifications();
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteHistory | null>(null);
  const [playerAwards, setPlayerAwards] = useState<PlayerAwards | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [unlockingCard, setUnlockingCard] = useState<PlayerAward | null>(null);
  
  // ✅ Sistema di force update per il preloading
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(
    new Set([...globalImageCache, ...globalImageLoadedCache])
  );

  const email = typeof params.email === 'string' ? decodeURIComponent(params.email) : '';
  
  // ✅ Controlla se l'utente corrente è il proprietario del profilo
  const isOwner = userEmail === email;

  const gameStatsInView = useInView();
  const voteStatsInView = useInView();
  const votePercentageInView = useInView();

  // ✅ Marca le notifiche come viste quando si visita il proprio profilo
  useEffect(() => {
    if (isOwner && playerAwards && playerAwards.pending > 0) {
      // Attendi un po' per assicurarsi che l'utente veda le notifiche
      const timer = setTimeout(() => {
        markEvolutionsAsSeen();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isOwner, playerAwards?.pending, markEvolutionsAsSeen]);

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!email) {
        setError('Email non valida');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        console.log('🔍 Email dal parametro URL (raw):', params.email);
        console.log('🔍 Email decodificata:', email);
        
        // Recupera dati giocatore
        const response = await fetch('/api/players');
        if (!response.ok) {
          throw new Error('Errore nel caricamento dei giocatori');
        }
        
        const playersData = await response.json();
        console.log('📦 Dati giocatori ricevuti:', playersData.length, 'giocatori');
        console.log('📧 Email disponibili:', playersData.map((p: any) => p.email));
        
        // Prova sia con email diretta che decodificata per sicurezza
        let targetPlayer = playersData.find((p: any) => p.email === email);
        if (!targetPlayer && typeof params.email === 'string') {
          // Fallback: prova senza decodifica
          targetPlayer = playersData.find((p: any) => p.email === params.email);
        }
        
        console.log('🎯 Giocatore trovato:', targetPlayer ? 'SÌ' : 'NO');
        
        if (!targetPlayer) {
          console.error('❌ Giocatore non trovato con email:', email);
          console.log('📝 Email esatte nel database:', playersData.map((p: any) => `"${p.email}"`));
          throw new Error(`Giocatore non trovato con email: ${email}`);
        }

        const formattedPlayer = {
          ...targetPlayer,
          name: targetPlayer.nome || 'Nome non disponibile',
          email: targetPlayer.email || 'email@non-disponibile.com',
          // Calcola overall come media delle 5 migliori statistiche
          overall: (() => {
            const stats = [targetPlayer.ATT, targetPlayer.DIF, targetPlayer.VEL, targetPlayer.FOR, targetPlayer.PAS, targetPlayer.POR];
            const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
            return Math.round(top5Stats.reduce((sum, val) => sum + val, 0) / 5);
          })(),
          att: Math.round(targetPlayer.ATT),
          vel: Math.round(targetPlayer.VEL),
          pas: Math.round(targetPlayer.PAS),
          for: Math.round(targetPlayer.FOR),
          dif: Math.round(targetPlayer.DIF),
          por: Math.round(targetPlayer.POR)
        };
        
        console.log('✅ Giocatore mappato:', formattedPlayer);
        
        setPlayer(formattedPlayer);
        
        // Carica statistiche reali da Airtable
        try {
          const apiUrl = `/api/player-stats/${encodeURIComponent(email)}`;
          console.log('🔗 Chiamando API:', apiUrl);
          console.log('📧 Email originale:', email);
          console.log('📧 Email encoded:', encodeURIComponent(email));
          
          const statsResponse = await fetch(apiUrl);
          console.log('📡 Response status:', statsResponse.status);
          console.log('📡 Response headers:', [...statsResponse.headers.entries()]);
          
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            console.log('📊 Statistiche caricate dall\'API:', statsData);
            console.log('🔢 Tipo di dati ricevuti:', typeof statsData, Object.keys(statsData));
            setPlayerStats(statsData);
          } else {
            console.log('⚠️ Errore nel caricamento statistiche, risposta non OK:', statsResponse.status);
            const errorText = await statsResponse.text();
            console.log('💥 Testo errore:', errorText);
            setPlayerStats({
              gol: 0,
              partiteDisputate: 0,
              partiteVinte: 0,
              partitePareggiate: 0,
              partitePerse: 0,
              assistenze: 0,
              cartelliniGialli: 0,
              cartelliniRossi: 0,
              minutiGiocati: 0
            });
          }
        } catch (statsError) {
          console.log('❌ Errore nel caricamento statistiche:', statsError);
          setPlayerStats({
            gol: 0,
            partiteDisputate: 0,
            partiteVinte: 0,
            partitePareggiate: 0,
            partitePerse: 0,
            assistenze: 0,
            cartelliniGialli: 0,
            cartelliniRossi: 0,
            minutiGiocati: 0
          });
        }
        
        // Carica storico votazioni
        try {
          const voteResponse = await fetch(`/api/votes/history/${encodeURIComponent(email)}`);
          if (voteResponse.ok) {
            const voteData = await voteResponse.json();
            if (voteData.success) {
              setVoteHistory(voteData);
            }
          }
        } catch (voteError) {
          console.log('Storico votazioni non disponibile:', voteError);
          // Non blocca il caricamento se le votazioni non sono disponibili
        }

        // Carica premi e card sbloccate - NON BLOCCANTE
        try {
          const awardsResponse = await fetch(`/api/player-awards/${encodeURIComponent(email)}`);
          if (awardsResponse.ok) {
            const awardsData = await awardsResponse.json();
            setPlayerAwards(awardsData);
            console.log('🏆 Premi caricati:', awardsData);
          } else {
            console.log('⚠️ Tabella player_awards non disponibile o vuota');
            // Imposta valori di default se errore
            setPlayerAwards({
              total: 0,
              pending: 0,
              unlocked: 0,
              awards: [],
              pendingAwards: [],
              unlockedAwards: [],
              selectedCard: null
            });
          }
        } catch (awardsError) {
          console.log('⚠️ Errore nel caricamento premi (normale se tabella non esiste):', awardsError);
          // Imposta valori di default se errore - NON bloccante
          setPlayerAwards({
            total: 0,
            pending: 0,
            unlocked: 0,
            awards: [],
            pendingAwards: [],
            unlockedAwards: [],
            selectedCard: null
          });
        }
        
      } catch (error) {
        console.error('❌ Errore generale:', error);
        setError(error instanceof Error ? error.message : 'Errore sconosciuto');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [email, params.email]);

  // Preloading delle immagini delle card per eliminare il lag - OTTIMIZZATO
  useEffect(() => {
    if (!player || !playerAwards) return;

    const preloadImages = async () => {
      const imagesToPreload: string[] = [];
      
      // Card base
      const baseCardSrc = getCardUrl(player.email);
      if (!preloadedImages.has(baseCardSrc)) {
        imagesToPreload.push(baseCardSrc);
      }
      
      // Card speciali sbloccate - solo quelle non ancora precaricate
      playerAwards.unlockedAwards.forEach(award => {
        const specialCardSrc = getSpecialCardUrl(player.email, award.awardType);
        if (!preloadedImages.has(specialCardSrc)) {
          imagesToPreload.push(specialCardSrc);
        }
      });

      // Se non ci sono nuove immagini da precaricare, esci
      if (imagesToPreload.length === 0) {
        console.log('✅ Tutte le immagini già precaricate, skip');
        return;
      }

      console.log('🔄 Precaricando', imagesToPreload.length, 'nuove immagini...');

      // Precarica solo le nuove immagini
      const loadPromises = imagesToPreload.map(src => {
        return new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(src);
          img.onerror = () => reject(src);
          img.src = src;
        });
      });

      try {
        const loadedImages = await Promise.allSettled(loadPromises);
        
        loadedImages.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            // ✅ Sincronizza con cache globale
            const imageSrc = imagesToPreload[index];
            globalImageCache.add(imageSrc);
            globalImageLoadedCache.add(imageSrc); // ✅ Segna come caricata
          }
        });
        
        const successCount = loadedImages.filter(r => r.status === 'fulfilled').length;
        console.log('✅ Precaricate', successCount, 'nuove immagini card');
        
        // ✅ Force update solo se necessario, senza influenzare CardImage
        if (successCount > 0) {
          forceUpdate();
        }
      } catch (error) {
        console.log('⚠️ Errore nel preloading immagini:', error);
      }
    };

    preloadImages();
  }, [player?.email, playerAwards?.unlockedAwards.length]); // ✅ Dipendenze ottimizzate

  // Funzione per sbloccare una card pending - Solo per il proprietario
  const handleUnlockCard = useCallback(async (award: PlayerAward) => {
    // ✅ Verifica che l'utente sia il proprietario
    if (!isOwner) {
      console.log('🚫 Solo il proprietario del profilo può sbloccare le card');
      return;
    }
    
    try {
      setUnlockingCard(award);
      setShowUnlockAnimation(true);
      
      const response = await fetch(`/api/player-awards/${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ awardId: award.id }),
      });

      if (response.ok) {
        // ✅ OTTIMIZZAZIONE: Aggiorna solo lo stato locale invece di rifare fetch
        if (playerAwards) {
          const updatedAwards = { ...playerAwards };
          
          // Rimuovi il premio dalle pending
          updatedAwards.pendingAwards = updatedAwards.pendingAwards.filter(a => a.id !== award.id);
          updatedAwards.pending = updatedAwards.pendingAwards.length;
          
          // Aggiungi il premio alle unlocked
          const unlockedAward = { 
            ...award, 
            status: 'unlocked', 
            unlockedAt: new Date().toISOString() 
          };
          updatedAwards.unlockedAwards = [...updatedAwards.unlockedAwards, unlockedAward];
          updatedAwards.unlocked = updatedAwards.unlockedAwards.length;
          updatedAwards.total = updatedAwards.pending + updatedAwards.unlocked;
          
          // Aggiorna lo stato senza triggeare il preloading
          setPlayerAwards(updatedAwards);
          
          // Precarica solo la nuova immagine sbloccata
          if (player) {
            const newImageSrc = getSpecialCardUrl(player.email, award.awardType);
            const img = new Image();
            img.onload = () => {
              // ✅ Sincronizza con cache globale
              globalImageCache.add(newImageSrc);
              globalImageLoadedCache.add(newImageSrc); // ✅ Segna come caricata
              console.log('✅ Nuova card precaricata:', award.awardType);
            };
            img.src = newImageSrc;
          }

          // ✅ Aggiorna le notifiche dopo lo sblocco
          setTimeout(() => {
            checkForNewEvolutions();
          }, 1000);
        }
        
        // Chiudi l'animazione dopo 3 secondi
        setTimeout(() => {
          setShowUnlockAnimation(false);
          setUnlockingCard(null);
        }, 3000);
      } else {
        console.error('Errore nello sblocco della card');
        setShowUnlockAnimation(false);
        setUnlockingCard(null);
      }
    } catch (error) {
      console.error('Errore nello sblocco della card:', error);
      setShowUnlockAnimation(false);
      setUnlockingCard(null);
    }
  }, [email, playerAwards, player, isOwner, checkForNewEvolutions]);

  // Funzione per selezionare una card come retro - Solo per il proprietario - SEMPLIFICATA
  const handleSelectCard = useCallback(async (awardId: string | null) => {
    // ✅ Verifica che l'utente sia il proprietario
    if (!isOwner) {
      console.log('🚫 Solo il proprietario del profilo può selezionare le card');
      return;
    }
    
    console.log('🔘 Tentativo selezione card:', awardId);
    
    try {
      const response = await fetch(`/api/player-awards/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ awardId }),
      });

      if (response.ok) {
        console.log('✅ API call successful');
        
        // ✅ LOGICA SEMPLIFICATA: Aggiorna lo stato in modo diretto e chiaro
        setPlayerAwards(currentAwards => {
          if (!currentAwards) return currentAwards;
          
          console.log('🔄 Stato PRIMA dell\'aggiornamento:', {
            selectedCard: currentAwards.selectedCard?.id || 'none',
            selectedAwards: currentAwards.unlockedAwards.filter(a => a.selected).map(a => a.id)
          });
          
          // Crea una nuova versione dello stato
          const newState = {
            ...currentAwards,
            unlockedAwards: currentAwards.unlockedAwards.map(award => ({
              ...award,
              selected: award.id === awardId // Semplice: seleziona solo quella con l'ID corrispondente
            })),
            selectedCard: awardId 
              ? currentAwards.unlockedAwards.find(award => award.id === awardId) || null
              : null
          };
          
          console.log('🔄 Stato DOPO l\'aggiornamento:', {
            selectedCard: newState.selectedCard?.id || 'none',
            selectedAwards: newState.unlockedAwards.filter(a => a.selected).map(a => a.id)
          });
          
          return newState;
        });
        
        // ✅ Force update per garantire il re-render dell'interfaccia
        setTimeout(() => forceUpdate(), 100);
        
        console.log('✅ Card selezionata aggiornata:', awardId ? `Card speciale ${awardId}` : 'Card base');
      } else {
        console.error('❌ Errore API nella selezione della card:', response.status);
      }
    } catch (error) {
      console.error('❌ Errore nella selezione della card:', error);
    }
  }, [email, isOwner, forceUpdate]);

  const getCardType = (overall: number) => {
    if (overall >= 90) return 'Ultimate';
    if (overall >= 78) return 'Gold';
    if (overall >= 65) return 'Silver';
    return 'Bronze';
  };

  const getCardColor = (overall: number) => {
    if (overall >= 90) return 'from-purple-600 to-pink-600';
    if (overall >= 78) return 'from-yellow-400 to-yellow-600';
    if (overall >= 65) return 'from-gray-400 to-gray-600';
    return 'from-amber-600 to-amber-800';
  };

  const getCardBackground = (overall: number) => {
    if (overall >= 90) return 'bg-gradient-to-br from-purple-900 to-pink-900';
    if (overall >= 78) return 'bg-gradient-to-br from-yellow-700 to-yellow-900';
    if (overall >= 65) return 'bg-gradient-to-br from-gray-600 to-gray-800';
    return 'bg-gradient-to-br from-amber-700 to-amber-900';
  };

  const getAwardLabel = (awardType: string) => {
    const labels: Record<string, string> = {
      '1presenza': 'Prima Presenza',
      // ⚽ Catena Goleador
      'goleador': 'Goleador',
      'matador': 'Matador',
      'goldenboot': 'Golden Boot',
      // 🅰️ Catena Assistman  
      'assistman': 'Assist Man',
      'regista': 'Regista',
      'elfutbol': 'El fútbol',
      // 🏆 Altri premi
      'motm': 'Man of the Match',
      'win3': 'Streak Winner 3',
      'win5': 'Streak Winner 5',
      'win10': 'Streak Winner 10',
      'win25': 'Streak Winner 25',
      'win50': 'Streak Winner 50'
    };
    return labels[awardType] || awardType.toUpperCase();
  };

  const getAwardDescription = (awardType: string) => {
    const descriptions: Record<string, string> = {
      '1presenza': 'Prima partita giocata',
      // ⚽ Catena Goleador Progressive (MILESTONE)
      'goleador': '10 gol segnati in carriera',
      'matador': '25 gol segnati in carriera',
      'goldenboot': '50 gol segnati in carriera',
      // 🅰️ Catena Assistman Progressive (MILESTONE)
      'assistman': '10 assist forniti in carriera',
      'regista': '25 assist forniti in carriera',
      'elfutbol': '50 assist forniti in carriera',
      // 🏆 Altri premi
      'motm': 'Più voti MOTM ricevuti in partita',
      'win3': '3 vittorie consecutive',
      'win5': '5 vittorie consecutive',
      'win10': '10 vittorie consecutive',
      'win25': '25 vittorie consecutive',
      'win50': '50 vittorie consecutive'
    };
    return descriptions[awardType] || 'Achievement speciale';
  };

  // ✅ NUOVO: Lista completa di tutte le card speciali disponibili - ORGANIZZATE PER CATENE PROGRESSIVE
  const allSpecialCards = [
    // 🔹 Card Base/Introduzione
    { id: '1presenza', name: 'Prima Presenza', description: 'Prima partita giocata', color: 'from-blue-600 to-blue-800' },
    
    // ⚽ Catena Goleador (Progressive MILESTONE)
    { id: 'goleador', name: 'Goleador', description: '10 gol segnati in carriera', color: 'from-red-600 to-red-800' },
    { id: 'matador', name: 'Matador', description: '25 gol segnati in carriera', color: 'from-red-800 to-red-900' },
    { id: 'goldenboot', name: 'Golden Boot', description: '50 gol segnati in carriera', color: 'from-yellow-600 to-yellow-800' },
    
    // 🅰️ Catena Assistman (Progressive MILESTONE)
    { id: 'assistman', name: 'Assist Man', description: '10 assist forniti in carriera', color: 'from-green-600 to-green-800' },
    { id: 'regista', name: 'Regista', description: '25 assist forniti in carriera', color: 'from-green-700 to-green-900' },
    { id: 'elfutbol', name: 'El fútbol', description: '50 assist forniti in carriera', color: 'from-purple-600 to-purple-800' },
    
    // 🏆 Altri Premi
    { id: 'motm', name: 'Man of the Match', description: 'Più voti MOTM ricevuti in partita', color: 'from-yellow-600 to-yellow-800' },
    { id: 'win10', name: '10 Vittorie', description: '10 vittorie consecutive', color: 'from-purple-600 to-purple-800' },
    { id: 'win25', name: '25 Vittorie', description: '25 vittorie consecutive', color: 'from-pink-600 to-pink-800' },
    { id: 'win50', name: '50 Vittorie', description: '50 vittorie consecutive', color: 'from-indigo-600 to-indigo-800' }
  ];

  // ✅ NUOVO: Stato per modal di selezione card
  const [selectedCardModal, setSelectedCardModal] = useState<string | null>(null);

  // ✅ NUOVO: Funzione per controllare se una card è sbloccata
  const isCardUnlocked = (cardId: string) => {
    return playerAwards?.unlockedAwards.some(award => award.awardType === cardId) || false;
  };

  // ✅ NUOVO: Funzione per ottenere l'award di una card
  const getCardAward = (cardId: string) => {
    return playerAwards?.unlockedAwards.find(award => award.awardType === cardId) || null;
  };

  // ✅ NUOVO: Funzione per controllare se una card è selezionata
  const isCardSelected = (cardId: string) => {
    return playerAwards?.selectedCard?.awardType === cardId || false;
  };

  // Componente per immagine STATICO - NO RELOAD
  const CardImage = memo(({ src, alt }: { src: string; alt: string }) => {
    // ✅ Stato iniziale fisso basato sulla cache globale
    const [isLoaded] = useState(() => globalImageLoadedCache.has(src));
    
    // ✅ NO useEffect - No subscription - No ricaricamenti
    
    // ✅ Handler per quando l'immagine si carica (solo prima volta)
    const handleImageLoad = useCallback(() => {
      if (!globalImageLoadedCache.has(src)) {
        globalImageLoadedCache.add(src);
        globalImageCache.add(src);
        console.log('✅ Immagine caricata (statica):', src.split('/').pop());
      }
    }, [src]);
    
    // Se l'immagine è già in cache, mostra direttamente
    if (globalImageLoadedCache.has(src)) {
      return (
        <div className="relative w-full mb-2">
          <img 
            src={src}
            alt={alt}
            className="w-full h-auto rounded opacity-100"
            loading="lazy"
          />
        </div>
      );
    }
    
    // Se non è in cache, mostra skeleton e carica
    return (
      <div className="relative w-full mb-2">
        <div className="w-full aspect-[3/4] bg-gray-700 rounded animate-pulse"></div>
        <img 
          src={src}
          alt={alt}
          className="w-full h-auto rounded opacity-0 absolute inset-0"
          onLoad={handleImageLoad}
          loading="lazy"
        />
      </div>
    );
  }, (prevProps, nextProps) => {
    // ✅ Memo: ri-renderizza SOLO se l'src cambia
    return prevProps.src === nextProps.src;
  });

  // Dati per il grafico radar
  const radarData = player ? [
    { stat: 'ATT', value: player.att, fullMark: 100 },
    { stat: 'VEL', value: player.vel, fullMark: 100 },
    { stat: 'PAS', value: player.pas, fullMark: 100 },
    { stat: 'FOR', value: player.for, fullMark: 100 },
    { stat: 'DIF', value: player.dif, fullMark: 100 },
    { stat: 'POR', value: player.por, fullMark: 100 },
  ] : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
          <p className="text-gray-200 mt-4 font-runtime">Caricamento profilo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 font-runtime text-lg">{error}</p>
          <button 
            onClick={() => router.push('/players')}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-runtime"
          >
            Torna Indietro
          </button>
        </div>
      </div>
    );
  }

  if (!player || !playerStats) {
    return null;
  }

  return (
          <div className="min-h-screen bg-black relative">
        {/* Overlay nero per OLED */}
        <div className="absolute inset-0 bg-black"></div>

      {/* Stili per la scrollbar del carousel */}
      <style jsx>{`
        .carousel-scroll::-webkit-scrollbar {
          height: 8px;
        }
        .carousel-scroll::-webkit-scrollbar-track {
          background: #1F2937;
          border-radius: 4px;
        }
        .carousel-scroll::-webkit-scrollbar-thumb {
          background: #4B5563;
          border-radius: 4px;
        }
        .carousel-scroll::-webkit-scrollbar-thumb:hover {
          background: #6B7280;
        }
      `}</style>

      {/* Animazione Sblocco Card */}
      {showUnlockAnimation && unlockingCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto mb-4 relative">
                <div className="absolute inset-0 border-4 border-yellow-400 rounded-full animate-ping"></div>
                <div className="absolute inset-2 border-2 border-yellow-300 rounded-full animate-pulse"></div>
                <div className="absolute inset-4 bg-yellow-400 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-yellow-400 font-runtime mb-4">Evoluzione Sbloccata!</h2>
            <p className="text-2xl text-white font-runtime mb-2">{getAwardLabel(unlockingCard.awardType)}</p>
            <p className="text-gray-300 font-runtime">{getAwardDescription(unlockingCard.awardType)}</p>
          </div>
        </div>
      )}

      {/* Contenuto principale */}
      <div className="relative z-10">
        <Navigation />
        
        {/* Header Section */}
        <section className="pt-20 lg:pt-24 pb-8 px-4 sm:px-6 lg:px-8" style={{ paddingTop: 'max(80px, env(safe-area-inset-top, 0px) + 50px)' }}>
          <div className="max-w-4xl mx-auto">
            {/* Bottone Indietro */}
            <button 
              onClick={() => router.push('/players')}
              className="mb-2 flex items-center text-gray-300 hover:text-white transition-colors font-runtime cursor-pointer z-50 relative pointer-events-auto"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Torna ai Giocatori
            </button>

            {/* Header con nome giocatore */}
            <div className="text-center mb-4">
              <h1 className="text-4xl sm:text-5xl font-bold font-runtime text-white mb-2 drop-shadow-lg">
                {player.name}
              </h1>
              {isOwner && (
                <div className="inline-flex items-center bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm font-runtime font-semibold border border-green-400/30">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Il tuo profilo
                </div>
              )}
            </div>

            {/* Card del Giocatore con Effetto Tilt */}
            <div className="text-center mb-4">
              <div className="w-80 mx-auto mb-4">
                <ProfileTiltCard
                  src={getCardUrl(player.email)}
                  alt={`Card di ${player.name}`}
                  enableTilt={true}
                  intensity={0.6}
                />
              </div>
              
              {/* Bottone Download Card */}
              <div>
                <a
                  href={getCardUrl(player.email)}
                  download={`${player.name.replace(/\s+/g, '_')}_card.png`}
                  className="inline-flex items-center px-4 py-2 bg-green-600/80 hover:bg-green-700/80 text-white rounded-lg transition-colors font-runtime font-semibold"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Scarica Card
                </a>
              </div>
            </div>

            {/* Grafico Radar */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 mb-8">
              <h2 className="text-2xl font-bold text-white font-runtime mb-6 text-center">Statistiche Abilità</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#4B5563" />
                    <PolarAngleAxis 
                      dataKey="stat" 
                      className="text-gray-300 font-runtime" 
                      fontSize={14}
                    />
                    <PolarRadiusAxis 
                      angle={0} 
                      domain={[0, 100]} 
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                    />
                    <Radar
                      name="Abilità"
                      dataKey="value"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sezione Evoluzioni */}
            {playerAwards && (
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white font-runtime">🏆 Evoluzioni Card</h2>
                  <div className="flex items-center space-x-4">
                    <span className="text-yellow-400 font-runtime">
                      {playerAwards.unlocked} Sbloccate
                    </span>
                    {playerAwards.pending > 0 && (
                      <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-runtime">
                        {playerAwards.pending} Nuove!
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Premi Pending - Solo per il proprietario */}
                {playerAwards.pendingAwards.length > 0 && isOwner && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-yellow-400 font-runtime mb-4">🎁 Premi da Sbloccare</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {playerAwards.pendingAwards.map((award) => (
                        <div key={award.id} className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border border-yellow-400/30 rounded-lg p-4 relative">
                          <div className="absolute -top-2 -right-2">
                            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-runtime font-bold">
                              NUOVO
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-3 bg-yellow-400/20 rounded-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <h4 className="text-white font-runtime font-bold mb-1">{getAwardLabel(award.awardType)}</h4>
                            <p className="text-gray-300 text-sm font-runtime mb-3">{getAwardDescription(award.awardType)}</p>
                            <button
                              onClick={() => handleUnlockCard(award)}
                              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-runtime font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
                            >
                              🎉 Sblocca Evoluzione
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ✅ NUOVA INTERFACCIA: Collezione Evoluzioni a Griglia */}
                <div>
                  <h3 className="text-lg font-semibold text-green-400 font-runtime mb-4">✅ Collezione Evoluzioni</h3>
                  
                  {/* Griglia di tutte le card speciali */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
                    {/* Card Base - sempre presente */}
                    <div 
                      className={`relative aspect-square rounded-lg border-2 transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                        !playerAwards.selectedCard 
                          ? 'border-blue-400 bg-blue-900/30 shadow-lg shadow-blue-400/20' 
                          : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                      }`}
                      onClick={() => isOwner && setSelectedCardModal('base')}
                    >
                      <div className="absolute inset-2 rounded-lg overflow-hidden">
                        <CardImage 
                          src={getCardUrl(player?.email || '')}
                          alt="Card Base"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-white text-xs font-runtime font-bold text-center">Card Base</p>
                      </div>
                      {!playerAwards.selectedCard && (
                        <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded font-runtime font-bold">
                          ATTIVA
                        </div>
                      )}
                    </div>

                    {/* Card Speciali */}
                    {allSpecialCards.map((card) => {
                      const isUnlocked = isCardUnlocked(card.id);
                      const isSelected = isCardSelected(card.id);
                      const award = getCardAward(card.id);
                      
                      return (
                        <div 
                          key={card.id}
                          className={`relative aspect-square rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${
                            isUnlocked 
                              ? `cursor-pointer ${isSelected 
                                  ? 'border-green-400 bg-green-900/30 shadow-lg shadow-green-400/20' 
                                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                                }`
                              : 'border-gray-700 bg-gray-900/50 cursor-not-allowed'
                          }`}
                          onClick={() => isUnlocked && isOwner && setSelectedCardModal(card.id)}
                        >
                          {isUnlocked ? (
                            <>
                              {/* Card sbloccata - mostra preview */}
                              <div className="absolute inset-2 rounded-lg overflow-hidden">
                                <CardImage 
                                  src={getSpecialCardUrl(player?.email || '', card.id)}
                                  alt={`Card ${card.name}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-white text-xs font-runtime font-bold text-center">{card.name}</p>
                              </div>
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded font-runtime font-bold">
                                  ATTIVA
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {/* Card bloccata - mostra lucchetto */}
                              <div className={`absolute inset-2 rounded-lg bg-gradient-to-br ${card.color} opacity-20`}></div>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <p className="text-gray-500 text-xs font-runtime font-bold text-center px-1">{card.name}</p>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Info sul Sistema Progressivo */}
                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-400/30 rounded-lg">
                  <h4 className="text-blue-400 font-runtime font-bold mb-2">💡 Sistema Card Progressive</h4>
                  {isOwner ? (
                    <ul className="text-gray-300 text-sm font-runtime space-y-1">
                      <li>• ⚽ <strong>Catena Goleador:</strong> Goleador → Matador → Golden Boot</li>
                      <li>• 🅰️ <strong>Catena Assistman:</strong> Assistman → Regista → El fútbol</li>
                      <li>• 🏆 Ogni vittoria nella stessa categoria sblocca la card successiva</li>
                      <li>• 🎯 Clicca sui premi "Nuovi" per sbloccarli con l'animazione</li>
                      <li>• 🎨 Clicca sulle card sbloccate per selezionarle come retro</li>
                    </ul>
                  ) : (
                    <ul className="text-gray-300 text-sm font-runtime space-y-1">
                      <li>• 📚 Collezione di {player?.name} - {playerAwards?.unlocked || 0} card sbloccate</li>
                      <li>• ⚽ <strong>Catena Goleador:</strong> Goleador → Matador → Golden Boot</li>
                      <li>• 🅰️ <strong>Catena Assistman:</strong> Assistman → Regista → El fútbol</li>
                      <li>• 🔒 Le card progressive si sbloccano vincendo nella stessa categoria</li>
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* ✅ MODAL CARD RESPONSIVE - Ottimizzato per Desktop */}
            {selectedCardModal && isOwner && (
              <div 
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setSelectedCardModal(null);
                  }
                }}
              >
                <div className="bg-gray-900 rounded-2xl w-full max-w-sm border border-gray-700 my-8 max-h-[90vh] overflow-y-auto">
                  {/* Header fisso */}
                  <div className="sticky top-0 bg-gray-900 rounded-t-2xl border-b border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white font-runtime">
                          {selectedCardModal === 'base' ? 'Card Base' : allSpecialCards.find(c => c.id === selectedCardModal)?.name}
                        </h3>
                        <p className="text-gray-400 font-runtime text-sm mt-1">
                          {selectedCardModal === 'base' ? 'La card principale' : allSpecialCards.find(c => c.id === selectedCardModal)?.description}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedCardModal(null)}
                        className="ml-4 text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Contenuto scrollabile */}
                  <div className="p-4">
                    {/* Preview card - Dimensioni ottimizzate per desktop */}
                    <div className="mb-6 flex justify-center">
                      <div className="w-48 max-w-full">
                        <CardImage 
                          src={selectedCardModal === 'base' 
                            ? getCardUrl(player?.email || '') 
                            : getSpecialCardUrl(player?.email || '', selectedCardModal)
                          }
                          alt={`Card ${selectedCardModal}`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Footer con bottoni - Sempre visibile */}
                  <div className="sticky bottom-0 bg-gray-900 rounded-b-2xl border-t border-gray-700 p-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedCardModal(null)}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-xl font-runtime font-semibold transition-all"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={() => {
                          handleSelectCard(selectedCardModal === 'base' ? null : getCardAward(selectedCardModal)?.id || null);
                          setSelectedCardModal(null);
                        }}
                        className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-3 px-4 rounded-xl font-runtime font-semibold transition-all"
                      >
                        ✅ Seleziona
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Statistiche di Gioco */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 mb-8">
              <h2 className="text-2xl font-bold text-white font-runtime mb-6 text-center">Statistiche di Gioco</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-purple-400 font-runtime">{playerStats.partiteDisputate}</div>
                  <div className="text-gray-300 font-runtime">Partite</div>
                </div>
                <div className="text-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-green-400 font-runtime">{playerStats.partiteVinte}</div>
                  <div className="text-gray-300 font-runtime">Vittorie</div>
                </div>
                <div className="text-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-red-400 font-runtime">{playerStats.partitePerse}</div>
                  <div className="text-gray-300 font-runtime">Sconfitte</div>
                </div>
                <div className="text-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-yellow-400 font-runtime">{playerStats.gol}</div>
                  <div className="text-gray-300 font-runtime">Gol</div>
                </div>
                <div className="text-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-cyan-400 font-runtime">{playerStats.assistenze}</div>
                  <div className="text-gray-300 font-runtime">Assist</div>
                </div>
                <div className="text-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-blue-400 font-runtime">
                    {(playerStats.gol / playerStats.partiteDisputate).toFixed(1)}
                  </div>
                  <div className="text-gray-300 font-runtime">Gol/Partita</div>
                </div>
                <div className="text-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-teal-400 font-runtime">
                    {(playerStats.assistenze / playerStats.partiteDisputate).toFixed(1)}
                  </div>
                  <div className="text-gray-300 font-runtime">Assist/Partita</div>
                </div>
                <div className="text-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-orange-400 font-runtime">
                    {(playerStats.partiteVinte / playerStats.partitePerse).toFixed(1)}
                  </div>
                  <div className="text-gray-300 font-runtime">Vittorie/Sconfitte</div>
                </div>
                <div className="text-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-amber-400 font-runtime">{playerStats.cartelliniGialli}</div>
                  <div className="text-gray-300 font-runtime">Cartellini Gialli</div>
                </div>
                <div className="text-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-rose-400 font-runtime">{playerStats.cartelliniRossi}</div>
                  <div className="text-gray-300 font-runtime">Cartellini Rossi</div>
                </div>
              </div>
            </div>

            {/* Storico Votazioni */}
            {voteHistory && (
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white font-runtime mb-6 text-center">Storico Votazioni</h2>
                
                {/* ✅ NUOVO: Statistiche Votazioni Complete */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                  <div className="text-center transform transition-all duration-300 hover:scale-105">
                    <div className="text-2xl font-bold text-blue-400 font-runtime">{voteHistory.statistics.totalVotes}</div>
                    <div className="text-gray-300 font-runtime text-sm">Voti Totali</div>
                  </div>
                  <div className="text-center transform transition-all duration-300 hover:scale-105">
                    <div className="text-2xl font-bold text-green-400 font-runtime">{voteHistory.statistics.upVotes}</div>
                    <div className="text-gray-300 font-runtime text-sm">UP</div>
                  </div>
                  <div className="text-center transform transition-all duration-300 hover:scale-105">
                    <div className="text-2xl font-bold text-gray-400 font-runtime">{voteHistory.statistics.neutralVotes || 0}</div>
                    <div className="text-gray-300 font-runtime text-sm">NEUTRAL</div>
                  </div>
                  <div className="text-center transform transition-all duration-300 hover:scale-105">
                    <div className="text-2xl font-bold text-red-400 font-runtime">{voteHistory.statistics.downVotes}</div>
                    <div className="text-gray-300 font-runtime text-sm">DOWN</div>
                  </div>
                  <div className="text-center transform transition-all duration-300 hover:scale-105">
                    <div className="text-2xl font-bold text-amber-400 font-runtime">{voteHistory.statistics.motmVotes || 0}</div>
                    <div className="text-gray-300 font-runtime text-sm">MOTM Voti</div>
                  </div>
                  <div className="text-center transform transition-all duration-300 hover:scale-105">
                    <div className={`text-2xl font-bold font-runtime ${
                      voteHistory.statistics.netVotes > 0 ? 'text-green-400' :
                      voteHistory.statistics.netVotes < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {voteHistory.statistics.netVotes > 0 ? '+' : ''}{voteHistory.statistics.netVotes}
                    </div>
                    <div className="text-gray-300 font-runtime text-sm">Net Score</div>
                  </div>
                </div>

                {/* Percentuale UP e Man of the Match */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="text-center transform transition-all duration-300 hover:scale-105">
                    <div className="text-4xl font-bold text-purple-400 font-runtime">{voteHistory.statistics.upPercentage}%</div>
                    <div className="text-gray-300 font-runtime">Percentuale UP</div>
                  </div>
                  <div className="text-center transform transition-all duration-300 hover:scale-105">
                    <div className="text-4xl font-bold text-yellow-400 font-runtime">{voteHistory.statistics.actualMotm || 0}</div>
                    <div className="text-gray-300 font-runtime">Man of the Match</div>
                  </div>
                </div>

                {/* Risultati ultima partita */}
                {voteHistory.matchResults && voteHistory.matchResults.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white font-runtime mb-4">Risultati ultima partita</h3>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      {(() => {
                        const lastMatch = voteHistory.matchResults[0];
                        return (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="flex items-center space-x-2">
                              <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-runtime font-semibold min-w-[45px] text-center">
                                {lastMatch.upVotes} UP
                              </span>
                              {lastMatch.neutralVotes > 0 && (
                                <span className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-runtime font-semibold min-w-[45px] text-center">
                                  {lastMatch.neutralVotes} NEU
                                </span>
                              )}
                              <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-runtime font-semibold min-w-[45px] text-center">
                                {lastMatch.downVotes} DOWN
                              </span>
                              {lastMatch.motmVotes > 0 && (
                                <span className="bg-amber-500 text-black px-2 py-1 rounded text-xs font-runtime font-bold min-w-[45px] text-center">
                                  {lastMatch.motmVotes} MOTM
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`font-runtime font-bold text-sm ${
                                lastMatch.netVotes > 0 ? 'text-green-400' :
                                lastMatch.netVotes < 0 ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                Net: {lastMatch.netVotes > 0 ? '+' : ''}{lastMatch.netVotes}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Footer spacer */}
        <div className="h-20 sm:h-8"></div>
      </div>
    </div>
  );
} 