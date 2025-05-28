'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from "../components/Navigation";
import Logo from "../components/Logo";
import ProtectedRoute from "../components/ProtectedRoute";

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

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Dati reali dall'API
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/players');
        
        if (!response.ok) {
          throw new Error('Errore nel caricamento dei giocatori');
        }
        
        const playersData = await response.json();
        
        // Mappa i dati del backend al formato del frontend
        const mappedPlayers = playersData
          .filter((player: any) => player.nome && player.nome.trim() !== '') // Filtra record vuoti
          .map((player: any, index: number) => ({
            id: (index + 1).toString(),
            name: player.nome || 'Nome non disponibile',
            email: player.email || 'email@non-disponibile.com',
            overall: Math.round((player.ATT + player.DIF + player.VEL + player.FOR + player.PAS + player.POR) / 6),
            att: player.ATT,
            vel: player.VEL,
            pas: player.PAS,
            for: player.FOR,
            dif: player.DIF,
            por: player.POR
          }));
        
        setPlayers(mappedPlayers);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Errore sconosciuto');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

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

  const handleViewCard = (player: Player) => {
    router.push(`/profile/${encodeURIComponent(player.email)}`);
  };

  return (
    <ProtectedRoute>
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
            <div className="max-w-6xl mx-auto text-center">
              <Logo
                type="simbolo"
                width={80}
                height={80}
                className="mx-auto mb-6 w-16 h-16 drop-shadow-lg"
              />
              
              <h1 className="text-4xl sm:text-5xl font-bold font-runtime text-white mb-4 drop-shadow-lg">
                I Nostri{" "}
                <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                  Giocatori
                </span>
              </h1>
              
              <p className="text-xl font-runtime text-gray-200 mb-8 max-w-2xl mx-auto drop-shadow-md">
                Scopri le statistiche e le card personalizzate di tutti i giocatori della lega
              </p>
            </div>
          </section>

          {/* Players Grid Section */}
          <section className="py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              
              {/* Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400 font-runtime">{players.length}</div>
                  <div className="text-gray-300 font-runtime">Giocatori Totali</div>
                </div>
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400 font-runtime">
                    {players.length > 0 ? Math.round(players.reduce((acc, p) => acc + p.overall, 0) / players.length) : 0}
                  </div>
                  <div className="text-gray-300 font-runtime">Overall Medio</div>
                </div>
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400 font-runtime">
                    {players.filter(p => p.overall >= 90).length}
                  </div>
                  <div className="text-gray-300 font-runtime">Ultimate</div>
                </div>
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400 font-runtime">
                    {players.filter(p => p.overall >= 78 && p.overall < 90).length}
                  </div>
                  <div className="text-gray-300 font-runtime">Oro</div>
                </div>
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-400 font-runtime">
                    {players.filter(p => p.overall >= 65 && p.overall < 78).length}
                  </div>
                  <div className="text-gray-300 font-runtime">Argento</div>
                </div>
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600 font-runtime">
                    {players.filter(p => p.overall < 65).length}
                  </div>
                  <div className="text-gray-300 font-runtime">Bronzo</div>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
                  <p className="text-gray-200 mt-4 font-runtime">Caricamento giocatori...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-12">
                  <p className="text-red-400 font-runtime">{error}</p>
                </div>
              )}

              {/* Players Grid */}
              {!loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {players.map((player) => (
                    <div 
                      key={player.id}
                      className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      {/* Player Header */}
                      <div className="text-center mb-4">
                        <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                          {player.email && player.email !== 'email@non-disponibile.com' ? (
                            <img 
                              src={`http://localhost:3001/players/${encodeURIComponent(player.email)}.jpg`}
                              alt={`Foto di ${player.name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback alle iniziali se la foto non è disponibile
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = `<span class="text-2xl font-bold text-gray-300 font-runtime">${
                                  player.name && player.name.trim() 
                                    ? player.name.split(' ').map(n => n[0] || '').join('').toUpperCase().substring(0, 2)
                                    : '??'
                                }</span>`;
                              }}
                            />
                          ) : (
                            <span className="text-2xl font-bold text-gray-300 font-runtime">
                              {player.name && player.name.trim() 
                                ? player.name.split(' ').map(n => n[0] || '').join('').toUpperCase().substring(0, 2)
                                : '??'
                              }
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-white font-runtime">{player.name}</h3>
                      </div>

                      {/* Overall Rating */}
                      <div className="text-center mb-4">
                        <div className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${getCardColor(player.overall)}`}>
                          <span className="text-white font-bold text-lg font-runtime">{player.overall}</span>
                        </div>
                        <p className="text-gray-300 text-sm mt-1 font-runtime">{getCardType(player.overall)}</p>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-green-400 font-bold font-runtime">{player.att}</div>
                          <div className="text-gray-400 text-xs font-runtime">ATT</div>
                        </div>
                        <div>
                          <div className="text-blue-400 font-bold font-runtime">{player.vel}</div>
                          <div className="text-gray-400 text-xs font-runtime">VEL</div>
                        </div>
                        <div>
                          <div className="text-purple-400 font-bold font-runtime">{player.pas}</div>
                          <div className="text-gray-400 text-xs font-runtime">PAS</div>
                        </div>
                        <div>
                          <div className="text-red-400 font-bold font-runtime">{player.for}</div>
                          <div className="text-gray-400 text-xs font-runtime">FOR</div>
                        </div>
                        <div>
                          <div className="text-yellow-400 font-bold font-runtime">{player.dif}</div>
                          <div className="text-gray-400 text-xs font-runtime">DIF</div>
                        </div>
                        <div>
                          <div className="text-orange-400 font-bold font-runtime">{player.por}</div>
                          <div className="text-gray-400 text-xs font-runtime">POR</div>
                        </div>
                      </div>

                      {/* View Card Button */}
                      <div className="mt-4">
                        <button 
                          className={`w-full py-2 rounded-lg transition-colors font-runtime font-semibold ${
                            player.email && player.email !== 'email@non-disponibile.com'
                              ? 'bg-green-600/80 hover:bg-green-700/80 text-white'
                              : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                          }`}
                          onClick={() => handleViewCard(player)}
                          disabled={!player.email || player.email === 'email@non-disponibile.com'}
                        >
                          {player.email && player.email !== 'email@non-disponibile.com' 
                            ? 'Vai al Profilo' 
                            : 'Profilo Non Disponibile'
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Footer spacer per navbar mobile */}
          <div className="h-20 sm:h-8"></div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 