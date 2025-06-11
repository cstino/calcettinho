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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    
    console.log('⏰ Controllo timeout votazioni per partita:', matchId);

    // 1. Recupera dettagli partita
    const matchRecords = await base('matches').select({
      filterByFormula: `{IDmatch} = "${matchId}"`
    }).all();

    if (matchRecords.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Partita non trovata'
      }, { status: 404 });
    }

    const match = matchRecords[0];
    const votingStartedAt = match.get('voting_started_at') as string;
    const votingStatus = match.get('voting_status') as string;

    // 2. Controlla se le votazioni sono già chiuse
    if (votingStatus === 'closed') {
      console.log('✅ Votazioni già chiuse');
      return NextResponse.json({
        success: true,
        message: 'Votazioni già chiuse',
        alreadyClosed: true,
        votingStatus: 'closed'
      });
    }

    // 3. Controlla se sono passate 24 ore
    if (!votingStartedAt) {
      console.log('⚠️ Timestamp votazioni non trovato');
      return NextResponse.json({
        success: false,
        error: 'Timestamp inizio votazioni non trovato'
      }, { status: 400 });
    }

    const startTime = new Date(votingStartedAt).getTime();
    const now = new Date().getTime();
    const hours24 = 24 * 60 * 60 * 1000; // 24 ore in millisecondi
    const timeElapsed = now - startTime;
    const hoursElapsed = timeElapsed / (60 * 60 * 1000);

    console.log(`⏰ Tempo trascorso: ${hoursElapsed.toFixed(1)} ore (limite: 24 ore)`);

    if (timeElapsed <= hours24) {
      const remainingHours = Math.max(0, 24 - hoursElapsed);
      console.log(`🔄 Votazioni ancora aperte, restano ${remainingHours.toFixed(1)} ore`);
      
      return NextResponse.json({
        success: true,
        message: 'Votazioni ancora aperte',
        timeout: false,
        hoursElapsed: Math.round(hoursElapsed * 10) / 10,
        hoursRemaining: Math.round(remainingHours * 10) / 10,
        votingStatus: 'open'
      });
    }

    // 4. ⏰ TIMEOUT RAGGIUNTO! Chiudi automaticamente le votazioni
    console.log('🚨 TIMEOUT 24 ORE RAGGIUNTO! Chiudendo votazioni automaticamente...');

    try {
      const finalizeResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/matches/${matchId}/finalize-voting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const finalizeData = await finalizeResponse.json();
      
      if (finalizeData.success) {
        console.log('✅ TIMEOUT: FASE 2 completata automaticamente dopo 24 ore');
        
        return NextResponse.json({
          success: true,
          message: 'Votazioni chiuse automaticamente dopo 24 ore',
          timeout: true,
          hoursElapsed: Math.round(hoursElapsed * 10) / 10,
          autoFinalized: true,
          phase2Complete: true,
          finalizeMessage: finalizeData.message,
          motmAwarded: finalizeData.motmAwards || 0,
          abilitiesUpdated: finalizeData.playerAbilitiesUpdated || 0,
          votingCloseReason: '24 ore trascorse - chiusura automatica'
        });
      } else {
        console.log('❌ TIMEOUT: Finalize-voting fallito:', finalizeData.error);
        
        return NextResponse.json({
          success: false,
          error: 'Timeout raggiunto ma finalizzazione fallita',
          timeout: true,
          hoursElapsed: Math.round(hoursElapsed * 10) / 10,
          finalizeError: finalizeData.error
        }, { status: 500 });
      }
    } catch (finalizeError) {
      console.error('❌ TIMEOUT: Errore durante finalize-voting automatico:', finalizeError);
      
      return NextResponse.json({
        success: false,
        error: 'Timeout raggiunto ma errore durante finalizzazione',
        timeout: true,
        hoursElapsed: Math.round(hoursElapsed * 10) / 10,
        finalizeError: 'Errore durante finalizzazione automatica'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Errore nel controllo timeout votazioni:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel controllo timeout votazioni',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 