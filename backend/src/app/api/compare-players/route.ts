import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurazione Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Credenziali Airtable mancanti nelle variabili d\'ambiente');
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: apiKey
});

const base = Airtable.base(baseId);

export async function POST(request: NextRequest) {
  try {
    const { player1Email, player2Email } = await request.json();
    
    if (!player1Email || !player2Email) {
      return NextResponse.json({ error: 'Email dei giocatori richieste' }, { status: 400 });
    }

    console.log('Confronto tra:', player1Email, 'vs', player2Email);

    // Recupera dati dei giocatori
    const playersRecords = await base('players').select({
      filterByFormula: `OR({email} = '${player1Email}', {email} = '${player2Email}')`
    }).all();

    // Recupera statistiche dettagliate
    const statsRecords = await base('player_stats').select({
      filterByFormula: `OR({playerEmail} = '${player1Email}', {playerEmail} = '${player2Email}')`
    }).all();

    // Recupera voti (se la tabella esiste)
    let votesData: Record<string, { upVotes: number; downVotes: number }> = {};
    votesData[player1Email] = { upVotes: 0, downVotes: 0 };
    votesData[player2Email] = { upVotes: 0, downVotes: 0 };
    
    try {
      const votesRecords = await base('votes').select({
        filterByFormula: `OR({toPlayerEmail} = '${player1Email}', {toPlayerEmail} = '${player2Email}')`
      }).all();

      // Aggrega i voti per giocatore
      votesRecords.forEach(record => {
        const playerEmail = record.get('toPlayerEmail');
        const voteType = record.get('voteType');
        
        if (typeof playerEmail === 'string' && votesData[playerEmail]) {
          if (voteType === 'UP') {
            votesData[playerEmail].upVotes++;
          } else if (voteType === 'DOWN') {
            votesData[playerEmail].downVotes++;
          }
        }
      });
    } catch (votesError) {
      console.log('Tabella votes non disponibile, usando valori di default');
    }

    // Mappa i dati dei giocatori
    const playersMap = new Map();
    playersRecords.forEach(record => {
      const email = record.get('email');
      if (email) {
        playersMap.set(email, {
          id: record.id,
          name: record.get('name'),
          email: email,
          overall: (() => {
            // Calcola overall dalle migliori 5 statistiche (nuovo metodo)
            const playerStats = [
              Number(record.get('Attacco')) || 0,
              Number(record.get('Difesa')) || 0,
              Number(record.get('Velocità')) || 0,
              Number(record.get('Forza')) || 0,
              Number(record.get('Passaggio')) || 0,
              Number(record.get('Portiere')) || 0
            ];
            
            // Ordina le statistiche in ordine decrescente e prendi le migliori 5
            const top5Stats = playerStats.sort((a, b) => b - a).slice(0, 5);
            return Math.round(top5Stats.reduce((sum, val) => sum + val, 0) / 5);
          })(),
          attacco: Number(record.get('Attacco')),
          difesa: Number(record.get('Difesa')),
          velocità: Number(record.get('Velocità')),
          forza: Number(record.get('Forza')),
          passaggio: Number(record.get('Passaggio')),
          portiere: Number(record.get('Portiere'))
        });
      }
    });

    // Mappa le statistiche
    const statsMap = new Map();
    statsRecords.forEach(record => {
      const email = record.get('playerEmail');
      if (email) {
        statsMap.set(email, {
          gol: Number(record.get('Gol')) || Number(record.get('gol')) || 0,
          partiteDisputate: Number(record.get('partiteDisputate')) || 0,
          partiteVinte: Number(record.get('partiteVinte')) || 0,
          partitePareggiate: Number(record.get('partitePareggiate')) || 0,
          partitePerse: Number(record.get('partitePerse')) || 0,
          assistenze: Number(record.get('assistenze')) || 0,
          cartelliniGialli: Number(record.get('cartelliniGialli')) || 0,
          cartelliniRossi: Number(record.get('cartelliniRossi')) || 0,
          minutiGiocati: Number(record.get('minutiGiocati')) || 0
        });
      }
    });

    // Costruisci la risposta
    const player1Data = playersMap.get(player1Email);
    const player2Data = playersMap.get(player2Email);
    const player1Stats = statsMap.get(player1Email) || {};
    const player2Stats = statsMap.get(player2Email) || {};

    if (!player1Data || !player2Data) {
      return NextResponse.json({ error: 'Uno o entrambi i giocatori non trovati' }, { status: 404 });
    }

    const comparison = {
      player1: {
        ...player1Data,
        stats: player1Stats,
        votes: votesData[player1Email]
      },
      player2: {
        ...player2Data,
        stats: player2Stats,
        votes: votesData[player2Email]
      }
    };

    console.log('Confronto completato:', comparison);
    return NextResponse.json(comparison);

  } catch (error) {
    console.error('Errore nel confronto giocatori:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
} 