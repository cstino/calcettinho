'use client';

import { useState, useEffect, useReducer, useCallback, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { getCardUrl, getSpecialCardUrl } from '../../../utils/api';
import ProfileTiltCard from '../../components/ProfileTiltCard';
import SmartCardImage from '../../../components/SmartCardImage';

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
    voteType: string;
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
  status: string;
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

interface ProfileClientViewProps {
  player: Player | null;
  playerStats: PlayerStats | null;
  email: string;
  lastUpdate: string;
}

// ✅ Cache globale per le immagini delle card
const globalImageCache = new Set<string>();
const globalImageLoadedCache = new Set<string>();
const imageLoadListeners = new Map<string, Set<() => void>>();

// Hook per animazione contatori
const useCountUp = (end: number, duration: number = 2000, startWhen: boolean = true, decimals: number = 0) => {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
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
          observer.disconnect();
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
      <div className="text-gray-400 font-runtime font-semibold text-sm mt-1">
        {label}
      </div>
    </div>
  );
};

const AnimatedNetVotes = ({ 
  value, 
  startAnimation = false, 
  duration = 2400 
}: { 
  value: number; 
  startAnimation?: boolean; 
  duration?: number; 
}) => {
  const { value: animatedValue, isAnimating } = useCountUp(Math.abs(value), duration, startAnimation, 0);
  const isPositive = value >= 0;

  return (
    <div className={`text-4xl font-bold font-runtime transition-all duration-300 ${
      isPositive ? 'text-green-400' : 'text-red-400'
    } ${isAnimating ? 'animate-pulse' : ''}`}>
      {isPositive ? '+' : '-'}{animatedValue}
      {isAnimating && (
        <span className="inline-block w-1 h-10 bg-current ml-1 animate-pulse"></span>
      )}
    </div>
  );
};

const AnimatedPercentage = ({ 
  value, 
  startAnimation = false, 
  duration = 2500 
}: { 
  value: number; 
  startAnimation?: boolean; 
  duration?: number; 
}) => {
  const { value: animatedValue, isAnimating } = useCountUp(value, duration, startAnimation, 1);

  return (
    <div className={`text-3xl font-bold font-runtime transition-all duration-300 text-blue-400 ${isAnimating ? 'animate-pulse' : ''}`}>
      {animatedValue}%
      {isAnimating && (
        <span className="inline-block w-1 h-8 bg-current ml-1 animate-pulse"></span>
      )}
    </div>
  );
};

