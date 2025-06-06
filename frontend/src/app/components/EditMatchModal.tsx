'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Users, Trophy, Plus, Minus } from 'lucide-react';

interface PlayerMatchStats {
  gol: number;
  assist: number;
  gialli: number;
  rossi: number;
}

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
  playerStats?: { [email: string]: PlayerMatchStats };
}

interface Player {
  nome: string;
  email: string;
}

interface EditMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  match: Match | null;
  allPlayers: Player[];
}

export default function EditMatchModal({ 
  isOpen, 
  onClose, 
  match, 
  allPlayers, 
  onSuccess 
}: EditMatchModalProps) {
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [playerStats, setPlayerStats] = useState<{ [email: string]: PlayerMatchStats }>({});
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Reset quando si apre il modal
  useEffect(() => {
    if (isOpen && match) {
      setTeamA([...match.teamA]);
      setTeamB([...match.teamB]);
      setScoreA(match.scoreA || 0);
      setScoreB(match.scoreB || 0);
      setPlayerStats(match.playerStats || {});
      setCompleted(match.completed);
    }
  }, [isOpen, match]);

  const getPlayerName = (email: string): string => {
    const player = allPlayers.find(p => p.email === email);
    return player?.nome || email.split('@')[0] || 'Giocatore';
  };

  const getAvailablePlayers = () => {
    const usedEmails = [...teamA, ...teamB];
    return allPlayers.filter(player => !usedEmails.includes(player.email));
  };

  const addPlayerToTeam = (team: 'A' | 'B', playerEmail: string) => {
    if (team === 'A' && teamA.length < 5) {
      setTeamA([...teamA, playerEmail]);
    } else if (team === 'B' && teamB.length < 5) {
      setTeamB([...teamB, playerEmail]);
    }
  };

  const removePlayerFromTeam = (team: 'A' | 'B', playerEmail: string) => {
    if (team === 'A') {
      setTeamA(teamA.filter(email => email !== playerEmail));
    } else {
      setTeamB(teamB.filter(email => email !== playerEmail));
    }
    // Rimuovi anche le statistiche del giocatore
    const newStats = { ...playerStats };
    delete newStats[playerEmail];
    setPlayerStats(newStats);
  };

  const updatePlayerStat = (playerEmail: string, stat: keyof PlayerMatchStats, value: number) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerEmail]: {
        ...prev[playerEmail] || { gol: 0, assist: 0, gialli: 0, rossi: 0 },
        [stat]: Math.max(0, value)
      }
    }));
  };

  // Ricalcola automaticamente il punteggio quando cambiano le statistiche
  useEffect(() => {
    if (Object.keys(playerStats).length > 0) {
      // Calcola gol squadra A
      const goalsTeamA = teamA.reduce((total, email) => {
        return total + (playerStats[email]?.gol || 0);
      }, 0);
      
      // Calcola gol squadra B
      const goalsTeamB = teamB.reduce((total, email) => {
        return total + (playerStats[email]?.gol || 0);
      }, 0);
      
      // Aggiorna i punteggi solo se sono diversi da quelli attuali
      if (goalsTeamA !== scoreA) {
        setScoreA(goalsTeamA);
      }
      if (goalsTeamB !== scoreB) {
        setScoreB(goalsTeamB);
      }
    }
  }, [playerStats, teamA, teamB]);

  const getAllPlayers = () => [...teamA, ...teamB];

  const handleSubmit = async () => {
    if (teamA.length === 0 || teamB.length === 0) {
      alert('Entrambe le squadre devono avere almeno un giocatore');
      return;
    }

    setLoading(true);
    
    try {
      // 1. Aggiorna la partita
      const response = await fetch(`/api/matches/${match?.matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamA,
          teamB,
          scoreA,
          scoreB,
          playerStats,
          completed: completed
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Partita aggiornata:', data);
        
        // 2. Se la partita è stata completata, processa premi e statistiche automaticamente
        if (completed && match?.matchId) {
          console.log('🎯 Partita completata, processamento premi e statistiche...');
          try {
            const processResponse = await fetch(`/api/matches/${match.matchId}/process-awards`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (processResponse.ok) {
              const processResult = await processResponse.json();
              console.log('🏆 Premi e statistiche processati:', processResult);
              
              if (processResult.isReprocessing) {
                alert(`✅ Partita aggiornata con successo!\n🔄 Statistiche corrette automaticamente\n🏆 Premi assegnati: ${processResult.awards}\n📊 Operazione: aggiornamento sicuro`);
              } else {
                alert(`✅ Partita completata con successo!\n🏆 Premi assegnati: ${processResult.awards}\n📊 Statistiche create automaticamente`);
              }
            } else if (processResponse.status === 409) {
              // Partita già processata
              const errorResult = await processResponse.json();
              console.log('⚠️ Partita già processata:', errorResult);
              alert(`✅ Partita aggiornata con successo!\n⚠️ Nota: ${errorResult.message}\nLe statistiche non sono state modificate per evitare doppi conteggi.`);
            } else {
              console.error('❌ Errore nel processamento premi:', processResponse.status);
              alert('✅ Partita aggiornata!\n⚠️ Attenzione: errore nell\'aggiornamento automatico delle statistiche');
            }
          } catch (processError) {
            console.error('❌ Errore nel processamento premi:', processError);
            alert('✅ Partita aggiornata!\n⚠️ Attenzione: errore nell\'aggiornamento automatico delle statistiche');
          }
        } else {
          alert('✅ Partita aggiornata con successo!');
        }
        
        onSuccess();
        onClose();
      } else {
        alert(`❌ Errore nell'aggiornamento: ${data.error}`);
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento partita:', error);
      alert('❌ Errore nell\'aggiornamento della partita');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-gray-700"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-runtime">
              Modifica Partita
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-blue-100 mt-2">
            {new Date(match.date).toLocaleDateString('it-IT')} - {match.location}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          
          {/* Punteggio */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Punteggio Finale
            </h3>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-red-400 font-semibold mb-2">Team Rosso</div>
                <input
                  type="number"
                  value={scoreA}
                  onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                  className="w-20 h-20 text-3xl font-bold text-center bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-red-400 focus:outline-none"
                  min="0"
                />
              </div>
              <div className="text-2xl font-bold text-gray-400">VS</div>
              <div className="text-center">
                <div className="text-blue-400 font-semibold mb-2">Team Blu</div>
                <input
                  type="number"
                  value={scoreB}
                  onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                  className="w-20 h-20 text-3xl font-bold text-center bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Gestione Squadre */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Team A */}
            <div className="bg-red-900/20 rounded-xl p-6 border border-red-500/30">
              <h3 className="text-xl font-semibold text-red-400 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Rosso ({teamA.length}/5)
              </h3>
              
              {/* Giocatori attuali */}
              <div className="space-y-2 mb-4">
                {teamA.map((email, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-red-900/30 p-3 rounded-lg">
                    <span className="text-white font-medium">{getPlayerName(email)}</span>
                    <button
                      onClick={() => removePlayerFromTeam('A', email)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Aggiungi giocatore */}
              {teamA.length < 5 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addPlayerToTeam('A', e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full bg-gray-700 text-white rounded-lg p-2 border border-gray-600"
                >
                  <option value="">Aggiungi giocatore...</option>
                  {getAvailablePlayers().map(player => (
                    <option key={player.email} value={player.email}>
                      {player.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Team B */}
            <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-500/30">
              <h3 className="text-xl font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Blu ({teamB.length}/5)
              </h3>
              
              {/* Giocatori attuali */}
              <div className="space-y-2 mb-4">
                {teamB.map((email, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-blue-900/30 p-3 rounded-lg">
                    <span className="text-white font-medium">{getPlayerName(email)}</span>
                    <button
                      onClick={() => removePlayerFromTeam('B', email)}
                      className="text-blue-400 hover:text-blue-300 p-1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Aggiungi giocatore */}
              {teamB.length < 5 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addPlayerToTeam('B', e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full bg-gray-700 text-white rounded-lg p-2 border border-gray-600"
                >
                  <option value="">Aggiungi giocatore...</option>
                  {getAvailablePlayers().map(player => (
                    <option key={player.email} value={player.email}>
                      {player.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Statistiche Giocatori */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Statistiche Individuali</h3>
            
            <div className="grid gap-4">
              {getAllPlayers().map(email => {
                const stats = playerStats[email] || { gol: 0, assist: 0, gialli: 0, rossi: 0 };
                const isTeamA = teamA.includes(email);
                
                return (
                  <div 
                    key={email} 
                    className={`p-4 rounded-lg border ${
                      isTeamA 
                        ? 'bg-red-900/20 border-red-500/30' 
                        : 'bg-blue-900/20 border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">{getPlayerName(email)}</span>
                      <span className={`text-sm ${isTeamA ? 'text-red-400' : 'text-blue-400'}`}>
                        {isTeamA ? 'Team Rosso' : 'Team Blu'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Gol */}
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">⚽ Gol</div>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updatePlayerStat(email, 'gol', stats.gol - 1)}
                            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-white font-bold">{stats.gol}</span>
                          <button
                            onClick={() => updatePlayerStat(email, 'gol', stats.gol + 1)}
                            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Assist */}
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">🅰️ Assist</div>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updatePlayerStat(email, 'assist', stats.assist - 1)}
                            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-white font-bold">{stats.assist}</span>
                          <button
                            onClick={() => updatePlayerStat(email, 'assist', stats.assist + 1)}
                            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Gialli */}
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">🟨 Gialli</div>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updatePlayerStat(email, 'gialli', stats.gialli - 1)}
                            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-white font-bold">{stats.gialli}</span>
                          <button
                            onClick={() => updatePlayerStat(email, 'gialli', stats.gialli + 1)}
                            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Rossi */}
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">🟥 Rossi</div>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updatePlayerStat(email, 'rossi', stats.rossi - 1)}
                            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-white font-bold">{stats.rossi}</span>
                          <button
                            onClick={() => updatePlayerStat(email, 'rossi', stats.rossi + 1)}
                            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Completa Partita */}
        <div className="px-6">
          <div className="bg-green-900/20 rounded-xl p-4 border border-green-500/30">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
                className="w-5 h-5 text-green-500 bg-gray-700 border-gray-600 rounded focus:ring-green-400 focus:ring-2"
              />
              <div>
                <span className="text-white font-semibold">Completa partita</span>
                <p className="text-gray-400 text-sm">
                  Segna come completata e aggiorna automaticamente le statistiche e i premi
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 p-6 rounded-b-2xl">
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || teamA.length === 0 || teamB.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salva Modifiche
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 