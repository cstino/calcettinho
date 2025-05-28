'use client';

import { useState, useEffect } from 'react';
import Navigation from "../components/Navigation";
import Logo from "../components/Logo";

interface PlayerStats {
  id: string;
  name: string;
  matches: number;
  wins: number;
  losses: number;
  goals: number;
  assists: number;
  overall: number;
  avgRating: number;
}

export default function Stats() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'overall' | 'goals' | 'avgRating' | 'wins'>('overall');

  useEffect(() => {
    setTimeout(() => {
      setPlayers([
        { id: '1', name: 'Marco Rossi', matches: 15, wins: 10, losses: 5, goals: 12, assists: 8, overall: 85, avgRating: 7.8 },
        { id: '2', name: 'Luca Bianchi', matches: 14, wins: 9, losses: 5, goals: 15, assists: 6, overall: 78, avgRating: 7.5 },
        { id: '3', name: 'Andrea Verdi', matches: 13, wins: 8, losses: 5, goals: 8, assists: 12, overall: 82, avgRating: 7.9 },
        { id: '4', name: 'Paolo Neri', matches: 12, wins: 7, losses: 5, goals: 10, assists: 7, overall: 79, avgRating: 7.4 },
        { id: '5', name: 'Giuseppe Viola', matches: 16, wins: 11, losses: 5, goals: 18, assists: 9, overall: 87, avgRating: 8.2 }
      ]);
      setLoading(false);
    }, 800);
  }, []);

  const sortedPlayers = [...players].sort((a, b) => {
    switch (sortBy) {
      case 'goals': return b.goals - a.goals;
      case 'avgRating': return b.avgRating - a.avgRating;
      case 'wins': return b.wins - a.wins;
      case 'overall':
      default: return b.overall - a.overall;
    }
  });

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
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="relative z-10">
        <Navigation />
        
        <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <Logo
              type="simbolo"
              width={80}
              height={80}
              className="mx-auto mb-6 w-16 h-16 drop-shadow-lg"
            />
            
            <h1 className="text-4xl sm:text-5xl font-bold font-runtime text-white mb-4 drop-shadow-lg">
              Classifica &{" "}
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Statistiche
              </span>
            </h1>
            
            <p className="text-xl font-runtime text-gray-200 mb-8 max-w-2xl mx-auto drop-shadow-md">
              Le performance e le statistiche di tutti i giocatori
            </p>
          </div>
        </section>

        {/* Sort Controls */}
        <section className="pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-center space-x-1 bg-gray-800/50 p-1 rounded-lg backdrop-blur-sm">
              <button
                onClick={() => setSortBy('overall')}
                className={`px-4 py-2 rounded-md font-runtime font-semibold transition-colors ${
                  sortBy === 'overall' ? 'bg-white text-gray-900' : 'text-gray-200 hover:text-white'
                }`}
              >
                Overall
              </button>
              <button
                onClick={() => setSortBy('goals')}
                className={`px-4 py-2 rounded-md font-runtime font-semibold transition-colors ${
                  sortBy === 'goals' ? 'bg-white text-gray-900' : 'text-gray-200 hover:text-white'
                }`}
              >
                Gol
              </button>
              <button
                onClick={() => setSortBy('avgRating')}
                className={`px-4 py-2 rounded-md font-runtime font-semibold transition-colors ${
                  sortBy === 'avgRating' ? 'bg-white text-gray-900' : 'text-gray-200 hover:text-white'
                }`}
              >
                Rating
              </button>
              <button
                onClick={() => setSortBy('wins')}
                className={`px-4 py-2 rounded-md font-runtime font-semibold transition-colors ${
                  sortBy === 'wins' ? 'bg-white text-gray-900' : 'text-gray-200 hover:text-white'
                }`}
              >
                Vittorie
              </button>
            </div>
          </div>
        </section>

        {/* Stats Table */}
        <section className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
                <p className="text-gray-200 mt-4 font-runtime">Caricamento statistiche...</p>
              </div>
            ) : (
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-white font-runtime font-semibold">#</th>
                        <th className="px-6 py-4 text-left text-white font-runtime font-semibold">Giocatore</th>
                        <th className="px-6 py-4 text-center text-white font-runtime font-semibold">Overall</th>
                        <th className="px-6 py-4 text-center text-white font-runtime font-semibold">Partite</th>
                        <th className="px-6 py-4 text-center text-white font-runtime font-semibold">V/S</th>
                        <th className="px-6 py-4 text-center text-white font-runtime font-semibold">Gol</th>
                        <th className="px-6 py-4 text-center text-white font-runtime font-semibold">Assist</th>
                        <th className="px-6 py-4 text-center text-white font-runtime font-semibold">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPlayers.map((player, index) => (
                        <tr key={player.id} className="border-t border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-runtime ${
                              index === 0 ? 'bg-yellow-500 text-black' :
                              index === 1 ? 'bg-gray-400 text-black' :
                              index === 2 ? 'bg-amber-600 text-white' :
                              'bg-gray-600 text-white'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                                <span className="text-white font-bold font-runtime">
                                  {player.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <span className="text-white font-runtime font-semibold">{player.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-green-400 font-runtime">{player.overall}</span>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-300 font-runtime">{player.matches}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-green-400 font-runtime">{player.wins}</span>
                            <span className="text-gray-400 font-runtime">/</span>
                            <span className="text-red-400 font-runtime">{player.losses}</span>
                          </td>
                          <td className="px-6 py-4 text-center text-blue-400 font-runtime font-bold">{player.goals}</td>
                          <td className="px-6 py-4 text-center text-purple-400 font-runtime font-bold">{player.assists}</td>
                          <td className="px-6 py-4 text-center text-yellow-400 font-runtime font-bold">{player.avgRating}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="h-20 sm:h-8"></div>
      </div>
    </div>
  );
} 