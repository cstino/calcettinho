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
  status: 'scheduled' | 'completed' | 'in_progress';
  playerStats?: { [email: string]: PlayerMatchStats };
}

interface PlayerMatchStats {
  gol: number;
  assist: number;
  gialli: number;
  rossi: number;
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
    playerStats: {} as { [email: string]: PlayerMatchStats }
  });

  useEffect(() => {
    if (isOpen && match) {
      fetchPlayers();
      const allPlayers = [...match.teamA, ...match.teamB];
      const initialPlayerStats: { [email: string]: PlayerMatchStats } = {};
      
      allPlayers.forEach(email => {
        initialPlayerStats[email] = match.playerStats?.[email] || {
          gol: 0,
          assist: 0,
          gialli: 0,
          rossi: 0
        };
      });

      setFormData({
        scoreA: match.scoreA || 0,
        scoreB: match.scoreB || 0,
        playerStats: initialPlayerStats
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

  const updatePlayerStats = (email: string, field: keyof PlayerMatchStats, value: number) => {
    setFormData(prev => ({
      ...prev,
      playerStats: {
        ...prev.playerStats,
        [email]: {
          ...prev.playerStats[email],
          [field]: Math.max(0, value)
        }
      }
    }));
  };

  const calculateTeamScore = (teamEmails: string[]) => {
    return teamEmails.reduce((total, email) => {
      return total + (formData.playerStats[email]?.gol || 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!match) return;

    const calculatedScoreA = calculateTeamScore(match.teamA);
    const calculatedScoreB = calculateTeamScore(match.teamB);

    setLoading(true);
    
    try {
      // 1. Salva il risultato della partita
      const response = await fetch('/api/matches', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: match.matchId,
          scoreA: calculatedScoreA,
          scoreB: calculatedScoreB,
          playerStats: formData.playerStats,
          completed: true
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Risultato salvato:', result);
        
        // 2. Processa automaticamente premi e statistiche
        console.log('🎯 Avvio processamento premi e statistiche...');
        try {
          const processResponse = await fetch(`/.netlify/functions/process-awards?matchId=${match.matchId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (processResponse.ok) {
            const processResult = await processResponse.json();
            console.log('🏆 Premi e statistiche processati:', processResult);
            
            // Mostra il riepilogo
            let summaryMessage = '';
            if (processResult.isReprocessing) {
              summaryMessage = '✅ Partita aggiornata con successo!\n🔄 Statistiche corrette automaticamente\n\n';
            } else {
              summaryMessage = '✅ Partita completata con successo!\n\n';
            }
            
            summaryMessage += `🏆 Premi assegnati: ${processResult.awards}\n`;
            if (processResult.awardDetails && processResult.awardDetails.length > 0) {
              summaryMessage += '\nPREMI OTTENUTI:\n';
              processResult.awardDetails.forEach((award: any) => {
                const playerName = getPlayerName(award.playerEmail);
                const awardName = award.awardType === 'motm' ? '👑 Man of the Match' :
                                 award.awardType === 'goleador' ? '⚽ Goleador' :
                                 award.awardType === 'assistman' ? '🅰️ Assist Man' : award.awardType;
                summaryMessage += `• ${playerName}: ${awardName}\n`;
              });
            }
            summaryMessage += `\n📊 ${processResult.isReprocessing ? 'Statistiche corrette' : 'Statistiche create'} automaticamente!`;
            
            alert(summaryMessage);
          } else if (processResponse.status === 409) {
            // Partita già processata
            const errorResult = await processResponse.json();
            console.log('⚠️ Partita già processata:', errorResult);
            alert(`✅ Risultato salvato con successo!\n⚠️ Nota: ${errorResult.message}\nLe statistiche non sono state modificate per evitare doppi conteggi.`);
          } else {
            console.error('❌ Errore nel processamento premi:', processResponse.status);
            alert('✅ Risultato salvato!\n⚠️ Attenzione: errore nell\'aggiornamento automatico delle statistiche');
          }
        } catch (processError) {
          console.error('❌ Errore nel processamento premi:', processError);
          alert('✅ Risultato salvato!\n⚠️ Attenzione: errore nell\'aggiornamento automatico delle statistiche');
        }
        
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

  const allPlayers = [...match.teamA, ...match.teamB];
  const calculatedScoreA = calculateTeamScore(match.teamA);
  const calculatedScoreB = calculateTeamScore(match.teamB);

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
            {/* Punteggio Calcolato Automaticamente */}
            <div className="bg-gray-700/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 font-runtime flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Punteggio Finale (Calcolato Automaticamente)
              </h3>
              <div className="grid grid-cols-3 gap-4 items-center">
                {/* Squadra A */}
                <div className="text-center">
                  <h4 className="text-red-400 font-semibold mb-2 font-runtime">Squadra A</h4>
                  <div className="text-sm text-gray-300 mb-2">
                    {getTeamPlayers('A').map(player => player.name).join(', ')}
                  </div>
                  <div className="w-20 h-16 text-2xl font-bold text-center bg-gray-700 text-red-400 rounded-lg border border-gray-600 flex items-center justify-center mx-auto">
                    {calculatedScoreA}
                  </div>
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
                  <div className="w-20 h-16 text-2xl font-bold text-center bg-gray-700 text-blue-400 rounded-lg border border-gray-600 flex items-center justify-center mx-auto">
                    {calculatedScoreB}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistiche Giocatori */}
            <div className="bg-gray-700/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 font-runtime flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Statistiche Giocatori
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left py-3 px-2 text-gray-300 font-runtime">Giocatore</th>
                      <th className="text-center py-3 px-2 text-gray-300 font-runtime">Squadra</th>
                      <th className="text-center py-3 px-2 text-yellow-400 font-runtime">⚽ Gol</th>
                      <th className="text-center py-3 px-2 text-blue-400 font-runtime">🅰️ Assist</th>
                      <th className="text-center py-3 px-2 text-yellow-300 font-runtime">🟨 Gialli</th>
                      <th className="text-center py-3 px-2 text-red-400 font-runtime">🟥 Rossi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPlayers.map((email) => {
                      const playerName = getPlayerName(email);
                      const isTeamA = match.teamA.includes(email);
                      const teamColor = isTeamA ? 'text-red-400' : 'text-blue-400';
                      const teamName = isTeamA ? 'A' : 'B';
                      
                      return (
                        <tr key={email} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                          <td className="py-3 px-2">
                            <span className={`font-medium ${teamColor} font-runtime`}>
                              {playerName}
                            </span>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${isTeamA ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'} font-runtime`}>
                              {teamName}
                            </span>
                          </td>
                          <td className="text-center py-3 px-2">
                            <input
                              type="number"
                              min="0"
                              value={formData.playerStats[email]?.gol || 0}
                              onChange={(e) => updatePlayerStats(email, 'gol', parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-center bg-gray-600 text-white rounded border border-gray-500 focus:border-yellow-400 focus:outline-none"
                            />
                          </td>
                          <td className="text-center py-3 px-2">
                            <input
                              type="number"
                              min="0"
                              value={formData.playerStats[email]?.assist || 0}
                              onChange={(e) => updatePlayerStats(email, 'assist', parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-center bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-400 focus:outline-none"
                            />
                          </td>
                          <td className="text-center py-3 px-2">
                            <input
                              type="number"
                              min="0"
                              value={formData.playerStats[email]?.gialli || 0}
                              onChange={(e) => updatePlayerStats(email, 'gialli', parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-center bg-gray-600 text-white rounded border border-gray-500 focus:border-yellow-300 focus:outline-none"
                            />
                          </td>
                          <td className="text-center py-3 px-2">
                            <input
                              type="number"
                              min="0"
                              value={formData.playerStats[email]?.rossi || 0}
                              onChange={(e) => updatePlayerStats(email, 'rossi', parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-center bg-gray-600 text-white rounded border border-gray-500 focus:border-red-400 focus:outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-xs text-gray-400 font-runtime">
                💡 Il punteggio finale viene calcolato automaticamente dalla somma dei gol di ogni squadra
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