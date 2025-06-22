'use client';

import { useState, useEffect, useMemo } from 'react';
import Navigation from "../components/Navigation";
import Logo from "../components/Logo";
import PlayerCard from "../components/PlayerCard";
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
  
  // Filtri e ricerca
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'overall' | 'rarity'>('name');
  const [selectedRarities, setSelectedRarities] = useState<string[]>(['Ultimate', 'Gold', 'Silver', 'Bronze']);
  const [showFilters, setShowFilters] = useState(false);

  // Dati reali dall'API con cleanup
  useEffect(() => {
    // Crea un AbortController per cancellare la richiesta se necessario
    const abortController = new AbortController();
    
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/players', {
          signal: abortController.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Errore nel caricamento dei giocatori: ${response.status}`);
        }
        
        const playersData = await response.json();
        
        // Controlla se la richiesta è stata cancellata
        if (abortController.signal.aborted) {
          return;
        }
        
        // Mappa i dati del backend al formato del frontend
        const mappedPlayers = playersData
          .filter((player: any) => player.nome && player.nome.trim() !== '') // Filtra record vuoti
          .map((player: any, index: number) => ({
            id: (index + 1).toString(),
            name: player.nome || 'Nome non disponibile',
            email: player.email || 'email@non-disponibile.com',
            overall: (() => {
              const stats = [player.ATT, player.DIF, player.VEL, player.FOR, player.PAS, player.POR];
              const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
              return Math.round(top5Stats.reduce((sum, val) => sum + val, 0) / 5);
            })(),
            att: Math.round(player.ATT),
            vel: Math.round(player.VEL),
            pas: Math.round(player.PAS),
            for: Math.round(player.FOR),
            dif: Math.round(player.DIF),
            por: Math.round(player.POR)
          }));
        
        setPlayers(mappedPlayers);
      } catch (error) {
        // Non mostrare errori se la richiesta è stata cancellata
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        setError(error instanceof Error ? error.message : 'Errore sconosciuto');
      } finally {
        // Non impostare loading a false se la richiesta è stata cancellata
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchPlayers();

    // Cleanup: cancella la richiesta quando il componente viene smontato
    return () => {
      abortController.abort();
    };
  }, []);

  // Funzioni per filtri
  const getCardType = (overall: number) => {
    if (overall >= 90) return 'Ultimate';
    if (overall >= 78) return 'Gold';
    if (overall >= 65) return 'Silver';
    return 'Bronze';
  };

  const getRarityValue = (rarity: string) => {
    switch (rarity) {
      case 'Ultimate': return 4;
      case 'Gold': return 3;
      case 'Silver': return 2;
      case 'Bronze': return 1;
      default: return 0;
    }
  };

  // Memoizza i calcoli costosi per migliorare le performance
  const filteredAndSortedPlayers = useMemo(() => {
    return players
      .filter(player => {
        // Filtro per nome
        const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Filtro per rarità
        const playerRarity = getCardType(player.overall);
        const matchesRarity = selectedRarities.includes(playerRarity);
        
        return matchesSearch && matchesRarity;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'overall':
            return b.overall - a.overall; // Dal più alto al più basso
          case 'rarity':
            const rarityA = getRarityValue(getCardType(a.overall));
            const rarityB = getRarityValue(getCardType(b.overall));
            return rarityB - rarityA; // Dalla rarità più alta alla più bassa
          default:
            return 0;
        }
      });
  }, [players, searchTerm, selectedRarities, sortBy]);

  // Memoizza le statistiche per evitare ricalcoli inutili
  const stats = useMemo(() => ({
    total: filteredAndSortedPlayers.length,
    ultimate: filteredAndSortedPlayers.filter(p => p.overall >= 90).length,
    gold: filteredAndSortedPlayers.filter(p => p.overall >= 78 && p.overall < 90).length,
    silver: filteredAndSortedPlayers.filter(p => p.overall >= 65 && p.overall < 78).length
  }), [filteredAndSortedPlayers]);

  const handleRarityToggle = (rarity: string) => {
    setSelectedRarities(prev => 
      prev.includes(rarity) 
        ? prev.filter(r => r !== rarity)
        : [...prev, rarity]
    );
  };

  return (
    <ProtectedRoute>
              <div className="min-h-screen bg-black relative">
          {/* Overlay nero per OLED */}
          <div className="absolute inset-0 bg-black"></div>

        {/* Contenuto principale */}
        <div className="relative z-10">
          <Navigation />
          
          {/* Header Section */}
          <section className="pt-20 lg:pt-24 pb-8 px-4 sm:px-6 lg:px-8" style={{ paddingTop: 'max(80px, env(safe-area-inset-top, 0px) + 60px)' }}>
            <div className="max-w-6xl mx-auto text-center">
              <Logo
                type="simbolo"
                width={80}
                height={80}
                className="mx-auto mb-6 w-16 h-16 drop-shadow-lg"
              />
              
              <h1 className="text-4xl sm:text-5xl font-bold font-runtime text-white mb-4 drop-shadow-lg">
                Le Nostre{" "}
                <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                  Card Personalizzate
                </span>
              </h1>
              
              <p className="text-xl font-runtime text-gray-200 mb-8 max-w-2xl mx-auto drop-shadow-md">
                Scopri le card uniche di tutti i giocatori della lega - clicca per vedere il profilo completo
              </p>
            </div>
          </section>

          {/* Players Grid Section */}
          <section className="py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              
              {/* Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400 font-runtime">{stats.total}</div>
                  <div className="text-gray-300 font-runtime">Giocatori Mostrati</div>
                </div>
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400 font-runtime">
                    {stats.ultimate}
                  </div>
                  <div className="text-gray-300 font-runtime">Ultimate</div>
                </div>
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400 font-runtime">
                    {stats.gold}
                  </div>
                  <div className="text-gray-300 font-runtime">Oro</div>
                </div>
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-400 font-runtime">
                    {stats.silver}
                  </div>
                  <div className="text-gray-300 font-runtime">Argento</div>
                </div>
              </div>

              {/* Filtri e Ricerca */}
              {!loading && !error && (
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl mb-8">
                  {/* Header collassabile */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-700/30 transition-colors rounded-xl"
                  >
                    <h3 className="text-lg font-bold text-white font-runtime">
                      🔍 Filtri e Ricerca
                    </h3>
                    <div className={`transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  
                  {/* Contenuto collassabile */}
                  {showFilters && (
                    <div className="px-6 pb-6">{/* Nota: il padding top è già nel bottone */}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Barra di Ricerca */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 font-runtime mb-2">
                        Cerca Giocatore
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Inserisci nome..."
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent font-runtime"
                      />
                    </div>

                    {/* Ordinamento */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 font-runtime mb-2">
                        Ordina per
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'name' | 'overall' | 'rarity')}
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent font-runtime"
                      >
                        <option value="name">Nome (A-Z)</option>
                        <option value="overall">Overall (Alto-Basso)</option>
                        <option value="rarity">Rarità (Migliore-Peggiore)</option>
                      </select>
                    </div>

                    {/* Filtro Rarità */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 font-runtime mb-2">
                        Filtra per Rarità
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { name: 'Ultimate', color: 'text-purple-400', bgColor: 'from-purple-600 to-pink-600', borderColor: 'border-purple-400' },
                          { name: 'Gold', color: 'text-yellow-400', bgColor: 'from-yellow-400 to-yellow-600', borderColor: 'border-yellow-400' },
                          { name: 'Silver', color: 'text-gray-400', bgColor: 'from-gray-400 to-gray-600', borderColor: 'border-gray-400' },
                          { name: 'Bronze', color: 'text-amber-600', bgColor: 'from-amber-600 to-amber-800', borderColor: 'border-amber-600' }
                        ].map((rarity) => (
                          <label key={rarity.name} className="flex items-center cursor-pointer group">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={selectedRarities.includes(rarity.name)}
                                onChange={() => handleRarityToggle(rarity.name)}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 rounded border-2 transition-all duration-200 ${
                                selectedRarities.includes(rarity.name)
                                  ? `bg-gradient-to-r ${rarity.bgColor} ${rarity.borderColor} shadow-lg`
                                  : 'bg-gray-700 border-gray-500 group-hover:border-gray-400'
                              }`}>
                                {selectedRarities.includes(rarity.name) && (
                                  <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className={`ml-3 text-sm font-runtime font-semibold transition-colors duration-200 ${
                              selectedRarities.includes(rarity.name) ? rarity.color : 'text-gray-400 group-hover:text-gray-300'
                            }`}>
                              {rarity.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                      {/* Reset Filtri */}
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSortBy('name');
                            setSelectedRarities(['Ultimate', 'Gold', 'Silver', 'Bronze']);
                          }}
                          className="px-4 py-2 bg-gray-600/50 hover:bg-gray-700/50 text-gray-300 hover:text-white rounded-lg transition-colors font-runtime text-sm"
                        >
                          Reset Filtri
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              {/* Instructions */}
              {!loading && !error && filteredAndSortedPlayers.length > 0 && (
                <div className="mb-8 text-center">
                  <p className="text-gray-300 font-runtime text-lg">
                    ✨ <span className="text-green-400 font-semibold">Clicca su una carta</span> per esplorare il profilo completo del giocatore
                  </p>
                </div>
              )}

              {/* No Results */}
              {!loading && !error && filteredAndSortedPlayers.length === 0 && players.length > 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-600/50 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-300 font-runtime mb-2">Nessun risultato trovato</h3>
                  <p className="text-gray-400 font-runtime mb-4">
                    Prova a modificare i filtri o la ricerca per trovare i giocatori che stai cercando.
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSortBy('name');
                      setSelectedRarities(['Ultimate', 'Gold', 'Silver', 'Bronze']);
                    }}
                    className="px-4 py-2 bg-green-600/80 hover:bg-green-700/80 text-white rounded-lg transition-colors font-runtime"
                  >
                    Reset Filtri
                  </button>
                </div>
              )}

              {/* Players Cards Grid */}
              {!loading && !error && filteredAndSortedPlayers.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
                  {filteredAndSortedPlayers.map((player) => (
                    <PlayerCard key={player.id} player={player} />
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