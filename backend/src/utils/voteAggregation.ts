import Airtable from 'airtable';

// Configurazione Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Credenziali Airtable mancanti nelle variabili d\'ambiente');
}

const base = Airtable.base(baseId);

// Interfaccia per i dati aggregati dei voti
interface VoteAggregation {
  playerEmail: string;
  upVotes: number;
  downVotes: number;
  neutralVotes: number;
  motmVotes: number;
  totalVotes: number;
  netVotes: number;
}

/**
 * Funzione per aggregare i voti di una specifica partita
 * @param matchId - ID della partita da aggregare
 * @returns Array di aggregazioni per giocatore
 */
export async function aggregateVotesForMatch(matchId: string): Promise<VoteAggregation[]> {
  try {
    console.log('🔄 Aggregazione voti per partita:', matchId);
    
    // Recupera tutti i voti per questa partita
    const voteRecords = await base('votes').select({
      filterByFormula: `{matchId} = "${matchId}"`
    }).all();
    
    console.log(`📊 Trovati ${voteRecords.length} voti per la partita ${matchId}`);
    
    // Raggruppa i voti per giocatore votato (toPlayerId)
    const votesByPlayer: { [playerEmail: string]: VoteAggregation } = {};
    
    voteRecords.forEach(record => {
      const toPlayerId = record.get('toPlayerId') as string;
      const voteType = record.get('voteType') as string;
      const motmVote = record.get('motm_vote') as boolean;
      
      if (!votesByPlayer[toPlayerId]) {
        votesByPlayer[toPlayerId] = {
          playerEmail: toPlayerId,
          upVotes: 0,
          downVotes: 0,
          neutralVotes: 0,
          motmVotes: 0,
          totalVotes: 0,
          netVotes: 0
        };
      }
      
      // Conta i tipi di voto
      if (voteType === 'UP') {
        votesByPlayer[toPlayerId].upVotes++;
      } else if (voteType === 'DOWN') {
        votesByPlayer[toPlayerId].downVotes++;
      } else if (voteType === 'NEUTRAL') {
        votesByPlayer[toPlayerId].neutralVotes++;
      }
      
      // Conta i voti MOTM
      if (motmVote) {
        votesByPlayer[toPlayerId].motmVotes++;
      }
      
      votesByPlayer[toPlayerId].totalVotes++;
    });
    
    // Calcola netVotes per ogni giocatore
    Object.values(votesByPlayer).forEach(aggregation => {
      aggregation.netVotes = aggregation.upVotes - aggregation.downVotes;
    });
    
    const aggregations = Object.values(votesByPlayer);
    console.log(`✅ Aggregazione completata per ${aggregations.length} giocatori`);
    
    return aggregations;
    
  } catch (error) {
    console.error('❌ Errore nell\'aggregazione voti:', error);
    throw error;
  }
}

/**
 * Funzione per aggiornare le statistiche aggregate di un giocatore in player_stats
 * @param playerEmail - Email del giocatore
 * @param voteAggregation - Dati aggregati dei voti da aggiungere
 */
export async function updatePlayerStatsWithVotes(
  playerEmail: string, 
  voteAggregation: VoteAggregation
): Promise<void> {
  try {
    console.log(`🔄 Aggiornamento statistiche voti per ${playerEmail}:`, voteAggregation);
    
    // Trova il record del giocatore in player_stats
    const playerRecords = await base('player_stats').select({
      filterByFormula: `{playerEmail} = "${playerEmail}"`
    }).all();
    
    if (playerRecords.length === 0) {
      console.log(`⚠️ Giocatore ${playerEmail} non trovato in player_stats, creo nuovo record`);
      
      // ✅ Crea nuovo record con i campi confermati dall'immagine Airtable dell'utente
      await base('player_stats').create({
        playerEmail: playerEmail,
        Gol: 0,
        partiteDisputate: 0,
        partiteVinte: 0,
        partitePareggiate: 0,
        partitePerse: 0,
        assistenze: 0,
        cartelliniGialli: 0,
        cartelliniRossi: 0,
        // ✅ Campi per i voti aggregati - nomi confermati dall'immagine
        upVotes: voteAggregation.upVotes,
        downVotes: voteAggregation.downVotes,
        neutralVotes: voteAggregation.neutralVotes,
        motmVotes: voteAggregation.motmVotes
      });
      
    } else {
      const playerRecord = playerRecords[0];
      const currentUpVotes = Number(playerRecord.get('upVotes')) || 0;
      const currentDownVotes = Number(playerRecord.get('downVotes')) || 0;
      const currentNeutralVotes = Number(playerRecord.get('neutralVotes')) || 0;
      const currentMotmVotes = Number(playerRecord.get('motmVotes')) || 0;
      
      // ✅ Aggiorna aggiungendo i nuovi voti a quelli esistenti
      await base('player_stats').update(playerRecord.id, {
        upVotes: currentUpVotes + voteAggregation.upVotes,
        downVotes: currentDownVotes + voteAggregation.downVotes,
        neutralVotes: currentNeutralVotes + voteAggregation.neutralVotes,
        motmVotes: currentMotmVotes + voteAggregation.motmVotes
      });
    }
    
    console.log(`✅ Statistiche voti aggiornate per ${playerEmail}`);
    
  } catch (error) {
    console.error(`❌ Errore nell'aggiornamento statistiche per ${playerEmail}:`, error);
    throw error;
  }
}

/**
 * Funzione per processare tutti i voti di una partita e aggiornarli in player_stats
 * @param matchId - ID della partita da processare
 */
export async function processMatchVotesToPlayerStats(matchId: string): Promise<void> {
  try {
    console.log('🚀 Processamento voti per player_stats, partita:', matchId);
    
    // 1. Aggrega i voti per questa partita
    const aggregations = await aggregateVotesForMatch(matchId);
    
    // 2. Aggiorna player_stats per ogni giocatore
    for (const aggregation of aggregations) {
      await updatePlayerStatsWithVotes(aggregation.playerEmail, aggregation);
    }
    
    console.log(`✅ Processamento completato per ${aggregations.length} giocatori`);
    
  } catch (error) {
    console.error('❌ Errore nel processamento voti per player_stats:', error);
    throw error;
  }
}

/**
 * Funzione per cancellare i voti di una partita dalla tabella votes
 * @param matchId - ID della partita di cui cancellare i voti
 */
export async function cleanupMatchVotes(matchId: string): Promise<void> {
  try {
    console.log('🗑️ Cancellazione voti vecchi per partita:', matchId);
    
    // Recupera tutti i voti per questa partita
    const voteRecords = await base('votes').select({
      filterByFormula: `{matchId} = "${matchId}"`
    }).all();
    
    if (voteRecords.length === 0) {
      console.log('⚠️ Nessun voto da cancellare');
      return;
    }
    
    // Cancella i record in batch (max 10 per volta per limitazioni Airtable)
    const batchSize = 10;
    for (let i = 0; i < voteRecords.length; i += batchSize) {
      const batch = voteRecords.slice(i, i + batchSize);
      const recordIds = batch.map(record => record.id);
      
      await base('votes').destroy(recordIds);
      console.log(`🗑️ Cancellati ${recordIds.length} voti (batch ${Math.floor(i / batchSize) + 1})`);
    }
    
    console.log(`✅ Cancellazione completata: ${voteRecords.length} voti rimossi`);
    
  } catch (error) {
    console.error('❌ Errore nella cancellazione voti:', error);
    throw error;
  }
} 