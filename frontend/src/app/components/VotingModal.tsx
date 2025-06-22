'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Check, X, Minus, Crown } from 'lucide-react';

interface Player {
  name: string;
  email: string;
}

interface PlayerStats {
  ATT: number;
  DIF: number;
  VEL: number;
  PAS: number;
  FOR: number;
  POR: number;
}

interface Match {
  id: string;
  matchId: string;
  teamA: string[];
  teamB: string[];
  status?: 'scheduled' | 'completed' | 'in_progress';
  match_status?: 'scheduled' | 'completed' | 'in_progress';
  referee?: string;
}

// ✅ NUOVO: Aggiornato tipo per includere NEUTRAL e MOTM
interface Vote {
  playerEmail: string;
  voteType: 'UP' | 'DOWN' | 'NEUTRAL';
  motmVote: boolean;
}

interface VotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  voterEmail: string;
  allPlayers: Player[];
  onSuccess: () => void;
}

export default function VotingModal({ 
  isOpen, 
  onClose, 
  match, 
  voterEmail, 
  allPlayers, 
  onSuccess 
}: VotingModalProps) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  // ✅ NUOVO: Stato aggiornato per supportare NEUTRAL e MOTM
  const [votes, setVotes] = useState<Record<string, { voteType: 'UP' | 'DOWN' | 'NEUTRAL'; motmVote: boolean }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  
  // ✅ Nuovo stato per forzare il reset dei pulsanti
  const [buttonResetKey, setButtonResetKey] = useState(0);

  // ✅ FIXED: Uso useMemo per evitare ricreazione continua di playersToVote
  const playersToVote = useMemo(() => {
    return match ? allPlayers.filter(player => 
      [...match.teamA, ...match.teamB].includes(player.email) && player.email !== voterEmail
    ) : [];
  }, [match, allPlayers, voterEmail]);

  // Reset quando si apre il modal
  useEffect(() => {
    if (isOpen) {
      console.log('[VOTING DEBUG] Reset completo modal');
      setCurrentPlayerIndex(0);
      setVotes({});
      setIsSubmitting(false);
      setIsComplete(false);
      setPlayerStats({});
      setLoadingStats(true);
      setButtonResetKey(prev => prev + 1); // ✅ Force reset pulsanti
    }
  }, [isOpen]);

  // ✅ FIXED: Rimuovo playersToVote dalle dipendenze per evitare loop infinito
  useEffect(() => {
    console.log('[VOTING DEBUG] Cambio giocatore, reset pulsanti:', {
      currentPlayerIndex,
      currentPlayer: playersToVote[currentPlayerIndex]?.name,
      currentPlayerEmail: playersToVote[currentPlayerIndex]?.email
    });
    setButtonResetKey(prev => prev + 1);
  }, [currentPlayerIndex]); // ✅ Solo currentPlayerIndex come dipendenza

  // Carica le statistiche dei giocatori
  useEffect(() => {
    if (isOpen && playersToVote.length > 0) {
      const loadPlayerStats = async () => {
        setLoadingStats(true);
        const stats: Record<string, PlayerStats> = {};
        
        try {
          // Carica tutti i giocatori in parallelo
          const response = await fetch('/api/players');
          if (response.ok) {
            const allPlayersData = await response.json();
            
            playersToVote.forEach(player => {
              const playerData = allPlayersData.find((p: { email: string; [key: string]: any }) => p.email === player.email);
              if (playerData) {
                stats[player.email] = {
                  ATT: Math.round(playerData.ATT || 50),
                  DIF: Math.round(playerData.DIF || 50),
                  VEL: Math.round(playerData.VEL || 50),
                  PAS: Math.round(playerData.PAS || 50),
                  FOR: Math.round(playerData.FOR || 50),
                  POR: Math.round(playerData.POR || 50)
                };
              }
            });
          }
        } catch (error) {
          console.error('Errore nel caricamento statistiche:', error);
        }
        
        setPlayerStats(stats);
        setLoadingStats(false);
      };

      loadPlayerStats();
    }
  }, [isOpen, match?.matchId, playersToVote]);

  // Controlla se tutti i voti sono stati espressi
  useEffect(() => {
    const votedCount = Object.keys(votes).length;
    setIsComplete(votedCount === playersToVote.length && playersToVote.length > 0);
  }, [votes, playersToVote.length]);

  const currentPlayer = playersToVote[currentPlayerIndex];

  // ✅ NUOVO: Gestione voto principale (UP/DOWN/NEUTRAL)
  const handleVote = (voteType: 'UP' | 'DOWN' | 'NEUTRAL') => {
    if (!currentPlayer) return;

    console.log(`[VOTING DEBUG] handleVote chiamata:`, {
      player: currentPlayer.name,
      email: currentPlayer.email,
      voteType,
      previousVote: getVoteForPlayer(currentPlayer.email),
      buttonResetKey
    });

    const newVotes = { ...votes };
    if (!newVotes[currentPlayer.email]) {
      newVotes[currentPlayer.email] = { voteType, motmVote: false };
    } else {
      newVotes[currentPlayer.email].voteType = voteType;
    }
    setVotes(newVotes);

    console.log(`[VOTING DEBUG] Stato voti aggiornato:`, newVotes);

    // Passa automaticamente al prossimo giocatore se non è l'ultimo
    if (currentPlayerIndex < playersToVote.length - 1) {
      setTimeout(() => {
        console.log('[VOTING DEBUG] Passaggio automatico al prossimo giocatore');
        setCurrentPlayerIndex(currentPlayerIndex + 1);
      }, 300);
    }
  };

  // ✅ NUOVO: Gestione voto MOTM
  const handleMotmVote = () => {
    if (!currentPlayer) return;

    console.log(`[VOTING DEBUG] handleMotmVote chiamata per ${currentPlayer.name}`);

    const newVotes = { ...votes };
    if (!newVotes[currentPlayer.email]) {
      newVotes[currentPlayer.email] = { voteType: 'NEUTRAL', motmVote: true };
    } else {
      newVotes[currentPlayer.email].motmVote = !newVotes[currentPlayer.email].motmVote;
    }
    setVotes(newVotes);

    console.log(`[VOTING DEBUG] MOTM voto aggiornato:`, newVotes[currentPlayer.email]);
  };

  const goToPrevious = () => {
    if (currentPlayerIndex > 0) {
      console.log('[VOTING DEBUG] Navigazione al giocatore precedente');
      setCurrentPlayerIndex(currentPlayerIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentPlayerIndex < playersToVote.length - 1) {
      console.log('[VOTING DEBUG] Navigazione al giocatore successivo');
      setCurrentPlayerIndex(currentPlayerIndex + 1);
    }
  };

  const handleSubmit = async () => {
    if (!isComplete || !match) return;

    setIsSubmitting(true);
    
    try {
      // ✅ NUOVO: Converti formato voti per API
      const voteArray = Object.entries(votes).map(([playerEmail, vote]) => ({
        playerEmail,
        voteType: vote.voteType,
        motmVote: vote.motmVote
      }));

      console.log('Dati da inviare:', {
        voterEmail,
        matchId: match.matchId,
        votes: voteArray,
        totalVotes: voteArray.length,
        playersToVote: playersToVote.length
      });

      const response = await fetch('/api/votes/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voterEmail,
          matchId: match.matchId,
          votes: voteArray
        }),
      });

      const data = await response.json();
      console.log('Risposta server:', data);

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        console.error('Errore dal server:', data);
        
        // ✅ Gestione specifica per voto duplicato
        if (data.code === 'ALREADY_VOTED') {
          alert('⚠️ Hai già votato per questa partita!');
          onClose(); // Chiudi il modal se ha già votato
        } else {
          alert(`Errore nell'invio dei voti: ${data.error}`);
        }
      }
    } catch (error) {
      console.error('Errore nell\'invio dei voti:', error);
      alert('Errore nell\'invio dei voti. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVoteForPlayer = (playerEmail: string) => {
    const vote = votes[playerEmail];
    console.log(`[VOTING DEBUG] getVoteForPlayer(${playerEmail}):`, {
      vote,
      allVotes: votes,
      votesKeys: Object.keys(votes),
      votesSize: Object.keys(votes).length,
      buttonResetKey
    });
    return vote;
  };

  const progress = playersToVote.length > 0 ? ((currentPlayerIndex + 1) / playersToVote.length) * 100 : 0;

  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-700 flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-runtime">
              Vota i Giocatori
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progresso</span>
              <span>{currentPlayerIndex + 1} di {playersToVote.length}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <motion.div
                className="bg-white h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Player Info */}
        <div className="flex-1 p-6">
          <AnimatePresence mode="wait">
            {currentPlayer && (
              <motion.div
                key={`${currentPlayer.email}-${buttonResetKey}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {/* Player Name */}
                <div className="mb-6">
                  <h3 className="text-3xl font-bold text-white font-runtime mb-2">
                    {currentPlayer.name}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Come ha giocato in questa partita?
                  </p>
                </div>

                {/* Player Stats */}
                <div className="mb-6">
                  {loadingStats ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : playerStats[currentPlayer.email] ? (
                    <div className="grid grid-cols-3 gap-4 bg-gray-800 rounded-xl p-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-400 mb-1">
                          {playerStats[currentPlayer.email].ATT}
                        </div>
                        <div className="text-xs text-gray-400 font-semibold">ATT</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400 mb-1">
                          {playerStats[currentPlayer.email].VEL}
                        </div>
                        <div className="text-xs text-gray-400 font-semibold">VEL</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-400 mb-1">
                          {playerStats[currentPlayer.email].PAS}
                        </div>
                        <div className="text-xs text-gray-400 font-semibold">PAS</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-400 mb-1">
                          {playerStats[currentPlayer.email].FOR}
                        </div>
                        <div className="text-xs text-gray-400 font-semibold">FOR</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-yellow-400 mb-1">
                          {playerStats[currentPlayer.email].DIF}
                        </div>
                        <div className="text-xs text-gray-400 font-semibold">DIF</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-400 mb-1">
                          {playerStats[currentPlayer.email].POR}
                        </div>
                        <div className="text-xs text-gray-400 font-semibold">POR</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">Statistiche non disponibili</div>
                  )}
                </div>

                {/* ✅ NUOVO: Vote Buttons - 3 bottoni principali + MOTM */}
                <div className="flex gap-2 mb-4">
                  {/* DOWN Button */}
                  <motion.button
                    key={`down-${currentPlayer.email}-${buttonResetKey}`}
                    initial={{ scale: 1, backgroundColor: 'rgb(31, 41, 55)' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      backgroundColor: getVoteForPlayer(currentPlayer.email)?.voteType === 'DOWN' 
                        ? 'rgb(220, 38, 38)' // red-600
                        : 'rgb(31, 41, 55)', // gray-800
                      borderColor: getVoteForPlayer(currentPlayer.email)?.voteType === 'DOWN'
                        ? 'rgb(239, 68, 68)' // red-500
                        : 'rgb(75, 85, 99)', // gray-600
                    }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      console.log(`[VOTING DEBUG] Voto DOWN per ${currentPlayer.name} (${currentPlayer.email})`);
                      handleVote('DOWN');
                    }}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      getVoteForPlayer(currentPlayer.email)?.voteType === 'DOWN'
                        ? 'text-white'
                        : 'text-gray-300 hover:border-red-500 hover:bg-red-600/20'
                    }`}
                  >
                    <ThumbsDown className="w-6 h-6 mx-auto mb-1" />
                    <div className="font-semibold text-sm">DOWN</div>
                  </motion.button>

                  {/* NEUTRAL Button */}
                  <motion.button
                    key={`neutral-${currentPlayer.email}-${buttonResetKey}`}
                    initial={{ scale: 1, backgroundColor: 'rgb(31, 41, 55)' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      backgroundColor: getVoteForPlayer(currentPlayer.email)?.voteType === 'NEUTRAL' 
                        ? 'rgb(107, 114, 128)' // gray-500
                        : 'rgb(31, 41, 55)', // gray-800
                      borderColor: getVoteForPlayer(currentPlayer.email)?.voteType === 'NEUTRAL'
                        ? 'rgb(156, 163, 175)' // gray-400
                        : 'rgb(75, 85, 99)', // gray-600
                    }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      console.log(`[VOTING DEBUG] Voto NEUTRAL per ${currentPlayer.name} (${currentPlayer.email})`);
                      handleVote('NEUTRAL');
                    }}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      getVoteForPlayer(currentPlayer.email)?.voteType === 'NEUTRAL'
                        ? 'text-white'
                        : 'text-gray-300 hover:border-gray-400 hover:bg-gray-500/20'
                    }`}
                  >
                    <Minus className="w-6 h-6 mx-auto mb-1" />
                    <div className="font-semibold text-sm">NEUTRAL</div>
                  </motion.button>

                  {/* UP Button */}
                  <motion.button
                    key={`up-${currentPlayer.email}-${buttonResetKey}`}
                    initial={{ scale: 1, backgroundColor: 'rgb(31, 41, 55)' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      backgroundColor: getVoteForPlayer(currentPlayer.email)?.voteType === 'UP' 
                        ? 'rgb(22, 163, 74)' // green-600
                        : 'rgb(31, 41, 55)', // gray-800
                      borderColor: getVoteForPlayer(currentPlayer.email)?.voteType === 'UP'
                        ? 'rgb(34, 197, 94)' // green-500
                        : 'rgb(75, 85, 99)', // gray-600
                    }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      console.log(`[VOTING DEBUG] Voto UP per ${currentPlayer.name} (${currentPlayer.email})`);
                      handleVote('UP');
                    }}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      getVoteForPlayer(currentPlayer.email)?.voteType === 'UP'
                        ? 'text-white'
                        : 'text-gray-300 hover:border-green-500 hover:bg-green-600/20'
                    }`}
                  >
                    <ThumbsUp className="w-6 h-6 mx-auto mb-1" />
                    <div className="font-semibold text-sm">UP</div>
                  </motion.button>
                </div>

                {/* ✅ NUOVO: MOTM Button - Separato e opzionale */}
                <div className="mb-6">
                  <motion.button
                    key={`motm-${currentPlayer.email}-${buttonResetKey}`}
                    initial={{ scale: 1, backgroundColor: 'rgb(31, 41, 55)' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      backgroundColor: getVoteForPlayer(currentPlayer.email)?.motmVote 
                        ? 'rgb(251, 191, 36)' // amber-400
                        : 'rgb(31, 41, 55)', // gray-800
                      borderColor: getVoteForPlayer(currentPlayer.email)?.motmVote
                        ? 'rgb(245, 158, 11)' // amber-500
                        : 'rgb(75, 85, 99)', // gray-600
                    }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      console.log(`[VOTING DEBUG] Voto MOTM per ${currentPlayer.name} (${currentPlayer.email})`);
                      handleMotmVote();
                    }}
                    className={`w-full p-3 rounded-xl border-2 transition-all ${
                      getVoteForPlayer(currentPlayer.email)?.motmVote
                        ? 'text-black'
                        : 'text-gray-300 hover:border-amber-400 hover:bg-amber-400/20'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Crown className="w-5 h-5" />
                      <span className="font-semibold">MAN OF THE MATCH</span>
                    </div>
                    <div className="text-xs opacity-75 mt-1">Il migliore in campo (opzionale)</div>
                  </motion.button>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={goToPrevious}
                    disabled={currentPlayerIndex === 0}
                    className={`p-3 rounded-lg transition-colors ${
                      currentPlayerIndex === 0
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="text-gray-400 text-sm">
                    {currentPlayerIndex + 1} di {playersToVote.length}
                  </div>

                  <button
                    onClick={goToNext}
                    disabled={currentPlayerIndex === playersToVote.length - 1}
                    className={`p-3 rounded-lg transition-colors ${
                      currentPlayerIndex === playersToVote.length - 1
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex-shrink-0">
          {/* Submit Button */}
          {isComplete && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Invio voti...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Invia Tutti i Voti
                </>
              )}
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
} 