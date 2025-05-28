# 🎯 Configurazione Airtable per Calcettinho

## 1. Crea la Base Airtable

1. Vai su [Airtable.com](https://airtable.com) e crea un account
2. Crea una nuova base chiamata "Calcettinho"
3. Crea le seguenti tabelle:

### Tabella "players":
- **name** (Single line text) - Nome del giocatore
- **email** (Email) - Email del giocatore  
- **photoUrl** (URL) - URL della foto (opzionale)
- **Attacco** (Number) - Statistica attacco (0-100)
- **Difesa** (Number) - Statistica difesa (0-100)
- **Velocità** (Number) - Statistica velocità (0-100)
- **Forza** (Number) - Statistica forza (0-100)
- **Passaggio** (Number) - Statistica passaggio (0-100)
- **Portiere** (Number) - Statistica portiere (0-100)

### Tabella "player_stats":
- **playerEmail** (Email) - Email del giocatore (collegamento)
- **gol** (Number) - Numero di gol segnati
- **partiteDisputate** (Number) - Partite totali giocate
- **partiteVinte** (Number) - Partite vinte
- **partitePareggiate** (Number) - Partite pareggiate
- **partitePerse** (Number) - Partite perse
- **assistenze** (Number) - Assist forniti
- **cartelliniGialli** (Number) - Cartellini gialli ricevuti
- **cartelliniRossi** (Number) - Cartellini rossi ricevuti
- **minutiGiocati** (Number) - Minuti totali in campo

## 2. Ottieni le Credenziali

### API Key:
1. Vai su [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Clicca "Create new token"
3. Dai un nome al token (es: "Calcettinho App")
4. Seleziona la tua base "Calcettinho"
5. Permessi: `data.records:read`
6. Copia il token (inizia con "pat...")

### Base ID:
1. Vai su [airtable.com/api](https://airtable.com/api)
2. Seleziona la tua base "Calcettinho"
3. Copia il Base ID dalla URL o dalla sezione "Introduction"

## 3. Configurazione Backend

1. Vai nella cartella `backend/`
2. Copia il file `.env.example` in `.env`
3. Compila il file `.env`:

```bash
AIRTABLE_API_KEY=pat_your_personal_access_token_here
AIRTABLE_BASE_ID=app_your_base_id_here
```

## 4. Upload delle Immagini

### Template delle Card:
Carica questi file in `backend/public/cards/`:
- `bronzo.png`
- `argento.png` 
- `oro.png`
- `ultimate.png`

### Foto Giocatori:
Carica le foto in `backend/public/players/` con il nome: `email_del_giocatore.jpg`

Esempio: `marco.rossi@email.com.jpg`

## 5. Font (Opzionale)

Per il font personalizzato, carica `Nebulax-3lqLp.ttf` in `backend/public/fonts/`

## 6. Test della Configurazione

1. Avvia il backend: `cd backend && npm run dev`
2. Avvia il frontend: `cd frontend && npm run dev`
3. Vai su `http://localhost:3000/players`
4. Dovresti vedere i giocatori da Airtable
5. Clicca "Vedi Card" per testare la generazione

## 🔧 Troubleshooting

- **Errore 401**: Controlla che l'API key sia corretta
- **Errore 404**: Controlla che il Base ID sia corretto
- **Template non trovato**: Assicurati che i file PNG siano nella cartella corretta
- **Foto non trovata**: Rinomina la foto con l'email esatta del giocatore

## 📁 Struttura File

```
backend/
├── .env                          # Le tue credenziali
├── public/
│   ├── cards/
│   │   ├── bronzo.png
│   │   ├── argento.png
│   │   ├── oro.png
│   │   └── ultimate.png
│   ├── players/
│   │   ├── email1@example.com.jpg
│   │   └── email2@example.com.jpg
│   └── fonts/
│       └── Nebulax-3lqLp.ttf
``` 