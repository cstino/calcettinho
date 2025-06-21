'use client';

import React, { useState, useEffect } from 'react';
import PlayerCard from '../components/PlayerCard';

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

// Interfaccia per PlayerCard
interface PlayerCardData {
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
}

export default function TestNormalCards() {
  const [players, setPlayers] = useState<PlayerCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Funzione per calcolare l'overall
  const calculateOverall = (player: AirtablePlayer): number => {
    const stats = [player.ATT, player.DIF, player.VEL, player.FOR, player.PAS, player.POR];
    const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
    return Math.round(top5Stats.reduce((a, b) => a + b, 0) / 5);
  };

  // Converte da formato Airtable a formato PlayerCard
  const convertToPlayerCardData = (airtablePlayer: AirtablePlayer): PlayerCardData => {
    const overall = calculateOverall(airtablePlayer);
    return {
      id: airtablePlayer.email,
      name: airtablePlayer.nome,
      email: airtablePlayer.email,
      overall: overall,
      att: airtablePlayer.ATT,
      vel: airtablePlayer.VEL,
      pas: airtablePlayer.PAS,
      for: airtablePlayer.FOR,
      dif: airtablePlayer.DIF,
      por: airtablePlayer.POR
    };
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
        
        // Converte e prende solo i primi 8 giocatori per il test
        const convertedPlayers = airtablePlayers
          .slice(0, 8)
          .map(convertToPlayerCardData);
        
        setPlayers(convertedPlayers);
        
      } catch (err) {
        console.error('Errore nel recupero giocatori:', err);
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
        
        // Dati di fallback in caso di errore
        const fallbackPlayers: PlayerCardData[] = [
          {
            id: "1",
            name: "Marco Rossi",
            email: "marco.rossi@test.com",
            overall: 78,
            att: 85,
            vel: 80,
            pas: 78,
            for: 82,
            dif: 75,
            por: 50
          },
          {
            id: "2",
            name: "Luca Bianchi",
            email: "luca.bianchi@test.com",
            overall: 72,
            att: 80,
            vel: 75,
            pas: 70,
            for: 78,
            dif: 72,
            por: 45
          },
          {
            id: "3",
            name: "Giuseppe Verde",
            email: "giuseppe.verde@test.com",
            overall: 88,
            att: 92,
            vel: 90,
            pas: 87,
            for: 85,
            dif: 88,
            por: 60
          },
          {
            id: "4",
            name: "Andrea Neri",
            email: "andrea.neri@test.com",
            overall: 68,
            att: 70,
            vel: 68,
            pas: 66,
            for: 72,
            dif: 65,
            por: 40
          }
        ];
        
        setPlayers(fallbackPlayers);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mb-4"></div>
          <p className="text-white text-xl font-runtime">Caricamento carte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            🃏 Carte Normali - Menu Giocatori
          </h1>
          <p className="text-gray-300 text-lg">
            Carte con flip tradizionale (senza effetti tilt)
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
            Giocatori caricati: {players.length} • Hover per flip, drag su mobile
          </div>
        </div>

        {/* Griglia delle carte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {players.map((player) => (
            <div key={player.id} className="flex justify-center">
              <PlayerCard player={player} />
            </div>
          ))}
        </div>

        {/* Istruzioni */}
        <div className="mt-16 text-center">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-4 font-runtime">
              🎮 Funzionalità Carte Normali
            </h3>
            <div className="text-gray-300 space-y-2 font-runtime">
              <p>• <strong>Desktop:</strong> Hover per girare le carte automaticamente</p>
              <p>• <strong>Mobile:</strong> Drag orizzontale per girare manualmente</p>
              <p>• <strong>Click:</strong> Vai al profilo del giocatore</p>
              <p>• <strong>Effetti:</strong> Scale e rotazione leggera al hover</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 