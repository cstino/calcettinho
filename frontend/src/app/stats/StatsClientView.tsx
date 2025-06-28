'use client';

import { useState, useEffect, useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { getPlayerPhotoUrl, getCardUrl } from '../../utils/api';

interface PlayerStats {
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
  minutesPlayed: number;
  overall: number;
}

interface ComparisonData {
  player1: {
    id: string;
    name: string;
    email: string;
    overall: number;
    attacco: number;
    difesa: number;
    velocità: number;
    forza: number;
    passaggio: number;
    portiere: number;
    stats: {
      gol: number;
      partiteDisputate: number;
      partiteVinte: number;
      partitePareggiate: number;
      partitePerse: number;
      assistenze: number;
      cartelliniGialli: number;
      cartelliniRossi: number;
      minutiGiocati: number;
    };
    votes: {
      upVotes: number;
      downVotes: number;
    };
  };
  player2: {
    id: string;
    name: string;
    email: string;
    overall: number;
    attacco: number;
    difesa: number;
    velocità: number;
    forza: number;
    passaggio: number;
    portiere: number;
    stats: {
      gol: number;
      partiteDisputate: number;
      partiteVinte: number;
      partitePareggiate: number;
      partitePerse: number;
      assistenze: number;
      cartelliniGialli: number;
      cartelliniRossi: number;
      minutiGiocati: number;
    };
    votes: {
      upVotes: number;
      downVotes: number;
    };
  };
}

interface StatsClientViewProps {
  initialPlayerStats: PlayerStats[];
  lastUpdate: string;
}

// Componente per l'avatar del giocatore con foto
const PlayerAvatar = ({ player, size = "normal" }: { player: { email: string; name: string }, size?: "small" | "normal" }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = size === "small" ? "w-8 h-8" : "w-10 h-10";
  const textSize = size === "small" ? "text-xs" : "text-sm";

  return (
    <div className={`${sizeClasses} bg-gray-600 rounded-full flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-110`}>
      {!imageError ? (
        <img 
          src={getPlayerPhotoUrl(player.email)}
          alt={player.name}
          className={`w-full h-full object-cover transition-all duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      ) : null}
      {(imageError || !imageLoaded) && (
        <span className={`text-white font-bold font-runtime ${textSize}`}>
          {player.name.split(' ').map(n => n[0]).join('')}
        </span>
      )}
    </div>
  );
};

// Componente per tabella completa con stile TOP 5
const FullTable = ({ 
  title, 
  players, 
  statKey, 
  statColor
}: { 
  title: string;
  players: PlayerStats[];
  statKey: keyof PlayerStats;
  statColor: string;
}) => {
  return (
    <div className="glass-card liquid-border neon-border p-4 relative overflow-hidden">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white font-runtime text-center">
          {title}
        </h3>
      </div>
      
      <div className="space-y-4">
        {players.map((player, index) => (
          <div key={player.id} className="flex items-center gap-4">
            {/* Cerchio posizione */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-lg flex-shrink-0 ${
              index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black neon-glow' :
              index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-black' :
              index === 2 ? 'bg-gradient-to-r from-amber-500 to-amber-700 text-white' :
              'bg-gradient-to-r from-purple-500 to-purple-700 text-white'
            }`}>
              {index + 1}
            </div>

            {/* Riquadro giocatore */}
            <div className="flex-1 glass-dark liquid-border neon-border p-4 h-16 flex items-center hover:neon-glow transition-all duration-300 group">
              {/* Foto giocatore */}
              <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden flex-shrink-0 ml-2">
                <img 
                  src={getPlayerPhotoUrl(player.email)}
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

              {/* Nome giocatore */}
              <div className="flex-1 ml-4">
                <h4 className="text-white font-medium text-base group-hover:text-purple-200 transition-colors truncate">
                  {player.name}
                </h4>
              </div>

              {/* Valore statistica */}
              {statKey === 'wins' ? (
                <div className="bg-gradient-to-r from-green-400 to-green-600 px-3 py-2 rounded-lg flex items-center justify-center text-xs font-bold shadow-lg neon-glow flex-shrink-0 mr-2 min-w-[70px] h-12">
                  <div className="flex items-center space-x-1">
                    <span className="text-black">{player.wins}</span>
                    <span className="text-black">/</span>
                    <span className="text-black">{player.draws}</span>
                    <span className="text-black">/</span>
                    <span className="text-black">{player.losses}</span>
                  </div>
                </div>
              ) : (
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-lg neon-glow flex-shrink-0 mr-2 ${
                  statKey === 'goals' ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white' :
                  statKey === 'assists' ? 'bg-gradient-to-r from-purple-400 to-purple-600 text-white' :
                  'bg-gradient-to-r from-green-400 to-green-600 text-white'
                }`}>
                  {player[statKey]}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente per il grafico di confronto
const ComparisonChart = ({ data }: { data: ComparisonData }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const comparisonStats = [
    {
      label: 'Gol segnati',
      player1: data.player1.stats.gol || 0,
      player2: data.player2.stats.gol || 0,
      maxValue: Math.max(data.player1.stats.gol || 0, data.player2.stats.gol || 0, 10) * 1.5
    },
    {
      label: 'Assist forniti',
      player1: data.player1.stats.assistenze || 0,
      player2: data.player2.stats.assistenze || 0,
      maxValue: Math.max(data.player1.stats.assistenze || 0, data.player2.stats.assistenze || 0, 10) * 1.5
    },
    {
      label: 'Partite vinte',
      player1: data.player1.stats.partiteVinte || 0,
      player2: data.player2.stats.partiteVinte || 0,
      maxValue: Math.max(data.player1.stats.partiteVinte || 0, data.player2.stats.partiteVinte || 0, 10) * 1.5
    },
    {
      label: 'UP ricevuti',
      player1: data.player1.votes.upVotes || 0,
      player2: data.player2.votes.upVotes || 0,
      maxValue: Math.max(data.player1.votes.upVotes || 0, data.player2.votes.upVotes || 0, 10) * 1.5
    }
  ];

  return (
    <div className="bg-gray-900/80 rounded-lg p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white font-runtime mb-6 text-center">
        STATISTICHE
      </h3>
      
      <div className="space-y-4">
        {comparisonStats.map((stat, index) => {
          const player1Width = animated ? (stat.player1 / stat.maxValue) * 100 : 0;
          const player2Width = animated ? (stat.player2 / stat.maxValue) * 100 : 0;
          
          return (
            <div key={index} className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-cyan-400 font-runtime min-w-[60px] text-right">
                  {stat.player1}
                </span>
                <span className="text-white font-runtime font-semibold text-center flex-1 mx-8 text-sm">
                  {stat.label}
                </span>
                <span className="text-lg font-bold text-pink-400 font-runtime min-w-[60px] text-left">
                  {stat.player2}
                </span>
              </div>
              
              <div className="flex items-center h-11 bg-gray-900 rounded-lg border border-gray-600 relative overflow-hidden">
                <div className="flex-1 flex justify-end items-center h-full">
                  <div 
                    className="h-full bg-gradient-to-l from-cyan-400 to-blue-500 transition-all duration-1200 ease-out shadow-lg outline outline-2 outline-cyan-300 rounded-l-lg"
                    style={{ 
                      width: `${player1Width}%`,
                      transitionDelay: `${index * 150}ms`
                    }}
                  ></div>
                </div>
                
                <div className="flex-1 flex justify-start items-center h-full">
                  <div 
                    className="h-full bg-gradient-to-r from-pink-400 to-red-500 transition-all duration-1200 ease-out shadow-lg outline outline-2 outline-pink-300 rounded-r-lg"
                    style={{ 
                      width: `${player2Width}%`,
                      transitionDelay: `${index * 150}ms`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Componente per il grafico radar di confronto
const ComparisonRadarChart = ({ data }: { data: ComparisonData }) => {
  const radarData = [
    { stat: 'ATT', player1: data.player1.attacco || 0, player2: data.player2.attacco || 0, fullMark: 100 },
    { stat: 'VEL', player1: data.player1.velocità || 0, player2: data.player2.velocità || 0, fullMark: 100 },
    { stat: 'PAS', player1: data.player1.passaggio || 0, player2: data.player2.passaggio || 0, fullMark: 100 },
    { stat: 'FOR', player1: data.player1.forza || 0, player2: data.player2.forza || 0, fullMark: 100 },
    { stat: 'DIF', player1: data.player1.difesa || 0, player2: data.player2.difesa || 0, fullMark: 100 },
    { stat: 'POR', player1: data.player1.portiere || 0, player2: data.player2.portiere || 0, fullMark: 100 },
  ];

  return (
    <div className="bg-gray-900/80 rounded-lg p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white font-runtime mb-6 text-center">
        CONFRONTO ABILITÀ
      </h3>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="#4B5563" />
            <PolarAngleAxis dataKey="stat" className="text-gray-300 font-runtime" fontSize={14} />
            <PolarRadiusAxis angle={0} domain={[0, 100]} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
            <Radar name={data.player1.name} dataKey="player1" stroke="#22D3EE" fill="#22D3EE" fillOpacity={0.2} strokeWidth={3} />
            <Radar name={data.player2.name} dataKey="player2" stroke="#F472B6" fill="#F472B6" fillOpacity={0.2} strokeWidth={3} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function StatsClientView({ initialPlayerStats, lastUpdate }: StatsClientViewProps) {
  const [sortBy, setSortBy] = useState<'overall' | 'goals' | 'wins' | 'assists'>('overall');
  const [showComparison, setShowComparison] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<[string | null, string | null]>([null, null]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // Creo le classifiche separate per ogni categoria
  const rankings = useMemo(() => ({
    overall: [...initialPlayerStats].sort((a, b) => b.overall - a.overall),
    goals: [...initialPlayerStats].sort((a, b) => b.goals - a.goals),
    assists: [...initialPlayerStats].sort((a, b) => b.assists - a.assists),
    wins: [...initialPlayerStats].sort((a, b) => b.wins - a.wins)
  }), [initialPlayerStats]);

  // Funzione per confrontare due giocatori
  const comparePlayersData = async (player1Email: string, player2Email: string) => {
    try {
      setLoadingComparison(true);
      const response = await fetch('/api/compare-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player1Email, player2Email }),
      });

      if (response.ok) {
        const data = await response.json();
        setComparisonData(data);
      } else {
        console.error('Errore nel confronto:', response.status);
      }
    } catch (error) {
      console.error('Errore nel confronto:', error);
    } finally {
      setLoadingComparison(false);
    }
  };

  return (
    <>
      {/* Sort Controls */}
      <section className="pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:flex sm:justify-center gap-1 sm:space-x-1 bg-gray-800/50 p-1 rounded-lg backdrop-blur-sm relative z-20">
            {[
              { key: 'overall', label: 'Overall' },
              { key: 'goals', label: 'Gol' },
              { key: 'assists', label: 'Assist' },
              { key: 'wins', label: 'Vittorie' }
            ].map(option => (
              <button
                key={option.key}
                onClick={() => setSortBy(option.key as any)}
                className={`px-3 py-2 rounded-md font-runtime font-semibold transition-colors text-sm sm:text-base ${
                  sortBy === option.key ? 'bg-white text-gray-900' : 'text-gray-200 hover:text-white hover:bg-gray-700/30'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Tables */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {initialPlayerStats.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-600/50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-400 font-runtime mb-2">Nessuna statistica disponibile</h3>
              <p className="text-gray-500 font-runtime">I dati delle statistiche non sono ancora disponibili.</p>
            </div>
          ) : (
            <div>
              {sortBy === 'overall' && <FullTable title="🏆 Classifica Overall" players={rankings.overall} statKey="overall" statColor="text-green-400" />}
              {sortBy === 'goals' && <FullTable title="⚽ Classifica Gol" players={rankings.goals} statKey="goals" statColor="text-blue-400" />}
              {sortBy === 'assists' && <FullTable title="🎯 Classifica Assist" players={rankings.assists} statKey="assists" statColor="text-purple-400" />}
              {sortBy === 'wins' && <FullTable title="🏅 Classifica Vittorie" players={rankings.wins} statKey="wins" statColor="text-green-400" />}
            </div>
          )}
        </div>
      </section>

      {/* Pulsante Confronta Giocatori */}
      {initialPlayerStats.length > 1 && (
        <section className="pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <button
              onClick={() => setShowComparison(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-runtime font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Confronta Giocatori
            </button>
          </div>
        </section>
      )}

      {/* Modal Confronto */}
      {showComparison && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white font-runtime">Confronta Giocatori</h2>
              <button
                onClick={() => {
                  setShowComparison(false);
                  setSelectedPlayers([null, null]);
                  setComparisonData(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Selezione Giocatori */}
            {!comparisonData && (
              <div className="p-6">
                <p className="text-gray-300 font-runtime mb-6 text-center">
                  Seleziona due giocatori per confrontare le loro statistiche
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white font-runtime font-semibold mb-3">Primo Giocatore</label>
                    <select
                      value={selectedPlayers[0] || ''}
                      onChange={(e) => setSelectedPlayers([e.target.value || null, selectedPlayers[1]])}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 font-runtime focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Seleziona giocatore...</option>
                      {initialPlayerStats
                        .filter(p => p.email !== selectedPlayers[1])
                        .map(player => (
                        <option key={player.email} value={player.email}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-runtime font-semibold mb-3">Secondo Giocatore</label>
                    <select
                      value={selectedPlayers[1] || ''}
                      onChange={(e) => setSelectedPlayers([selectedPlayers[0], e.target.value || null])}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 font-runtime focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Seleziona giocatore...</option>
                      {initialPlayerStats
                        .filter(p => p.email !== selectedPlayers[0])
                        .map(player => (
                        <option key={player.email} value={player.email}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pulsante Confronta */}
                {selectedPlayers[0] && selectedPlayers[1] && (
                  <div className="text-center mt-6">
                    <button
                      onClick={() => comparePlayersData(selectedPlayers[0]!, selectedPlayers[1]!)}
                      disabled={loadingComparison}
                      className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-runtime font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100"
                    >
                      {loadingComparison ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Caricamento...
                        </div>
                      ) : (
                        'Avvia Confronto'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Risultati Confronto */}
            {comparisonData && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="text-center">
                    <img 
                      src={getCardUrl(comparisonData.player1.email)}
                      alt={`Card di ${comparisonData.player1.name}`}
                      className="w-64 h-auto mx-auto mb-4"
                    />
                    <h3 className="text-xl font-bold text-white font-runtime">
                      {comparisonData.player1.name}
                    </h3>
                    <p className="text-gray-300 font-runtime">Overall: {comparisonData.player1.overall}</p>
                  </div>

                  <div className="text-center">
                    <img 
                      src={getCardUrl(comparisonData.player2.email)}
                      alt={`Card di ${comparisonData.player2.name}`}
                      className="w-64 h-auto mx-auto mb-4"
                    />
                    <h3 className="text-xl font-bold text-white font-runtime">
                      {comparisonData.player2.name}
                    </h3>
                    <p className="text-gray-300 font-runtime">Overall: {comparisonData.player2.overall}</p>
                  </div>
                </div>

                <ComparisonRadarChart data={comparisonData} />
                <div className="mt-8">
                  <ComparisonChart data={comparisonData} />
                </div>

                <div className="text-center mt-6">
                  <button
                    onClick={() => {
                      setComparisonData(null);
                      setSelectedPlayers([null, null]);
                    }}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-runtime rounded-lg transition-colors"
                  >
                    Nuovo Confronto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="h-20 sm:h-8"></div>
    </>
  );
} 