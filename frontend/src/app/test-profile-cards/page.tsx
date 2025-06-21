'use client';

import React, { useState, useEffect } from 'react';
import ProfileCard from '../../components/ProfileCard';

// Interfaccia per i dati del giocatore da Airtable
interface AirtablePlayer {
  nome: string;
  email: string;
  foto: string;
  ATT: number;
  DIF: number;
  VEL: number;
  FOR: number;
  PAS: number;
  POR: number;
}

// Configurazioni per i diversi tipi di carte
const CARD_CONFIGS = {
  bronze: {
    behindGradient: "radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y), hsla(30,100%,70%,var(--card-opacity)) 4%, hsla(25,80%,60%,calc(var(--card-opacity)*0.75)) 10%, hsla(20,60%,50%,calc(var(--card-opacity)*0.5)) 50%, hsla(15,40%,40%,0) 100%), radial-gradient(35% 52% at 55% 20%, #CD7F32 0%, #8B4513 100%), conic-gradient(from 124deg at 50% 50%, #CD7F32 0%, #A0522D 40%, #A0522D 60%, #CD7F32 100%)",
    innerGradient: "linear-gradient(145deg, #8B4513 0%, #CD7F32 100%)",
    name: "Bronzo"
  },
  silver: {
    behindGradient: "radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y), hsla(0,0%,90%,var(--card-opacity)) 4%, hsla(0,0%,80%,calc(var(--card-opacity)*0.75)) 10%, hsla(0,0%,70%,calc(var(--card-opacity)*0.5)) 50%, hsla(0,0%,60%,0) 100%), radial-gradient(35% 52% at 55% 20%, #C0C0C0 0%, #808080 100%), conic-gradient(from 124deg at 50% 50%, #C0C0C0 0%, #A8A8A8 40%, #A8A8A8 60%, #C0C0C0 100%)",
    innerGradient: "linear-gradient(145deg, #808080 0%, #C0C0C0 100%)",
    name: "Argento"
  },
  gold: {
    behindGradient: "radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y), hsla(45,100%,80%,var(--card-opacity)) 4%, hsla(40,90%,70%,calc(var(--card-opacity)*0.75)) 10%, hsla(35,80%,60%,calc(var(--card-opacity)*0.5)) 50%, hsla(30,70%,50%,0) 100%), radial-gradient(35% 52% at 55% 20%, #FFD700 0%, #B8860B 100%), conic-gradient(from 124deg at 50% 50%, #FFD700 0%, #DAA520 40%, #DAA520 60%, #FFD700 100%)",
    innerGradient: "linear-gradient(145deg, #B8860B 0%, #FFD700 100%)",
    name: "Oro"
  },
  ultimate: {
    behindGradient: "radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y), hsla(266,100%,90%,var(--card-opacity)) 4%, hsla(266,50%,80%,calc(var(--card-opacity)*0.75)) 10%, hsla(266,25%,70%,calc(var(--card-opacity)*0.5)) 50%, hsla(266,0%,60%,0) 100%), radial-gradient(35% 52% at 55% 20%, #00ffaac4 0%, #073aff00 100%), radial-gradient(100% 100% at 50% 50%, #00c1ffff 1%, #073aff00 76%), conic-gradient(from 124deg at 50% 50%, #c137ffff 0%, #07c6ffff 40%, #07c6ffff 60%, #c137ffff 100%)",
    innerGradient: "linear-gradient(145deg, #60496e8c 0%, #71C4FF44 100%)",
    name: "Ultimate"
  }
};

