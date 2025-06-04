# Guida alla Risoluzione dei Problemi di Deploy

## Problemi Risolti

### 1. 🔧 Risolto problema URL API in produzione
**Problema**: Le API calls del frontend puntavano a `localhost:3001` anche in produzione
**Soluzione**: Modificato `frontend/src/utils/api.ts` per usare URL relative in produzione, sfruttando il rewriting di Next.js

### 2. 🔧 Risolto chiamate API ricorsive nel backend
**Problema**: Le API `/api/card/[email]` e `/api/card-special/[email]` facevano chiamate HTTP ricorsive a se stesse
**Soluzione**: Modificate per accedere direttamente ad Airtable invece di chiamare l'API `/api/players`

### 3. 🔧 Aggiunta API per foto giocatori
**Problema**: Le foto dei giocatori nei cerchi del campo non si caricavano
**Soluzione**: Creata nuova API route `/api/players/[email]` per servire le foto direttamente da Airtable

## Istruzioni per il Deploy

### 1. Variabili di Ambiente

#### Backend (Vercel)
Configura queste variabili di ambiente nel dashboard di Vercel per il backend:
```
AIRTABLE_API_KEY=tua_airtable_api_key
AIRTABLE_BASE_ID=tuo_airtable_base_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=tuo_google_service_account_email
GOOGLE_PRIVATE_KEY=tua_google_private_key
```

#### Frontend (Vercel)
Se necessario, configura queste variabili di ambiente nel dashboard di Vercel per il frontend:
```
AIRTABLE_API_KEY=tua_airtable_api_key
AIRTABLE_BASE_ID=tuo_airtable_base_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=tuo_google_service_account_email
GOOGLE_PRIVATE_KEY=tua_google_private_key
```

### 2. Configurazione Next.js

Il frontend è già configurato per il rewriting delle API:
- In sviluppo: le chiamate `/api/*` vanno a `localhost:3001`
- In produzione: le chiamate `/api/*` vanno al backend deployato su Vercel

### 3. Deploy su Vercel

#### Backend
1. Vai nella cartella `backend/`
2. Esegui `npm run build` per verificare che tutto compili
3. Deploy su Vercel (assicurati che punti alla cartella `backend/`)
4. Configura le variabili di ambiente nel dashboard Vercel

#### Frontend
1. Vai nella cartella `frontend/`
2. Esegui `npm run build` per verificare che tutto compili
3. Deploy su Vercel (assicurati che punti alla cartella `frontend/`)
4. Verifica che l'URL del backend sia corretto nel `next.config.js`

### 4. Verifica Post-Deploy

Dopo il deploy, verifica che:
- ✅ Le card dei giocatori si caricano nel menu giocatori
- ✅ Le immagini dei giocatori si vedono nei cerchi del campo
- ✅ Le immagini si vedono nei cerchi del menu statistiche
- ✅ Non ci sono errori di timeout negli API logs

### 5. Risoluzione Problemi

Se le immagini ancora non si caricano:
1. Verifica i logs di Vercel per errori API
2. Controlla che le variabili di ambiente siano configurate correttamente
3. Verifica che i dati su Airtable abbiano il campo `photoUrl` popolato
4. Controlla che l'URL del backend nel `next.config.js` sia corretto

## Modifiche Tecniche Apportate

### Frontend (`frontend/src/utils/api.ts`)
```typescript
// Prima (PROBLEMA)
export const getApiBaseUrl = () => {
  // Sempre localhost, anche in produzione
}

// Dopo (RISOLTO)
export const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return ''; // URL relative in produzione
  }
  // localhost solo in sviluppo
}
```

### Backend API Cards
```typescript
// Prima (PROBLEMA - chiamata ricorsiva)
const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/players`);

// Dopo (RISOLTO - accesso diretto)
const records = await base('players').select({
  filterByFormula: `{email} = '${email}'`
}).all();
```

### Nuova API Foto (`backend/src/app/api/players/[email]/route.ts`)
```typescript
// Nuova API per servire foto direttamente da Airtable
export async function GET(req, { params }) {
  // Scarica e serve foto da Airtable
}
``` 