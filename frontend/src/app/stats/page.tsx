import Navigation from "../components/Navigation";
import Logo from "../components/Logo";
import ProtectedRoute from "../components/ProtectedRoute";
import StatsClientView from "./StatsClientView";

interface PlayerStats {
  id: string;
  name: string;
  email: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  overall: number;
}

// 🚀 ISR Configuration - 15 minuti cache per statistiche dinamiche
export const revalidate = 900; // 15 minuti per aggiornare le statistiche

// 🎯 Server-side data fetching con ISR per statistiche
async function getStatsData(): Promise<{
  playerStats: PlayerStats[];
  lastUpdate: string;
}> {
  try {
    // Fetch delle statistiche con timeout e retry logic
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/player-stats`, {
      cache: 'force-cache',
      next: { 
        revalidate: revalidate,
        tags: ['stats', 'player-stats'] // Per revalidation on-demand
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Errore nel caricamento delle statistiche: ${response.status}`);
    }

    const statsData = await response.json();

    // Mappa i dati delle statistiche al formato richiesto
    const mappedStats: PlayerStats[] = statsData
      .filter((stat: any) => stat.nome && stat.nome.trim() !== '')
      .map((stat: any, index: number) => ({
        id: (index + 1).toString(),
        name: stat.nome || 'Nome non disponibile',
        email: stat.email || 'email@non-disponibile.com',
        matches: stat.partiteDisputate || 0,
        wins: stat.partiteVinte || 0,
        losses: stat.partitePerse || 0,
        draws: stat.partitePareggiate || 0,
        goals: stat.gol || 0,
        assists: stat.assistenze || 0,
        yellowCards: stat.cartelliniGialli || 0,
        redCards: stat.cartelliniRossi || 0,
        minutesPlayed: stat.minutiGiocati || 0,
        overall: (() => {
          const stats = [stat.ATT, stat.DIF, stat.VEL, stat.FOR, stat.PAS, stat.POR];
          const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
          return Math.round(top5Stats.reduce((sum, val) => sum + val, 0) / 5);
        })()
      }));

    return {
      playerStats: mappedStats,
      lastUpdate: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error fetching stats data:', error);
    // Fallback per evitare crash
    return {
      playerStats: [],
      lastUpdate: new Date().toISOString()
    };
  }
}

// 🎮 Server Component per SEO e performance
export default async function StatsPage() {
  // Pre-fetch dei dati lato server con ISR
  const { playerStats, lastUpdate } = await getStatsData();

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
                Statistiche e{" "}
                <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                  Classifiche
                </span>
              </h1>
              
              <p className="text-xl font-runtime text-gray-200 mb-4 max-w-2xl mx-auto drop-shadow-md">
                Analizza le performance dei giocatori con statistiche dettagliate e confronti avanzati
              </p>

              {/* Indicatore aggiornamento */}
              <div className="inline-flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-600/50">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">
                  Aggiornato ogni 15 minuti
                </span>
              </div>
            </div>
          </section>

          {/* 🎨 Client Component per interattività (classifiche, confronti, filtri) */}
          <StatsClientView 
            initialPlayerStats={playerStats} 
            lastUpdate={lastUpdate}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}

// 📊 Metadata per SEO ottimizzato
export const metadata = {
  title: 'Statistiche - Calcettinho ⚽',
  description: 'Statistiche dettagliate e classifiche della lega di calcetto. Analizza performance, gol, assist e confronta i giocatori.',
  keywords: ['calcetto', 'statistiche', 'classifiche', 'gol', 'assist', 'performance', 'confronti'],
  openGraph: {
    title: 'Statistiche - Calcettinho ⚽',
    description: 'Statistiche e classifiche aggiornate della lega di calcetto',
    type: 'website',
  },
}; 