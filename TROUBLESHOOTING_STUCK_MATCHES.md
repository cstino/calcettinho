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

# Troubleshooting Guide - Calcettinho

## Problema: Votazioni Bloccate

### Sintomi
- Partita completata da oltre 24 ore ma votazioni ancora aperte
- Giocatori non ricevono aggiornamenti statistiche  
- Sistema di voti non si chiude automaticamente

### Cause Principali
1. **Bug nel conteggio voti**: Campo `fromPlayerEmail` vs `fromPlayerId` 
2. **Cron job Vercel non affidabile**: Dipendenza da servizi esterni
3. **Variabili ambiente mancanti**: `NEXTAUTH_URL`, `CRON_SECRET`

### Soluzione: Interfaccia Admin

#### Nuovi Controlli Admin (Pagina Matches)
Per ogni partita completata sono disponibili due pulsanti:

**🗳️ "Stato Voti"**
- Mostra progresso votazioni (es. "6/10 players voted")
- Lista chi ha votato ✅ vs chi non ha votato ⏰
- Indica ore trascorse e timeout status
- Progress bar visuale

**⚡ "Forza Chiusura"** 
- Chiude manualmente le votazioni bloccate
- Assegna MOTM basato sui voti ricevuti
- Aggiorna abilità giocatori con Fair Algorithm v1.3
- Conferma richiesta per sicurezza

#### API Endpoints Admin
- `GET /api/admin/debug-stuck-matches` - Analizza partite bloccate
- `POST /api/admin/force-finalize-match` - Forza chiusura votazioni

### Bug Risolti
1. **Finalize Voting**: Corretto `fromPlayerEmail` → `fromPlayerId` (linea 78)
2. **CORS Backend**: Aggiunto supporto cross-origin per frontend
3. **Environment Variables**: Documentate variabili mancanti

### File Modificati
- `backend/src/app/api/matches/[id]/finalize-voting/route.ts`
- `frontend/src/app/components/VotingStatusModal.tsx` (nuovo)
- `frontend/src/app/matches/page.tsx` (controlli admin)
- `backend/src/app/api/admin/debug-stuck-matches/route.ts` (nuovo)
- `backend/src/app/api/admin/force-finalize-match/route.ts` (nuovo)
- `backend/next.config.js` (CORS)

---

## Modifiche Card Speciali Milestone

### Cambiamenti Richiesti
Trasformare alcune card da **post-match** a **milestone** basate su statistiche cumulative:

#### Card Gol (Milestone Progressive)
- **goleador**: 10 gol totali in carriera (era: più gol in singola partita)
- **matador**: 25 gol totali in carriera (era: post-match)  
- **goldenboot**: 50 gol totali in carriera (era: post-match)

#### Card Assist (Milestone Progressive)
- **assistman**: 10 assist totali in carriera (era: più assist in singola partita)
- **regista**: 25 assist totali in carriera (era: post-match)
- **elfutbol**: 50 assist totali in carriera (era: post-match)

### Modifiche Necessarie in Airtable

#### Tabella `special_cards` - Aggiornamenti:

**1. goleador**
```
condition_type: player_stats
condition_field: Gol  
condition_value: 10
ranking_behavior: threshold_met
```

**2. matador**
```
condition_type: player_stats
condition_field: Gol
condition_value: 25  
ranking_behavior: threshold_met
```

**3. goldenboot**
```
condition_type: player_stats
condition_field: Gol
condition_value: 50
ranking_behavior: threshold_met
```

**4. assistman**
```
condition_type: player_stats
condition_field: assistenze
condition_value: 10
ranking_behavior: threshold_met
```

**5. regista**
```
condition_type: player_stats  
condition_field: assistenze
condition_value: 25
ranking_behavior: threshold_met
```

**6. elfutbol**
```
condition_type: player_stats
condition_field: assistenze  
condition_value: 50
ranking_behavior: threshold_met
```

### Vantaggi del Nuovo Sistema
- **Progressione più sensata**: Card sbloccate con milestone realistiche
- **Motivazione a lungo termine**: Obiettivi cumulativi vs singola partita
- **Sistema più equo**: Non dipende dalla prestazione di una sola partita
- **Collezione progressiva**: Catene logiche goleador → matador → goldenboot

### Note Implementazione
- Il sistema controlla automaticamente le milestone dopo ogni partita
- Le card vengono assegnate una sola volta quando si raggiunge la soglia
- Non sostituisce le card esistenti già sbloccate dai giocatori 