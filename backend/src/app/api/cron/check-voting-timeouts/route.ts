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

export async function GET(req: NextRequest) {
  try {
    console.log('🕐 CRON JOB: Controllo timeout votazioni automatico avviato');
    
    // Verifica autorizzazione Cron (solo Vercel può chiamare questo endpoint)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('❌ CRON: Autorizzazione fallita');
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // 1. Trova tutte le partite con votazioni aperte
    const openVotingMatches = await base('matches').select({
      filterByFormula: `AND(
        {voting_status} = 'open',
        {voting_started_at} != ''
      )`
    }).all();

    console.log(`🔍 CRON: Trovate ${openVotingMatches.length} partite con votazioni aperte`);

    if (openVotingMatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessuna partita con votazioni aperte da controllare',
        checkedMatches: 0,
        timeoutMatches: 0
      });
    }

    // 2. Controlla ogni partita per timeout
    const results = [];
    let timeoutCount = 0;
    let errorCount = 0;

    for (const match of openVotingMatches) {
      const matchId = match.get('IDmatch') as string;
      const votingStartedAt = match.get('voting_started_at') as string;
      
      try {
        console.log(`⏰ CRON: Controllo timeout per partita ${matchId}`);
        
        // Calcola tempo trascorso
        const startTime = new Date(votingStartedAt).getTime();
        const now = new Date().getTime();
        const hours24 = 24 * 60 * 60 * 1000;
        const timeElapsed = now - startTime;
        const hoursElapsed = timeElapsed / (60 * 60 * 1000);

        if (timeElapsed > hours24) {
          console.log(`🚨 CRON: TIMEOUT rilevato per partita ${matchId} (${hoursElapsed.toFixed(1)}h)`);
          
          // Chiama l'endpoint di check-timeout per questa partita
          const timeoutResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/matches/${matchId}/check-voting-timeout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          const timeoutData = await timeoutResponse.json();
          
          if (timeoutData.success && timeoutData.autoFinalized) {
            console.log(`✅ CRON: Partita ${matchId} finalizzata automaticamente`);
            timeoutCount++;
            results.push({
              matchId,
              status: 'timeout_finalized',
              hoursElapsed: Math.round(hoursElapsed * 10) / 10,
              motmAwarded: timeoutData.motmAwarded || 0,
              abilitiesUpdated: timeoutData.abilitiesUpdated || 0
            });
          } else {
            console.log(`⚠️ CRON: Errore nella finalizzazione di ${matchId}:`, timeoutData.error);
            errorCount++;
            results.push({
              matchId,
              status: 'timeout_error',
              hoursElapsed: Math.round(hoursElapsed * 10) / 10,
              error: timeoutData.error
            });
          }
        } else {
          const remainingHours = Math.max(0, 24 - hoursElapsed);
          console.log(`🔄 CRON: Partita ${matchId} ancora aperta (restano ${remainingHours.toFixed(1)}h)`);
          results.push({
            matchId,
            status: 'still_open',
            hoursElapsed: Math.round(hoursElapsed * 10) / 10,
            hoursRemaining: Math.round(remainingHours * 10) / 10
          });
        }
      } catch (matchError) {
        console.error(`❌ CRON: Errore nel controllo partita ${matchId}:`, matchError);
        errorCount++;
        results.push({
          matchId,
          status: 'check_error',
          error: matchError instanceof Error ? matchError.message : 'Errore sconosciuto'
        });
      }
    }

    console.log(`🏁 CRON: Controllo completato - ${timeoutCount} timeout, ${errorCount} errori`);

    return NextResponse.json({
      success: true,
      message: `Controllo timeout completato: ${timeoutCount} partite finalizzate, ${errorCount} errori`,
      checkedMatches: openVotingMatches.length,
      timeoutMatches: timeoutCount,
      errorMatches: errorCount,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ CRON: Errore generale nel controllo timeout:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel controllo automatico timeout',
      details: error instanceof Error ? error.message : 'Errore sconosciuto',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 