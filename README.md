# Calcettinho ⚽️

Gestione gratuita, su invito, di una lega di calcetto 5vs5!

## Struttura
- **frontend/**: Next.js + Tailwind + Framer Motion
- **backend/**: Next.js API Routes + Google Sheets API

## 🎮 Sistema di Gioco

### 🗳️ Votazioni Up/Down
- **Interfaccia**: Sistema di carte a scorrimento post-partita
- **Meccanismo**: Ogni partecipante vota gli altri 9 giocatori con "UP" 👍 o "DOWN" 👎
- **Chiusura votazioni**: Automatica dopo che tutti hanno votato O dopo 48 ore dalla fine partita
- **Range voti**: Min 9 DOWN, Max 9 UP per giocatore

### 📈 Evoluzione Statistiche
- **Vittoria**: +0.5 base a tutte le statistiche (ATT, DIF, VEL, PAS, FOR, POR)
- **Sconfitta**: -0.5 base a tutte le statistiche
- **Pareggio**: Nessun cambiamento
- **Voti UP/DOWN**: Modificatore aggiuntivo basato sui voti ricevuti
- **Limiti**: 1.0-99.0 per ogni statistica (1 decimale)
- **Sistema Fair**: Giocatori con overall più basso evolvono più velocemente

### 🧮 Algoritmo Fair Dettagliato
**Componenti del Cambiamento:**
1. **Base Vittoria/Sconfitta**: ±0.5 punti
2. **Bonus UP/DOWN**: NetVotes × 0.1 (range -0.9 a +0.9)
3. **Moltiplicatore Fair**: Basato sull'overall del giocatore

**Sistema di Voti (9 votanti):**
- Range NetVotes: da -9 (0UP/9DOWN) a +9 (9UP/0DOWN)
- Esempi: 8UP/1DOWN = +7, 6UP/3DOWN = +3, 4UP/5DOWN = -1

**Moltiplicatore Fair:**
- **Overall < 50**: Salita +30%, Discesa -20%
- **Overall 50-69**: Salita +10%, Discesa -10%  
- **Overall ≥ 70**: Normale (senza moltiplicatore)

**Esempi Pratici:**
- Giocatore Overall 45 + Vittoria + 8UP/1DOWN = +1.56 stats
- Giocatore Overall 85 + Vittoria + 8UP/1DOWN = +1.2 stats
- Giocatore Overall 45 + Sconfitta + 2UP/7DOWN = -0.64 stats

**Progressione Categorie:**
- Bronze → Silver (45→65): ~20 vittorie nette
- Silver → Gold (65→78): ~15 vittorie nette
- Gold → Ultimate (78→90): ~15 vittorie nette

### 🏆 Sistema Premi (Cards Speciali - Permanenti)
**Premi Post-Partita:**
- **Man of the Match** (`motm`): Più UP ricevuti in partita
- **Goleador** (`goleador`): Più gol segnati in partita
- **Assist Man** (`assistman`): Più assist forniti in partita

**Premi Milestone:**
- **Prima Presenza** (`1presenza`): Prima partita giocata
- **Streak Winner 3** (`win3`): 3 vittorie consecutive
- **Streak Winner 5** (`win5`): 5 vittorie consecutive  
- **Streak Winner 10** (`win10`): 10 vittorie consecutive

**Meccanismo:**
- Cards permanenti sbloccate per sempre
- In caso di pareggio UP: vince il giocatore della squadra vincente
- Pareggio UP stessa squadra: entrambi vincono il premio

### 🎨 Sistema Personalizzazione Card
**Visualizzazione:**
- **Default**: Carta base (bronzo/argento/oro/ultimate) sempre visibile
- **Hover Effect**: Flip 3D che rivela la carta premio selezionata dal giocatore
- **Sezione Trofei**: Collezione di tutte le carte sbloccate
- **Selezione**: Il giocatore sceglie quale carta mostrare nell'hover

### 🔔 Sistema Notifiche e Unlock
**Flusso Premio:**
1. **Email automatica**: Notifica al giocatore del premio vinto
2. **Badge navbar**: Icona rossa sopra "Profilo" per premi non sbloccati
3. **Pulsante unlock**: "Sblocca Evoluzione" nella pagina profilo
4. **Animazione reveal**: Animazione coinvolgente della card sbloccata
5. **Sezione Trofei**: Collezione permanente e selezione carta attiva

**Stati Premio:**
- `pending`: Premio assegnato, email inviata, badge attivo
- `unlocked`: Premio sbloccato tramite animazione, badge rimosso, carta disponibile

## Setup rapido

1. **Clona la repo**
2. **Crea un Google Sheet** con i seguenti tab:
   - `whitelist` (email)
   - `players` (nome, email, foto, ATT, DIF, VEL, PAS, FOR, POR)
   - `pending_requests` (email, timestamp)
   - `matches` (id, data, teamA, teamB, risultato, playerStats)
   - `votes` (match_id, voter_email, voted_email, vote_type)
   - `player_awards` (player_email, award_type, match_id, status, unlocked_at, selected)
3. **Crea un Service Account Google** e condividi il foglio con la sua email
4. **Copia `.env.example` in `.env` nella cartella backend e inserisci i dati**

## Variabili d'ambiente (backend/.env)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` = email del service account
- `GOOGLE_PRIVATE_KEY` = chiave privata del service account (tra doppi apici)
- `GOOGLE_SHEET_ID` = ID del Google Sheet

## Avvio sviluppo

```sh
cd frontend
npm run dev
# In un altro terminale
cd backend
npm run dev
```

## Deploy
- Consigliato: Vercel (Next.js fullstack)
- Imposta le variabili d'ambiente su Vercel per il backend

## API Examples
Vedi file `postman_collection.json` per esempi di chiamate API.

## File grafici

### Card Standard
- Carica i 4 template delle card base in:
  - `backend/public/cards/`
  - `frontend/public/cards/`

File richiesti:
- `bronzo.png`
- `argento.png`
- `oro.png`
- `ultimate.png`

### Card Speciali (Premi)
- Carica le card speciali in:
  - `backend/public/cards/special/`
  - `frontend/public/cards/special/`

File richiesti:
- `1presenza.png` - Prima partita
- `motm.png` - Man of the Match
- `goleador.png` - Miglior marcatore
- `assistman.png` - Miglior assistman
- `win3.png` - 3 vittorie consecutive
- `win5.png` - 5 vittorie consecutive
- `win10.png` - 10 vittorie consecutive

### Foto Giocatori
- Carica le foto dei giocatori in:
  - `backend/public/players/`
  - `frontend/public/players/`

Le foto devono essere nominate con l'email (es: `nome@email.com.jpg`).

---

**Made with ❤️ by la community!** 