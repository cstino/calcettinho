'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock, Users } from 'lucide-react';

interface VotingStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  votingData: {
    totalPlayers: number;
    playersVoted: number;
    playersWhoVoted: string[];
    playersWhoHaventVoted: string[];
    hoursElapsed: number;
    isTimeout: boolean;
  } | null;
  allPlayers: { nome: string; email: string }[];
}

export default function VotingStatusModal({
  isOpen,
  onClose,
  matchId,
  votingData,
  allPlayers
}: VotingStatusModalProps) {
  
  const getPlayerName = (email: string): string => {
    if (!email) return 'Giocatore Sconosciuto';
    const player = allPlayers.find(p => p.email === email);
    return player ? player.nome : email.split('@')[0];
  };

  if (!isOpen || !votingData) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-700 max-h-[80vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-runtime text-white">
                Stato Votazioni
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* Progress Info */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-gray-300">
                  <span className="font-bold text-white">{votingData.playersVoted}</span>
                  <span className="text-gray-500"> / </span>
                  <span className="font-bold text-white">{votingData.totalPlayers}</span>
                  <span className="text-gray-400"> giocatori hanno votato</span>
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-400" />
                <span className="text-gray-300">
                  <span className="font-bold text-white">{votingData.hoursElapsed}</span>
                  <span className="text-gray-400"> ore trascorse</span>
                  {votingData.isTimeout && (
                    <span className="ml-2 px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm">
                      TIMEOUT
                    </span>
                  )}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(votingData.playersVoted / votingData.totalPlayers) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Players Lists */}
          <div className="p-6 space-y-6">
            {/* Chi ha votato */}
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Hanno Votato ({votingData.playersVoted})
              </h3>
              <div className="space-y-2">
                {votingData.playersWhoVoted.map((email, index) => (
                  <div key={email} className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-white font-runtime">{getPlayerName(email)}</span>
                    <Check className="w-4 h-4 text-green-400 ml-auto" />
                  </div>
                ))}
              </div>
            </div>

            {/* Chi non ha votato */}
            {votingData.playersWhoHaventVoted.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Non Hanno Votato ({votingData.playersWhoHaventVoted.length})
                </h3>
                <div className="space-y-2">
                  {votingData.playersWhoHaventVoted.map((email, index) => (
                    <div key={email} className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="text-white font-runtime">{getPlayerName(email)}</span>
                      <Clock className="w-4 h-4 text-yellow-400 ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700">
            <div className="text-center text-gray-400 text-sm">
              <p>Partita: <span className="text-white font-mono">{matchId}</span></p>
              {votingData.isTimeout && (
                <p className="text-red-400 mt-2">
                  ⚠️ Tempo limite superato - Le votazioni possono essere forzate
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 