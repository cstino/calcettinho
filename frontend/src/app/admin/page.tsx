'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Navigation from '../components/Navigation';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAdminGuard } from '../hooks/useAdminGuard';
import { useAuth } from '../contexts/AuthContext';
import { getPlayerPhotoUrl } from '@/utils/api';
import VotingModal from '../components/VotingModal';
import {
  Inbox, UserCog, Image as ImageIcon, FlaskConical,
  Check, X, Camera, Trash2, Play, Loader2,
} from 'lucide-react';

type Tab = 'richieste' | 'registrazioni' | 'foto' | 'sandbox';

const TABS: { id: Tab; label: string; icon: typeof Inbox }[] = [
  { id: 'richieste', label: 'Richieste', icon: Inbox },
  { id: 'registrazioni', label: 'Registrazioni', icon: UserCog },
  { id: 'foto', label: 'Foto giocatori', icon: ImageIcon },
  { id: 'sandbox', label: 'Test votazioni', icon: FlaskConical },
];

export default function AdminPage() {
  const { isAdmin, isLoading } = useAdminGuard();
  const [tab, setTab] = useState<Tab>('richieste');

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10">
          <Navigation />

          <section className="pt-20 lg:pt-24 pb-8 px-4 sm:px-6 lg:px-8" style={{ paddingTop: 'max(80px, env(safe-area-inset-top, 0px) + 50px)' }}>
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold font-runtime text-white mb-6 text-center">Pannello Admin</h1>

              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-10 h-10 text-green-400 animate-spin mx-auto" />
                </div>
              ) : !isAdmin ? (
                <div className="text-center py-12">
                  <p className="text-red-400 font-runtime text-lg">Accesso riservato agli amministratori.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
                    {TABS.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-runtime text-sm font-semibold transition-colors ${
                          tab === id ? 'bg-green-600 text-white' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/60'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {tab === 'richieste' && <RichiesteTab />}
                  {tab === 'registrazioni' && <RegistrazioniTab />}
                  {tab === 'foto' && <FotoTab />}
                  {tab === 'sandbox' && <SandboxTab />}
                </>
              )}
            </div>
          </section>

          <div className="h-20 sm:h-8"></div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

/* ═══════════════════ Tab 1: Richieste di accesso ═══════════════════ */

interface RegistrationRequest {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  raw_photo_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

function RichiesteTab() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/registration-requests');
      const data = await res.json();
      if (data.success) setRequests(data.requests);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/registration-requests/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
      } else {
        alert(`Errore: ${data.error}`);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Rifiutare questa richiesta?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/registration-requests/${id}/reject`, { method: 'POST' });
      const data = await res.json();
      if (data.success) fetchRequests();
      else alert(`Errore: ${data.error}`);
    } finally {
      setBusyId(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const decided = requests.filter((r) => r.status !== 'pending').slice(0, 10);

  if (loading) return <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto" />;

  return (
    <div className="space-y-6">
      {pending.length === 0 ? (
        <p className="text-gray-400 font-runtime text-center py-8">Nessuna richiesta in attesa.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <div key={r.id} className="bg-gray-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {r.raw_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.raw_photo_url} alt={r.username || r.email} className="w-14 h-14 rounded-lg object-cover flex-none" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gray-700 flex-none" />
                )}
                <div className="min-w-0">
                  <p className="text-white font-runtime font-semibold truncate">{r.full_name || r.email}</p>
                  {r.username && <p className="text-green-400 text-sm font-runtime">@{r.username}</p>}
                  <p className="text-gray-400 text-sm font-runtime truncate">{r.email}</p>
                  <p className="text-gray-500 text-xs font-runtime mt-1">{new Date(r.created_at).toLocaleString('it-IT')}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-none">
                <button
                  onClick={() => handleApprove(r.id)}
                  disabled={busyId === r.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-runtime text-sm font-semibold"
                >
                  <Check className="w-4 h-4" /> Accetta
                </button>
                <button
                  onClick={() => handleReject(r.id)}
                  disabled={busyId === r.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600/80 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-runtime text-sm font-semibold"
                >
                  <X className="w-4 h-4" /> Rifiuta
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <div>
          <h3 className="text-gray-400 font-runtime text-sm font-semibold mb-2 mt-8">Storico recente</h3>
          <div className="space-y-2">
            {decided.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm font-runtime text-gray-400 bg-gray-900/50 rounded-lg px-4 py-2">
                <span>{r.email}</span>
                <span className={r.status === 'approved' ? 'text-green-400' : 'text-red-400'}>
                  {r.status === 'approved' ? 'Approvata' : 'Rifiutata'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ Tab 2: Registrazioni da confermare ═══════════════════ */

interface PendingPlayer {
  email: string;
  name: string;
  username: string;
  raw_photo_url: string | null;
  created_at: string;
}

function RegistrazioniTab() {
  const [players, setPlayers] = useState<PendingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pending-players');
      const data = await res.json();
      if (data.success) setPlayers(data.players);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  const handleActivate = async (email: string, file: File) => {
    setBusyEmail(email);
    try {
      const form = new FormData();
      form.append('photo', file);
      const res = await fetch(`/api/admin/pending-players/${encodeURIComponent(email)}/activate`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (data.success) fetchPlayers();
      else alert(`Errore: ${data.error}`);
    } finally {
      setBusyEmail(null);
    }
  };

  if (loading) return <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto" />;

  if (players.length === 0) {
    return <p className="text-gray-400 font-runtime text-center py-8">Nessuna registrazione in attesa di conferma.</p>;
  }

  return (
    <div className="space-y-4">
      {players.map((p) => (
        <div key={p.email} className="bg-gray-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            {p.raw_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.raw_photo_url} alt={p.username} className="w-16 h-16 rounded-lg object-cover flex-none" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-700 flex-none" />
            )}
            <div>
              <p className="text-white font-runtime font-semibold">{p.username}</p>
              <p className="text-gray-400 text-sm font-runtime">{p.email}</p>
            </div>
          </div>
          <div className="flex-none">
            <input
              ref={(el) => { fileInputs.current[p.email] = el; }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleActivate(p.email, file);
              }}
            />
            <button
              onClick={() => fileInputs.current[p.email]?.click()}
              disabled={busyEmail === p.email}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-runtime text-sm font-semibold"
            >
              {busyEmail === p.email ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Carica foto e conferma
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════ Tab 3: Foto giocatori ═══════════════════ */

interface ActivePlayer {
  nome: string;
  email: string;
  foto: string;
}

function FotoTab() {
  const [players, setPlayers] = useState<ActivePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  // Seed con Date.now() (non 0): /api/players/[email] serve la foto con
  // Cache-Control: max-age=3600, quindi se il contatore ripartisse sempre da 0
  // ogni ricarica della pagina richiederebbe lo stesso URL già in cache del
  // browser, mostrando la foto vecchia anche dopo un caricamento riuscito.
  const [cacheBust, setCacheBust] = useState(() => Date.now());
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/players');
        const data = await res.json();
        setPlayers(data.map((p: any) => ({ nome: p.nome, email: p.email, foto: p.foto })));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleReplace = async (email: string, file: File) => {
    setBusyEmail(email);
    try {
      const form = new FormData();
      form.append('photo', file);
      const res = await fetch(`/api/admin/players/${encodeURIComponent(email)}/photo`, {
        method: 'PUT',
        body: form,
      });
      const data = await res.json();
      if (data.success) setCacheBust((c) => c + 1);
      else alert(`Errore: ${data.error}`);
    } finally {
      setBusyEmail(null);
    }
  };

  if (loading) return <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto" />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {players.map((p) => (
        <div key={p.email} className="bg-gray-800/80 rounded-xl p-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${getPlayerPhotoUrl(p.email)}?v=${cacheBust}`}
            alt={p.nome}
            className="w-full aspect-square rounded-lg object-cover mb-2"
          />
          <p className="text-white font-runtime text-sm font-semibold truncate mb-2">{p.nome}</p>
          <input
            ref={(el) => { fileInputs.current[p.email] = el; }}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleReplace(p.email, file);
            }}
          />
          <button
            onClick={() => fileInputs.current[p.email]?.click()}
            disabled={busyEmail === p.email}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 rounded-lg font-runtime text-xs font-semibold"
          >
            {busyEmail === p.email ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            Sostituisci
          </button>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════ Tab 4: Test votazioni (sandbox) ═══════════════════ */

interface SandboxMatch {
  matchId: string;
  teamA: string[];
  teamB: string[];
}

function SandboxTab() {
  const { userEmail } = useAuth();
  const [players, setPlayers] = useState<ActivePlayer[]>([]);
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [creating, setCreating] = useState(false);
  const [sandbox, setSandbox] = useState<SandboxMatch | null>(null);
  const [votedEmails, setVotedEmails] = useState<string[]>([]);
  const [votingAs, setVotingAs] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/players');
      const data = await res.json();
      setPlayers(data);
    })();
  }, []);

  const toggle = (email: string, team: 'A' | 'B') => {
    const setTeam = team === 'A' ? setTeamA : setTeamB;
    const other = team === 'A' ? teamB : teamA;
    if (other.includes(email)) return; // non selezionabile in entrambe le squadre
    setTeam((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]));
  };

  const handleCreate = async () => {
    if (teamA.length === 0 || teamB.length === 0) {
      alert('Seleziona almeno un giocatore per squadra');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/sandbox/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamA, teamB, scoreA, scoreB, playerStats: {} }),
      });
      const data = await res.json();
      if (data.success) {
        setSandbox({ matchId: data.matchId, teamA, teamB });
        setVotedEmails([]);
        setLastResult(null);
      } else {
        alert(`Errore: ${data.error}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleVoteSuccess = () => {
    if (votingAs) setVotedEmails((prev) => [...prev, votingAs]);
    setVotingAs(null);
    setLastResult('Voto registrato. Se tutti i partecipanti hanno votato, la partita si è auto-finalizzata (stessa logica reale).');
  };

  const handleCleanup = async () => {
    if (!sandbox) return;
    if (!confirm('Eliminare la partita di test e ripristinare tutto allo stato precedente?')) return;
    setCleaningUp(true);
    try {
      const res = await fetch(`/api/admin/sandbox/${sandbox.matchId}/cleanup`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSandbox(null);
        setTeamA([]);
        setTeamB([]);
        setVotedEmails([]);
        setLastResult(null);
      } else {
        alert(`Errore: ${data.error}`);
      }
    } finally {
      setCleaningUp(false);
    }
  };

  const nameOf = (email: string) => players.find((p) => p.email === email)?.nome || email;
  const allParticipants = sandbox ? [...sandbox.teamA, ...sandbox.teamB] : [];

  return (
    <div className="space-y-6">
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-300 font-runtime text-sm">
        Crea una partita reale di prova, vota con l&apos;interfaccia vera, poi elimina tutto con un tasto. Nulla resta nel database dopo la pulizia.
      </div>

      {!sandbox ? (
        <div className="bg-gray-800/80 rounded-xl p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {(['A', 'B'] as const).map((team) => (
              <div key={team}>
                <h3 className="text-white font-runtime font-semibold mb-2">Squadra {team}</h3>
                <div className="max-h-56 overflow-y-auto space-y-1 bg-gray-900/50 rounded-lg p-2">
                  {players.map((p) => {
                    const selected = (team === 'A' ? teamA : teamB).includes(p.email);
                    const disabled = (team === 'A' ? teamB : teamA).includes(p.email);
                    return (
                      <label key={p.email} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-runtime ${disabled ? 'opacity-30' : 'cursor-pointer hover:bg-gray-700/50'} ${selected ? 'bg-green-600/20 text-green-300' : 'text-gray-300'}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={disabled}
                          onChange={() => toggle(p.email, team)}
                          className="accent-green-500"
                        />
                        {p.nome}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <label className="text-white font-runtime text-sm">
              Punteggio A:{' '}
              <input
                type="number"
                min={0}
                value={scoreA}
                onChange={(e) => setScoreA(Number(e.target.value))}
                className="w-16 ml-1 px-2 py-1 bg-gray-700 rounded text-white"
              />
            </label>
            <label className="text-white font-runtime text-sm">
              Punteggio B:{' '}
              <input
                type="number"
                min={0}
                value={scoreB}
                onChange={(e) => setScoreB(Number(e.target.value))}
                className="w-16 ml-1 px-2 py-1 bg-gray-700 rounded text-white"
              />
            </label>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-runtime font-semibold"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Crea partita di test
          </button>
        </div>
      ) : (
        <div className="bg-gray-800/80 rounded-xl p-5 space-y-5">
          <p className="text-white font-runtime">
            Partita sandbox creata: <span className="text-green-400">{sandbox.matchId}</span>
          </p>

          <div>
            <h3 className="text-white font-runtime font-semibold mb-2">Vota come...</h3>
            <div className="flex flex-wrap gap-2">
              {allParticipants.map((email) => {
                const voted = votedEmails.includes(email);
                return (
                  <button
                    key={email}
                    onClick={() => setVotingAs(email)}
                    disabled={voted}
                    className={`px-3 py-1.5 rounded-lg font-runtime text-sm font-semibold ${
                      voted ? 'bg-green-600/20 text-green-400 cursor-default' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    {voted ? '✓ ' : ''}{nameOf(email)}
                  </button>
                );
              })}
            </div>
          </div>

          {lastResult && <p className="text-gray-300 font-runtime text-sm">{lastResult}</p>}

          <button
            onClick={handleCleanup}
            disabled={cleaningUp}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600/90 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-runtime font-semibold"
          >
            {cleaningUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Elimina test e ripristina tutto
          </button>
        </div>
      )}

      {sandbox && votingAs && (
        <VotingModal
          isOpen={!!votingAs}
          onClose={() => setVotingAs(null)}
          match={{ id: sandbox.matchId, matchId: sandbox.matchId, teamA: sandbox.teamA, teamB: sandbox.teamB }}
          voterEmail={votingAs}
          allPlayers={players.map((p) => ({ name: p.nome, email: p.email }))}
          onSuccess={handleVoteSuccess}
        />
      )}
    </div>
  );
}
