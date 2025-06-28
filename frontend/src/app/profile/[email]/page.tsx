import Navigation from "../../components/Navigation";
import Logo from "../../components/Logo";
import ProtectedRoute from "../../components/ProtectedRoute";
import ProfileClientView from "./ProfileClientView";
import { getApiBaseUrl } from "../../../utils/api";

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

interface PlayerStats {
  gol: number;
  partiteDisputate: number;
  partiteVinte: number;
  partitePareggiate: number;
  partitePerse: number;
  assistenze: number;
  cartelliniGialli: number;
  cartelliniRossi: number;
  minutiGiocati: number;
}

// 🚀 ISR Configuration - 1 ora cache per profili (cambiano meno frequentemente)
export const revalidate = 3600;

// 🎯 Server-side data fetching con ISR per dati base del profilo
async function getProfileData(email: string): Promise<{
  player: Player | null;
  playerStats: PlayerStats | null;
  lastUpdate: string;
}> {
  try {
    // Fetch player base data
    const baseUrl = getApiBaseUrl();
    const playerResponse = await fetch(`${baseUrl}/api/players/${encodeURIComponent(email)}`, {
      cache: 'force-cache',
      next: { 
        revalidate: revalidate,
        tags: ['profile', `profile-${email}`]
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!playerResponse.ok) {
      console.error(`Player API error: ${playerResponse.status} for email: ${email}`);
      throw new Error(`Errore nel caricamento del profilo: ${playerResponse.status}`);
    }

    const playerData = await playerResponse.json();

    // Fetch player stats
    const statsResponse = await fetch(`${baseUrl}/api/player-stats/${encodeURIComponent(email)}`, {
      cache: 'force-cache',
      next: { 
        revalidate: revalidate,
        tags: ['profile-stats', `profile-stats-${email}`]
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let playerStats: PlayerStats | null = null;
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      playerStats = {
        gol: statsData.gol || 0,
        partiteDisputate: statsData.partiteDisputate || 0,
        partiteVinte: statsData.partiteVinte || 0,
        partitePareggiate: statsData.partitePareggiate || 0,
        partitePerse: statsData.partitePerse || 0,
        assistenze: statsData.assistenze || 0,
        cartelliniGialli: statsData.cartelliniGialli || 0,
        cartelliniRossi: statsData.cartelliniRossi || 0,
        minutiGiocati: statsData.minutiGiocati || 0
      };
    }

    // Mappa i dati del player
    const player: Player = {
      id: playerData.id || email,
      name: playerData.name || playerData.nome || 'Nome non disponibile',
      email: playerData.email || email,
      overall: (() => {
        const stats = [playerData.ATT, playerData.DIF, playerData.VEL, playerData.FOR, playerData.PAS, playerData.POR];
        const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
        return Math.round(top5Stats.reduce((sum, val) => sum + val, 0) / 5);
      })(),
      att: playerData.ATT || 0,
      vel: playerData.VEL || 0,
      pas: playerData.PAS || 0,
      for: playerData.FOR || 0,
      dif: playerData.DIF || 0,
      por: playerData.POR || 0,
      photo: playerData.photo || null
    };

    return {
      player,
      playerStats,
      lastUpdate: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error fetching profile data:', error);
    return {
      player: null,
      playerStats: null,
      lastUpdate: new Date().toISOString()
    };
  }
}

// 🎮 Server Component per SEO e performance
export default async function ProfilePage({ params }: { params: { email: string } }) {
  // Decode email parameter
  const email = decodeURIComponent(params.email);
  
  // Pre-fetch dei dati lato server con ISR
  const { player, playerStats, lastUpdate } = await getProfileData(email);

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
              
              {player ? (
                <>
                  <h1 className="text-4xl sm:text-5xl font-bold font-runtime text-white mb-4 drop-shadow-lg">
                    Profilo di{" "}
                    <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                      {player.name}
                    </span>
                  </h1>
                  
                  <p className="text-xl font-runtime text-gray-200 mb-4 max-w-2xl mx-auto drop-shadow-md">
                    Statistiche dettagliate, progressi e achievements del giocatore
                  </p>

                  {/* Indicatore aggiornamento */}
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-6">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Aggiornato ogni ora</span>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4 inline-block">
                    <div className="text-3xl font-bold text-white font-runtime">
                      Overall: <span className="text-green-400">{player.overall}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-4xl sm:text-5xl font-bold font-runtime text-white mb-4 drop-shadow-lg">
                    Profilo{" "}
                    <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                      Non Trovato
                    </span>
                  </h1>
                  
                  <p className="text-xl font-runtime text-gray-200 mb-4 max-w-2xl mx-auto drop-shadow-md">
                    Il giocatore richiesto non è stato trovato nel database
                  </p>
                </>
              )}
            </div>
          </section>

          {/* 🎨 Client Component per interattività (votes, awards, animazioni) */}
          <ProfileClientView 
            player={player}
            playerStats={playerStats}
            email={email}
            lastUpdate={lastUpdate}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
} 