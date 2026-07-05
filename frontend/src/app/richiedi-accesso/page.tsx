'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
import { Mail, User, AtSign, Camera, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RichiediAccessoPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !fullName.trim() || !username.trim()) {
      setError('Compila tutti i campi');
      return;
    }
    if (!/^[A-Za-z0-9_]{2,12}$/.test(username.trim())) {
      setError('Username non valido: 2-12 caratteri, solo lettere, numeri e underscore');
      return;
    }
    if (!photoFile) {
      setError('Carica una foto');
      return;
    }

    setStatus('loading');
    try {
      const form = new FormData();
      form.append('email', email.trim());
      form.append('fullName', fullName.trim());
      form.append('username', username.trim());
      form.append('photo', photoFile);

      const res = await fetch('/api/registration/request', { method: 'POST', body: form });
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
    <div className="min-h-screen bg-black relative flex items-center justify-center py-10">
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
            <p className="text-gray-300 font-runtime text-sm">
              Un amministratore valuterà la tua richiesta: se accettata, il tuo profilo sarà creato subito
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
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-white font-runtime font-semibold mb-2 text-sm">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tua@email.com"
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 font-runtime"
                  disabled={status === 'loading'}
                />
              </div>

              <div>
                <label className="block text-white font-runtime font-semibold mb-2 text-sm">
                  <User className="inline w-4 h-4 mr-1" />
                  Nome e cognome
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Mario Rossi"
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 font-runtime"
                  disabled={status === 'loading'}
                />
              </div>

              <div>
                <label className="block text-white font-runtime font-semibold mb-2 text-sm">
                  <AtSign className="inline w-4 h-4 mr-1" />
                  Username (visibile sulla tua card)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="MarioR"
                  maxLength={12}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 font-runtime"
                  disabled={status === 'loading'}
                />
                <p className="text-right text-xs text-gray-500 mt-1 font-runtime">{username.length}/12</p>
              </div>

              <div>
                <label className="block text-white font-runtime font-semibold mb-2 text-sm">
                  <Camera className="inline w-4 h-4 mr-1" />
                  Foto
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={status === 'loading'}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-4 px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-left hover:bg-gray-700/70 transition-colors"
                >
                  {photoPreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={photoPreview} alt="Anteprima" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                      <Camera className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <span className="text-gray-300 font-runtime text-sm">
                    {photoFile ? photoFile.name : 'Scegli una foto'}
                  </span>
                </button>
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
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