export default function ProfileClientView({ player, playerStats, email, lastUpdate }: ProfileClientViewProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { addNotification } = useNotifications();

  // Stati per i dati real-time (non cachati lato server)
  const [voteHistory, setVoteHistory] = useState<VoteHistory | null>(null);
  const [playerAwards, setPlayerAwards] = useState<PlayerAwards | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stati per animazioni
  const [showAnimations, setShowAnimations] = useState(false);
  const [cardAnimationPhase, setCardAnimationPhase] = useState(0);

  // Refs per animazioni
  const { ref: statsRef, inView: statsInView } = useInView(0.2);
  const { ref: votesRef, inView: votesInView } = useInView(0.2);

  // Fetch dati real-time (votes, awards)
  const fetchRealTimeData = useCallback(async () => {
    if (!player) return;

    try {
      setLoading(true);
      
      // Fetch vote history
      const voteResponse = await fetch(`/api/votes/player/${email}`);
      if (voteResponse.ok) {
        const voteData = await voteResponse.json();
        setVoteHistory(voteData);
      }

      // Fetch awards
      const awardsResponse = await fetch(`/api/awards/player/${email}`);
      if (awardsResponse.ok) {
        const awardsData = await voteResponse.json();
        setPlayerAwards(awardsData);
      }

    } catch (error) {
      console.error('Error fetching real-time data:', error);
      setError('Errore nel caricamento dei dati real-time');
    } finally {
      setLoading(false);
    }
  }, [player, email]);

  // Effetto per caricare dati real-time
  useEffect(() => {
    fetchRealTimeData();
  }, [fetchRealTimeData]);

  // Effetto per animazioni progressive
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimations(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Effetto per animazione card progressiva
  useEffect(() => {
    if (showAnimations) {
      const phases = [1, 2, 3, 4];
      phases.forEach((phase, index) => {
        setTimeout(() => {
          setCardAnimationPhase(phase);
        }, index * 200);
      });
    }
  }, [showAnimations]);

  if (!player) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-6xl mx-auto text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-runtime text-red-400 mb-4">Giocatore Non Trovato</h2>
          <p className="text-gray-400 font-runtime mb-8">Il profilo richiesto non esiste o non è accessibile.</p>
          <button
            onClick={() => router.push('/players')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-runtime font-semibold rounded-lg transition-all duration-300"
          >
            Torna ai Giocatori
          </button>
        </div>
      </section>
    );
  }

  const getCardType = (overall: number) => {
    if (overall >= 90) return 'ultimate';
    if (overall >= 78) return 'gold';
    if (overall >= 65) return 'silver';
    return 'bronze';
  };

  const getCardColor = (overall: number) => {
    if (overall >= 90) return 'from-purple-600 to-pink-600';
    if (overall >= 78) return 'from-yellow-500 to-orange-500';
    if (overall >= 65) return 'from-gray-400 to-gray-600';
    return 'from-orange-600 to-red-600';
  };

  const getCardBackground = (overall: number) => {
    if (overall >= 90) return 'bg-gradient-to-br from-purple-900/20 to-pink-900/20';
    if (overall >= 78) return 'bg-gradient-to-br from-yellow-900/20 to-orange-900/20';
    if (overall >= 65) return 'bg-gradient-to-br from-gray-900/20 to-gray-800/20';
    return 'bg-gradient-to-br from-orange-900/20 to-red-900/20';
  };

  // Calcola statistiche radar per il grafico
  const radarData = [
    { skill: 'ATT', value: player.att, fullMark: 99 },
    { skill: 'VEL', value: player.vel, fullMark: 99 },
    { skill: 'PAS', value: player.pas, fullMark: 99 },
    { skill: 'FOR', value: player.for, fullMark: 99 },
    { skill: 'DIF', value: player.dif, fullMark: 99 },
    { skill: 'POR', value: player.por, fullMark: 99 }
  ];

  return (
    <>
      {/* Player Card Section */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Card 3D */}
            <div className="flex justify-center">
              <div className={`transform transition-all duration-1000 ${showAnimations ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
                <ProfileTiltCard
                  player={player}
                  cardType={getCardType(player.overall)}
                  animationPhase={cardAnimationPhase}
                />
              </div>
            </div>

            {/* Stats Overview */}
            <div className="space-y-8">
              {/* Overall e tipo carta */}
              <div className={`text-center lg:text-left transform transition-all duration-1000 delay-300 ${showAnimations ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <div className="mb-6">
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-runtime font-bold bg-gradient-to-r ${getCardColor(player.overall)} text-white shadow-lg`}>
                    {getCardType(player.overall).toUpperCase()} CARD
                  </div>
                </div>
                <div className="text-6xl font-bold font-runtime text-white mb-2">
                  {player.overall}
                </div>
                <div className="text-gray-400 font-runtime text-lg">Overall Rating</div>
              </div>

              {/* Statistiche Principali */}
              <div ref={statsRef} className={`grid grid-cols-2 gap-6 transform transition-all duration-1000 delay-500 ${showAnimations ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <AnimatedStat
                  value={player.att}
                  label="Attacco"
                  color="text-red-400"
                  startAnimation={statsInView}
                  duration={1800}
                />
                <AnimatedStat
                  value={player.vel}
                  label="Velocità"
                  color="text-blue-400"
                  startAnimation={statsInView}
                  duration={2000}
                />
                <AnimatedStat
                  value={player.pas}
                  label="Passaggio"
                  color="text-green-400"
                  startAnimation={statsInView}
                  duration={2200}
                />
                <AnimatedStat
                  value={player.for}
                  label="Forza"
                  color="text-purple-400"
                  startAnimation={statsInView}
                  duration={2400}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Radar Chart */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className={`bg-gray-800/80 backdrop-blur-sm rounded-xl p-8 transform transition-all duration-1000 delay-700 ${showAnimations ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h2 className="text-2xl font-bold text-white font-runtime mb-8 text-center">Abilità del Giocatore</h2>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis 
                    dataKey="skill" 
                    tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 'bold' }}
                    className="font-runtime"
                  />
                  <PolarRadiusAxis 
                    domain={[0, 99]} 
                    tick={{ fill: '#6B7280', fontSize: 10 }}
                    tickCount={6}
                  />
                  <Radar
                    name="Stats"
                    dataKey="value"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.2}
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Game Statistics */}
      {playerStats && (
        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className={`bg-gray-800/80 backdrop-blur-sm rounded-xl p-8 transform transition-all duration-1000 delay-900 ${showAnimations ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <h2 className="text-2xl font-bold text-white font-runtime mb-8 text-center">Statistiche di Gioco</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <AnimatedStat
                  value={playerStats.gol}
                  label="Gol"
                  color="text-blue-400"
                  startAnimation={statsInView}
                  duration={1500}
                />
                <AnimatedStat
                  value={playerStats.assistenze}
                  label="Assist"
                  color="text-purple-400"
                  startAnimation={statsInView}
                  duration={1700}
                />
                <AnimatedStat
                  value={playerStats.partiteVinte}
                  label="Vittorie"
                  color="text-green-400"
                  startAnimation={statsInView}
                  duration={1900}
                />
                <AnimatedStat
                  value={playerStats.partiteDisputate}
                  label="Partite"
                  color="text-yellow-400"
                  startAnimation={statsInView}
                  duration={2100}
                />
              </div>

              {/* Progress bars per percentuali */}
              {playerStats.partiteDisputate > 0 && (
                <div className="mt-8 space-y-4">
                  {/* Win Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-runtime font-semibold">Win Rate</span>
                      <span className="text-green-400 font-runtime font-bold">
                        {((playerStats.partiteVinte / playerStats.partiteDisputate) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-2000 ease-out"
                        style={{ 
                          width: showAnimations ? `${(playerStats.partiteVinte / playerStats.partiteDisputate) * 100}%` : '0%' 
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Goal per Partita */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-runtime font-semibold">Gol per Partita</span>
                      <span className="text-blue-400 font-runtime font-bold">
                        {(playerStats.gol / playerStats.partiteDisputate).toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-2000 ease-out"
                        style={{ 
                          width: showAnimations ? `${Math.min((playerStats.gol / playerStats.partiteDisputate) * 20, 100)}%` : '0%' 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Vote History Section */}
      {voteHistory && (
        <section ref={votesRef} className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className={`bg-gray-800/80 backdrop-blur-sm rounded-xl p-8 transform transition-all duration-1000 delay-1100 ${showAnimations ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <h2 className="text-2xl font-bold text-white font-runtime mb-8 text-center">Cronologia Voti</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div>
                  <AnimatedNetVotes
                    value={voteHistory.statistics.netVotes}
                    startAnimation={votesInView}
                    duration={2000}
                  />
                  <div className="text-gray-400 font-runtime font-semibold">Voti Netti</div>
                </div>

                <div>
                  <AnimatedPercentage
                    value={voteHistory.statistics.upPercentage}
                    startAnimation={votesInView}
                    duration={2200}
                  />
                  <div className="text-gray-400 font-runtime font-semibold">% Voti Positivi</div>
                </div>

                <div>
                  <AnimatedStat
                    value={voteHistory.statistics.actualMotm}
                    label="MOTM Vinti"
                    color="text-yellow-400"
                    startAnimation={votesInView}
                    duration={2400}
                  />
                </div>
              </div>

              {/* Vote breakdown */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-green-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400 font-runtime">
                    {voteHistory.statistics.upVotes}
                  </div>
                  <div className="text-green-300 font-runtime text-sm">Voti Positivi</div>
                </div>
                <div className="bg-red-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-400 font-runtime">
                    {voteHistory.statistics.downVotes}
                  </div>
                  <div className="text-red-300 font-runtime text-sm">Voti Negativi</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Loading/Error States */}
      {loading && (
        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-6xl mx-auto text-center">
            <div className="bg-gray-800/50 rounded-xl p-8">
              <div className="w-12 h-12 mx-auto mb-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 font-runtime">Caricamento dati aggiuntivi...</p>
            </div>
          </div>
        </section>
      )}

      {error && (
        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-6xl mx-auto text-center">
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-8">
              <div className="w-12 h-12 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-400 font-runtime">{error}</p>
              <button
                onClick={fetchRealTimeData}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-runtime rounded-lg transition-colors"
              >
                Riprova
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="h-20 sm:h-8"></div>
    </>
  );
} 