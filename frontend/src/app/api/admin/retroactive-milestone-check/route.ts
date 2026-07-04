import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

const conditionFieldToColumn: Record<string, string> = {
  Gol: 'gol',
  gol: 'gol',
  assistenze: 'assistenze',
  partiteVinte: 'partite_vinte',
  partiteDisputate: 'partite_disputate',
};

export async function POST() {
  try {
    const { data: specialCardsRecords, error: cardsError } = await supabase
      .from('special_cards')
      .select('*')
      .eq('is_active', true)
      .eq('condition_type', 'player_stats')
      .eq('ranking_behavior', 'threshold_met');

    if (cardsError) throw cardsError;

    const { data: allPlayerStatsRecords, error: statsError } = await supabase.from('player_stats').select('*');
    if (statsError) throw statsError;

    let milestonesAssigned = 0;
    const assignedMilestones: Array<{ playerEmail: string; awardType: string; currentValue: number; requiredValue: number }> = [];

    for (const playerStatsRecord of allPlayerStatsRecords || []) {
      const playerEmail = playerStatsRecord.player_email as string;

      for (const milestone of specialCardsRecords || []) {
        const templateId = milestone.template_id as string;
        const conditionField = milestone.condition_field as string;
        const conditionValue = Number(milestone.condition_value) || 0;
        const column = conditionFieldToColumn[conditionField] || conditionField;

        const currentValue = Number((playerStatsRecord as Record<string, unknown>)[column]) || 0;

        if (currentValue >= conditionValue) {
          const { data: existingMilestone } = await supabase
            .from('player_awards')
            .select('id')
            .eq('player_email', playerEmail)
            .eq('award_type', templateId);

          if (!existingMilestone || existingMilestone.length === 0) {
            await supabase.from('player_awards').insert({
              player_email: playerEmail,
              award_type: templateId,
              match_id: 'retroactive-check',
              status: 'pending',
            });

            assignedMilestones.push({ playerEmail, awardType: templateId, currentValue, requiredValue: conditionValue });
            milestonesAssigned++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Controllo retroattivo milestone completato',
      milestonesAssigned,
      playersChecked: allPlayerStatsRecords?.length || 0,
      milestoneTypesChecked: specialCardsRecords?.length || 0,
      assignedMilestones,
    });
  } catch (error) {
    console.error('Errore nel controllo retroattivo milestone:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel controllo retroattivo milestone', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}
