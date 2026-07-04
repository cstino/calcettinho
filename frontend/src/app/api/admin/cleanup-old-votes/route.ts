import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// Endpoint amministrativo per pulire manualmente i voti vecchi (righe già aggregate in player_stats).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchIds, beforeDate, dryRun = true } = body;

    let query = supabase.from('votes').select('id, match_id, created_at');

    if (matchIds && Array.isArray(matchIds) && matchIds.length > 0) {
      query = query.in('match_id', matchIds);
    } else if (beforeDate) {
      query = query.lt('created_at', beforeDate);
    } else {
      return NextResponse.json({ success: false, error: 'Specificare matchIds o beforeDate per la pulizia' }, { status: 400 });
    }

    const { data: voteRecords, error } = await query;
    if (error) throw error;

    if (!voteRecords || voteRecords.length === 0) {
      return NextResponse.json({ success: true, message: 'Nessun voto da eliminare', deletedCount: 0, dryRun });
    }

    const votesByMatch: Record<string, number> = {};
    voteRecords.forEach((record) => {
      votesByMatch[record.match_id] = (votesByMatch[record.match_id] || 0) + 1;
    });

    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: 'Dry run completato - nessun voto cancellato',
        deletedCount: 0,
        wouldDeleteCount: voteRecords.length,
        matchBreakdown: votesByMatch,
        dryRun: true,
      });
    }

    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .in('id', voteRecords.map((r) => r.id));

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: `Pulizia completata: ${voteRecords.length} voti cancellati`,
      deletedCount: voteRecords.length,
      totalFound: voteRecords.length,
      matchBreakdown: votesByMatch,
      dryRun: false,
    });
  } catch (error) {
    console.error('Errore nella pulizia voti:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nella pulizia voti', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}

// Statistiche sui voti senza cancellarli
export async function GET() {
  try {
    const { data: allVotes, error } = await supabase.from('votes').select('match_id, created_at');
    if (error) throw error;

    const votesByMatch: Record<string, { count: number; oldestDate: string; newestDate: string }> = {};

    (allVotes || []).forEach((record) => {
      const matchId = record.match_id;
      const created = record.created_at;
      if (!votesByMatch[matchId]) {
        votesByMatch[matchId] = { count: 0, oldestDate: created, newestDate: created };
      }
      votesByMatch[matchId].count++;
      if (new Date(created) < new Date(votesByMatch[matchId].oldestDate)) votesByMatch[matchId].oldestDate = created;
      if (new Date(created) > new Date(votesByMatch[matchId].newestDate)) votesByMatch[matchId].newestDate = created;
    });

    const totalVotes = allVotes?.length || 0;
    const totalMatches = Object.keys(votesByMatch).length;
    const avgVotesPerMatch = totalMatches > 0 ? totalVotes / totalMatches : 0;

    const topMatches = Object.entries(votesByMatch)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([matchId, data]) => ({ matchId, ...data }));

    return NextResponse.json({
      success: true,
      summary: {
        totalVotes,
        totalMatches,
        avgVotesPerMatch: Math.round(avgVotesPerMatch * 10) / 10,
        isApproachingLimit: false,
        limitReached: false,
      },
      topMatches,
      allMatches: votesByMatch,
    });
  } catch (error) {
    console.error('Errore nel recupero statistiche voti:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero statistiche voti', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}
