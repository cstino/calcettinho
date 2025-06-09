import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurazione Airtable
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
});

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Missing Airtable configuration in environment variables');
}

const base = Airtable.base(baseId);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);
    
    console.log('Ricerca storico votazioni completo per:', email);

    // ✅ NUOVO: Recupera tutti i voti ricevuti (UP, DOWN, NEUTRAL, MOTM)
    const records = await base('votes').select({
      filterByFormula: `{toPlayerId} = "${email}"`,
      sort: [{ field: 'matchId', direction: 'desc' }]
    }).all();

    console.log('Voti totali trovati:', records.length);

    // Recupera i veri premi Man of the Match dalla tabella player_awards
    let actualMotm = 0;
    try {
      const awardsRecords = await base('player_awards').select({
        filterByFormula: `AND({player_email} = "${email}", {award_type} = "motm")`
      }).all();
      actualMotm = awardsRecords.length;
      console.log('Premi MotM effettivi trovati:', actualMotm);
    } catch (awardsError) {
      console.log('Tabella player_awards non disponibile, usando valore 0 per MotM');
      actualMotm = 0;
    }

    // ✅ NUOVO: Mappa i dati includendo NEUTRAL e MOTM
    const votes = records.map(record => ({
      id: record.id,
      voterEmail: record.get('fromPlayerId'),
      voteType: record.get('voteType'), // 'UP', 'DOWN' o 'NEUTRAL'
      motmVote: record.get('motm_vote') || false, // Voto MOTM
      matchId: record.get('matchId'),
      toPlayerId: record.get('toPlayerId')
    }));

    // ✅ NUOVO: Calcola statistiche complete
    const totalVotes = votes.length;
    const upVotes = votes.filter(vote => vote.voteType === 'UP').length;
    const downVotes = votes.filter(vote => vote.voteType === 'DOWN').length;
    const neutralVotes = votes.filter(vote => vote.voteType === 'NEUTRAL').length;
    const motmVotes = votes.filter(vote => vote.motmVote).length;
    const netVotes = upVotes - downVotes; // NEUTRAL non influisce sul net
    const upPercentage = totalVotes > 0 ? ((upVotes / totalVotes) * 100).toFixed(1) : '0';

    console.log('📊 Statistiche calcolate:', {
      totalVotes,
      upVotes,
      downVotes,
      neutralVotes,
      motmVotes,
      netVotes
    });

    // ✅ NUOVO: Statistiche per partita (raggruppa per matchId)
    const votesByMatch = votes.reduce((acc, vote) => {
      const matchId = vote.matchId as string;
      if (!acc[matchId]) {
        acc[matchId] = { up: 0, down: 0, neutral: 0, motm: 0 };
      }
      
      if (vote.voteType === 'UP') {
        acc[matchId].up++;
      } else if (vote.voteType === 'DOWN') {
        acc[matchId].down++;
      } else if (vote.voteType === 'NEUTRAL') {
        acc[matchId].neutral++;
      }
      
      if (vote.motmVote) {
        acc[matchId].motm++;
      }
      
      return acc;
    }, {} as Record<string, { up: number; down: number; neutral: number; motm: number }>);

    const matchResults = Object.entries(votesByMatch).map(([matchId, votes]) => ({
      matchId,
      upVotes: votes.up,
      downVotes: votes.down,
      neutralVotes: votes.neutral,
      motmVotes: votes.motm,
      netVotes: votes.up - votes.down,
      wasMotmCandidate: votes.motm > 0 // Se ha ricevuto voti MOTM
    }));

    return NextResponse.json({
      success: true,
      playerEmail: email,
      votes,
      statistics: {
        totalVotes,
        upVotes,
        downVotes,
        neutralVotes, // ✅ NUOVO
        motmVotes,    // ✅ NUOVO
        netVotes,
        upPercentage: parseFloat(upPercentage),
        totalMatches: Object.keys(votesByMatch).length,
        actualMotm: actualMotm, // Veri premi MotM vinti
        motmCandidacies: matchResults.filter(match => match.wasMotmCandidate).length // ✅ NUOVO
      },
      matchResults: matchResults.slice(0, 10) // Ultimi 10 match
    });

  } catch (error) {
    console.error('Errore nel recupero storico votazioni completo:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero dello storico votazioni completo',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 