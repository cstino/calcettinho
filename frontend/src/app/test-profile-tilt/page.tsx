'use client';

import React, { useState, useEffect } from 'react';
import ProfileTiltCard from '../components/ProfileTiltCard';
import { getCardUrl } from '../../utils/api';

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

export default function TestProfileTilt() {
  const [players, setPlayers] = useState<AirtablePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Funzione per calcolare l'overall
  const calculateOverall = (player: AirtablePlayer): number => {
    const stats = [player.ATT, player.DIF, player.VEL, player.FOR, player.PAS, player.POR];
    const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
    return Math.round(top5Stats.reduce((a, b) => a + b, 0) / 5);
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
        
        // Prende solo i primi 6 giocatori per il test
        setPlayers(airtablePlayers.slice(0, 6));
        
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
          }
        ];
        
        setPlayers(fallbackPlayers);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const getCardType = (overall: number) => {
    if (overall >= 90) return 'Ultimate';
    if (overall >= 78) return 'Gold';
    if (overall >= 65) return 'Silver';
    return 'Bronze';
  };

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
            🎯 Test ProfileTiltCard - Profili Giocatori
          </h1>
          <p className="text-gray-300 text-lg">
            Carte con effetti 3D tilt per i profili giocatori
          </p>
          
          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300">⚠️ {error}</p>
              <p className="text-gray-400 text-sm mt-1">Usando dati di fallback</p>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-400">
            Giocatori caricati: {players.length} • Muovi il mouse sulle carte per l'effetto tilt 3D
          </div>
        </div>

        {/* Griglia delle carte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {players.map((player) => {
            const overall = calculateOverall(player);
            return (
              <div key={player.email} className="text-center">
                <div className="w-80 mx-auto mb-4">
                  <ProfileTiltCard
                    src={getCardUrl(player.email)}
                    alt={`Card di ${player.nome}`}
                    enableTilt={true}
                    intensity={0.6}
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white font-runtime">
                    {player.nome}
                  </h3>
                  <div className="inline-block px-3 py-1 rounded-full bg-gray-600 text-gray-300 text-sm font-runtime">
                    Overall: {overall} • {getCardType(overall)}
                  </div>
                  <div className="text-gray-400 text-sm font-runtime">
                    {player.email}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Confronto Effetti */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8 font-runtime">
            🔄 Confronto Effetti
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Carta con Tilt */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-green-400 mb-4 font-runtime">
                ✅ Con Effetto Tilt (Profili)
              </h3>
              <div className="w-64 mx-auto mb-4">
                <ProfileTiltCard
                  src={getCardUrl(players[0]?.email || 'test@test.com')}
                  alt="Carta con Tilt"
                  enableTilt={true}
                  intensity={0.8}
                />
              </div>
              <p className="text-gray-300 text-sm font-runtime">
                Effetti 3D realistici che seguono il mouse
              </p>
            </div>

            {/* Carta senza Tilt */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-400 mb-4 font-runtime">
                📱 Senza Tilt (Menu Giocatori)
              </h3>
              <div className="w-64 mx-auto mb-4">
                <ProfileTiltCard
                  src={getCardUrl(players[0]?.email || 'test@test.com')}
                  alt="Carta senza Tilt"
                  enableTilt={false}
                />
              </div>
              <p className="text-gray-300 text-sm font-runtime">
                Carta statica con hover leggero
              </p>
            </div>
          </div>
        </div>

        {/* Istruzioni */}
        <div className="mt-16 text-center">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-4 font-runtime">
              🎮 Utilizzo Ottimale
            </h3>
            <div className="text-gray-300 space-y-2 font-runtime">
              <p>• <strong>Profili Giocatori:</strong> Effetto tilt 3D per enfatizzare la carta principale</p>
              <p>• <strong>Menu Giocatori:</strong> Flip tradizionale per non confondere con il drag</p>
              <p>• <strong>Statistiche:</strong> Carte statiche per confronti puliti</p>
              <p>• <strong>Mobile:</strong> Effetti tilt disabilitati automaticamente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 