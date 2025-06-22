# 🚨 Guida Risoluzione Partite Bloccate

## Problema
Le partite rimangono con `voting_status = 'open'` per più di 24 ore e non si chiudono automaticamente.

## Cause Principali

### 1. **Bug Campo fromPlayerId vs fromPlayerEmail** ✅ RISOLTO
- **Problema**: Il sistema salvava i voti con `fromPlayerId` ma li leggeva con `fromPlayerEmail`
- **Soluzione**: Corretto in `finalize-voting/route.ts` linea 78

### 2. **Variabili d'Ambiente Mancanti**
Controllare che siano configurate:
```env
NEXTAUTH_URL=https://your-backend-url.vercel.app
CRON_SECRET=your_secure_random_string_here
```

### 3. **Cron Job Vercel Non Attivo**
- Verificare che il cron sia deployato su Vercel
- Controllare i log Vercel per errori nel cron

## Strumenti di Diagnosi

### 1. **Debug Partite Bloccate**
```bash
# GET per vedere tutte le partite bloccate
curl -X GET "https://your-backend-url.vercel.app/api/admin/debug-stuck-matches"
```

Risposta di esempio:
```json
{
  "success": true,
  "stuckMatches": 2,
  "waitingMatches": 0,
  "results": [
    {
      "matchId": "match_123",
      "hoursElapsed": 48.5,
      "isTimeout": true,
      "status": "TIMEOUT_STUCK",
      "totalPlayers": 8,
      "playersVoted": 6,
      "playersWhoHaventVoted": ["player1@email.com", "player2@email.com"]
    }
  ]
}
```

### 2. **Sbloccare Manualmente una Partita**
```bash
# POST per forzare la finalizzazione
curl -X POST "https://your-backend-url.vercel.app/api/admin/force-finalize-match" \
  -H "Content-Type: application/json" \
  -d '{"matchId": "match_123"}'
```

## Procedura di Riparazione

### **Opzione 1: Riparazione Automatica**
```bash
# 1. Trova le partite bloccate
curl -X GET "https://your-backend-url.vercel.app/api/admin/debug-stuck-matches"

# 2. Per ogni partita bloccata (status: "TIMEOUT_STUCK"), forza la finalizzazione
curl -X POST "https://your-backend-url.vercel.app/api/admin/force-finalize-match" \
  -H "Content-Type: application/json" \
  -d '{"matchId": "MATCH_ID_QUI"}'
```

### **Opzione 2: Test Cron Job Manuale**
```bash
# Testa il cron job manualmente (richiede CRON_SECRET)
curl -X GET "https://your-backend-url.vercel.app/api/cron/check-voting-timeouts" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Verifiche Post-Riparazione

Dopo aver riparato una partita, verifica:

1. **Stato Votazioni**: `voting_status = 'closed'`
2. **MOTM Assegnato**: Controlla `player_awards` per i premi MOTM
3. **Abilità Aggiornate**: Verifica che le statistiche dei giocatori siano state aggiornate
4. **Statistiche Base**: Controlla `player_stats` per gol, partite, ecc.

## Prevenzione Futura

1. **Configurare Correttamente le Variabili d'Ambiente**:
   - `NEXTAUTH_URL` per le chiamate interne
   - `CRON_SECRET` per la sicurezza del cron job

2. **Monitoraggio Vercel**:
   - Controllare regolarmente i log del cron job
   - Verificare che il cron sia attivo nel dashboard Vercel

3. **Test Periodici**:
   - Testare manualmente l'endpoint di debug
   - Verificare che il sistema di timeout funzioni

## Log di Errori Comuni

### Errore: "Unauthorized" nel Cron
```
❌ CRON: Autorizzazione fallita
```
**Soluzione**: Configurare `CRON_SECRET` nelle variabili Vercel

### Errore: "fromPlayerEmail is not defined"
```
❌ Errore nel controllo chiusura votazioni
```
**Soluzione**: ✅ Già risolto - usare `fromPlayerId`

### Errore: "fetch failed" nelle chiamate interne
```
❌ Errore durante finalize-voting automatico
```
**Soluzione**: Configurare `NEXTAUTH_URL` correttamente 