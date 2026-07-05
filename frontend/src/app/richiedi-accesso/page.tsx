'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
import { Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RichiediAccessoPage() {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Inserisci la tua email');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const res = await fetch('/api/registration/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), note: note.trim() || undefined }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus('sent');
      } else {
        setStatus('error');
        setError(data.error || 'Errore sconosciuto');
      }
    } catch {
      setStatus('error');
      setError('Errore di rete, riprova più tardi');
    }
  };

  return (
    <div className="min-h-screen bg-black relative flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <Logo type="simbolo" width={80} height={80} className="mx-auto mb-6 w-20 h-20 drop-shadow-lg" />
            <h1 className="text-3xl font-bold font-runtime text-white mb-2">
              Richiedi{' '}
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                l&apos;accesso
              </span>
            </h1>
            <p className="text-gray-300 font-runtime">
              Manda la tua richiesta: un amministratore la valuterà e ti risponderà via email
            </p>
          </div>

          {status === 'sent' ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-4" />
              <p className="text-white font-runtime text-lg mb-2">Richiesta inviata!</p>
              <p className="text-gray-300 font-runtime text-sm">
                Riceverai una email quando un amministratore l&apos;avrà valutata.
              </p>
              <Link href="/login" className="inline-block mt-6 text-green-400 hover:text-green-300 font-runtime">
                Torna al login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-white font-runtime font-semibold mb-2">
                  <Mail className="inline w-4 h-4 mr-2" />
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tua@email.com"
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 font-runtime"
                  disabled={status === 'loading'}
                />
              </div>

              <div>
                <label htmlFor="note" className="block text-white font-runtime font-semibold mb-2">
                  Nota (facoltativa)
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Es. chi ti ha invitato"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 font-runtime resize-none"
                  disabled={status === 'loading'}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm font-runtime">
                  <AlertCircle className="w-4 h-4 flex-none" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:opacity-60 text-white font-runtime font-semibold rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                {status === 'loading' ? 'Invio...' : 'Invia richiesta'}
              </button>

              <p className="text-center text-sm text-gray-400 font-runtime">
                Hai già un codice? <Link href="/registrati" className="text-green-400 hover:text-green-300">Completa la registrazione</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
