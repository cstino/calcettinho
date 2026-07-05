'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import Navigation from "../../components/Navigation";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from "../../components/ProtectedRoute";
import AnimatedCard from '../../components/card/AnimatedCard';
import { CardFrame, FRAMES, isFrameId, type FrameId } from '../../components/card/frames';
import { getPlayerPhotoUrl } from '@/utils/api';
import { RANKED_MIN_MATCHES, tierLabel, type CardTier } from '@/utils/playerRating';
import '../../components/card/card-tiers.css';

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

interface PlayerStats {
  gol: number;
  partiteDisputate: number;
  partiteVinte: number;
  partitePareggiate: number;
  partitePerse: number;
  assistenze: number;
  cartelliniGialli: number;
  cartelliniRossi: number;
}

interface VoteHistory {
  statistics: {
    ranked: boolean;
    rkMatches: number;
    difAvg: number;
    porAvg: number;
    mvpAvg: number;
    ratingsReceived: number;
    actualMotm: number;
  };
  matchResults: Array<{
    matchId: string;
    difAvg: number;
    porAvg: number;
    mvpAvg: number;
    ratingsCount: number;
    isMotm: boolean;
    date: string;
  }>;
}

interface PlayerAward {
  id: string;
  awardType: string;
  matchId: string;
  status: 'pending' | 'unlocked';
  unlockedAt: string;
  selected: boolean;
}

interface PlayerAwards {
  total: number;
  pending: number;
  unlocked: number;
  awards: PlayerAward[];
  pendingAwards: PlayerAward[];
  unlockedAwards: PlayerAward[];
  selectedCard: PlayerAward | null;
}

// Gradient hero per tier (stessi colori del design card approvato)
const TIER_HERO: Record<CardTier, string> = {
  unranked: 'linear-gradient(165deg, #1A1D21, #0B0D0F 78%)',
  bronzo: 'linear-gradient(165deg, #241409, #0E0703 78%)',
  argento: 'linear-gradient(165deg, #181D24, #090B0F 78%)',
  oro: 'linear-gradient(165deg, #231A07, #0D0902 78%)',
  platino: 'linear-gradient(165deg, #0D1C21, #040B0E 78%)',
  champion: 'linear-gradient(165deg, #1C0A2B, #08020F 78%)',
};
const TIER_ACCENT: Record<CardTier, string> = {
  unranked: '#8A97A1',
  bronzo: '#F5B570',
  argento: '#EEF4F9',
  oro: '#FFDF7E',
  platino: '#D8FFF8',
  champion: '#FF8BDF',
};

// Ordine catalogo cornici nella sezione collezione
const FRAME_CATALOG: FrameId[] = [
  '1presenza', 'motm',
  'goleador', 'matador', 'goldenboot',
  'assistman', 'regista', 'elfutbol',
  'win10', 'win25', 'win50',
];

// Progresso milestone (sui contatori storici, come nel sistema attuale)
const PROGRESS_MAP: Record<string, { field: keyof PlayerStats; required: number; description: string }> = {
  goleador: { field: 'gol', required: 10, description: 'Segna 10 gol in carriera' },
  matador: { field: 'gol', required: 25, description: 'Segna 25 gol in carriera' },
  goldenboot: { field: 'gol', required: 50, description: 'Segna 50 gol in carriera' },
  assistman: { field: 'assistenze', required: 10, description: 'Fornisci 10 assist in carriera' },
  regista: { field: 'assistenze', required: 25, description: 'Fornisci 25 assist in carriera' },
  elfutbol: { field: 'assistenze', required: 50, description: 'Fornisci 50 assist in carriera' },
  win10: { field: 'partiteVinte', required: 10, description: 'Vinci 10 partite' },
  win25: { field: 'partiteVinte', required: 25, description: 'Vinci 25 partite' },
  win50: { field: 'partiteVinte', required: 50, description: 'Vinci 50 partite' },
  '1presenza': { field: 'partiteDisputate', required: 1, description: 'Gioca la tua prima partita' },
};

// Anteprima cornice: effetto applicato su una mini-card neutra scura
function FramePreview({ frame }: { frame: FrameId }) {
  return (
    <div className="pcard-wrap">
      <div className="pcard tier-unranked" style={{ overflow: 'hidden' }}>
        <div className="cbg" />
      </div>
      <CardFrame frame={frame} />
    </div>
  );
}

