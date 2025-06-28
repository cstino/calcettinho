'use client';

import { useState, useMemo } from 'react';
import PlayerCard from "../components/PlayerCard";

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

interface PlayersClientViewProps {
  initialPlayers: Player[];
}

export default function PlayersClientView({ initialPlayers }: PlayersClientViewProps) {
  // Filtri e ricerca - solo logica client-side
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'overall' | 'rarity'>('name');
  const [selectedRarities, setSelectedRarities] = useState<string[]>(['Ultimate', 'Gold', 'Silver', 'Bronze']);
  const [showFilters, setShowFilters] = useState(false);

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
    return initialPlayers
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
  }, [initialPlayers, searchTerm, selectedRarities, sortBy]);

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
    <>
      {/* Controls Section */}
      <section className="pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md mx-auto">
              <input
                type="text"
                placeholder="Cerca giocatore..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-10 pr-4 text-white placeholder-gray-400 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 mb-6 border border-gray-600/30">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <div className="flex flex-wrap items-center gap-6 text-gray-300">
                <span>Totale: <span className="text-white font-semibold">{stats.total}</span></span>
                <span>Ultimate: <span className="text-purple-400 font-semibold">{stats.ultimate}</span></span>
                <span>Gold: <span className="text-yellow-400 font-semibold">{stats.gold}</span></span>
                <span>Silver: <span className="text-gray-400 font-semibold">{stats.silver}</span></span>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                Filtri
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-6 mb-6 border border-gray-600/30 space-y-4">
              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Ordina per</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'name', label: 'Nome' },
                    { value: 'overall', label: 'Overall' },
                    { value: 'rarity', label: 'Rarità' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value as any)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        sortBy === option.value
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rarity Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mostra rarità</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'Ultimate', label: 'Ultimate', color: 'from-purple-500 to-purple-700' },
                    { value: 'Gold', label: 'Gold', color: 'from-yellow-500 to-yellow-700' },
                    { value: 'Silver', label: 'Silver', color: 'from-gray-400 to-gray-600' },
                    { value: 'Bronze', label: 'Bronze', color: 'from-amber-600 to-amber-800' }
                  ].map(rarity => (
                    <button
                      key={rarity.value}
                      onClick={() => handleRarityToggle(rarity.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedRarities.includes(rarity.value)
                          ? `bg-gradient-to-r ${rarity.color} text-white shadow-lg`
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                      }`}
                    >
                      {rarity.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Players Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-6xl mx-auto">
          {filteredAndSortedPlayers.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-medium text-white mb-2">Nessun giocatore trovato</h3>
              <p className="text-gray-400">Prova a modificare i filtri di ricerca</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {filteredAndSortedPlayers.map((player) => (
                <div key={player.id} className="transform transition-transform duration-200 hover:scale-105">
                  <PlayerCard player={player} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
} 