# Calcettinho ⚽️

Gestione gratuita, su invito, di una lega di calcetto 5vs5!

## Struttura
- **frontend/**: Next.js + Tailwind + Framer Motion
- **backend/**: Next.js API Routes + Airtable Database

## 🎮 Sistema di Gioco

### 🗳️ Votazioni Up/Down
- **Interfaccia**: Sistema di carte a scorrimento post-partita
- **Meccanismo**: Ogni partecipante vota gli altri 9 giocatori con "UP" 👍 o "DOWN" 👎
- **Chiusura votazioni**: Automatica dopo che tutti hanno votato O dopo 48 ore dalla fine partita
- **Range voti**: Min 9 DOWN, Max 9 UP per giocatore
- **Stato votazioni**: Bottone "Vota Ora" diventa "Voti Inviati" dopo aver votato
- **Prevenzione duplicati**: Sistema che impedisce voti multipli per la stessa partita

### 📈 Evoluzione Statistiche
- **Vittoria**: +0.083 base a tutte le statistiche (ATT, DIF, VEL, PAS, FOR, POR) - circa +1 overall ogni 2 vittorie
- **Sconfitta**: -0.083 base a tutte le statistiche  
- **Pareggio**: Nessun cambiamento
- **Voti UP/DOWN**: Modificatore aggiuntivo basato sui voti ricevuti (ridotto)
- **Overall**: Calcolato come media delle 5 migliori statistiche del giocatore (non tutte e 6)
- **Limiti**: 1.0-99.0 per ogni statistica (1 decimale)
- **Sistema Fair**: Giocatori con overall più basso evolvono leggermente più velocemente

### 🧮 Algoritmo Fair Dettagliato
**Componenti del Cambiamento:**
1. **Base Vittoria/Sconfitta**: ±0.083 punti (ridotto per evoluzione più graduale)
2. **Bonus UP/DOWN**: NetVotes × 0.02 (range -0.18 a +0.18, ridotto)
3. **Moltiplicatore Fair**: Basato sull'overall del giocatore (ridotto)

**Sistema di Voti (9 votanti):**
- Range NetVotes: da -9 (0UP/9DOWN) a +9 (9UP/0DOWN)
- Esempi: 8UP/1DOWN = +7, 6UP/3DOWN = +3, 4UP/5DOWN = -1

**Moltiplicatore Fair (ridotto):**
- **Overall < 50**: Salita +10%, Discesa -5%
- **Overall 50-69**: Salita +2%, Discesa -2%  
- **Overall ≥ 70**: Normale (senza moltiplicatore)

**Esempi Pratici (nuovi valori):**
- Giocatore Overall 45 + Vittoria + 8UP/1DOWN = ~+0.25 stats per statistica
- Giocatore Overall 85 + Vittoria + 8UP/1DOWN = ~+0.22 stats per statistica
- Progressione molto più graduale e realistica

**Note Importanti:**
- **Overall = Media delle 5 migliori statistiche** (non tutte e 6)
- Obiettivo: +1 overall ogni 2 vittorie circa
- Sistema molto più equilibrato e meno inflazionato

### 🏆 Sistema Achievement Completo (Cards Speciali)

#### **Premi Post-Partita (Automatici)**
- **Man of the Match** (`motm`): Più UP ricevuti in partita
- **Goleador** (`goleador`): Più gol segnati in partita  
- **Assist Man** (`assistman`): Più assist forniti in partita

#### **Premi Milestone (Automatici)**
- **Prima Presenza** (`1presenza`): Prima partita giocata
- **10 Vittorie** (`win10`): 10 vittorie totali raggiunte
- **25 Vittorie** (`win25`): 25 vittorie totali raggiunte
- **50 Vittorie** (`win50`): 50 vittorie totali raggiunte

#### **Sistema Dinamico Achievement**
- **Lettura automatica**: Il sistema legge le condizioni dalla tabella `special_cards` di Airtable
- **Controllo post-partita**: Dopo ogni match vengono verificati tutti i milestone
- **Prevenzione duplicati**: Ogni achievement può essere vinto solo una volta
- **Assegnazione automatica**: I premi vengono assegnati automaticamente quando le condizioni sono soddisfatte

#### **Configurazione Achievement (Airtable)**
Tabella `special_cards` con campi:
- `template_id`: ID univoco della card (es. "win10", "motm")
- `template_image`: Nome file immagine della card
- `condition_type`: Tipo di condizione ("post_match" o "milestone")
- `condition_field`: Campo da controllare (es. "partiteVinte", "upVotes")
- `condition_value`: Valore soglia da raggiungere
- `ranking_behavior`: Come gestire i pareggi ("winner_team", "both")
- `tie_breaker_rule`: Regola per i pareggi
- `is_active`: Se l'achievement è attivo

### 🎨 Sistema Card e Collezione

#### **Generazione Card Automatica**
- **API Dinamica**: `/api/card/[email]` per card base e `/api/card-special/[email]/[type]` per card speciali
- **Font Personalizzato**: Utilizzo del font "Nebulax" per testi delle card
- **Posizionamento Allineato**: Statistiche e valori perfettamente allineati tra card base e speciali
- **Template Multipli**: Supporto per diversi template di card speciali

#### **Interfaccia Collezione Evoluzioni**
- **Griglia Completa**: Visualizzazione di tutte le card speciali disponibili (7 totali)
- **Stati Visivi**:
  - **Card Sbloccate**: Mostrano l'anteprima reale della card
  - **Card Bloccate**: Icona lucchetto con gradiente del colore tematico
  - **Card Attiva**: Bordo colorato e badge "ATTIVA"
- **Modal Selezione**: Click su card sbloccata apre modal per selezione come retro
- **Solo Proprietario**: Funzionalità di selezione disponibile solo per il proprietario del profilo

#### **Sistema Notifiche Evoluzioni**
- **Badge Navbar**: Icona rossa con numero di evoluzioni non viste
- **Premi Pending**: Sezione dedicata per sbloccare nuovi achievement
- **Animazione Sblocco**: Animazione coinvolgente quando si sblocca una nuova card
- **Auto-dismiss**: Le notifiche si marcano come viste automaticamente

### 🔧 Miglioramenti Tecnici

#### **Sistema Votazioni Riparato**
- **API Fix**: Corretta la verifica dei voti già inviati (`/api/votes/check/[voterEmail]/[matchId]`)
- **Nomi Tabella**: Allineamento tra API di submit e check dei voti
- **Campi Corretti**: Utilizzo di `fromPlayerId` invece di `voterEmail` per coerenza
- **Stato Bottone**: Il bottone "Vota Ora" cambia correttamente in "Voti Inviati"

#### **Posizionamento Card Allineato**
- **Coordinate Unificate**: 
  - Valori sinistra: x=220 (era 200)
  - Labels destra: x=360 (era 380)
- **Consistenza Visiva**: Card base e speciali ora hanno statistiche perfettamente allineate
- **Template Aggiornati**: Entrambe le API card utilizzano le stesse coordinate

#### **Performance e Cache**
- **Preloading Intelligente**: Le immagini delle card vengono precaricate in background
- **Cache Globale**: Sistema di cache per evitare ricaricamenti delle immagini
- **Componenti Ottimizzati**: Ridotti i re-render non necessari
- **Aggiornamenti Locali**: Stato aggiornato senza fetch aggiuntive dopo azioni

## 🆕 Aggiornamenti Recenti (v2.0)

### 🎯 Sistema Achievement Completo
- **Milestone Automatici**: Implementato sistema che controlla automaticamente i traguardi dopo ogni partita
- **Configurazione Dinamica**: Achievement configurabili tramite Airtable senza modifiche al codice
- **7 Card Speciali**: Prima Presenza, MotM, Goleador, Assistman, 10/25/50 Vittorie
- **Prevenzione Duplicati**: Ogni achievement può essere vinto solo una volta

### 🖼️ Interfaccia Collezione Moderna
- **Griglia Fissa**: Sostituito carousel con griglia che mostra tutte le card disponibili
- **Stati Visivi Chiari**: Card sbloccate vs bloccate con feedback visivo immediato
- **Modal Selezione**: Click per ingrandire e selezionare card come retro
- **Solo Proprietario**: Funzionalità di modifica disponibili solo per il proprietario

### 🔧 Fix Critici Sistema Voti
- **API Riparata**: Corretta verifica voti già inviati
- **Stato Bottone**: "Vota Ora" → "Voti Inviati" funziona correttamente
- **Prevenzione Duplicati**: Impossibile votare più volte per la stessa partita

### 🎨 Allineamento Card Perfetto
- **Coordinate Unificate**: Statistiche allineate tra card base e speciali
- **Posizionamento Fisso**: Valori e labels nelle stesse posizioni esatte
- **Consistenza Visiva**: Esperienza uniforme tra tutti i tipi di card

### ⚡ Ottimizzazioni Performance
- **Preloading Immagini**: Card precaricate per eliminare lag
- **Cache Intelligente**: Sistema di cache globale per immagini
- **Aggiornamenti Ottimizzati**: Meno fetch, più aggiornamenti locali
- **TypeScript ES2020**: Supporto per Promise.allSettled e funzionalità moderne

## 🚀 Prossimi Passi

### 📦 Deploy Ufficiale
- **Branch Pronto**: `test-nuove-modifiche` contiene tutte le funzionalità complete
- **Vercel Preview**: Attualmente in test su preview deployment
- **Merge Main**: Prossimo step è rendere ufficiale la preview su produzione
- **Database**: Airtable configurato e funzionante con tutti i dati

### 🔄 Stato Attuale
- ✅ **Sistema Voti**: Completamente funzionante
- ✅ **Achievement System**: Implementato e testato
- ✅ **Card Generation**: API perfettamente allineate
- ✅ **Collezione Interface**: Moderna e intuitiva
- ✅ **Performance**: Ottimizzate e veloci
- 🔄 **Deploy**: In attesa di merge su main per produzione ufficiale

## Setup rapido

1. **Clona la repo**
2. **Configura Airtable** con le seguenti tabelle:
   - `whitelist` (email)
   - `players` (nome, email, foto, ATT, DIF, VEL, PAS, FOR, POR)
   - `pending_requests` (email, timestamp)
   - `matches` (id, data, teamA, teamB, risultato, playerStats)
   - `votes` (match_id, fromPlayerId, toPlayerId, voteType)
   - `player_awards` (playerEmail, awardType, matchId, status, unlockedAt, selected)
   - `special_cards` (template_id, template_image, condition_type, condition_field, condition_value, ranking_behavior, tie_breaker_rule, is_active)
3. **Crea un Service Account Google** (se usi Google Sheets) o configura Airtable API
4. **Copia `.env.example` in `.env` nella cartella backend e inserisci i dati**

## Variabili d'ambiente (backend/.env)
- `AIRTABLE_API_KEY` = API key di Airtable
- `AIRTABLE_BASE_ID` = ID della base Airtable
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` = email del service account (se usi Google Sheets)
- `GOOGLE_PRIVATE_KEY` = chiave privata del service account (se usi Google Sheets)
- `GOOGLE_SHEET_ID` = ID del Google Sheet (se usi Google Sheets)

## Avvio sviluppo

```sh
# Dalla root del progetto
npm run dev
# Oppure separatamente:
cd frontend && npm run dev
cd backend && npm run dev
```

## Deploy
- **Consigliato**: Vercel (Next.js fullstack)
- **Branch Attivo**: `test-nuove-modifiche` (pronto per produzione)
- **Database**: Airtable (configurato e funzionante)
- **Variabili**: Imposta le variabili d'ambiente su Vercel

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
- `win10.png` - 10 vittorie totali
- `win25.png` - 25 vittorie totali
- `win50.png` - 50 vittorie totali

### Foto Giocatori
- Carica le foto dei giocatori in:
  - `backend/public/players/`
  - `frontend/public/players/`

Le foto devono essere nominate con l'email (es: `nome@email.com.jpg`).

### Font Personalizzati
- Font "Nebulax" utilizzato per le card
- Caricato in `backend/public/fonts/`

---

**Made with ❤️ by la community!** 
Sistema completo v2.0 - Pronto per produzione ufficiale! 🚀