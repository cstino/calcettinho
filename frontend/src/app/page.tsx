'use client';

import { useAuth } from './contexts/AuthContext';
import { useNotifications } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Link from "next/link";
import Navigation from "./components/Navigation";
import Logo from "./components/Logo";
import PlayerCard from "./components/PlayerCard";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface PlayerData {
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
}

interface PlayerStatsData {
  id: string;
  name: string;
  email: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  overall: number;
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
}

interface MatchData {
  id: string;
  matchId: string;
  title: string;
  date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  teamA: string[];
  teamB: string[];
  canVote?: boolean;
}

// Componente Carosello Top 5
function TopPlayersCarousel({ players }: { players: PlayerStatsData[] }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const categories = [
    { 
      title: 'Overall', 
      color: 'from-yellow-500 to-orange-500',
      getValue: (player: PlayerStatsData) => player.overall,
      format: (value: number) => value.toString()
    },
    { 
      title: 'Gol', 
      color: 'from-green-500 to-blue-500',
      getValue: (player: PlayerStatsData) => player.goals,
      format: (value: number) => value.toString()
    },
    { 
      title: 'Assist', 
      color: 'from-purple-500 to-pink-500',
      getValue: (player: PlayerStatsData) => player.assists,
      format: (value: number) => value.toString()
    },
    { 
      title: 'Vittorie', 
      color: 'from-blue-500 to-cyan-500',
      getValue: (player: PlayerStatsData) => player.wins,
      format: (value: number) => value.toString()
    }
  ];

  const getTopPlayersForCategory = (categoryIndex: number) => {
    const category = categories[categoryIndex];
    return [...players]
      .sort((a, b) => category.getValue(b) - category.getValue(a))
      .slice(0, 5);
  };

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % categories.length);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + categories.length) % categories.length);
  };

  // Gestione swipe touch
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextPage();
    } else if (isRightSwipe) {
      prevPage();
    }
    setIsDragging(false);
  };

  // Gestione mouse drag per desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setTouchEnd(null);
    setTouchStart(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTouchEnd(e.clientX);
    }
  };

  const handleMouseUp = () => {
    if (!touchStart || !touchEnd || !isDragging) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextPage();
    } else if (isRightSwipe) {
      prevPage();
    }
    setIsDragging(false);
  };

  const currentCategory = categories[currentPage];
  const topPlayers = getTopPlayersForCategory(currentPage);

    return (
    <div>
      {/* Titolo TOP 5 completamente libero - senza contenitori */}
      <div className="px-6 mb-4">
        <h2 className="text-3xl font-bold text-white font-runtime">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 text-neon">
            TOP 5
          </span>
        </h2>
      </div>

      {/* Contenitore principale con stessa larghezza delle altre sezioni */}
      <div className="px-6">
        {/* Header con categoria e navigazione - senza riquadri */}
        <div className="flex items-center justify-between mb-6">
        <span className={`px-4 py-2 bg-gradient-to-r ${currentCategory.color} rounded-full text-white text-sm font-bold shadow-lg neon-glow`}>
          {currentCategory.title}
        </span>
        
        <div className="flex items-center gap-3">
          <button
            onClick={prevPage}
            className="w-10 h-10 glass-dark neon-border rounded-full flex items-center justify-center text-purple-200 hover:text-white transition-all duration-300 hover:neon-glow"
          >
            ←
          </button>
          <div className="flex gap-2">
            {categories.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentPage 
                    ? 'bg-gradient-to-r from-purple-400 to-blue-400 neon-glow' 
                    : 'bg-gray-600/50 hover:bg-purple-400/50'
                }`}
              />
            ))}
          </div>
          <button
            onClick={nextPage}
            className="w-10 h-10 glass-dark neon-border rounded-full flex items-center justify-center text-purple-200 hover:text-white transition-all duration-300 hover:neon-glow"
          >
            →
          </button>
        </div>
      </div>

      {/* Lista Top 5 con glassmorphism */}
      <div 
        className="glass-card liquid-border neon-border p-4 mb-6 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ 
            duration: 0.3,
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
          className="relative z-10"
        >
        {topPlayers.map((player, index) => (
          <Link key={player.id} href={`/profile/${encodeURIComponent(player.email)}`}>
            <div className={`flex items-center gap-4 ${index > 0 ? 'mt-4' : ''}`}>
              {/* Cerchio posizione - DIMENSIONI UNIFORMI */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-lg flex-shrink-0 ${
                index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black neon-glow' :
                index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-black' :
                index === 2 ? 'bg-gradient-to-r from-amber-500 to-amber-700 text-white' :
                'bg-gradient-to-r from-purple-500 to-purple-700 text-white'
              }`}>
                {index + 1}
              </div>

              {/* Riquadro giocatore - DIMENSIONI UNIFORMI */}
              <div className="flex-1 glass-dark liquid-border neon-border p-4 h-16 flex items-center hover:neon-glow transition-all duration-300 group">
                {/* Foto giocatore - DIMENSIONI UNIFORMI */}
                <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden flex-shrink-0 ml-2">
                  <img 
                    src={`/players/${player.email}.jpg`}
                    alt={player.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling!.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden w-full h-full bg-gray-600 flex items-center justify-center text-gray-300 text-sm font-bold">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Nome giocatore - POSIZIONE UNIFORME */}
                <div className="flex-1 ml-4">
                  <h4 className="text-white font-medium text-base group-hover:text-purple-200 transition-colors truncate">{player.name}</h4>
                </div>

                {/* Cerchio valore - DIMENSIONI UNIFORMI */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-r ${currentCategory.color} text-white shadow-lg neon-glow flex-shrink-0 mr-2`}>
                  {currentCategory.format(currentCategory.getValue(player))}
                </div>
              </div>
            </div>
          </Link>
        ))}
        </motion.div>
      </div>



        {/* Link alle statistiche complete */}
        <Link href="/stats" className="block mt-6 text-center">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 text-sm font-bold hover:from-purple-400 hover:to-pink-400 transition-all duration-300">
            Vedi tutte le statistiche →
          </span>
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const { loading, userEmail } = useAuth();
  const { hasUnseenEvolutions, evolutionCount } = useNotifications();
  const [currentPlayer, setCurrentPlayer] = useState<PlayerData | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [allPlayersStats, setAllPlayersStats] = useState<PlayerStatsData[]>([]);
  const [pendingVotes, setPendingVotes] = useState<MatchData[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Carica dati per la versione mobile
  useEffect(() => {
    const fetchMobileData = async () => {
      if (!userEmail) return;
      
      try {
        setLoadingData(true);
        
        // Carica i dati del giocatore corrente
        const playersResponse = await fetch('/api/players');
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          const player = playersData.find((p: any) => p.email === userEmail);
          if (player) {
            setCurrentPlayer(player);
          }
        }

        // Carica le statistiche del giocatore
        const statsResponse = await fetch(`/api/player-stats/${encodeURIComponent(userEmail)}`);
        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          setPlayerStats(stats);
        }

        // Carica tutte le statistiche dei giocatori
        const allStatsResponse = await fetch('/api/stats');
        if (allStatsResponse.ok) {
          const allStats = await allStatsResponse.json();
          setAllPlayersStats(allStats);
        }

        // Carica le partite per cui l'utente può votare
        const matchesResponse = await fetch('/api/matches');
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json();
          
          // Filtra partite completate dove l'utente ha partecipato
          const completedMatches = matchesData.filter((match: any) => {
            if (!match.completed) return false;
            
            const teamA = Array.isArray(match.teamA) ? match.teamA : 
                         (typeof match.teamA === 'string' ? JSON.parse(match.teamA || '[]') : []);
            const teamB = Array.isArray(match.teamB) ? match.teamB : 
                         (typeof match.teamB === 'string' ? JSON.parse(match.teamB || '[]') : []);
            
            return [...teamA, ...teamB].includes(userEmail);
          });

          // Controlla per ogni partita se l'utente può ancora votare
          const votableMatches = [];
          
          for (const match of completedMatches) {
            try {
              const voteCheckResponse = await fetch(
                `/api/votes/check/${encodeURIComponent(userEmail)}/${match.matchId}`
              );
              
              if (voteCheckResponse.ok) {
                const voteData = await voteCheckResponse.json();
                
                if (!voteData.hasVoted) {
                  votableMatches.push({
                    id: match.id,
                    matchId: match.matchId,
                    title: match.title || `Partita del ${new Date(match.date).toLocaleDateString()}`,
                    date: match.date,
                    status: 'completed' as const,
                    teamA: Array.isArray(match.teamA) ? match.teamA : JSON.parse(match.teamA || '[]'),
                    teamB: Array.isArray(match.teamB) ? match.teamB : JSON.parse(match.teamB || '[]'),
                    canVote: true
                  });
                }
              }
            } catch (error) {
              console.error(`Errore nel controllo voti per partita ${match.matchId}:`, error);
            }
          }

          setPendingVotes(votableMatches);
        }

      } catch (error) {
        console.error('Errore nel caricamento dati mobile:', error);
      } finally {
        setLoadingData(false);
      }
    };

    if (userEmail) {
      fetchMobileData();
    }
  }, [userEmail]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
          <p className="text-gray-200 mt-4 font-runtime">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black relative overflow-hidden" style={{ margin: '0', padding: '0' }}>
        {/* Particelle fluttuanti ridotte per OLED */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-1 h-1 bg-purple-400/20 rounded-full float-animation"></div>
          <div className="absolute top-20 right-20 w-1 h-1 bg-blue-400/20 rounded-full float-animation" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-40 left-1/3 w-1 h-1 bg-green-400/20 rounded-full float-animation" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-60 right-1/4 w-1 h-1 bg-pink-400/20 rounded-full float-animation" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-40 left-20 w-1 h-1 bg-cyan-400/20 rounded-full float-animation" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute bottom-20 right-10 w-1 h-1 bg-yellow-400/20 rounded-full float-animation" style={{ animationDelay: '2.5s' }}></div>
        </div>
        {/* VERSIONE MOBILE */}
        <div className="block lg:hidden status-bar-immersive status-bar-overlay bg-black" style={{ marginTop: '0', paddingTop: '0' }}>
          {/* Mobile Header - Neon Style */}
          <div 
            className="px-6 relative overflow-hidden bg-black"
            style={{ 
              paddingTop: 'env(safe-area-inset-top, 20px)',
              marginTop: 'calc(-1 * env(safe-area-inset-top, 0px))'
            }}
          >
            {/* Background nero puro per OLED */}
            <div className="absolute inset-0 bg-black"></div>
            
            <div className="relative z-10 text-center mb-4" style={{ marginTop: '10px' }}>
              <div className="font-runtime">
                <div className="text-lg font-medium text-white/90 mb-1">
                  Benvenuto nel
                </div>
                <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 via-blue-500 to-cyan-400 text-neon-clean drop-shadow-none">
                  Calcettinho
                </h1>
              </div>
            </div>

            {/* Banner Evoluzioni Mobile */}
            {hasUnseenEvolutions && userEmail && (
              <div className="mb-4">
                <Link href={`/profile/${encodeURIComponent(userEmail)}`}>
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 rounded-xl shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center">
                        <span className="text-xl">🏆</span>
                      </div>
                      <div>
                        <h3 className="font-bold font-runtime">Nuove Evoluzioni!</h3>
                        <p className="text-sm text-yellow-100">
                          {evolutionCount} evoluzion{evolutionCount === 1 ? 'e' : 'i'} disponibili
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Card del Giocatore */}
            {currentPlayer && (
              <div className="mb-6">
                <h2 className="text-base font-bold text-white font-runtime mb-3 text-center">
                  La Tua Card
                </h2>
                <div className="flex justify-center">
                  <div className="w-64">
                    <PlayerCard player={currentPlayer} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sezioni Mobile */}
          <div className="px-4 pb-32 space-y-6 bg-black">
            
            {/* Statistiche Rapide - Neon Style */}
            {playerStats && (
              <section className="glass-card liquid-border neon-border p-6 relative overflow-hidden">
                {/* Glow effect interno */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
                
                <h3 className="text-xl font-bold text-white font-runtime mb-6 relative z-10">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">
                    Le Tue Statistiche
                  </span>
                </h3>
                
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="glass-dark liquid-border p-4 text-center neon-border group hover:neon-glow transition-all duration-300">
                    <div className="text-3xl font-bold text-green-400 mb-1 group-hover:scale-110 transition-transform">{playerStats.partiteDisputate}</div>
                    <div className="text-sm text-purple-200/80 font-medium">Partite</div>
                  </div>
                  <div className="glass-dark liquid-border p-4 text-center neon-border group hover:neon-glow transition-all duration-300">
                    <div className="text-3xl font-bold text-blue-400 mb-1 group-hover:scale-110 transition-transform">{playerStats.gol}</div>
                    <div className="text-sm text-purple-200/80 font-medium">Gol</div>
                  </div>
                  <div className="glass-dark liquid-border p-4 text-center neon-border group hover:neon-glow transition-all duration-300">
                    <div className="text-3xl font-bold text-purple-400 mb-1 group-hover:scale-110 transition-transform">{playerStats.assistenze}</div>
                    <div className="text-sm text-purple-200/80 font-medium">Assist</div>
                  </div>
                  <div className="glass-dark liquid-border p-4 text-center neon-border group hover:neon-glow transition-all duration-300">
                    <div className="text-3xl font-bold text-yellow-400 mb-1 group-hover:scale-110 transition-transform">{playerStats.partiteVinte}</div>
                    <div className="text-sm text-purple-200/80 font-medium">Vittorie</div>
                  </div>
                </div>
              </section>
            )}

                         {/* Votazioni Pendenti - Neon Style */}
              {pendingVotes.length > 0 && (
                <section className="glass-card liquid-border neon-border p-6 relative overflow-hidden">
                  {/* Effetti glow di sfondo */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-red-500/5 rounded-full blur-3xl"></div>
                  
                  <h3 className="text-xl font-bold text-white font-runtime mb-6 relative z-10">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
                      Votazioni Pendenti
                    </span>
                  </h3>
                  
                  <div className="space-y-4 relative z-10">
                    {pendingVotes.map((match) => (
                      <div key={match.id} className="glass-dark liquid-border neon-border p-5 group hover:neon-glow transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-white font-medium text-lg group-hover:text-orange-200 transition-colors">{match.title}</h4>
                            <p className="text-sm text-purple-200/80 font-medium">
                              {new Date(match.date).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          <div className="w-4 h-4 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-pulse shadow-lg neon-glow"></div>
                        </div>
                        <Link 
                          href={`/matches`}
                          className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white px-6 py-3 rounded-full font-bold text-center block hover:from-orange-600 hover:via-red-600 hover:to-pink-600 transition-all duration-300 shadow-lg neon-glow hover:scale-105"
                        >
                          Vota Ora
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {/* Top 5 Carosello */}
            {allPlayersStats.length > 0 && (
              <TopPlayersCarousel players={allPlayersStats} />
            )}

            
          </div>
          
          {/* Navigation Mobile alla fine */}
          <Navigation />
        </div>

        {/* VERSIONE DESKTOP - Nero OLED */}
        <div className="hidden lg:block min-h-screen bg-black relative">
          {/* Overlay nero per OLED */}
          <div className="absolute inset-0 bg-black"></div>

          {/* Contenuto principale */}
          <div className="relative z-10">
            <Navigation />
            
            {/* Hero Section */}
            <section className="relative py-20 px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto text-center">
                {/* Immagine principale al posto del logo e del testo */}
                <div className="mb-8">
                  <img 
                    src="/images/heroes/sfondo%20calc.png"
                    alt="Calcettinho - Lega di Calcetto"
                    className="mx-auto w-full max-w-4xl h-auto drop-shadow-lg rounded-lg"
                  />
                </div>
                
                <p className="text-xl font-runtime text-gray-200 mb-8 max-w-2xl mx-auto drop-shadow-md">
                  Lega di calcetto 5v5. Organizza partite, vota i tuoi amici e osserva le statistiche evolvere nel tempo.
                </p>
              </div>
            </section>

            {/* Banner Evoluzioni */}
            {hasUnseenEvolutions && userEmail && (
              <section className="py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                  <Link href={`/profile/${encodeURIComponent(userEmail)}`}>
                    <div className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white p-6 rounded-xl shadow-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 border border-yellow-400/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center animate-pulse">
                            <span className="text-3xl">🏆</span>
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold font-runtime mb-1">
                              Nuove Evoluzioni Disponibili!
                            </h3>
                            <p className="text-yellow-100 font-runtime">
                              Hai {evolutionCount} evoluzion{evolutionCount === 1 ? 'e' : 'i'} pronte da sbloccare nel tuo profilo
                            </p>
                          </div>
                        </div>
                        <div className="hidden sm:block">
                          <svg className="w-8 h-8 text-yellow-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </section>
            )}

            {/* Features Section */}
            <section className="py-16 bg-black/80 backdrop-blur-sm">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold font-runtime text-center text-white mb-12 drop-shadow-lg">
                  Funzionalità Principali
                </h2>
                
                <div className="grid md:grid-cols-3 gap-8">
                  {/* Card Personalizzate */}
                  <div className="group text-center p-6 rounded-xl bg-black/80 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:bg-black/90 transition-all duration-500 hover:scale-105 cursor-pointer hover:border hover:border-green-400/50">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-900/60 group-hover:bg-green-600 rounded-full flex items-center justify-center transition-all duration-500 group-hover:shadow-lg group-hover:shadow-green-400/50">
                      <svg className="w-8 h-8 text-green-400 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold font-runtime text-white mb-2 group-hover:text-green-400 transition-colors duration-500">Card Personalizzate</h3>
                    <p className="text-gray-300 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 ease-out">
                      Card uniche per ogni giocatore con statistiche, foto e design dinamici basati sulle prestazioni.
                    </p>
                  </div>

                  {/* Gestione Partite */}
                  <div className="group text-center p-6 rounded-xl bg-black/80 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:bg-black/90 transition-all duration-500 hover:scale-105 cursor-pointer hover:border hover:border-blue-400/50">
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-900/60 group-hover:bg-blue-600 rounded-full flex items-center justify-center transition-all duration-500 group-hover:shadow-lg group-hover:shadow-blue-400/50">
                      <svg className="w-8 h-8 text-blue-400 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold font-runtime text-white mb-2 group-hover:text-blue-400 transition-colors duration-500">Gestione Partite</h3>
                    <p className="text-gray-300 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 ease-out">
                      Organizza partite, forma squadre automaticamente e tieni traccia di tutti i risultati e statistiche.
                    </p>
                  </div>

                  {/* Sistema Votazioni */}
                  <div className="group text-center p-6 rounded-xl bg-black/80 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:bg-black/90 transition-all duration-500 hover:scale-105 cursor-pointer hover:border hover:border-purple-400/50">
                    <div className="w-16 h-16 mx-auto mb-4 bg-purple-900/60 group-hover:bg-purple-600 rounded-full flex items-center justify-center transition-all duration-500 group-hover:shadow-lg group-hover:shadow-purple-400/50">
                      <svg className="w-8 h-8 text-purple-400 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold font-runtime text-white mb-2 group-hover:text-purple-400 transition-colors duration-500">Sistema Votazioni</h3>
                    <p className="text-gray-300 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 ease-out">
                      Vota le prestazioni dei compagni dopo ogni partita e vedi come evolvono le statistiche nel tempo.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-black/90 backdrop-blur-sm">
              <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold font-runtime text-white mb-6 drop-shadow-lg">
                  Pronto a giocare?
                </h2>
                <p className="text-xl font-runtime text-gray-200 mb-8 drop-shadow-md">
                  Unisciti alla community di Calcettinho e porta la tua lega al livello successivo!
                </p>
              </div>
            </section>

            {/* Footer */}
            <footer className="bg-black text-white py-8">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <Logo
                  type="scritta"
                  width={150}
                  height={40}
                  className="mx-auto mb-4 w-auto h-8 opacity-80 drop-shadow-lg"
                />
                <p className="text-gray-400 drop-shadow-md">
                  Made with ❤️ by la community!
                </p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
