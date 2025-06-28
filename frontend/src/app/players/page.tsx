import Navigation from "../components/Navigation";
import Logo from "../components/Logo";
import ProtectedRoute from "../components/ProtectedRoute";
import PlayersClientView from "./PlayersClientView";

interface Player {
  id: string;
  name: string;
  email: string;
  overall: number;
  att: number;
  vel: number;
  pas: number;
  for: number;
  dif: number;
  por: number;
  photo?: string;
}

// 🚀 ISR Configuration - 30 minuti cache
export const revalidate = 1800; // 30 minuti per aggiornare i dati giocatori

// 🎯 Server-side data fetching con ISR
async function getPlayersData(): Promise<Player[]> {
  try {
    // Fetch dai backend API con timeout e retry logic
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/players`, {
      cache: 'force-cache',
      next: { 
        revalidate: revalidate,
        tags: ['players'] // Per revalidation on-demand
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Errore nel caricamento dei giocatori: ${response.status}`);
    }

    const playersData = await response.json();

    // Mappa i dati del backend al formato del frontend
    const mappedPlayers = playersData
      .filter((player: any) => player.nome && player.nome.trim() !== '') // Filtra record vuoti
      .map((player: any, index: number) => ({
        id: (index + 1).toString(),
        name: player.nome || 'Nome non disponibile',
        email: player.email || 'email@non-disponibile.com',
        overall: (() => {
          const stats = [player.ATT, player.DIF, player.VEL, player.FOR, player.PAS, player.POR];
          const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
          return Math.round(top5Stats.reduce((sum, val) => sum + val, 0) / 5);
        })(),
        att: Math.round(player.ATT),
        vel: Math.round(player.VEL),
        pas: Math.round(player.PAS),
        for: Math.round(player.FOR),
        dif: Math.round(player.DIF),
        por: Math.round(player.POR)
      }));

    return mappedPlayers;

  } catch (error) {
    console.error('Error fetching players data:', error);
    // Fallback a array vuoto invece di far crashare la pagina
    return [];
  }
}

// 🎮 Server Component per SEO e performance
export default async function PlayersPage() {
  // Pre-fetch dei dati lato server con ISR
  const playersData = await getPlayersData();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black relative">
        {/* Overlay nero per OLED */}
        <div className="absolute inset-0 bg-black"></div>

        {/* Contenuto principale */}
        <div className="relative z-10">
          <Navigation />
          
          {/* Header Section - Renderizzato lato server per SEO */}
          <section className="pt-20 lg:pt-24 pb-8 px-4 sm:px-6 lg:px-8" style={{ paddingTop: 'max(80px, env(safe-area-inset-top, 0px) + 50px)' }}>
            <div className="max-w-6xl mx-auto text-center">
              <Logo
                type="simbolo"
                width={80}
                height={80}
                className="mx-auto mb-6 w-16 h-16 drop-shadow-lg"
              />
              
              <h1 className="text-4xl sm:text-5xl font-bold font-runtime text-white mb-4 drop-shadow-lg">
                Le Nostre{" "}
                <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                  Card Personalizzate
                </span>
              </h1>
              
              <p className="text-xl font-runtime text-gray-200 mb-8 max-w-2xl mx-auto drop-shadow-md">
                Scopri le card uniche di tutti i giocatori della lega - clicca per vedere il profilo completo
              </p>
            </div>
          </section>

          {/* 🎨 Client Component per interattività (filtri, ricerca, sorting) */}
          <PlayersClientView initialPlayers={playersData} />
        </div>
      </div>
    </ProtectedRoute>
  );
}

// 📊 Metadata per SEO ottimizzato
export const metadata = {
  title: 'Giocatori - Calcettinho ⚽',
  description: 'Scopri le card personalizzate di tutti i giocatori della lega di calcetto. Statistiche, valutazioni e profili completi.',
  keywords: ['calcetto', 'giocatori', 'card', 'statistiche', 'profili', 'lega'],
  openGraph: {
    title: 'Giocatori - Calcettinho ⚽',
    description: 'Card personalizzate e statistiche dei giocatori di calcetto',
    type: 'website',
  },
}; 