export default function PlayerProfile() {
  const params = useParams();
  const { userEmail } = useAuth();
  const { markEvolutionsAsSeen, checkForNewEvolutions } = useNotifications();

  const [player, setPlayer] = useState<ApiPlayer | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteHistory | null>(null);
  const [playerAwards, setPlayerAwards] = useState<PlayerAwards | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [unlockingFrame, setUnlockingFrame] = useState<FrameId | null>(null);
  const [selectModal, setSelectModal] = useState<FrameId | null>(null);
  const [progressModal, setProgressModal] = useState<FrameId | null>(null);
  const [busy, setBusy] = useState(false);

  const email = typeof params.email === 'string' ? decodeURIComponent(params.email) : '';
  const isOwner = userEmail === email;

  // Marca le notifiche come viste sul proprio profilo
  useEffect(() => {
    if (isOwner && playerAwards && playerAwards.pending > 0) {
      const timer = setTimeout(() => markEvolutionsAsSeen(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOwner, playerAwards, markEvolutionsAsSeen]);

  const fetchAll = useCallback(async () => {
    if (!email) {
      setError('Email non valida');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const [playersRes, statsRes, historyRes, awardsRes] = await Promise.all([
        fetch('/api/players'),
        fetch(`/api/player-stats/${encodeURIComponent(email)}`),
        fetch(`/api/votes/history/${encodeURIComponent(email)}`),
        fetch(`/api/player-awards/${encodeURIComponent(email)}`),
      ]);

      if (!playersRes.ok) throw new Error('Errore nel caricamento del giocatore');

      const players: ApiPlayer[] = await playersRes.json();
      const found = players.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (!found) throw new Error('Giocatore non trovato');
      setPlayer(found);

      if (statsRes.ok) setPlayerStats(await statsRes.json());
      if (historyRes.ok) {
        const h = await historyRes.json();
        if (h.success) setVoteHistory(h);
      }
      if (awardsRes.ok) setPlayerAwards(await awardsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── cornici: helpers ── */
  const isUnlocked = (id: FrameId) => playerAwards?.unlockedAwards.some((a) => a.awardType === id) || false;
  const isPending = (id: FrameId) => playerAwards?.pendingAwards.some((a) => a.awardType === id) || false;
  const isSelected = (id: FrameId) => playerAwards?.selectedCard?.awardType === id || false;

  const getProgress = (id: FrameId) => {
    const cfg = PROGRESS_MAP[id];
    if (!cfg) return { current: 0, required: 0, description: FRAMES[id].description };
    const current = playerStats ? playerStats[cfg.field] || 0 : 0;
    return { current, required: cfg.required, description: cfg.description };
  };

  const handleUnlock = async (award: PlayerAward) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/player-awards/${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardId: award.id }),
      });
      const data = await res.json();
      if (data.success) {
        if (isFrameId(award.awardType)) {
          setUnlockingFrame(award.awardType);
          setShowUnlockAnimation(true);
          setTimeout(() => setShowUnlockAnimation(false), 3000);
        }
        await fetchAll();
        checkForNewEvolutions();
      } else {
        alert(`Errore nello sblocco: ${data.error}`);
      }
    } catch {
      alert('Errore di rete nello sblocco');
    } finally {
      setBusy(false);
    }
  };

  const handleSelectFrame = async (frameId: FrameId | null) => {
    if (busy) return;
    setBusy(true);
    try {
      const awardId = frameId ? playerAwards?.unlockedAwards.find((a) => a.awardType === frameId)?.id ?? null : null;
      const res = await fetch(`/api/player-awards/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAll();
        setSelectModal(null);
      } else {
        alert(`Errore nella selezione: ${data.error}`);
      }
    } catch {
      alert('Errore di rete nella selezione');
    } finally {
      setBusy(false);
    }
  };

  /* ── dati derivati ── */
  const accent = player ? TIER_ACCENT[player.tier] : '#8A97A1';
  const radarData = player
    ? [
        { stat: 'ATT', value: player.ATT },
        { stat: 'PAS', value: player.PAS },
        { stat: 'POR', value: player.POR },
        { stat: 'DIF', value: player.DIF },
      ]
    : [];

  const winPct = playerStats && playerStats.partiteDisputate > 0
    ? Math.round((playerStats.partiteVinte / playerStats.partiteDisputate) * 100)
    : 0;

  const barMax = playerStats
    ? Math.max(playerStats.gol, playerStats.assistenze, playerStats.partiteDisputate, 1)
    : 1;

  const lastMatch = voteHistory?.matchResults?.[0] || null;

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
            <p className="text-gray-200 mt-4 font-runtime">Caricamento profilo...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !player) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-red-400 font-runtime">{error || 'Giocatore non trovato'}</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10">
          <Navigation />

          {/* ═══ HERO ═══ */}
          <section
            className="relative overflow-hidden"
            style={{ background: TIER_HERO[player.tier], paddingTop: 'max(80px, env(safe-area-inset-top, 0px) + 56px)' }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(55% 45% at 22% 16%, color-mix(in srgb, ${accent} 20%, transparent), transparent 70%), repeating-linear-gradient(118deg, rgba(255,255,255,.02) 0 1px, transparent 1px 7px)`,
              }}
            />
            <div className="relative max-w-5xl mx-auto px-5 sm:px-8 pb-0 flex items-end justify-between gap-4">
              <div className="pb-8">
                <h1
                  className="text-white text-4xl sm:text-5xl uppercase leading-none"
                  style={{ fontFamily: 'var(--font-russo)', textShadow: '0 2px 14px rgba(0,0,0,.6)' }}
                >
                  {player.nome}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <span
                    className="px-3 py-1.5 rounded-lg text-sm font-bold tracking-widest bg-white/95"
                    style={{ fontFamily: 'var(--font-chakra)', color: '#0B0D12' }}
                  >
                    {player.ranked ? `OVR ${player.overall}` : 'UNRANKED'}
                  </span>
                  <span
                    className="px-3 py-1.5 rounded-lg text-sm font-bold tracking-widest border border-white/25 bg-black/35 text-white"
                    style={{ fontFamily: 'var(--font-chakra)' }}
                  >
                    {tierLabel(player.tier).toUpperCase()}
                  </span>
                  {isFrameId(player.selectedFrame) && (
                    <span
                      className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider border bg-black/35"
                      style={{ fontFamily: 'var(--font-chakra)', color: accent, borderColor: `color-mix(in srgb, ${accent} 40%, transparent)` }}
                    >
                      ✦ {FRAMES[player.selectedFrame].label.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-40 sm:w-52 flex-none -mb-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPlayerPhotoUrl(player.email)}
                  alt={player.nome}
                  className="w-full drop-shadow-[0_12px_24px_rgba(0,0,0,.6)]"
                />
              </div>
            </div>
          </section>

          <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 space-y-10">

            {/* ═══ LA CARD ═══ */}
            <section>
              <div className="max-w-[290px] mx-auto">
                <AnimatedCard
                  name={player.nome}
                  email={player.email}
                  stats={player}
                  frame={player.selectedFrame}
                  enableHover={false}
                />
              </div>
            </section>

            {/* ═══ OVERVIEW ═══ */}
            <section className="rounded-3xl border border-white/10 bg-[#0F1116] p-6 sm:p-8">
              <h2 className="text-gray-400 text-xs font-bold tracking-[.26em] uppercase mb-6 flex items-center gap-3" style={{ fontFamily: 'var(--font-chakra)' }}>
                Overview <span className="flex-1 h-px bg-white/10" />
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-8 items-center">
                <div className="space-y-4">
                  {[
                    { label: 'Gol', value: playerStats?.gol || 0, color: '#FF6B6B' },
                    { label: 'Assist', value: playerStats?.assistenze || 0, color: '#5EC8F2' },
                    { label: 'Partite', value: playerStats?.partiteDisputate || 0, color: '#C084FC' },
                    { label: 'Vittorie', value: playerStats?.partiteVinte || 0, color: '#4ADE80' },
                  ].map((bar) => (
                    <div key={bar.label}>
                      <div className="flex justify-between items-baseline text-sm text-gray-400 mb-1.5">
                        <span>{bar.label}</span>
                        <b className="text-white text-base tabular-nums" style={{ fontFamily: 'var(--font-chakra)' }}>{bar.value}</b>
                      </div>
                      <div className="relative h-1.5 rounded-full bg-white/[.07]">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${Math.min(100, (bar.value / barMax) * 100)}%`,
                            background: `linear-gradient(90deg, color-mix(in srgb, ${bar.color} 55%, transparent), ${bar.color})`,
                          }}
                        >
                          <span
                            className="absolute -right-1 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full"
                            style={{ background: bar.color, boxShadow: `0 0 8px ${bar.color}` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* anello % vittorie */}
                <div className="relative w-[130px] h-[130px] mx-auto">
                  <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90 overflow-visible">
                    <circle cx="24" cy="24" r="20" pathLength={100} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="5.5" />
                    <circle
                      cx="24" cy="24" r="20" pathLength={100} fill="none"
                      stroke="url(#winGrad)" strokeWidth="5.5" strokeLinecap="round"
                      strokeDasharray={`${winPct} 100`}
                      style={{ filter: 'drop-shadow(0 0 5px rgba(62,207,110,.5))', transition: 'stroke-dasharray 1.2s cubic-bezier(.16,1,.3,1)' }}
                    />
                    <defs>
                      <linearGradient id="winGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#7CE8A4" />
                        <stop offset="1" stopColor="#2BA659" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                      <b className="block text-white text-2xl leading-none" style={{ fontFamily: 'var(--font-russo)' }}>{winPct}%</b>
                      <span className="block text-gray-400 text-[10px] tracking-[.24em] mt-1" style={{ fontFamily: 'var(--font-chakra)' }}>VITTORIE</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* riga secondaria */}
              <div className="grid grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/10 text-center">
                {[
                  { label: 'Pareggi', value: playerStats?.partitePareggiate || 0 },
                  { label: 'Sconfitte', value: playerStats?.partitePerse || 0 },
                  { label: 'Gialli', value: playerStats?.cartelliniGialli || 0 },
                  { label: 'Rossi', value: playerStats?.cartelliniRossi || 0 },
                ].map((s) => (
                  <div key={s.label}>
                    <b className="block text-white text-xl tabular-nums" style={{ fontFamily: 'var(--font-chakra)' }}>{s.value}</b>
                    <span className="text-gray-500 text-xs">{s.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ═══ PERFORMANCE ═══ */}
            <section className="rounded-3xl border border-white/10 bg-[#080A0E] p-6 sm:p-8">
              <h2 className="text-gray-400 text-xs font-bold tracking-[.26em] uppercase mb-2 flex items-center gap-3" style={{ fontFamily: 'var(--font-chakra)' }}>
                Performance <span className="flex-1 h-px bg-white/10" />
              </h2>
              {player.ranked ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="72%">
                      <PolarGrid stroke="rgba(255,255,255,.1)" />
                      <PolarAngleAxis
                        dataKey="stat"
                        tick={{ fill: '#8A8F98', fontSize: 12, fontFamily: 'var(--font-chakra)', fontWeight: 700 }}
                      />
                      <PolarRadiusAxis domain={[0, 99]} tick={false} axisLine={false} />
                      <Radar
                        dataKey="value"
                        stroke="#FF2D95"
                        fill="#C13BFF"
                        fillOpacity={0.4}
                        strokeWidth={2}
                        dot={{ fill: '#FF8BDF', r: 3.5 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-white text-lg mb-2" style={{ fontFamily: 'var(--font-russo)' }}>UNRANKED</p>
                  <p className="text-gray-400 text-sm mb-6">
                    Gioca ancora {Math.max(0, RANKED_MIN_MATCHES - player.rkMatches)} partite per ottenere il rank
                  </p>
                  <div className="max-w-xs mx-auto h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500"
                      style={{ width: `${(player.rkMatches / RANKED_MIN_MATCHES) * 100}%`, boxShadow: '0 0 8px rgba(62,207,110,.6)' }}
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-3 tracking-[.28em]" style={{ fontFamily: 'var(--font-chakra)' }}>
                    {player.rkMatches}/{RANKED_MIN_MATCHES} PARTITE
                  </p>
                </div>
              )}
            </section>

            {/* ═══ VOTI RICEVUTI ═══ */}
            <section className="rounded-3xl border border-white/10 bg-[#0F1116] p-6 sm:p-8">
              <h2 className="text-gray-400 text-xs font-bold tracking-[.26em] uppercase mb-6 flex items-center gap-3" style={{ fontFamily: 'var(--font-chakra)' }}>
                Voti ricevuti <span className="flex-1 h-px bg-white/10" />
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-center">
                {[
                  { label: 'MEDIA DIF', value: voteHistory?.statistics.difAvg ?? 0, color: '#5EC8F2' },
                  { label: 'MEDIA POR', value: voteHistory?.statistics.porAvg ?? 0, color: '#FFB454' },
                  { label: 'MEDIA MVP', value: voteHistory?.statistics.mvpAvg ?? 0, color: '#F26DEB' },
                  { label: 'VALUTAZIONI', value: voteHistory?.statistics.ratingsReceived ?? 0, color: '#EDEDEF' },
                  { label: 'MOTM VINTI', value: voteHistory?.statistics.actualMotm ?? 0, color: '#FFD700' },
                ].map((t) => (
                  <div key={t.label} className="rounded-2xl border border-white/10 bg-black/30 py-4 px-2">
                    <b className="block text-2xl tabular-nums" style={{ fontFamily: 'var(--font-russo)', color: t.color }}>
                      {typeof t.value === 'number' && !Number.isInteger(t.value) ? t.value.toFixed(1) : t.value}
                    </b>
                    <span className="text-gray-500 text-[10px] tracking-[.18em]" style={{ fontFamily: 'var(--font-chakra)' }}>{t.label}</span>
                  </div>
                ))}
              </div>

              {lastMatch && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-gray-500 text-xs tracking-[.2em] uppercase mb-3" style={{ fontFamily: 'var(--font-chakra)' }}>
                    Ultima partita {lastMatch.isMotm && <span className="text-yellow-400 ml-2">👑 MOTM</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { tag: 'DIF', value: lastMatch.difAvg, color: '#5EC8F2' },
                      { tag: 'POR', value: lastMatch.porAvg, color: '#FFB454' },
                      { tag: 'MVP', value: lastMatch.mvpAvg, color: '#F26DEB' },
                    ].map((c) => (
                      <span
                        key={c.tag}
                        className="px-3 py-1.5 rounded-lg text-sm font-bold border tabular-nums"
                        style={{
                          fontFamily: 'var(--font-chakra)',
                          color: c.color,
                          background: `color-mix(in srgb, ${c.color} 10%, transparent)`,
                          borderColor: `color-mix(in srgb, ${c.color} 35%, transparent)`,
                        }}
                      >
                        {c.tag} {c.value.toFixed(1)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ═══ CORNICI ═══ */}
            <section className="rounded-3xl border border-white/10 bg-[#0F1116] p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-gray-400 text-xs font-bold tracking-[.26em] uppercase flex items-center gap-3" style={{ fontFamily: 'var(--font-chakra)' }}>
                  Cornici
                </h2>
                <div className="flex items-center gap-2 text-xs" style={{ fontFamily: 'var(--font-chakra)' }}>
                  <span className="px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 font-bold">
                    {playerAwards?.unlocked ?? 0} SBLOCCATE
                  </span>
                  {isOwner && (playerAwards?.pending ?? 0) > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-bold animate-pulse">
                      {playerAwards?.pending} NUOVE!
                    </span>
                  )}
                </div>
              </div>

              {/* Premi in attesa di sblocco (solo owner) */}
              {isOwner && playerAwards && playerAwards.pendingAwards.length > 0 && (
                <div className="mb-8 space-y-3">
                  {playerAwards.pendingAwards.map((award) => (
                    <div key={award.id} className="flex items-center justify-between gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/[.06] px-4 py-3">
                      <div>
                        <p className="text-white font-bold" style={{ fontFamily: 'var(--font-chakra)' }}>
                          {isFrameId(award.awardType) ? FRAMES[award.awardType].label : award.awardType}
                          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-red-500 text-white align-middle">NUOVO</span>
                        </p>
                        <p className="text-gray-400 text-xs">
                          {isFrameId(award.awardType) ? FRAMES[award.awardType].description : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnlock(award)}
                        disabled={busy}
                        className="flex-none px-4 py-2 rounded-xl text-sm font-bold text-black bg-gradient-to-b from-yellow-300 to-amber-500 shadow-[0_0_18px_-4px_rgba(255,200,0,.6)] active:scale-95 transition-transform disabled:opacity-50"
                        style={{ fontFamily: 'var(--font-chakra)' }}
                      >
                        🎉 Sblocca
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Griglia cornici */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Nessuna cornice (card base) */}
                <button
                  onClick={() => (isOwner ? handleSelectFrame(null) : undefined)}
                  className={`text-left rounded-2xl border p-3 transition-colors ${
                    !player.selectedFrame ? 'border-green-400/60 bg-green-500/[.06]' : 'border-white/10 bg-black/30 hover:border-white/25'
                  } ${isOwner ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="pcard-wrap mb-2">
                    <div className="pcard tier-unranked"><div className="cbg" /></div>
                  </div>
                  <p className="text-white text-sm font-bold" style={{ fontFamily: 'var(--font-chakra)' }}>Nessuna cornice</p>
                  <p className="text-gray-500 text-xs">Card pulita{!player.selectedFrame ? ' · ATTIVA' : ''}</p>
                </button>

                {FRAME_CATALOG.map((id) => {
                  const unlocked = isUnlocked(id);
                  const pending = isPending(id);
                  const selected = isSelected(id);
                  const progress = getProgress(id);
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        if (unlocked && isOwner) setSelectModal(id);
                        else if (!unlocked && !pending) setProgressModal(id);
                      }}
                      className={`relative text-left rounded-2xl border p-3 transition-colors cursor-pointer ${
                        selected
                          ? 'border-green-400/60 bg-green-500/[.06]'
                          : unlocked
                            ? 'border-white/15 bg-black/30 hover:border-white/30'
                            : 'border-white/10 bg-black/40 hover:border-white/20'
                      }`}
                    >
                      <div className={`mb-2 ${unlocked || pending ? '' : 'opacity-35 saturate-50'}`}>
                        <FramePreview frame={id} />
                      </div>
                      {!unlocked && !pending && (
                        <span className="absolute top-5 right-5 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </span>
                      )}
                      {selected && (
                        <span className="absolute top-5 right-5 text-[10px] px-2 py-0.5 rounded-full bg-green-500 text-black font-bold" style={{ fontFamily: 'var(--font-chakra)' }}>
                          ATTIVA
                        </span>
                      )}
                      <p className="text-white text-sm font-bold" style={{ fontFamily: 'var(--font-chakra)' }}>{FRAMES[id].label}</p>
                      <p className="text-gray-500 text-xs">{FRAMES[id].description}</p>
                      {!unlocked && !pending && progress.required > 0 && (
                        <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gray-400"
                            style={{ width: `${Math.min(100, (progress.current / progress.required) * 100)}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ═══ Modal selezione cornice ═══ */}
          <AnimatePresence>
            {selectModal && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectModal(null)}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0F1116] p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-white text-lg mb-1" style={{ fontFamily: 'var(--font-russo)' }}>
                    {FRAMES[selectModal].label.toUpperCase()}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">{FRAMES[selectModal].description}</p>
                  <div className="max-w-[240px] mx-auto mb-5">
                    <AnimatedCard
                      name={player.nome}
                      email={player.email}
                      stats={player}
                      frame={selectModal}
                      enableHover={false}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectModal(null)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-white text-sm font-bold"
                      style={{ fontFamily: 'var(--font-chakra)' }}
                    >
                      Annulla
                    </button>
                    <button
                      onClick={() => handleSelectFrame(isSelected(selectModal) ? null : selectModal)}
                      disabled={busy}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-[#06210F] bg-gradient-to-b from-[#4BDB7E] to-[#2BA659] disabled:opacity-60"
                      style={{ fontFamily: 'var(--font-chakra)' }}
                    >
                      {isSelected(selectModal) ? 'Rimuovi' : '✅ Attiva'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ═══ Modal progresso ═══ */}
          <AnimatePresence>
            {progressModal && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setProgressModal(null)}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0F1116] p-6 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-white text-lg mb-1" style={{ fontFamily: 'var(--font-russo)' }}>
                    {FRAMES[progressModal].label.toUpperCase()}
                  </h3>
                  <p className="text-gray-400 text-sm mb-5">{getProgress(progressModal).description}</p>
                  {(() => {
                    const p = getProgress(progressModal);
                    const pct = p.required > 0 ? Math.min(100, (p.current / p.required) * 100) : 0;
                    return (
                      <>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-gray-300 text-sm tabular-nums mb-5" style={{ fontFamily: 'var(--font-chakra)' }}>
                          {p.current} / {p.required}
                        </p>
                      </>
                    );
                  })()}
                  <button
                    onClick={() => setProgressModal(null)}
                    className="px-6 py-2.5 rounded-xl border border-white/15 text-white text-sm font-bold"
                    style={{ fontFamily: 'var(--font-chakra)' }}
                  >
                    Chiudi
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ═══ Animazione sblocco ═══ */}
          <AnimatePresence>
            {showUnlockAnimation && unlockingFrame && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="relative w-56 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping" />
                    <FramePreview frame={unlockingFrame} />
                  </div>
                  <motion.p
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-white text-2xl"
                    style={{ fontFamily: 'var(--font-russo)' }}
                  >
                    CORNICE SBLOCCATA!
                  </motion.p>
                  <p className="text-yellow-400 mt-2 font-bold" style={{ fontFamily: 'var(--font-chakra)' }}>
                    {FRAMES[unlockingFrame].label}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-20 sm:h-8"></div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
