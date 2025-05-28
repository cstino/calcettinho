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
    
    console.log('Ricerca storico votazioni per:', email);

    // Recupera tutti i voti ricevuti da questo giocatore usando la struttura corretta
    const records = await base('votes').select({
      filterByFormula: `{toPlayerId} = "${email}"`,
      sort: [{ field: 'matchId', direction: 'desc' }]
    }).all();

    console.log('Voti trovati:', records.length);

    // Mappa i dati usando la struttura corretta
    const votes = records.map(record => ({
      id: record.id,
      voterEmail: record.get('fromPlayerId'),
      rating: record.get('value'),
      matchId: record.get('matchId'),
      toPlayerId: record.get('toPlayerId')
    }));

    // Calcola statistiche
    const totalVotes = votes.length;
    const averageRating = totalVotes > 0 
      ? (votes.reduce((sum, vote) => sum + (Number(vote.rating) || 0), 0) / totalVotes).toFixed(1)
      : '0';

    const ratingDistribution = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => ({
      rating,
      count: votes.filter(vote => Number(vote.rating) === rating).length
    }));

    return NextResponse.json({
      success: true,
      playerEmail: email,
      votes,
      statistics: {
        totalVotes,
        averageRating: parseFloat(averageRating),
        ratingDistribution
      }
    });

  } catch (error) {
    console.error('Errore nel recupero storico votazioni:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero dello storico votazioni',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 