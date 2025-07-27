import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurazione Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Missing Airtable configuration in environment variables');
}

const base = Airtable.base(baseId);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email parameter required'
      }, { status: 400 });
    }
    
    console.log('🔍 DEBUG: Controllo dati per:', email);
    
    // 1. Controlla se esiste in player_stats
    const playerStatsRecords = await base('player_stats').select({
      filterByFormula: `{playerEmail} = "${email}"`
    }).all();
    
    console.log('📊 Record trovati in player_stats:', playerStatsRecords.length);
    
    if (playerStatsRecords.length === 0) {
      return NextResponse.json({
        success: true,
        debug: {
          email,
          foundInPlayerStats: false,
          reason: 'Giocatore non trovato in player_stats',
          willUseFallback: true
        }
      });
    }
    
    const playerStatsRecord = playerStatsRecords[0];
    const rawData = playerStatsRecord.fields;
    
    console.log('📋 Dati raw da player_stats:', rawData);
    
    // 2. Estrai i dati come fa l'API
    const upVotes = Number(playerStatsRecord.get('upVotes')) || 0;
    const downVotes = Number(playerStatsRecord.get('downVotes')) || 0;
    const neutralVotes = Number(playerStatsRecord.get('neutralVotes')) || 0;
    const motmVotes = Number(playerStatsRecord.get('motmVotes')) || 0;
    
    const totalVotes = upVotes + downVotes + neutralVotes;
    const netVotes = upVotes - downVotes;
    const upPercentage = totalVotes > 0 ? ((upVotes / totalVotes) * 100) : 0;
    
    console.log('🧮 Dati processati:', {
      upVotes,
      downVotes,
      neutralVotes,
      motmVotes,
      totalVotes,
      netVotes,
      upPercentage
    });
    
    // 3. Controlla se attiverà il fallback
    const willUseFallback = totalVotes === 0;
    
    // 4. Se fallback, mostra anche un campione dalla tabella votes
    let votesLegacySample = null;
    if (willUseFallback) {
      try {
        const votesRecords = await base('votes').select({
          filterByFormula: `{toPlayerId} = "${email}"`,
          maxRecords: 10
        }).all();
        
        votesLegacySample = {
          totalVotesInVotesTable: votesRecords.length,
          sampleVotes: votesRecords.slice(0, 3).map(vote => ({
            voteType: vote.get('voteType'),
            motmVote: vote.get('motm_vote'),
            matchId: vote.get('matchId')
          }))
        };
      } catch (votesError) {
        votesLegacySample = { error: votesError instanceof Error ? votesError.message : 'Errore sconosciuto' };
      }
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        email,
        foundInPlayerStats: true,
        rawPlayerStatsData: rawData,
        processedData: {
          upVotes,
          downVotes,
          neutralVotes,
          motmVotes,
          totalVotes,
          netVotes,
          upPercentage: parseFloat(upPercentage.toFixed(1))
        },
        willUseFallback,
        fallbackReason: willUseFallback ? 'totalVotes === 0' : null,
        votesLegacySample
      }
    });
    
  } catch (error) {
    console.error('❌ Errore nel debug player-stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel debug',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 