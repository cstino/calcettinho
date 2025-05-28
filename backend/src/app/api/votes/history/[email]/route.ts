import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurazione Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Credenziali Airtable mancanti');
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: apiKey
});

const base = Airtable.base(baseId);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);
    
    console.log('Ricerca storico votazioni UP/DOWN per:', email);

    // Recupera tutti i voti ricevuti da questo giocatore usando la nuova struttura UP/DOWN
    const records = await base('votes').select({
      filterByFormula: `{toPlayerId} = "${email}"`,
      sort: [{ field: 'matchId', direction: 'desc' }]
    }).all();

    console.log('Voti UP/DOWN trovati:', records.length);

    // Mappa i dati usando la nuova struttura UP/DOWN
    const votes = records.map(record => ({
      id: record.id,
      voterEmail: record.get('fromPlayerId'),
      voteType: record.get('voteType'), // 'UP' o 'DOWN'
      matchId: record.get('matchId'),
      toPlayerId: record.get('toPlayerId')
    }));

    // Calcola statistiche UP/DOWN
    const totalVotes = votes.length;
    const upVotes = votes.filter(vote => vote.voteType === 'UP').length;
    const downVotes = votes.filter(vote => vote.voteType === 'DOWN').length;
    const netVotes = upVotes - downVotes;
    const upPercentage = totalVotes > 0 ? ((upVotes / totalVotes) * 100).toFixed(1) : '0';

    // Statistiche per partita (raggruppa per matchId)
    const votesByMatch = votes.reduce((acc, vote) => {
      const matchId = vote.matchId as string;
      if (!acc[matchId]) {
        acc[matchId] = { up: 0, down: 0 };
      }
      if (vote.voteType === 'UP') {
        acc[matchId].up++;
      } else {
        acc[matchId].down++;
      }
      return acc;
    }, {} as Record<string, { up: number; down: number }>);

    const matchResults = Object.entries(votesByMatch).map(([matchId, votes]) => ({
      matchId,
      upVotes: votes.up,
      downVotes: votes.down,
      netVotes: votes.up - votes.down,
      isMotm: votes.up >= 7 // Potenziale Man of the Match se ha 7+ UP
    }));

    return NextResponse.json({
      success: true,
      playerEmail: email,
      votes,
      statistics: {
        totalVotes,
        upVotes,
        downVotes,
        netVotes,
        upPercentage: parseFloat(upPercentage),
        totalMatches: Object.keys(votesByMatch).length,
        potentialMotm: matchResults.filter(match => match.isMotm).length
      },
      matchResults: matchResults.slice(0, 10) // Ultimi 10 match
    });

  } catch (error) {
    console.error('Errore nel recupero storico votazioni UP/DOWN:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero dello storico votazioni UP/DOWN',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 