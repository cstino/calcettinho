'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navigation from "../../components/Navigation";
import Logo from "../../components/Logo";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

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
    potentialMotm: number;
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

export default function PlayerProfile() {
  const params = useParams();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteHistory | null>(null);
  const [playerAwards, setPlayerAwards] = useState<PlayerAwards | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [unlockingCard, setUnlockingCard] = useState<PlayerAward | null>(null);
  // Stato per il carousel delle evoluzioni
  const [currentPage, setCurrentPage] = useState(0);
  const cardsPerPage = 3;
  // Stato per l'animazione del carousel
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  const email = typeof params.email === 'string' ? decodeURIComponent(params.email) : '';

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

        const mappedPlayer = {
          id: targetPlayer.id || '1',
          name: targetPlayer.nome || 'Nome non disponibile',
          email: targetPlayer.email || 'email@non-disponibile.com',
          overall: Math.round((targetPlayer.ATT + targetPlayer.DIF + targetPlayer.VEL + targetPlayer.FOR + targetPlayer.PAS + targetPlayer.POR) / 6),
          att: Math.round(targetPlayer.ATT),
          vel: Math.round(targetPlayer.VEL),
          pas: Math.round(targetPlayer.PAS),
          for: Math.round(targetPlayer.FOR),
          dif: Math.round(targetPlayer.DIF),
          por: Math.round(targetPlayer.POR)
        };
        
        console.log('✅ Giocatore mappato:', mappedPlayer);
        
        // Statistiche mock per ora
        const mockStats = {
          gol: Math.floor(Math.random() * 15) + 5,
          partiteDisputate: Math.floor(Math.random() * 20) + 10,
          partiteVinte: Math.floor(Math.random() * 12) + 8,
          partitePareggiate: Math.floor(Math.random() * 5) + 2,
          partitePerse: Math.floor(Math.random() * 8) + 3,
          assistenze: Math.floor(Math.random() * 10) + 3,
          cartelliniGialli: Math.floor(Math.random() * 5),
          cartelliniRossi: Math.floor(Math.random() * 2),
          minutiGiocati: Math.floor(Math.random() * 1000) + 800
        };
        
        setPlayer(mappedPlayer);
        
        // Carica statistiche reali da Airtable
        try {
          const statsResponse = await fetch(`/api/player-stats/${encodeURIComponent(email)}`);
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setPlayerStats(statsData);
          } else {
            // Usa le statistiche mock in caso di errore
            setPlayerStats(mockStats);
          }
        } catch (statsError) {
          console.log('Errore nel caricamento statistiche:', statsError);
          setPlayerStats(mockStats);
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

  // Reset della pagina corrente quando cambiano i premi
  useEffect(() => {
    setCurrentPage(0);
  }, [playerAwards?.unlockedAwards.length]);

  // Preloading delle immagini delle card per eliminare il lag
  useEffect(() => {
    if (!player || !playerAwards) return;

    const preloadImages = async () => {
      const imagesToPreload: string[] = [];
      
      // Card base
      imagesToPreload.push(`http://localhost:3001/api/card/${encodeURIComponent(player.email)}`);
      
      // Card speciali sbloccate
      playerAwards.unlockedAwards.forEach(award => {
        imagesToPreload.push(
          `http://localhost:3001/api/card-special/${encodeURIComponent(player.email)}?template=${award.awardType}`
        );
      });

      // Precarica tutte le immagini
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
        const successfullyLoaded = new Set<string>();
        
        loadedImages.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successfullyLoaded.add(imagesToPreload[index]);
          }
        });
        
        setPreloadedImages(successfullyLoaded);
        console.log('✅ Precaricate', successfullyLoaded.size, 'immagini card');
      } catch (error) {
        console.log('⚠️ Errore nel preloading immagini:', error);
      }
    };

    preloadImages();
  }, [player, playerAwards]);

  // Funzione per sbloccare una card pending
  const handleUnlockCard = async (award: PlayerAward) => {
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
        // Ricarica i dati dei premi
        const awardsResponse = await fetch(`/api/player-awards/${encodeURIComponent(email)}`);
        if (awardsResponse.ok) {
          const awardsData = await awardsResponse.json();
          setPlayerAwards(awardsData);
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
  };

  // Funzione per selezionare una card come retro
  const handleSelectCard = async (awardId: string | null) => {
    try {
      const response = await fetch(`/api/player-awards/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ awardId }),
      });

      if (response.ok) {
        // Ricarica i dati dei premi
        const awardsResponse = await fetch(`/api/player-awards/${encodeURIComponent(email)}`);
        if (awardsResponse.ok) {
          const awardsData = await awardsResponse.json();
          setPlayerAwards(awardsData);
        }
      } else {
        console.error('Errore nella selezione della card');
      }
    } catch (error) {
      console.error('Errore nella selezione della card:', error);
    }
  };

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
      'goleador': 'Goleador',
      'assistman': 'Assist Man',
      'motm': 'Man of the Match',
      'win3': 'Streak Winner 3',
      'win5': 'Streak Winner 5',
      'win10': 'Streak Winner 10'
    };
    return labels[awardType] || awardType.toUpperCase();
  };

  const getAwardDescription = (awardType: string) => {
    const descriptions: Record<string, string> = {
      '1presenza': 'Prima partita giocata',
      'goleador': 'Più gol segnati in partita',
      'assistman': 'Più assist forniti in partita',
      'motm': 'Più UP ricevuti in partita',
      'win3': '3 vittorie consecutive',
      'win5': '5 vittorie consecutive',
      'win10': '10 vittorie consecutive'
    };
    return descriptions[awardType] || 'Achievement speciale';
  };

  // Funzioni per il carousel delle evoluzioni
  const getTotalCards = () => {
    if (!playerAwards) return 0;
    return playerAwards.unlockedAwards.length + 1; // +1 per la card base
  };

  const getTotalPages = () => {
    const totalCards = getTotalCards();
    return Math.ceil(totalCards / cardsPerPage);
  };

  const nextPage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      const totalPages = getTotalPages();
      setCurrentPage(prev => (prev + 1) % totalPages);
      setTimeout(() => setIsTransitioning(false), 150);
    }, 150);
  };

  const prevPage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      const totalPages = getTotalPages();
      setCurrentPage(prev => (prev - 1 + totalPages) % totalPages);
      setTimeout(() => setIsTransitioning(false), 150);
    }, 150);
  };

  const goToPage = (page: number) => {
    if (isTransitioning || page === currentPage) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(page);
      setTimeout(() => setIsTransitioning(false), 150);
    }, 150);
  };

  const getCurrentCards = () => {
    if (!playerAwards) return [];
    
    // Creo array con card base + card sbloccate
    const allCards = [
      { type: 'base', data: null },
      ...playerAwards.unlockedAwards.map(award => ({ type: 'unlocked', data: award }))
    ];
    
    const startIndex = currentPage * cardsPerPage;
    const endIndex = startIndex + cardsPerPage;
    return allCards.slice(startIndex, endIndex);
  };

  // Componente per immagine con skeleton loader
  const CardImage = ({ src, alt, isPreloaded }: { src: string; alt: string; isPreloaded: boolean }) => {
    const [imageLoaded, setImageLoaded] = useState(isPreloaded);
    
    return (
      <div className="relative w-full mb-2">
        {!imageLoaded && (
          <div className="w-full aspect-[3/4] bg-gray-700 rounded image-skeleton"></div>
        )}
        <img 
          src={src}
          alt={alt}
          className={`w-full h-auto rounded transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100 image-loaded' : 'opacity-0 absolute inset-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
      </div>
    );
  };

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
    <div 
      className="min-h-screen bg-gray-900 relative"
      style={{
        backgroundImage: 'url("/stadium-background.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay per migliorare la leggibilità */}
      <div className="absolute inset-0 bg-black/60"></div>

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
        <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Bottone Indietro */}
            <button 
              onClick={() => router.push('/players')}
              className="mb-6 flex items-center text-gray-300 hover:text-white transition-colors font-runtime cursor-pointer z-50 relative pointer-events-auto"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Torna ai Giocatori
            </button>

            {/* Header con nome giocatore */}
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-bold font-runtime text-white mb-2 drop-shadow-lg">
                {player.name}
              </h1>
            </div>

            {/* Card del Giocatore */}
            <div className="text-center mb-8">
              <img 
                src={`http://localhost:3001/api/card/${encodeURIComponent(player.email)}`}
                alt={`Card di ${player.name}`}
                className="w-80 h-auto mx-auto mb-4 inline-block"
              />
              
              {/* Bottone Download Card */}
              <div>
                <a
                  href={`http://localhost:3001/api/card/${encodeURIComponent(player.email)}`}
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

                {/* Card Premi Pending */}
                {playerAwards.pendingAwards.length > 0 && (
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

                {/* Card Sbloccate */}
                {playerAwards.unlockedAwards.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-green-400 font-runtime mb-4">✅ Collezione Evoluzioni</h3>
                    
                    {/* Carousel Container */}
                    <div className="relative">
                      {/* Freccia Sinistra */}
                      {getTotalPages() > 1 && (
                        <button
                          onClick={prevPage}
                          disabled={isTransitioning}
                          className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700/80 text-white p-2 rounded-full transition-all duration-300 shadow-lg ${
                            isTransitioning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
                          }`}
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}

                      {/* Card Container */}
                      <div className={`carousel-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mx-12 ${
                        isTransitioning ? 'carousel-transitioning' : ''
                      }`}>
                        {getCurrentCards().map((card, index) => (
                          <div key={`${card.type}-${index}`}>
                            {card.type === 'base' ? (
                              /* Card Base */
                              <div className={`carousel-card border-2 rounded-lg p-4 cursor-pointer transition-all duration-300 ${
                                !playerAwards.selectedCard 
                                  ? 'border-blue-400 bg-blue-900/30' 
                                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-400'
                              }`}
                              onClick={() => handleSelectCard(null)}
                              >
                                <div className="text-center">
                                  <CardImage 
                                    src={`http://localhost:3001/api/card/${encodeURIComponent(player?.email || '')}`}
                                    alt="Card Base"
                                    isPreloaded={preloadedImages.has(`http://localhost:3001/api/card/${encodeURIComponent(player?.email || '')}`)}
                                  />
                                  <h4 className="text-white font-runtime font-bold mb-1">Card Base</h4>
                                  <p className="text-gray-300 text-sm font-runtime mb-2">La tua card principale</p>
                                  {!playerAwards.selectedCard && (
                                    <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded font-runtime font-bold">
                                      SELEZIONATA
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Card Sbloccate */
                              <div 
                                className={`carousel-card border-2 rounded-lg p-4 cursor-pointer transition-all duration-300 ${
                                  card.data?.selected 
                                    ? 'border-green-400 bg-green-900/30' 
                                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-400'
                                }`}
                                onClick={() => handleSelectCard(card.data?.id || '')}
                              >
                                <div className="text-center">
                                  <CardImage 
                                    src={`http://localhost:3001/api/card-special/${encodeURIComponent(player?.email || '')}?template=${card.data?.awardType}`}
                                    alt={`Card ${card.data?.awardType}`}
                                    isPreloaded={preloadedImages.has(`http://localhost:3001/api/card-special/${encodeURIComponent(player?.email || '')}?template=${card.data?.awardType}`)}
                                  />
                                  <h4 className="text-white font-runtime font-bold mb-1">{getAwardLabel(card.data?.awardType || '')}</h4>
                                  <p className="text-gray-300 text-sm font-runtime mb-2">{getAwardDescription(card.data?.awardType || '')}</p>
                                  {card.data?.selected && (
                                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded font-runtime font-bold">
                                      SELEZIONATA
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Freccia Destra */}
                      {getTotalPages() > 1 && (
                        <button
                          onClick={nextPage}
                          disabled={isTransitioning}
                          className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700/80 text-white p-2 rounded-full transition-all duration-300 shadow-lg ${
                            isTransitioning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
                          }`}
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Indicatori Pagina (Pallini) */}
                    {getTotalPages() > 1 && (
                      <div className="flex justify-center space-x-2 mt-6">
                        {Array.from({ length: getTotalPages() }).map((_, index) => (
                          <button
                            key={index}
                            onClick={() => goToPage(index)}
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${
                              currentPage === index 
                                ? 'bg-green-400 scale-125' 
                                : 'bg-gray-600 hover:bg-gray-500'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Info Navigazione */}
                    {getTotalPages() > 1 && (
                      <div className="text-center mt-4">
                        <p className="text-gray-400 text-sm font-runtime">
                          Pagina {currentPage + 1} di {getTotalPages()} • {getTotalCards()} card totali
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Messaggio se nessuna card sbloccata */}
                {playerAwards.total === 0 && (
                  <div className="text-center py-8">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-700/50 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-400 font-runtime mb-2">Nessuna Evoluzione Ancora</h3>
                    <p className="text-gray-500 font-runtime">Partecipa alle partite per sbloccare card speciali!</p>
                  </div>
                )}

                {/* Info sul Sistema */}
                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-400/30 rounded-lg">
                  <h4 className="text-blue-400 font-runtime font-bold mb-2">💡 Come Funziona</h4>
                  <ul className="text-gray-300 text-sm font-runtime space-y-1">
                    <li>• Gioca alle partite per guadagnare achievement</li>
                    <li>• Sblocca le evoluzioni cliccando sui premi disponibili</li>
                    <li>• Seleziona quale card mostrare nel retro durante l'hover</li>
                    <li>• La card selezionata apparirà quando gli altri vedranno il tuo profilo</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Statistiche di Gioco */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 mb-8">
              <h2 className="text-2xl font-bold text-white font-runtime mb-6 text-center">Statistiche di Gioco</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400 font-runtime">{playerStats.partiteDisputate}</div>
                  <div className="text-gray-300 font-runtime">Partite</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 font-runtime">{playerStats.partiteVinte}</div>
                  <div className="text-gray-300 font-runtime">Vittorie</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400 font-runtime">{playerStats.partitePerse}</div>
                  <div className="text-gray-300 font-runtime">Sconfitte</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400 font-runtime">{playerStats.gol}</div>
                  <div className="text-gray-300 font-runtime">Gol</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 font-runtime">
                    {(playerStats.gol / playerStats.partiteDisputate).toFixed(1)}
                  </div>
                  <div className="text-gray-300 font-runtime">Gol/Partita</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400 font-runtime">
                    {playerStats.partitePerse > 0 ? (playerStats.partiteVinte / playerStats.partitePerse).toFixed(1) : '∞'}
                  </div>
                  <div className="text-gray-300 font-runtime">Vittorie/Sconfitte</div>
                </div>
              </div>
            </div>

            {/* Storico Votazioni */}
            {voteHistory && (
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white font-runtime mb-6 text-center">Storico Votazioni</h2>
                
                {/* Statistiche Votazioni */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 font-runtime">{voteHistory.statistics.totalVotes}</div>
                    <div className="text-gray-300 font-runtime">Voti Ricevuti</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 font-runtime">{voteHistory.statistics.upVotes}</div>
                    <div className="text-gray-300 font-runtime">Voti UP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-400 font-runtime">{voteHistory.statistics.downVotes}</div>
                    <div className="text-gray-300 font-runtime">Voti DOWN</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold font-runtime ${
                      voteHistory.statistics.netVotes > 0 ? 'text-green-400' :
                      voteHistory.statistics.netVotes < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {voteHistory.statistics.netVotes > 0 ? '+' : ''}{voteHistory.statistics.netVotes}
                    </div>
                    <div className="text-gray-300 font-runtime">Net Votes</div>
                  </div>
                </div>

                {/* Percentuale UP e Man of the Match */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-400 font-runtime">{voteHistory.statistics.upPercentage}%</div>
                    <div className="text-gray-300 font-runtime">Percentuale UP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-400 font-runtime">{voteHistory.statistics.potentialMotm}</div>
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
                          <div className="flex items-center justify-center space-x-4">
                            <div className="flex items-center space-x-3">
                              <span className="bg-green-600 text-white px-4 py-2 rounded text-sm font-runtime font-semibold min-w-[70px] text-center">
                                {lastMatch.upVotes} UP
                              </span>
                              <span className="bg-red-600 text-white px-4 py-2 rounded text-sm font-runtime font-semibold min-w-[70px] text-center">
                                {lastMatch.downVotes} DOWN
                              </span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className={`font-runtime font-bold text-lg ${
                                lastMatch.netVotes > 0 ? 'text-green-400' :
                                lastMatch.netVotes < 0 ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                {lastMatch.netVotes > 0 ? '+' : ''}{lastMatch.netVotes}
                              </div>
                              {lastMatch.isMotm && (
                                <div className="bg-yellow-500 text-black px-3 py-1 rounded text-sm font-runtime font-bold">
                                  MotM
                                </div>
                              )}
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