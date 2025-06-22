import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { matchId } = await req.json();
    
    if (!matchId) {
      return NextResponse.json({
        success: false,
        error: 'matchId richiesto'
      }, { status: 400 });
    }
    
    console.log('🔧 FORCE FINALIZE: Finalizzazione forzata per partita:', matchId);
    
    // Chiama direttamente l'endpoint di finalizzazione
    const finalizeUrl = `http://localhost:3001/api/matches/${matchId}/finalize-voting`;
    
    const finalizeResponse = await fetch(finalizeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        force: true
      })
    });

    const finalizeData = await finalizeResponse.json();
    
    if (finalizeData.success) {
      console.log('✅ FORCE FINALIZE: Partita finalizzata con successo');
      
      return NextResponse.json({
        success: true,
        message: 'Partita finalizzata forzatamente con successo',
        matchId,
        motmAwarded: finalizeData.motmAwards || 0,
        abilitiesUpdated: finalizeData.playerAbilitiesUpdated || 0,
        details: finalizeData
      });
    } else {
      console.log('❌ FORCE FINALIZE: Errore nella finalizzazione:', finalizeData.error);
      
      return NextResponse.json({
        success: false,
        error: 'Errore nella finalizzazione forzata',
        details: finalizeData.error,
        matchId
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ FORCE FINALIZE: Errore durante finalizzazione forzata:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore durante finalizzazione forzata',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 