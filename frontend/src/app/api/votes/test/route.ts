import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurazione Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

export async function GET() {
  try {
    if (!apiKey || !baseId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Credenziali Airtable mancanti' 
      }, { status: 500 });
    }

    Airtable.configure({
      endpointUrl: 'https://api.airtable.com',
      apiKey: apiKey
    });

    const base = Airtable.base(baseId);

    console.log('Test API Votazioni - Credenziali:', {
      apiKey: apiKey ? `${apiKey.slice(0, 10)}...` : 'MISSING',
      baseId: baseId || 'MISSING'
    });

    // Prova a creare un voto di test nella tabella "votes"
    const testVote = await base('votes').create({
      matchId: `test_match_${Date.now()}`,
      fromPlayerId: 'test@example.com',
      toPlayerId: 'cr.96bc@gmail.com',
      value: 8
    });

    console.log('Voto di test creato:', testVote.id);

    return NextResponse.json({
      success: true,
      message: 'Tabella votes funziona correttamente',
      testVoteId: testVote.id,
      credentials: {
        apiKey: apiKey ? `${apiKey.slice(0, 10)}...` : 'MISSING',
        baseId: baseId || 'MISSING'
      }
    });

  } catch (error) {
    console.error('Errore test votazioni:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel test della tabella votes',
      details: error instanceof Error ? error.message : 'Errore sconosciuto',
      credentials: {
        apiKey: apiKey ? `${apiKey.slice(0, 10)}...` : 'MISSING',
        baseId: baseId || 'MISSING'
      }
    }, { status: 500 });
  }
} 