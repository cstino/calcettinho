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
    rating: number;
    matchId: string;
    toPlayerId: string;
  }>;
  statistics: {
    totalVotes: number;
    averageRating: number;
    ratingDistribution: Array<{
      rating: number;
      count: number;
    }>;
  };
}

export default function PlayerProfile() {
  const params = useParams();
  const router = useRouter();
  const email = decodeURIComponent(params.email as string);
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true);
        
        // Recupera tutti i giocatori
        const response = await fetch('/api/players');
        if (!response.ok) {
          throw new Error('Errore nel caricamento dei giocatori');
        }
        
        const playersData = await response.json();
        
        // Trova il giocatore specifico
        const playerData = playersData.find((p: any) => p.email === email);
        
        if (!playerData) {
          throw new Error('Giocatore non trovato');
        }
        
        // Mappa i dati
        const mappedPlayer = {
          id: '1',
          name: playerData.nome,
          email: playerData.email,
          overall: Math.round((playerData.ATT + playerData.DIF + playerData.VEL + playerData.FOR + playerData.PAS + playerData.POR) / 6),
          att: playerData.ATT,
          vel: playerData.VEL,
          pas: playerData.PAS,
          for: playerData.FOR,
          dif: playerData.DIF,
          por: playerData.POR
        };
        
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
        
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Errore sconosciuto');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [email]);

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
            onClick={() => router.back()}
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

      {/* Contenuto principale */}
      <div className="relative z-10">
        <Navigation />
        
        {/* Header Section */}
        <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Bottone Indietro */}
            <button 
              onClick={() => router.back()}
              className="mb-6 flex items-center text-gray-300 hover:text-white transition-colors font-runtime"
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
                className="w-80 h-auto rounded-xl shadow-2xl mx-auto mb-4 inline-block"
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 font-runtime">{voteHistory.statistics.totalVotes}</div>
                    <div className="text-gray-300 font-runtime">Voti Ricevuti</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400 font-runtime">{voteHistory.statistics.averageRating}</div>
                    <div className="text-gray-300 font-runtime">Media Voti</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 font-runtime">
                      {voteHistory.statistics.ratingDistribution.filter(r => r.rating >= 9).reduce((acc, r) => acc + r.count, 0)}
                    </div>
                    <div className="text-gray-300 font-runtime">Voti 9-10</div>
                  </div>
                </div>

                {/* Distribuzione Voti */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white font-runtime mb-4">Distribuzione Voti</h3>
                  <div className="space-y-2">
                    {voteHistory.statistics.ratingDistribution.map(({ rating, count }) => (
                      <div key={rating} className="flex items-center">
                        <div className="flex items-center w-16 justify-center">
                          <span className={`font-runtime font-bold text-sm px-2 py-1 rounded ${
                            rating >= 9 ? 'bg-green-600 text-white' :
                            rating >= 7 ? 'bg-yellow-600 text-white' :
                            rating >= 5 ? 'bg-orange-600 text-white' :
                            'bg-red-600 text-white'
                          }`}>
                            {rating}
                          </span>
                        </div>
                        <div className="flex-1 mx-4">
                          <div className="bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                rating >= 9 ? 'bg-green-400' :
                                rating >= 7 ? 'bg-yellow-400' :
                                rating >= 5 ? 'bg-orange-400' :
                                'bg-red-400'
                              }`}
                              style={{ 
                                width: voteHistory.statistics.totalVotes > 0 
                                  ? `${(count / voteHistory.statistics.totalVotes) * 100}%` 
                                  : '0%' 
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-gray-300 font-runtime w-8">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ultimi Voti */}
                {voteHistory.votes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white font-runtime mb-4">Ultimi Voti Ricevuti</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {voteHistory.votes.slice(0, 10).map((vote) => (
                        <div key={vote.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center">
                              <span className={`font-runtime font-bold text-lg px-3 py-1 rounded ${
                                vote.rating >= 9 ? 'bg-green-600 text-white' :
                                vote.rating >= 7 ? 'bg-yellow-600 text-white' :
                                vote.rating >= 5 ? 'bg-orange-600 text-white' :
                                'bg-red-600 text-white'
                              }`}>
                                {vote.rating}/10
                              </span>
                            </div>
                            <div className="text-gray-300 font-runtime text-sm">
                              da {vote.voterEmail}
                            </div>
                          </div>
                          <div className="text-gray-400 font-runtime text-xs">
                            {vote.matchId || 'Match ID non disponibile'}
                          </div>
                        </div>
                      ))}
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