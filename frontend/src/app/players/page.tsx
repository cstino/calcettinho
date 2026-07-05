'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from "../components/Navigation";
import Logo from "../components/Logo";
import ProtectedRoute from "../components/ProtectedRoute";
import AnimatedCard from "../components/card/AnimatedCard";
import { TIER_ORDER, tierLabel, type CardTier } from "@/utils/playerRating";

interface ApiPlayer {
  nome: string;
  email: string;
  foto: string;
  ATT: number;
  PAS: number;
  DIF: number;
  POR: number;
  overall: number;
  tier: CardTier;
  ranked: boolean;
  rkMatches: number;
  selectedFrame: string | null;
}

const TIER_FILTER_STYLES: Record<CardTier, { color: string; bgColor: string; borderColor: string }> = {
  champion: { color: 'text-fuchsia-400', bgColor: 'from-fuchsia-600 to-pink-600', borderColor: 'border-fuchsia-400' },
  platino: { color: 'text-cyan-300', bgColor: 'from-cyan-400 to-teal-500', borderColor: 'border-cyan-300' },
  oro: { color: 'text-yellow-400', bgColor: 'from-yellow-400 to-yellow-600', borderColor: 'border-yellow-400' },
  argento: { color: 'text-gray-300', bgColor: 'from-gray-400 to-gray-600', borderColor: 'border-gray-400' },
  bronzo: { color: 'text-amber-600', bgColor: 'from-amber-600 to-amber-800', borderColor: 'border-amber-600' },
  unranked: { color: 'text-gray-500', bgColor: 'from-gray-600 to-gray-800', borderColor: 'border-gray-500' },
};

export default function Players() {
  const router = useRouter();
  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtri e ricerca
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'overall'>('overall');
  const [selectedTiers, setSelectedTiers] = useState<CardTier[]>([...TIER_ORDER]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/players', {
          signal: abortController.signal,
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Errore nel caricamento dei giocatori: ${response.status}`);
        }

        const playersData: ApiPlayer[] = await response.json();
        if (abortController.signal.aborted) return;

        setPlayers(playersData.filter((p) => p.nome && p.nome.trim() !== ''));
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    };

    fetchPlayers();
    return () => abortController.abort();
  }, []);

  const filteredAndSortedPlayers = useMemo(() => {
    const tierRank = (tier: CardTier) => TIER_ORDER.indexOf(tier);

    return players
      .filter((player) => {
        const matchesSearch = player.nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTier = selectedTiers.includes(player.tier);
        return matchesSearch && matchesTier;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.nome.localeCompare(b.nome);
        // overall: unranked sempre in fondo
        if (a.ranked !== b.ranked) return a.ranked ? -1 : 1;
        if (b.overall !== a.overall) return b.overall - a.overall;
        return tierRank(a.tier) - tierRank(b.tier);
      });
  }, [players, searchTerm, selectedTiers, sortBy]);

  const tierCounts = useMemo(() => {
    const counts = Object.fromEntries(TIER_ORDER.map((t) => [t, 0])) as Record<CardTier, number>;
    filteredAndSortedPlayers.forEach((p) => { counts[p.tier]++; });
    return counts;
  }, [filteredAndSortedPlayers]);

  const handleTierToggle = (tier: CardTier) => {
    setSelectedTiers((prev) => (prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]));
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSortBy('overall');
    setSelectedTiers([...TIER_ORDER]);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black relative">
        <div className="absolute inset-0 bg-black"></div>

        <div className="relative z-10">
          <Navigation />

          {/* Header Section */}
          <section className="pt-20 lg:pt-24 pb-8 px-4 sm:px-6 lg:px-8" style={{ paddingTop: 'max(80px, env(safe-area-inset-top, 0px) + 50px)' }}>
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

              {/* Stats Summary per tier */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-12">
                {TIER_ORDER.map((tier) => (
                  <div key={tier} className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                    <div className={`text-2xl font-bold font-runtime ${TIER_FILTER_STYLES[tier].color}`}>
                      {tierCounts[tier]}
                    </div>
                    <div className="text-gray-300 font-runtime text-sm">{tierLabel(tier)}</div>
                  </div>
                ))}
              </div>

              {/* Filtri e Ricerca */}
              {!loading && !error && (
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl mb-8">
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

                  {showFilters && (
                    <div className="px-6 pb-6">
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
                            onChange={(e) => setSortBy(e.target.value as 'name' | 'overall')}
                            className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent font-runtime"
                          >
                            <option value="overall">Overall (Alto-Basso)</option>
                            <option value="name">Nome (A-Z)</option>
                          </select>
                        </div>

                        {/* Filtro Tier */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 font-runtime mb-2">
                            Filtra per Tier
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            {TIER_ORDER.map((tier) => {
                              const style = TIER_FILTER_STYLES[tier];
                              const checked = selectedTiers.includes(tier);
                              return (
                                <label key={tier} className="flex items-center cursor-pointer group">
                                  <div className="relative">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleTierToggle(tier)}
                                      className="sr-only"
                                    />
                                    <div className={`w-5 h-5 rounded border-2 transition-all duration-200 ${
                                      checked
                                        ? `bg-gradient-to-r ${style.bgColor} ${style.borderColor} shadow-lg`
                                        : 'bg-gray-700 border-gray-500 group-hover:border-gray-400'
                                    }`}>
                                      {checked && (
                                        <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`ml-3 text-sm font-runtime font-semibold transition-colors duration-200 ${
                                    checked ? style.color : 'text-gray-400 group-hover:text-gray-300'
                                  }`}>
                                    {tierLabel(tier)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <button
                          onClick={resetFilters}
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
                    onClick={resetFilters}
                    className="px-4 py-2 bg-green-600/80 hover:bg-green-700/80 text-white rounded-lg transition-colors font-runtime"
                  >
                    Reset Filtri
                  </button>
                </div>
              )}

              {/* Players Cards Grid */}
              {!loading && !error && filteredAndSortedPlayers.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
                  {filteredAndSortedPlayers.map((player) => (
                    <AnimatedCard
                      key={player.email}
                      name={player.nome}
                      email={player.email}
                      stats={player}
                      frame={player.selectedFrame}
                      onClick={() => router.push(`/profile/${encodeURIComponent(player.email)}`)}
                    />
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
