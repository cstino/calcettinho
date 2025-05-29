'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import Logo from "../components/Logo";
import { Mail, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Inserisci la tua email');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await login(email.trim());
      
      if (success) {
        router.push('/'); // Redirect alla home page dopo il login
      } else {
        setError('Email non autorizzata. Contatta un amministratore per richiedere l\'accesso.');
      }
    } catch (error) {
      setError('Errore durante il login. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gray-900 relative flex items-center justify-center"
      style={{
        backgroundImage: 'url("/stadium-background.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay per migliorare la leggibilità */}
      <div className="absolute inset-0 bg-black/70"></div>

      {/* Contenuto principale */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
          
          {/* Logo e Titolo */}
          <div className="text-center mb-8">
            <Logo
              type="simbolo"
              width={80}
              height={80}
              className="mx-auto mb-6 w-20 h-20 drop-shadow-lg"
            />
            
            <h1 className="text-3xl font-bold font-runtime text-white mb-2">
              Accedi a{" "}
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Calcettinho
              </span>
            </h1>
            
            <p className="text-gray-300 font-runtime">
              Solo i membri invitati possono accedere
            </p>
          </div>

          {/* Form di Login */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Campo Email */}
            <div>
              <label htmlFor="email" className="block text-white font-runtime font-semibold mb-2">
                <Mail className="inline w-4 h-4 mr-2" />
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="inserisci la tua email..."
                className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 font-runtime focus:outline-none focus:ring-2 focus:ring-green-400 border border-gray-600 transition-all"
                disabled={isLoading}
              />
            </div>

            {/* Messaggio di Errore */}
            {error && (
              <div className="bg-red-900/50 border border-red-400 rounded-lg p-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-red-400 font-runtime text-sm">{error}</p>
              </div>
            )}

            {/* Bottone Login */}
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors font-runtime font-semibold flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                  Verifica in corso...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Accedi
                </>
              )}
            </button>
          </form>

          {/* Informazioni aggiuntive */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm font-runtime">
              Non hai accesso?{" "}
              <button 
                onClick={() => {/* TODO: Implementa richiesta accesso */}}
                className="text-green-400 hover:text-green-300 underline"
              >
                Richiedi l'invito
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 