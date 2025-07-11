'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Users, Minus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Player {
  nome: string;
  email: string;
  foto?: string;
}

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateMatchModal({ isOpen, onClose, onSuccess }: CreateMatchModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    date: '',
    teamA: [] as string[],
    teamB: [] as string[],
    referee: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
      setSearchQuery('');
    }
  }, [isOpen]);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const playersData = await response.json();
        setPlayers(playersData);
      }
    } catch (error) {
      console.error('Errore nel caricamento giocatori:', error);
    }
  };

  const filteredPlayers = players.filter(player =>
    player.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlayerToggle = (playerEmail: string, team: 'A' | 'B') => {
    setFormData(prev => {
      const newData = { ...prev };
      
      // Se il giocatore è già nella squadra selezionata, rimuovilo (toggle)
      if (team === 'A' && newData.teamA.includes(playerEmail)) {
        newData.teamA = newData.teamA.filter(email => email !== playerEmail);
        return newData;
      }
      
      if (team === 'B' && newData.teamB.includes(playerEmail)) {
        newData.teamB = newData.teamB.filter(email => email !== playerEmail);
        return newData;
      }
      
      // Controlla il limite di 5 giocatori per squadra
      if (team === 'A' && newData.teamA.length >= 5) {
        alert('La squadra A può avere massimo 5 giocatori');
        return prev;
      }
      
      if (team === 'B' && newData.teamB.length >= 5) {
        alert('La squadra B può avere massimo 5 giocatori');
        return prev;
      }
      
      // Rimuovi il giocatore da entrambe le squadre
      newData.teamA = newData.teamA.filter(email => email !== playerEmail);
      newData.teamB = newData.teamB.filter(email => email !== playerEmail);
      
      // Aggiungi alla squadra selezionata
      if (team === 'A') {
        newData.teamA.push(playerEmail);
      } else {
        newData.teamB.push(playerEmail);
      }
      
      return newData;
    });
  };

  const removePlayer = (playerEmail: string, team: 'A' | 'B') => {
    setFormData(prev => ({
      ...prev,
      [team === 'A' ? 'teamA' : 'teamB']: prev[team === 'A' ? 'teamA' : 'teamB'].filter(email => email !== playerEmail)
    }));
  };

  const getPlayerName = (email: string) => {
    const player = players.find(p => p.email === email);
    return player?.nome || email.split('@')[0];
  };

  const isPlayerSelected = (playerEmail: string) => {
    return formData.teamA.includes(playerEmail) || formData.teamB.includes(playerEmail);
  };

  const getPlayerTeam = (playerEmail: string): 'A' | 'B' | null => {
    if (formData.teamA.includes(playerEmail)) return 'A';
    if (formData.teamB.includes(playerEmail)) return 'B';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date) {
      alert('Inserisci una data per la partita');
      return;
    }
    
    if (formData.teamA.length === 0 || formData.teamB.length === 0) {
      alert('Entrambe le squadre devono avere almeno un giocatore');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Partita creata:', result);
        alert('✅ Partita creata con successo!');
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          date: '',
          teamA: [],
          teamB: [],
          referee: ''
        });
        setSearchQuery('');
      } else {
        const error = await response.json();
        alert(`❌ Errore: ${error.error}`);
      }
    } catch (error) {
      console.error('Errore nella creazione:', error);
      alert('❌ Errore nella creazione della partita');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white font-runtime">
              Crea Nuova Partita
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Data e Arbitro */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-runtime mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Data Partita
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-white font-runtime mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Arbitro (Opzionale)
                </label>
                <select
                  value={formData.referee}
                  onChange={(e) => setFormData(prev => ({ ...prev, referee: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none"
                >
                  <option value="">Seleziona arbitro...</option>
                  {players.map(player => (
                    <option key={player.email} value={player.email}>
                      {player.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Barra di Ricerca */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3 font-runtime">
                Giocatori Disponibili
              </h3>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cerca giocatore per nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-green-500 focus:outline-none placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {filteredPlayers.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-gray-400">
                    {searchQuery ? 
                      `Nessun giocatore trovato per "${searchQuery}"` : 
                      'Nessun giocatore disponibile'
                    }
                  </div>
                ) : (
                  filteredPlayers.map(player => {
                    const isSelected = isPlayerSelected(player.email);
                    const team = getPlayerTeam(player.email);
                    
                    return (
                      <div key={player.email} className="flex items-center gap-2">
                        <span className={`text-sm flex-1 ${isSelected ? 'text-gray-400' : 'text-white'}`}>
                          {player.nome}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handlePlayerToggle(player.email, 'A')}
                            disabled={!isSelected && formData.teamA.length >= 5 && team !== 'A'}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              team === 'A' 
                                ? 'bg-red-600 text-white' 
                                : 'bg-red-900/30 text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                          >
                            A
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePlayerToggle(player.email, 'B')}
                            disabled={!isSelected && formData.teamB.length >= 5 && team !== 'B'}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              team === 'B' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-blue-900/30 text-blue-400 hover:bg-blue-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                          >
                            B
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Squadre */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Squadra A */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-400 mb-3 font-runtime">
                  <Users className="w-5 h-5 inline mr-2" />
                  Squadra A ({formData.teamA.length}/5 giocatori)
                </h3>
                <div className="space-y-2 mb-4">
                  {formData.teamA.map(email => (
                    <div key={email} className="flex items-center justify-between bg-red-900/30 p-2 rounded border border-red-500/30">
                      <span className="text-white text-sm">{getPlayerName(email)}</span>
                      <button
                        type="button"
                        onClick={() => removePlayer(email, 'A')}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.teamA.length === 0 && (
                    <div className="text-gray-400 text-sm italic text-center py-4">
                      Seleziona giocatori dalla lista sopra
                    </div>
                  )}
                </div>
              </div>

              {/* Squadra B */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-400 mb-3 font-runtime">
                  <Users className="w-5 h-5 inline mr-2" />
                  Squadra B ({formData.teamB.length}/5 giocatori)
                </h3>
                <div className="space-y-2 mb-4">
                  {formData.teamB.map(email => (
                    <div key={email} className="flex items-center justify-between bg-blue-900/30 p-2 rounded border border-blue-500/30">
                      <span className="text-white text-sm">{getPlayerName(email)}</span>
                      <button
                        type="button"
                        onClick={() => removePlayer(email, 'B')}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.teamB.length === 0 && (
                    <div className="text-gray-400 text-sm italic text-center py-4">
                      Seleziona giocatori dalla lista sopra
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pulsanti */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-runtime"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={loading || formData.teamA.length === 0 || formData.teamB.length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-runtime"
              >
                {loading ? 'Creazione...' : 'Crea Partita'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 