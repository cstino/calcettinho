'use client';

import { useAuth } from './contexts/AuthContext';
import { useNotifications } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Link from "next/link";
import Navigation from "./components/Navigation";
import Logo from "./components/Logo";

export default function Home() {
  const { loading, userEmail } = useAuth();
  const { hasUnseenEvolutions, evolutionCount } = useNotifications();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
          <p className="text-gray-200 mt-4 font-runtime">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div 
        className="min-h-screen bg-gray-900 relative"
        style={{
          backgroundImage: 'url("/stadium-background.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Overlay per migliorare la leggibilità */}
        <div className="absolute inset-0 bg-black/60"></div>

        {/* Contenuto principale */}
        <div className="relative z-10">
          <Navigation />
          
          {/* Hero Section */}
          <section className="relative py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              {/* Immagine principale al posto del logo e del testo */}
              <div className="mb-8">
                <img 
                  src="/images/heroes/sfondo%20calc.png"
                  alt="Calcettinho - Lega di Calcetto"
                  className="mx-auto w-full max-w-4xl h-auto drop-shadow-lg rounded-lg"
                />
              </div>
              
              <p className="text-xl font-runtime text-gray-200 mb-8 max-w-2xl mx-auto drop-shadow-md">
                Lega di calcetto 5v5. Organizza partite, vota i tuoi amici e osserva le statistiche evolvere nel tempo.
              </p>
            </div>
          </section>

          {/* Banner Evoluzioni */}
          {hasUnseenEvolutions && userEmail && (
            <section className="py-8 px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto">
                <Link href={`/profile/${encodeURIComponent(userEmail)}`}>
                  <div className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white p-6 rounded-xl shadow-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 border border-yellow-400/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center animate-pulse">
                          <span className="text-3xl">🏆</span>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold font-runtime mb-1">
                            Nuove Evoluzioni Disponibili!
                          </h3>
                          <p className="text-yellow-100 font-runtime">
                            Hai {evolutionCount} evoluzion{evolutionCount === 1 ? 'e' : 'i'} pronte da sbloccare nel tuo profilo
                          </p>
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        <svg className="w-8 h-8 text-yellow-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          )}

          {/* Features Section */}
          <section className="py-16 bg-gray-800/40 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold font-runtime text-center text-white mb-12 drop-shadow-lg">
                Funzionalità Principali
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                {/* Card Personalizzate */}
                <div className="group text-center p-6 rounded-xl bg-gray-800/60 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:bg-gray-700/80 transition-all duration-500 hover:scale-105 cursor-pointer hover:border hover:border-green-400/50">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-900/60 group-hover:bg-green-600 rounded-full flex items-center justify-center transition-all duration-500 group-hover:shadow-lg group-hover:shadow-green-400/50">
                    <svg className="w-8 h-8 text-green-400 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold font-runtime text-white mb-2 group-hover:text-green-400 transition-colors duration-500">Card Personalizzate</h3>
                  <p className="text-gray-300 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 ease-out">
                    Card uniche per ogni giocatore con statistiche, foto e design dinamici basati sulle prestazioni.
                  </p>
                </div>

                {/* Gestione Partite */}
                <div className="group text-center p-6 rounded-xl bg-gray-800/60 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:bg-gray-700/80 transition-all duration-500 hover:scale-105 cursor-pointer hover:border hover:border-blue-400/50">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-900/60 group-hover:bg-blue-600 rounded-full flex items-center justify-center transition-all duration-500 group-hover:shadow-lg group-hover:shadow-blue-400/50">
                    <svg className="w-8 h-8 text-blue-400 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold font-runtime text-white mb-2 group-hover:text-blue-400 transition-colors duration-500">Gestione Partite</h3>
                  <p className="text-gray-300 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 ease-out">
                    Organizza partite, forma squadre automaticamente e tieni traccia di tutti i risultati e statistiche.
                  </p>
                </div>

                {/* Sistema Votazioni */}
                <div className="group text-center p-6 rounded-xl bg-gray-800/60 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:bg-gray-700/80 transition-all duration-500 hover:scale-105 cursor-pointer hover:border hover:border-purple-400/50">
                  <div className="w-16 h-16 mx-auto mb-4 bg-purple-900/60 group-hover:bg-purple-600 rounded-full flex items-center justify-center transition-all duration-500 group-hover:shadow-lg group-hover:shadow-purple-400/50">
                    <svg className="w-8 h-8 text-purple-400 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold font-runtime text-white mb-2 group-hover:text-purple-400 transition-colors duration-500">Sistema Votazioni</h3>
                  <p className="text-gray-300 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 ease-out">
                    Vota le prestazioni dei compagni dopo ogni partita e vedi come evolvono le statistiche nel tempo.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 bg-gray-900/40 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold font-runtime text-white mb-6 drop-shadow-lg">
                Pronto a giocare?
              </h2>
              <p className="text-xl font-runtime text-gray-200 mb-8 drop-shadow-md">
                Unisciti alla community di Calcettinho e porta la tua lega al livello successivo!
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-black/80 backdrop-blur-sm text-white py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <Logo
                type="scritta"
                width={150}
                height={40}
                className="mx-auto mb-4 w-auto h-8 opacity-80 drop-shadow-lg"
              />
              <p className="text-gray-400 drop-shadow-md">
                Made with ❤️ by la community!
              </p>
            </div>
          </footer>
        </div>
      </div>
    </ProtectedRoute>
  );
}
