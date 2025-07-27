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
    
    console.log('🔄 NUOVO: Recupero storico votazioni da player_stats per:', email);

    // ✅ NUOVO: Leggi i dati aggregati dalla tabella player_stats invece che da votes
    const playerStatsRecords = await base('player_stats').select({
      filterByFormula: `{playerEmail} = "${email}"`
    }).all();

    if (playerStatsRecords.length === 0) {
      console.log('⚠️ Giocatore non trovato in player_stats, restituisco valori vuoti');
      
      return NextResponse.json({
        success: true,
        playerEmail: email,
        votes: [], // Array vuoto per compatibilità
        statistics: {
          totalVotes: 0,
          upVotes: 0,
          downVotes: 0,
          neutralVotes: 0,
          motmVotes: 0,
          netVotes: 0,
          upPercentage: 0,
          totalMatches: 0,
          actualMotm: 0,
          motmCandidacies: 0
        },
        matchResults: [],
        source: 'player_stats' // Indicatore del source per debug
      });
    }

    const playerStatsRecord = playerStatsRecords[0];
    
    // ✅ Nomi dei campi confermati dall'immagine Airtable dell'utente
    const upVotes = Number(playerStatsRecord.get('upVotes')) || 0;
    const downVotes = Number(playerStatsRecord.get('downVotes')) || 0;
    const neutralVotes = Number(playerStatsRecord.get('neutralVotes')) || 0;
    const motmVotes = Number(playerStatsRecord.get('motmVotes')) || 0;
    
    const totalVotes = upVotes + downVotes + neutralVotes;
    const netVotes = upVotes - downVotes;
    const upPercentage = totalVotes > 0 ? ((upVotes / totalVotes) * 100) : 0;

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

    // Per ora, poiché i dati sono aggregati, non abbiamo più il dettaglio per partita
    // Restituiamo le statistiche aggregate
    
    console.log('📊 Statistiche aggregate recuperate:', {
      totalVotes,
      upVotes,
      downVotes,
      neutralVotes,
      motmVotes,
      netVotes
    });

    // ✅ FALLBACK: Se i dati aggregati non ci sono ancora, leggi dalla tabella votes (modalità legacy)
    if (totalVotes === 0) {
      console.log('⚠️ Nessun dato aggregato trovato, fallback alla tabella votes...');
      
      // Recupera dalla tabella votes come prima (modalità legacy)
      const records = await base('votes').select({
        filterByFormula: `{toPlayerId} = "${email}"`,
        sort: [{ field: 'matchId', direction: 'desc' }]
      }).all();

      const votes = records.map(record => ({
        id: record.id,
        voterEmail: record.get('fromPlayerId'),
        voteType: record.get('voteType'),
        motmVote: record.get('motm_vote') || false,
        matchId: record.get('matchId'),
        toPlayerId: record.get('toPlayerId')
      }));

      const totalVotesLegacy = votes.length;
      const upVotesLegacy = votes.filter(vote => vote.voteType === 'UP').length;
      const downVotesLegacy = votes.filter(vote => vote.voteType === 'DOWN').length;
      const neutralVotesLegacy = votes.filter(vote => vote.voteType === 'NEUTRAL').length;
      const motmVotesLegacy = votes.filter(vote => vote.motmVote).length;
      const netVotesLegacy = upVotesLegacy - downVotesLegacy;
      const upPercentageLegacy = totalVotesLegacy > 0 ? ((upVotesLegacy / totalVotesLegacy) * 100) : 0;

      // Statistiche per partita (raggruppa per matchId)
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
        wasMotmCandidate: votes.motm > 0
      }));

      return NextResponse.json({
        success: true,
        playerEmail: email,
        votes,
        statistics: {
          totalVotes: totalVotesLegacy,
          upVotes: upVotesLegacy,
          downVotes: downVotesLegacy,
          neutralVotes: neutralVotesLegacy,
          motmVotes: motmVotesLegacy,
          netVotes: netVotesLegacy,
          upPercentage: parseFloat(upPercentageLegacy.toFixed(1)),
          totalMatches: Object.keys(votesByMatch).length,
          actualMotm: actualMotm,
          motmCandidacies: matchResults.filter(match => match.wasMotmCandidate).length
        },
        matchResults: matchResults.slice(0, 10),
        source: 'votes_legacy' // Indicatore del source per debug
      });
    }

    return NextResponse.json({
      success: true,
      playerEmail: email,
      votes: [], // I singoli voti non sono più disponibili con i dati aggregati
      statistics: {
        totalVotes,
        upVotes,
        downVotes,
        neutralVotes,
        motmVotes,
        netVotes,
        upPercentage: parseFloat(upPercentage.toFixed(1)),
        totalMatches: 0, // TODO: Potremmo dover aggiungere questo campo a player_stats
        actualMotm: actualMotm,
        motmCandidacies: 0 // TODO: Potremmo dover aggiungere questo campo a player_stats
      },
      matchResults: [], // I dettagli per partita non sono più disponibili con i dati aggregati
      source: 'player_stats' // Indicatore del source per debug
    });

  } catch (error) {
    console.error('Errore nel recupero storico votazioni da player_stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero dello storico votazioni da player_stats',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 