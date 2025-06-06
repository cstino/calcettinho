import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurazione Airtable
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
});

const base = airtable.base(process.env.AIRTABLE_BASE_ID!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ voterEmail: string; matchId: string }> }
) {
  try {
    // ✅ FIXED: Await params come richiesto da Next.js 15
    const { voterEmail, matchId } = await params;

    console.log('🔍 Controllo voti per:', {
      voterEmail: decodeURIComponent(voterEmail),
      matchId: decodeURIComponent(matchId)
    });

    // ✅ FIXED: Corretto nome tabella e campi per allinearsi con submit API
    const records = await base('votes').select({
      filterByFormula: `AND({fromPlayerId} = '${decodeURIComponent(voterEmail)}', {matchId} = '${decodeURIComponent(matchId)}')`
    }).firstPage();

    const hasVoted = records.length > 0;

    const result = {
      voterEmail: decodeURIComponent(voterEmail),
      matchId: decodeURIComponent(matchId),
      hasVoted,
      recordsFound: records.length
    };

    console.log('✅ Risultato controllo voti:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Errore controllo voti:', error);
    return NextResponse.json(
      { error: 'Errore nel controllo voti', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 