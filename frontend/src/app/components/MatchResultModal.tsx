'use client';

import { useState, useEffect } from 'react';
import { X, Trophy, Target, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Match {
  id: string;
  matchId: string;
  date: string;
  teamA: string[];
  teamB: string[];
  location: string;
  completed: boolean;
  scoreA?: number;
  scoreB?: number;
  teamAScorer?: string;
  teamBScorer?: string;
  assistA?: string;
  assistB?: string;
  status: 'scheduled' | 'completed';
}

interface Player {
  nome: string;
  email: string;
  foto?: string;
}

interface MatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  match: Match | null;
}

export default function MatchResultModal({ isOpen, onClose, onSuccess, match }: MatchResultModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    scoreA: 0,
    scoreB: 0,
    teamAScorer: '',
    teamBScorer: '',
    assistA: '',
    assistB: ''
  });

  useEffect(() => {
    if (isOpen && match) {
      fetchPlayers();
      // Pre-popola i dati se la partita ha già dei risultati
      setFormData({
        scoreA: match.scoreA || 0,
        scoreB: match.scoreB || 0,
        teamAScorer: match.teamAScorer || '',
        teamBScorer: match.teamBScorer || '',
        assistA: match.assistA || '',
        assistB: match.assistB || ''
      });
    }
  }, [isOpen, match]);

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

  const getPlayerName = (email: string) => {
    const player = players.find(p => p.email === email);
    return player?.nome || email.split('@')[0];
  };

  const getTeamPlayers = (team: 'A' | 'B') => {
    if (!match) return [];
    const teamEmails = team === 'A' ? match.teamA : match.teamB;
    return teamEmails.map(email => ({
      email,
      name: getPlayerName(email)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!match) return;

    setLoading(true);
    
    try {
      const response = await fetch('/api/matches', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: match.matchId,
          ...formData,
          completed: true
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Risultato salvato:', result);
        alert('✅ Risultato salvato con successo!');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert(`❌ Errore: ${error.error}`);
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      alert('❌ Errore nel salvataggio del risultato');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !match) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gray-800 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white font-runtime">
                Inserisci Risultato
              </h2>
              <p className="text-gray-400 font-runtime">
                {formatDate(match.date)} - {match.location}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Punteggi */}
            <div className="bg-gray-700/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 font-runtime flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Punteggio Finale
              </h3>
              <div className="grid grid-cols-3 gap-4 items-center">
                {/* Squadra A */}
                <div className="text-center">
                  <h4 className="text-red-400 font-semibold mb-2 font-runtime">Squadra A</h4>
                  <div className="text-sm text-gray-300 mb-2">
                    {getTeamPlayers('A').map(player => player.name).join(', ')}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formData.scoreA}
                    onChange={(e) => setFormData(prev => ({ ...prev, scoreA: parseInt(e.target.value) || 0 }))}
                    className="w-20 h-16 text-2xl font-bold text-center bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none"
                  />
                </div>

                {/* VS */}
                <div className="text-center">
                  <span className="text-3xl font-bold text-gray-400">VS</span>
                </div>

                {/* Squadra B */}
                <div className="text-center">
                  <h4 className="text-blue-400 font-semibold mb-2 font-runtime">Squadra B</h4>
                  <div className="text-sm text-gray-300 mb-2">
                    {getTeamPlayers('B').map(player => player.name).join(', ')}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formData.scoreB}
                    onChange={(e) => setFormData(prev => ({ ...prev, scoreB: parseInt(e.target.value) || 0 }))}
                    className="w-20 h-16 text-2xl font-bold text-center bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Marcatori */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Marcatori Squadra A */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-red-400 font-semibold mb-3 font-runtime flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Marcatori Squadra A
                </h4>
                <select
                  value={formData.teamAScorer}
                  onChange={(e) => setFormData(prev => ({ ...prev, teamAScorer: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none"
                >
                  <option value="">Seleziona marcatore</option>
                  {getTeamPlayers('A').map(player => (
                    <option key={player.email} value={player.email}>
                      {player.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2">
                  <label className="block text-sm text-gray-400 mb-1">Assist</label>
                  <select
                    value={formData.assistA}
                    onChange={(e) => setFormData(prev => ({ ...prev, assistA: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none"
                  >
                    <option value="">Seleziona assist-man</option>
                    {getTeamPlayers('A').map(player => (
                      <option key={player.email} value={player.email}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Marcatori Squadra B */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-semibold mb-3 font-runtime flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Marcatori Squadra B
                </h4>
                <select
                  value={formData.teamBScorer}
                  onChange={(e) => setFormData(prev => ({ ...prev, teamBScorer: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Seleziona marcatore</option>
                  {getTeamPlayers('B').map(player => (
                    <option key={player.email} value={player.email}>
                      {player.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2">
                  <label className="block text-sm text-gray-400 mb-1">Assist</label>
                  <select
                    value={formData.assistB}
                    onChange={(e) => setFormData(prev => ({ ...prev, assistB: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Seleziona assist-man</option>
                    {getTeamPlayers('B').map(player => (
                      <option key={player.email} value={player.email}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pulsanti */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-runtime"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-runtime"
              >
                {loading ? 'Salvataggio...' : 'Salva Risultato'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 