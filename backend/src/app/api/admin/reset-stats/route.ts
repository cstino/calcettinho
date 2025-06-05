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

export async function POST(req: NextRequest) {
  try {
    console.log('🚨 AVVIO RESET STATISTICHE - Correzione doppi conteggi');
    
    // 1. Reset completo della tabella player_stats
    console.log('📊 Reset tabella player_stats...');
    const existingStats = await base('player_stats').select().all();
    
    if (existingStats.length > 0) {
      // Cancella tutti i record esistenti
      const deletePromises = [];
      for (let i = 0; i < existingStats.length; i += 10) {
        const batch = existingStats.slice(i, i + 10);
        deletePromises.push(
          base('player_stats').destroy(batch.map(r => r.id))
        );
      }
      await Promise.all(deletePromises);
      console.log(`✅ Cancellati ${existingStats.length} record statistiche obsoleti`);
    }

    // 2. Reset completo della tabella player_awards
    console.log('🏆 Reset tabella player_awards...');
    try {
      const existingAwards = await base('player_awards').select().all();
      
      if (existingAwards.length > 0) {
        const deleteAwardPromises = [];
        for (let i = 0; i < existingAwards.length; i += 10) {
          const batch = existingAwards.slice(i, i + 10);
          deleteAwardPromises.push(
            base('player_awards').destroy(batch.map(r => r.id))
          );
        }
        await Promise.all(deleteAwardPromises);
        console.log(`✅ Cancellati ${existingAwards.length} premi obsoleti`);
      }
    } catch (awardsError) {
      console.log('⚠️ Tabella player_awards non esiste ancora o errore:', awardsError);
    }

    // 3. Riprocessa tutte le partite completate
    console.log('⚽ Recupero partite completate da riprocessare...');
    const matches = await base('matches').select({
      filterByFormula: '{completed} = TRUE()'
    }).all();

    console.log(`📝 Trovate ${matches.length} partite completate da riprocessare`);
    
    let successfulProcessed = 0;
    let errors = 0;
    
    for (const match of matches) {
      try {
        const matchId = match.get('IDmatch') as string;
        console.log(`🔄 Processando partita: ${matchId}`);
        
        // Riprocessa la partita (ora che abbiamo resettato tutto, non ci sarà conflitto)
        const response = await fetch(`${req.nextUrl.origin}/api/matches/${matchId}/process-awards`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Partita ${matchId} processata: ${result.awards} premi assegnati`);
          successfulProcessed++;
        } else {
          console.error(`❌ Errore nel processare partita ${matchId}:`, response.status);
          errors++;
        }
      } catch (matchError) {
        console.error(`❌ Errore nel processare partita:`, matchError);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reset statistiche completato con successo',
      details: {
        statsResetted: existingStats.length,
        matchesReprocessed: successfulProcessed,
        errors: errors,
        totalMatches: matches.length
      }
    });

  } catch (error) {
    console.error('❌ Errore nel reset statistiche:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel reset delle statistiche',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 