'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminGuard } from '../hooks/useAdminGuard';
import Navigation from '../components/Navigation';
import { Shield, Users, Trophy, Settings } from 'lucide-react';

export default function AdminPanel() {
  const { isAdmin, isLoading, user } = useAdminGuard();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      // Redirect non-admin users
      router.push('/');
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Verificando autorizzazioni...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Accesso Negato</h1>
          <p>Non hai i permessi per accedere a questa pagina.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-green-400" />
              <h1 className="text-4xl font-bold text-white font-runtime">
                Pannello Admin
              </h1>
            </div>
            <p className="text-gray-300">
              Benvenuto, {user?.email} - Ruolo: <span className="text-green-400 font-semibold">{user?.role}</span>
            </p>
          </div>

          {/* Admin Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Gestione Utenti */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-green-500 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-semibold text-white">Gestione Utenti</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Gestisci i ruoli e le autorizzazioni degli utenti registrati.
              </p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                Vai alla Gestione
              </button>
            </div>

            {/* Statistiche Sistema */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-green-500 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl font-semibold text-white">Statistiche</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Visualizza statistiche generali del sistema e performance.
              </p>
              <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors">
                Vedi Statistiche
              </button>
            </div>

            {/* Configurazioni */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-green-500 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-semibold text-white">Configurazioni</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Modifica le impostazioni generali del sistema.
              </p>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                Configura Sistema
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">Stato del Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">✅</div>
                <div className="text-sm text-gray-400">Database</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">✅</div>
                <div className="text-sm text-gray-400">API Airtable</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">✅</div>
                <div className="text-sm text-gray-400">Sistema Votazioni</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 