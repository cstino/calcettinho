'use client';

import Navigation from "../components/Navigation";
import Logo from "../components/Logo";

export default function Admin() {
  const adminCards = [
    {
      title: "Gestione Giocatori",
      description: "Aggiungi, modifica o rimuovi giocatori dalla lega",
      icon: "👥",
      color: "from-blue-600 to-blue-700",
      actions: ["Nuovo Giocatore", "Modifica Statistiche", "Carica Foto"]
    },
    {
      title: "Gestione Partite",
      description: "Crea nuove partite e gestisci i risultati",
      icon: "⚽",
      color: "from-green-600 to-green-700",
      actions: ["Nuova Partita", "Risultati", "Formazioni"]
    },
    {
      title: "Sistema Votazioni",
      description: "Configura e monitora le votazioni post-partita",
      icon: "📊",
      color: "from-purple-600 to-purple-700",
      actions: ["Apri Votazioni", "Visualizza Risultati", "Impostazioni"]
    },
    {
      title: "Database & Export",
      description: "Gestisci dati e esporta statistiche",
      icon: "💾",
      color: "from-orange-600 to-orange-700",
      actions: ["Backup Dati", "Export CSV", "Sincronizza Airtable"]
    },
    {
      title: "Configurazione",
      description: "Impostazioni generali dell'applicazione",
      icon: "⚙️",
      color: "from-gray-600 to-gray-700",
      actions: ["Impostazioni", "Utenti", "Sicurezza"]
    },
    {
      title: "Card Generator",
      description: "Genera e personalizza le card dei giocatori",
      icon: "🎴",
      color: "from-pink-600 to-pink-700",
      actions: ["Genera Card", "Template", "Preview"]
    }
  ];

  return (
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
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="relative z-10">
        <Navigation />
        
        {/* Header Section */}
        <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <Logo
              type="simbolo"
              width={80}
              height={80}
              className="mx-auto mb-6 w-16 h-16 drop-shadow-lg"
            />
            
            <h1 className="text-4xl sm:text-5xl font-bold font-runtime text-white mb-4 drop-shadow-lg">
              Pannello{" "}
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Amministratore
              </span>
            </h1>
            
            <p className="text-xl font-runtime text-gray-200 mb-8 max-w-2xl mx-auto drop-shadow-md">
              Gestisci tutti gli aspetti della tua lega di calcetto
            </p>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400 font-runtime">12</div>
                <div className="text-gray-300 font-runtime">Giocatori Attivi</div>
              </div>
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400 font-runtime">8</div>
                <div className="text-gray-300 font-runtime">Partite Giocate</div>
              </div>
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400 font-runtime">3</div>
                <div className="text-gray-300 font-runtime">Partite Programmate</div>
              </div>
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400 font-runtime">94</div>
                <div className="text-gray-300 font-runtime">Votazioni Completate</div>
              </div>
            </div>
          </div>
        </section>

        {/* Admin Cards Grid */}
        <section className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminCards.map((card, index) => (
                <div 
                  key={index}
                  className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  {/* Card Header */}
                  <div className="text-center mb-4">
                    <div className={`w-16 h-16 mx-auto mb-3 bg-gradient-to-r ${card.color} rounded-full flex items-center justify-center text-2xl`}>
                      {card.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white font-runtime">{card.title}</h3>
                    <p className="text-gray-300 text-sm mt-2">{card.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    {card.actions.map((action, actionIndex) => (
                      <button 
                        key={actionIndex}
                        className="w-full bg-gray-700/50 hover:bg-gray-600/50 text-white py-2 rounded-lg transition-colors font-runtime text-sm"
                        onClick={() => {
                          console.log(`Action: ${action} for ${card.title}`);
                        }}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-white font-runtime mb-6 text-center">
              Attività Recente
            </h2>
            
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
                  <div>
                    <p className="text-white font-runtime">Nuova partita creata: Campo Sud</p>
                    <p className="text-gray-400 text-sm font-runtime">2 ore fa</p>
                  </div>
                  <span className="text-green-400 text-sm font-runtime">Nuovo</span>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
                  <div>
                    <p className="text-white font-runtime">Votazioni completate per partita #12</p>
                    <p className="text-gray-400 text-sm font-runtime">5 ore fa</p>
                  </div>
                  <span className="text-blue-400 text-sm font-runtime">Completato</span>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
                  <div>
                    <p className="text-white font-runtime">Card generate per 3 giocatori</p>
                    <p className="text-gray-400 text-sm font-runtime">1 giorno fa</p>
                  </div>
                  <span className="text-purple-400 text-sm font-runtime">Generato</span>
                </div>
                
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white font-runtime">Backup database completato</p>
                    <p className="text-gray-400 text-sm font-runtime">2 giorni fa</p>
                  </div>
                  <span className="text-yellow-400 text-sm font-runtime">Sistema</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="h-20 sm:h-8"></div>
      </div>
    </div>
  );
} 