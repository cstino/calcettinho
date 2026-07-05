'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import RatingPicker from './RatingPicker';
import { getPlayerPhotoUrl } from '@/utils/api';

interface Player {
  name: string;
  email: string;
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

// v3: tre voti 1-10 per giocatore (DIF, POR, MVP)
interface PlayerRatings {
  dif?: number;
  por?: number;
  mvp?: number;
}

interface VotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  voterEmail: string;
  allPlayers: Player[];
  onSuccess: () => void;
}

const RATE_KINDS = [
  { key: 'dif' as const, tag: 'DIF', label: 'Prestazione difensiva', color: '#5EC8F2' },
  { key: 'por' as const, tag: 'POR', label: 'Prestazione in porta', color: '#FFB454' },
  { key: 'mvp' as const, tag: 'MVP', label: 'Impatto sulla partita', color: '#F26DEB' },
];

export default function VotingModal({
  isOpen,
  onClose,
  match,
  voterEmail,
  allPlayers,
  onSuccess,
}: VotingModalProps) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [votes, setVotes] = useState<Record<string, PlayerRatings>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playersToVote = useMemo(() => {
    return match
      ? allPlayers.filter(
          (player) => [...match.teamA, ...match.teamB].includes(player.email) && player.email !== voterEmail
        )
      : [];
  }, [match, allPlayers, voterEmail]);

  // Reset quando si apre il modal
  useEffect(() => {
    if (isOpen) {
      setCurrentPlayerIndex(0);
      setVotes({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
  }, []);

  const currentPlayer = playersToVote[currentPlayerIndex];
  const currentRatings: PlayerRatings = (currentPlayer && votes[currentPlayer.email]) || {};

  const isPlayerComplete = (email: string) => {
    const r = votes[email];
    return !!r && r.dif != null && r.por != null && r.mvp != null;
  };

  const completedCount = playersToVote.filter((p) => isPlayerComplete(p.email)).length;
  const isComplete = playersToVote.length > 0 && completedCount === playersToVote.length;

  const setRating = (kind: 'dif' | 'por' | 'mvp', value: number) => {
    if (!currentPlayer) return;
    const email = currentPlayer.email;

    setVotes((prev) => {
      const next = { ...prev, [email]: { ...prev[email], [kind]: value } };

      // Auto-advance quando i 3 voti del giocatore corrente sono completi
      const r = next[email];
      if (r.dif != null && r.por != null && r.mvp != null && currentPlayerIndex < playersToVote.length - 1) {
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = setTimeout(() => {
          setCurrentPlayerIndex((i) => Math.min(i + 1, playersToVote.length - 1));
        }, 550);
      }
      return next;
    });
  };

  const goPrev = () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setCurrentPlayerIndex((i) => Math.max(0, i - 1));
  };
  const goNext = () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setCurrentPlayerIndex((i) => Math.min(playersToVote.length - 1, i + 1));
  };

  const handleSubmit = async () => {
    if (!match || !isComplete || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        voterEmail,
        matchId: match.matchId,
        votes: playersToVote.map((p) => ({
          playerEmail: p.email,
          difRating: votes[p.email].dif,
          porRating: votes[p.email].por,
          mvpRating: votes[p.email].mvp,
        })),
      };

      const response = await fetch('/api/votes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else if (data.code === 'ALREADY_VOTED') {
        alert('Hai già votato per questa partita!');
        onClose();
      } else {
        alert(`Errore nell'invio dei voti: ${data.error || 'Errore sconosciuto'}`);
      }
    } catch (error) {
      console.error("Errore nell'invio dei voti:", error);
      alert("Errore di rete nell'invio dei voti. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0F1116] shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_30px_60px_-30px_rgba(0,0,0,.9)] overflow-hidden"
      >
        {/* Header: progress */}
        <div className="px-6 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-lg font-bold" style={{ fontFamily: 'var(--font-russo)' }}>
              VOTA LA PARTITA
            </h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500"
                style={{ width: `${(completedCount / Math.max(1, playersToVote.length)) * 100}%` }}
              />
            </div>
            <span
              className="text-sm font-bold text-green-400 tabular-nums"
              style={{ fontFamily: 'var(--font-chakra)' }}
            >
              {completedCount}/{playersToVote.length}
            </span>
          </div>
        </div>

        {/* Corpo: giocatore corrente */}
        <div className="px-6 py-5 min-h-[340px]">
          <AnimatePresence mode="wait">
            {currentPlayer && (
              <motion.div
                key={currentPlayer.email}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Testa giocatore */}
                <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-none border border-white/15 bg-gradient-to-b from-[#2A2416] to-[#0D0902]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getPlayerPhotoUrl(currentPlayer.email)}
                      alt={currentPlayer.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div>
                    <h3 className="text-white text-xl leading-tight" style={{ fontFamily: 'var(--font-russo)' }}>
                      {currentPlayer.name.toUpperCase()}
                    </h3>
                    <p className="text-gray-400 text-sm">Valuta la sua prestazione</p>
                  </div>
                  {isPlayerComplete(currentPlayer.email) && (
                    <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/30" style={{ fontFamily: 'var(--font-chakra)' }}>
                      COMPLETO
                    </span>
                  )}
                </div>

                {/* Tre voti */}
                {RATE_KINDS.map(({ key, tag, label, color }) => (
                  <div key={key} className="mt-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="text-[11px] font-bold tracking-[.16em] px-2.5 py-1 rounded-md border"
                        style={{
                          fontFamily: 'var(--font-chakra)',
                          color,
                          background: `color-mix(in srgb, ${color} 12%, transparent)`,
                          borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
                        }}
                      >
                        {tag}
                      </span>
                      <span className="text-gray-400 text-xs">{label}</span>
                    </div>
                    <RatingPicker
                      value={currentRatings[key] ?? null}
                      onChange={(v) => setRating(key, v)}
                      accentColor={color}
                    />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer: navigazione + invio */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={currentPlayerIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/15 text-white text-sm font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
            style={{ fontFamily: 'var(--font-chakra)' }}
          >
            <ChevronLeft className="w-4 h-4" /> Indietro
          </button>

          {isComplete ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 max-w-[220px] px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider text-[#06210F] bg-gradient-to-b from-[#4BDB7E] to-[#2BA659] shadow-[0_0_22px_-6px_rgba(62,207,110,.7),inset_0_1px_0_rgba(255,255,255,.35)] disabled:opacity-60 active:scale-95 transition-transform"
              style={{ fontFamily: 'var(--font-chakra)' }}
            >
              {isSubmitting ? 'Invio…' : 'Invia i voti'}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={currentPlayerIndex >= playersToVote.length - 1}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/15 text-white text-sm font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
              style={{ fontFamily: 'var(--font-chakra)' }}
            >
              Avanti <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