export default function TestProfileCards() {
  const [players, setPlayers] = useState<AirtablePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Funzione per calcolare l'overall
  const calculateOverall = (player: AirtablePlayer): number => {
    const stats = [player.ATT, player.DIF, player.VEL, player.FOR, player.PAS, player.POR];
    const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
    return Math.round(top5Stats.reduce((a, b) => a + b, 0) / 5);
  };

  // Funzione per determinare il tipo di carta basato sull'overall
  const getCardType = (overall: number): 'bronze' | 'silver' | 'gold' | 'ultimate' => {
    if (overall >= 90) return 'ultimate';
    if (overall >= 78) return 'gold';
    if (overall >= 65) return 'silver';
    return 'bronze';
  };

  // Recupera i giocatori da Airtable
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Chiamata all'API backend per recuperare i giocatori
        const response = await fetch('/api/players');
        
        if (!response.ok) {
          throw new Error(`Errore HTTP: ${response.status}`);
        }
        
        const airtablePlayers: AirtablePlayer[] = await response.json();
        console.log('Giocatori recuperati da Airtable:', airtablePlayers);
        
        // Prende solo i primi 8 giocatori per il test
        setPlayers(airtablePlayers.slice(0, 8));
        
      } catch (err) {
        console.error('Errore nel recupero giocatori:', err);
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
        
        // Dati di fallback in caso di errore
        const fallbackPlayers: AirtablePlayer[] = [
          {
            nome: "Marco Rossi",
            email: "marco.rossi@test.com",
            foto: "",
            ATT: 85,
            DIF: 75,
            VEL: 80,
            FOR: 82,
            PAS: 78,
            POR: 50
          },
          {
            nome: "Luca Bianchi",
            email: "luca.bianchi@test.com",
            foto: "",
            ATT: 80,
            DIF: 72,
            VEL: 75,
            FOR: 78,
            PAS: 70,
            POR: 45
          },
          {
            nome: "Giuseppe Verde",
            email: "giuseppe.verde@test.com",
            foto: "",
            ATT: 92,
            DIF: 88,
            VEL: 90,
            FOR: 85,
            PAS: 87,
            POR: 60
          },
          {
            nome: "Andrea Neri",
            email: "andrea.neri@test.com",
            foto: "",
            ATT: 70,
            DIF: 65,
            VEL: 68,
            FOR: 72,
            PAS: 66,
            POR: 40
          }
        ];
        setPlayers(fallbackPlayers);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const handleContactClick = (player: AirtablePlayer) => {
    console.log('Contact clicked:', player.nome);
    alert(`Contatta ${player.nome} all'email: ${player.email}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Caricamento giocatori...</h2>
          <p className="text-gray-300">Recupero dati da Airtable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            🃏 Test ProfileCard Calcettinho
          </h1>
          <p className="text-gray-300 text-lg">
            Carte interattive con dati reali da Airtable
          </p>
          
          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300">⚠️ {error}</p>
              <p className="text-gray-400 text-sm mt-1">Usando dati di fallback</p>
            </div>
          )}
          
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            <div className="bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full">
              Ultimate: 90+ Overall
            </div>
            <div className="bg-yellow-600/20 text-yellow-300 px-3 py-1 rounded-full">
              Gold: 78+ Overall
            </div>
            <div className="bg-gray-400/20 text-gray-300 px-3 py-1 rounded-full">
              Silver: 65+ Overall
            </div>
            <div className="bg-orange-600/20 text-orange-300 px-3 py-1 rounded-full">
              Bronze: &lt;65 Overall
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-400">
            Giocatori caricati: {players.length}
          </div>
        </div>

        {/* Griglia delle carte */}
        {players.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12">
            {players.map((player, index) => {
              const overall = calculateOverall(player);
              const cardType = getCardType(overall);
              const config = CARD_CONFIGS[cardType];
              
              const playerStats = [
                { label: 'ATT', value: player.ATT },
                { label: 'VEL', value: player.VEL },
                { label: 'PAS', value: player.PAS },
                { label: 'FOR', value: player.FOR },
                { label: 'DIF', value: player.DIF },
                { label: 'POR', value: player.POR }
              ];

              return (
                <div key={player.email} className="flex justify-center">
                  <ProfileCard
                    avatarUrl={player.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.nome)}&background=random&size=400`}
                    miniAvatarUrl={player.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.nome)}&background=random&size=100`}
                    iconUrl=""
                    grainUrl=""
                    name={player.nome}
                    overall={overall}
                    stats={playerStats}
                    handle={player.nome.toLowerCase().replace(/\s+/g, '')}
                    status={config.name}
                    contactText="Contatta"
                    behindGradient={config.behindGradient}
                    innerGradient={config.innerGradient}
                    showBehindGradient={true}
                    showUserInfo={true}
                    enableTilt={true}
                    onContactClick={() => handleContactClick(player)}
                    className="transform hover:scale-105 transition-transform duration-300"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">
              Nessun giocatore trovato
            </div>
          </div>
        )}

        {/* Sezione informazioni */}
        <div className="mt-16 bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            ℹ️ Informazioni ProfileCard
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-4">✨ Caratteristiche</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• <strong>Effetti 3D interattivi</strong> - Tilt al movimento del mouse</li>
                <li>• <strong>Gradienti personalizzati</strong> - Diversi per ogni tipo di carta</li>
                <li>• <strong>Foto reali</strong> - Recuperate da Airtable</li>
                <li>• <strong>Overall calcolato</strong> - Media delle 5 migliori statistiche</li>
                <li>• <strong>Design responsive</strong> - Ottimizzato per tutti i dispositivi</li>
                <li>• <strong>Animazioni fluide</strong> - Transizioni smooth e naturali</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-blue-400 mb-4">🎮 Interazioni</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• <strong>Hover Effect</strong> - Effetti olografici al passaggio del mouse</li>
                <li>• <strong>Tilt 3D</strong> - Rotazione della carta seguendo il cursore</li>
                <li>• <strong>Bottone Contatta</strong> - Azione personalizzabile</li>
                <li>• <strong>Touch Support</strong> - Funziona anche su dispositivi touch</li>
                <li>• <strong>Smooth Animations</strong> - Animazioni di entrata e uscita</li>
                <li>• <strong>Performance Optimized</strong> - Rendering efficiente</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <p className="text-blue-300 text-center">
              <strong>💡 Suggerimento:</strong> Passa il mouse sopra le carte per vedere gli effetti 3D e olografici in azione!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 