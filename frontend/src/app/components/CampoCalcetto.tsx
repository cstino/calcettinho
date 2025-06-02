'use client';

import React, { useState } from 'react';
import { getPlayerPhotoUrl } from '../../utils/api';

interface Player {
  name: string;
  email: string;
}

interface PlayerImageProps {
  player: Player;
  teamColor: 'red' | 'blue';
  playerName: string;
}

interface CampoCalcettoProps {
  team1: Player[];
  team2: Player[];
  team1Name?: string;
  team2Name?: string;
}

// Componente per l'immagine del giocatore con fallback
function PlayerImage({ player, teamColor, playerName }: PlayerImageProps) {
  const [imageError, setImageError] = useState(false);
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const borderColor = teamColor === 'red' ? 'border-red-500' : 'border-blue-500';
  const bgColor = teamColor === 'red' ? 'bg-red-500' : 'bg-blue-500';

  // ✅ Usa la funzione utility per URL dinamiche
  const photoUrl = getPlayerPhotoUrl(player?.email || '');

  return (
    <div className={`w-12 h-12 border-2 ${borderColor} rounded-full overflow-hidden shadow-lg bg-gray-200`}>
      {!imageError ? (
        <img
          src={photoUrl}
          alt={playerName}
          className="w-full h-full object-cover"
          onError={() => {
            console.log(`[CAMPO DEBUG] ❌ Immagine non trovata per: ${player?.email} (Nome: ${playerName})`);
            console.log(`[CAMPO DEBUG] ❌ URL tentativo: ${photoUrl}`);
            setImageError(true);
          }}
          onLoad={() => {
            console.log(`[CAMPO DEBUG] ✅ Immagine caricata correttamente per: ${player?.email} (Nome: ${playerName})`);
            console.log(`[CAMPO DEBUG] ✅ URL: ${photoUrl}`);
          }}
        />
      ) : (
        <div className={`w-full h-full ${bgColor} flex items-center justify-center`}>
          <span className="text-white text-sm font-bold">
            {getInitials(playerName)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function CampoCalcetto({ team1, team2, team1Name = "Squadra 1", team2Name = "Squadra 2" }: CampoCalcettoProps) {
  
  // Posizioni per squadra 1 (metà sinistra del campo) - SISTEMATE
  const positionsTeam1 = [
    { x: 12, y: 50 },    // Portiere
    { x: 20, y: 20 },    // Difensore alto
    { x: 20, y: 80 },    // Difensore basso
    { x: 40, y: 35 },    // Attaccante alto
    { x: 40, y: 65 }     // Attaccante basso
  ];

  // Posizioni per squadra 2 (metà destra del campo) - SISTEMATE
  const positionsTeam2 = [
    { x: 88, y: 50 },    // Portiere
    { x: 80, y: 20 },    // Difensore alto  
    { x: 80, y: 80 },    // Difensore basso
    { x: 60, y: 35 },    // Attaccante alto
    { x: 60, y: 65 }     // Attaccante basso
  ];

  const getPlayerName = (player: Player | undefined) => {
    if (!player) return '';
    return player.name || player.email.split('@')[0] || 'Giocatore';
  };



  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Campo da calcetto */}
      <div className="relative bg-green-500 rounded-lg overflow-hidden shadow-xl">
        {/* SVG Campo */}
        <svg 
          viewBox="0 0 600 400" 
          className="w-full h-auto"
          style={{ aspectRatio: '3/2' }}
        >
          {/* Campo di fondo */}
          <rect width="600" height="400" fill="#16A085"/>
          
          {/* Linee del campo */}
          <rect x="20" y="20" width="560" height="360" fill="none" stroke="white" strokeWidth="2"/>
          <line x1="300" y1="20" x2="300" y2="380" stroke="white" strokeWidth="2"/>
          <circle cx="300" cy="200" r="50" fill="none" stroke="white" strokeWidth="2"/>
          <circle cx="300" cy="200" r="2" fill="white"/>
          
          {/* Aree di rigore */}
          <rect x="20" y="140" width="60" height="120" fill="none" stroke="white" strokeWidth="2"/>
          <rect x="20" y="170" width="30" height="60" fill="none" stroke="white" strokeWidth="2"/>
          <rect x="520" y="140" width="60" height="120" fill="none" stroke="white" strokeWidth="2"/>
          <rect x="550" y="170" width="30" height="60" fill="none" stroke="white" strokeWidth="2"/>
          
          {/* Corner */}
          <path d="M 20 20 A 8 8 0 0 1 28 20" stroke="white" strokeWidth="1.5" fill="none"/>
          <path d="M 572 20 A 8 8 0 0 1 580 28" stroke="white" strokeWidth="1.5" fill="none"/>
          <path d="M 20 380 A 8 8 0 0 1 20 372" stroke="white" strokeWidth="1.5" fill="none"/>
          <path d="M 580 380 A 8 8 0 0 1 572 380" stroke="white" strokeWidth="1.5" fill="none"/>
        </svg>
        
        {/* Giocatori Squadra 1 (Rossi) */}
        {positionsTeam1.map((pos, index) => {
          const player = team1[index];
          const playerName = getPlayerName(player);
          return (
            <div
              key={`team1-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
            >
              {/* Pallino giocatore con foto */}
              <div className="relative flex flex-col items-center">
                <PlayerImage 
                  player={player} 
                  teamColor="red" 
                  playerName={playerName} 
                />
                {/* Nome giocatore */}
                <div className="mt-1 px-2 py-1 bg-black/70 text-white text-xs rounded font-runtime text-center min-w-max">
                  {playerName}
                </div>
              </div>
            </div>
          );
        })}

        {/* Giocatori Squadra 2 (Blu) */}
        {positionsTeam2.map((pos, index) => {
          const player = team2[index];
          const playerName = getPlayerName(player);
          return (
            <div
              key={`team2-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
            >
              {/* Pallino giocatore con foto */}
              <div className="relative flex flex-col items-center">
                {/* Nome giocatore */}
                <div className="mb-1 px-2 py-1 bg-black/70 text-white text-xs rounded font-runtime text-center min-w-max">
                  {playerName}
                </div>
                <PlayerImage 
                  player={player} 
                  teamColor="blue" 
                  playerName={playerName} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 