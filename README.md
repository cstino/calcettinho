# Calcettinho ⚽️

Gestione gratuita, su invito, di una lega di calcetto 5vs5!

## Struttura
- **frontend/**: Next.js + Tailwind + Framer Motion
- **backend/**: Next.js API Routes + Google Sheets API

## Setup rapido

1. **Clona la repo**
2. **Crea un Google Sheet** con i seguenti tab:
   - `whitelist` (email)
   - `players` (nome, email, foto, ATT, DIF, VEL, PAS, FOR, POR)
   - `pending_requests` (email, timestamp)
   - `matches` (id, data, teamA, teamB, risultato, voti)
   - `votes` (match_id, voter_email, voted_email, voto)
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

- Carica i 4 template delle card (bronzo, argento, oro, ultimate) in:
  - `backend/public/cards/`
  - `frontend/public/cards/`
- Carica le foto dei giocatori in:
  - `backend/public/players/`
  - `frontend/public/players/`

I file delle card devono chiamarsi:
- `bronzo.png`
- `argento.png`
- `oro.png`
- `ultimate.png`

Le foto dei giocatori devono essere nominate con l'email (es: `nome@email.com.jpg`).

---

**Made with ❤️ by la community!** 