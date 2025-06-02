# 🚀 Guida Deploy Calcettinho su Vercel

## 📋 Pre-requisiti

1. ✅ Account Vercel (gratuito)
2. ✅ Repository GitHub del progetto  
3. ✅ Credenziali Airtable/Google Sheets

## 🔧 Preparazione Deploy

### 1. Genera le Icone PWA

1. Apri il file `generate-icons.html` nel browser
2. Scarica tutte le icone generate (32x32 fino a 512x512)
3. Sposta tutti i file `.png` in `frontend/public/icons/`

### 2. Unificazione App (GIÀ FATTO ✅)

L'app è già stata configurata per il deploy unificato:
- ✅ API backend spostate in `frontend/src/app/api/`
- ✅ Dipendenze unificate in `frontend/package.json`
- ✅ Configurazione PWA con `next-pwa`
- ✅ Manifest e meta tag configurati

## 🌐 Deploy su Vercel

### Metodo 1: Dashboard Vercel (Raccomandato)

1. **Carica il progetto su GitHub**
   ```bash
   cd "calcettinho 1.1/calcettinho"
   git add .
   git commit -m "Deploy ready: PWA + Unified app"
   git push origin main
   ```

2. **Connetti a Vercel**
   - Vai su [vercel.com](https://vercel.com)
   - "New Project" → Importa da GitHub
   - Seleziona il repository `calcettinho`

3. **Configurazione Build**
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### Metodo 2: CLI Vercel

```bash
npm i -g vercel
cd frontend
vercel --prod
```

## 🔐 Variabili d'Ambiente

Nel dashboard Vercel → Settings → Environment Variables:

```
AIRTABLE_API_KEY=key_xxxxxxxxxxxxxxxx
AIRTABLE_BASE_ID=appxxxxxxxxxxxxxxx
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@xxxxx.iam.gserviceaccount.com  
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nxxxxx\n-----END PRIVATE KEY-----
GOOGLE_SHEETS_SPREADSHEET_ID=1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NODE_ENV=production
```

⚠️ **IMPORTANTE**: Per `GOOGLE_SHEETS_PRIVATE_KEY`, assicurati che i `\n` siano effettivamente a capo.

## 📱 Test PWA

Dopo il deploy:

1. **Desktop**: Apri l'app in Chrome → Icona "Installa" nella barra degli indirizzi
2. **Mobile**: Apri in Safari/Chrome → Menu → "Aggiungi alla schermata Home"

### Caratteristiche PWA

- ✅ **Installabile** su mobile e desktop
- ✅ **Offline ready** con Service Worker  
- ✅ **Icona personalizzata** (simbolo.svg)
- ✅ **Splash screen** su iOS
- ✅ **Standalone mode** (nessuna barra browser)
- ✅ **Shortcuts** per azioni rapide

## 🐛 Troubleshooting

### Build Fallisce

```bash
cd frontend
npm run build
```

Se ci sono errori TypeScript:
- Già configurato `eslint.ignoreDuringBuilds: true`
- Errori di tipo possono essere risolti aggiornando le API routes

### API Non Funzionano

1. Verifica variabili d'ambiente in Vercel
2. Controlla logs in Vercel → Functions
3. Testa endpoint: `https://tuodominio.vercel.app/api/auth/check`

### PWA Non Si Installa

1. Verifica che tutte le icone siano in `/icons/`
2. Controlla `manifest.json` via DevTools → Application
3. Verifica HTTPS (richiesto per PWA)

## 🎯 Checklist Post-Deploy

- [ ] App carica correttamente
- [ ] Login funziona
- [ ] API routes funzionano 
- [ ] PWA installabile su mobile
- [ ] Icone corrette nell'installazione
- [ ] Service Worker attivo
- [ ] Notifiche funzionanti

## 🌟 Caratteristiche Produzione

### Performance
- ✅ **Next.js Optimizations**: Automatic code splitting
- ✅ **PWA Caching**: Assets e API cachati
- ✅ **CDN Vercel**: Global edge network

### UX
- ✅ **Mobile-first**: Swipe gestures per carte
- ✅ **Responsive**: Ottimizzato per tutti i dispositivi  
- ✅ **Fast loading**: Service Worker per caricamento veloce

### SEO
- ✅ **Meta tags**: Open Graph e Twitter Cards
- ✅ **Manifest**: Web App Manifest completo
- ✅ **Sitemap**: Automatico con Next.js

---

## 🚀 URL Finale

Dopo il deploy, la tua app sarà disponibile su:
`https://calcettinho.vercel.app` (o dominio personalizzato)

Gli utenti potranno:
1. Usarla normalmente nel browser
2. **Installarla** come app nativa sul telefono
3. Accedervi offline per alcune funzionalità
4. Ricevere notifiche (se configurate)

**Il simbolo.svg sarà l'icona dell'app quando installata! 🏈⚽** 