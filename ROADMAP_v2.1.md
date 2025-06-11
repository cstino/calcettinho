# 🚀 Calcettinho v2.1 - Piano di Sviluppo Dettagliato

## 📋 Overview
Roadmap per l'evoluzione di Calcettinho verso una piattaforma più interattiva, moderna e user-friendly con focus su engagement e automazione.

---

## 🔔 EPIC 1: Sistema di Notifiche Completo
**Priorità**: Alta | **Complessità**: Media | **Durata stimata**: 2-3 settimane

### 📱 1.1 Notifiche Push (Browser)
**Obiettivo**: Implementare notifiche push per eventi importanti

**Task Tecniche**:
- [ ] **SW-001**: Creare Service Worker per gestione notifiche push
  - File: `frontend/public/sw.js`
  - Gestione background sync e push events
- [ ] **SW-002**: Implementare registrazione automatica utenti
  - API: `POST /api/notifications/subscribe`
  - Salvataggio subscription in Airtable tabella `push_subscriptions`
- [ ] **SW-003**: Sistema di invio notifiche server-side
  - Servizio: Firebase Cloud Messaging (FCM) o Web Push Protocol
  - API: `POST /api/notifications/send`
- [ ] **SW-004**: Gestione permessi e preferenze utente
  - UI per abilitare/disabilitare notifiche
  - Persistenza preferenze in localStorage + Airtable

**Trigger Notifiche**:
- [ ] **NT-001**: Nuova partita creata
- [ ] **NT-002**: Reminder voti (12h e 2h prima scadenza)
- [ ] **NT-003**: Nuovo achievement sbloccato
- [ ] **NT-004**: Posto disponibile in partita (da riserva a titolare)
- [ ] **NT-005**: Partita confermata/annullata

### 🔔 1.2 Notifiche In-App
**Obiettivo**: Centro notifiche interno con badge e segnalini

**Task UI/UX**:
- [ ] **UI-001**: Icona campana in navbar con badge contatore
- [ ] **UI-002**: Dropdown centro notifiche
  - Lista notifiche non lette
  - Pulsante "Segna tutte come lette"
  - Timeline notifiche recenti
- [ ] **UI-003**: Toast notifications per azioni immediate
  - Success/error feedback
  - Animazioni smooth
- [ ] **UI-004**: Segnalini rossi su menu con novità
  - Badge su "Statistiche" se nuovi dati
  - Badge su "Profilo" se nuovi achievement

**Task Backend**:
- [ ] **BE-001**: Tabella Airtable `notifications`
  - Campi: id, userId, type, title, message, read, createdAt, actionUrl
- [ ] **BE-002**: API gestione notifiche
  - `GET /api/notifications/[userEmail]` - Lista notifiche utente  
  - `POST /api/notifications/mark-read` - Segna come lette
  - `POST /api/notifications/create` - Crea notifica

### 🎯 1.3 Sistema di Scheduling
**Task Avanzate**:
- [ ] **SC-001**: Cron job per notifiche programmate
  - Vercel Cron o sistema di queue
- [ ] **SC-002**: Template notifiche configurabili
  - Template HTML per email
  - Template push notifications

---

## ⚽ EPIC 2: Sistema Prenotazione Partite
**Priorità**: Alta | **Complessità**: Alta | **Durata stimata**: 3-4 settimane

### 🎮 2.1 Creazione e Gestione Partite
**Obiettivo**: Sistema completo di prenotazione con titolari/riserve

**Task Database**:
- [ ] **DB-001**: Estendere tabella `matches` con nuovi campi:
  - `status`: 'draft', 'open', 'confirmed', 'completed', 'cancelled'
  - `maxPlayers`: 10 (default)
  - `registrationDeadline`: timestamp
  - `location`: stringa
  - `notes`: testo libero
- [ ] **DB-002**: Nuova tabella `match_registrations`
  - Campi: matchId, playerEmail, registeredAt, status ('registered', 'folded'), position (1-10 titolari, 11+ riserve)
- [ ] **DB-003**: Nuova tabella `match_history`
  - Log di tutte le azioni (registrazioni, fold, sostituzioni)

### 📝 2.2 Interfaccia Creazione Partita
**Task Frontend**:
- [ ] **FE-001**: Pagina "Crea Partita" per admin
  - Form: data, ora, luogo, note, deadline registrazioni
  - Calendario integrato per selezione data
  - Validazione input e conferma creazione
- [ ] **FE-002**: Lista partite disponibili per registrazione
  - Card partite con info essenziali
  - Stato partita (aperta/chiusa/confermata)
  - Countdown deadline registrazione
- [ ] **FE-003**: Dashboard admin per gestione partite
  - Lista tutte le partite create
  - Azioni: modifica, annulla, conferma
  - Statistiche registrazioni

### 🔄 2.3 Sistema Registrazione Giocatori
**Task Core**:
- [ ] **REG-001**: Bottone "PRENOTA" per giocatori
  - Controllo se già registrato
  - Assegnazione automatica posizione (titolare/riserva)
  - Feedback immediato con posizione assegnata
- [ ] **REG-002**: Bottone "FOLD" per rinuncia
  - Disponibile solo per giocatori registrati
  - Promozione automatica primo riserva
  - Notifica al giocatore promosso
- [ ] **REG-003**: Lista giocatori visualizzata in tempo reale
  - Sezione "Titolari" (1-10)
  - Sezione "Riserve" (11+)
  - Indicatori visivi stato registrazione

**Task API**:
- [ ] **API-001**: `POST /api/matches/register`
  - Registrazione giocatore con controllo posti
- [ ] **API-002**: `POST /api/matches/fold`
  - Gestione rinuncia e promozioni automatiche
- [ ] **API-003**: `GET /api/matches/[id]/players`
  - Lista aggiornata giocatori registrati

### 🎯 2.4 Automazioni e Notifiche
**Task Avanzate**:
- [ ] **AUTO-001**: Conferma automatica partita se 10 titolari
- [ ] **AUTO-002**: Notifiche push per promozioni riserve
- [ ] **AUTO-003**: Reminder automatici deadline registrazione

---

## 🎨 EPIC 3: Redesign UX/UI Moderno
**Priorità**: Media | **Complessità**: Alta | **Durata stimata**: 3-4 settimane

### 🎭 3.1 Design System
**Obiettivo**: Design system coerente e moderno

**Task Preparatorie**:
- [ ] **DS-001**: Audit completo UI esistente
  - Inventario componenti esistenti
  - Identificazione inconsistenze
- [ ] **DS-002**: Definizione palette colori aggiornata
  - Primary, secondary, accent colors
  - Dark mode ready
- [ ] **DS-003**: Tipografia moderna
  - Font pairings
  - Scale tipografica responsive
- [ ] **DS-004**: Iconografia coerente
  - Set di icone uniform (Lucide, Heroicons)
  - Dimensioni standardizzate

### 📱 3.2 Mobile-First Approach
**Task Responsive**:
- [ ] **MOB-001**: Redesign navbar mobile
  - Hamburger menu animato
  - Gesture-friendly
- [ ] **MOB-002**: Ottimizzazione card giocatori
  - Touch-friendly buttons
  - Swipe gestures per azioni rapide
- [ ] **MOB-003**: Miglioramento forms mobile
  - Input ottimizzati per touch
  - Keyboard-aware layout

### 🎯 3.3 Microinterazioni e Animazioni
**Task UX Enhancement**:
- [ ] **ANI-001**: Transizioni smooth tra pagine
  - Framer Motion page transitions
- [ ] **ANI-002**: Loading states eleganti
  - Skeleton screens
  - Progress indicators
- [ ] **ANI-003**: Feedback visivo azioni utente
  - Hover states
  - Active states
  - Success/error animations

### 🖼️ 3.4 Componenti Moderni
**Task Refactoring**:
- [ ] **COMP-001**: Redesign card giocatori
  - Layout più pulito
  - Statistiche più leggibili
  - Azioni rapide accessibili
- [ ] **COMP-002**: Redesign tabelle statistiche
  - Ordinamento intuitivo
  - Filtri avanzati
  - Visualizzazione dati migliorata
- [ ] **COMP-003**: Nuovi modali e overlay
  - Backdrop blur
  - Animazioni entrada/uscita
  - Focus management

---

## 🤖 EPIC 4: AI Generazione Squadre
**Priorità**: Media | **Complessità**: Media | **Durata stimata**: 2-3 settimane

### 🧠 4.1 Algoritmo Bilanciamento
**Obiettivo**: AI gratuita per formazioni equilibrate

**Task Algoritmo**:
- [ ] **AI-001**: Algoritmo base bilanciamento
  - Calcolo "forza squadra" basato su overall
  - Bilanciamento ruoli (ATT, DIF, POR)
  - Considerazione affinità giocatori (storico partite insieme)
- [ ] **AI-002**: Algoritmo genetico semplificato
  - Popolazione formazioni casuali
  - Fitness function basata su equilibrio
  - Iterazioni per ottimizzazione
- [ ] **AI-003**: Considerazione preferenze giocatori
  - Input opzionale "preferisco giocare con/contro"
  - Peso algoritmo per rispettare preferenze

### ⚙️ 4.2 Implementazione Tecnica
**Task Backend**:
- [ ] **BE-AI-001**: API generazione squadre
  - `POST /api/ai/generate-teams`
  - Input: lista giocatori, parametri bilanciamento
  - Output: formazioni ottimizzate con score
- [ ] **BE-AI-002**: Sistema configurazione algoritmo
  - Pesi configurabili per criteri bilanciamento
  - A/B testing diverse configurazioni
- [ ] **BE-AI-003**: Storico e analytics
  - Salvataggio formazioni generate
  - Feedback su equilibrio partite giocate

### 🎮 4.3 Interfaccia Utente
**Task Frontend**:
- [ ] **FE-AI-001**: Pannello generazione squadre
  - Selezione giocatori disponibili
  - Slider per bilanciamento criteri
  - Pulsante "Genera Squadre"
- [ ] **FE-AI-002**: Visualizzazione risultati
  - Formazioni proposte con statistiche
  - Pulsante "Rigenera" per nuove opzioni
  - Confronto equilibrio squadre
- [ ] **FE-AI-003**: Sistema feedback
  - Valutazione post-partita su equilibrio
  - Miglioramento algoritmo basato su feedback

---

## 📱 EPIC 5: Ottimizzazioni Mobile - Menu Giocatori
**Priorità**: Alta | **Complessità**: Media | **Durata stimata**: 1-2 settimane

### 🃏 5.1 Layout Card Responsive
**Obiettivo**: Da 1 colonna a 3 colonne su mobile con interazioni fluide

**Task Layout**:
- [ ] **LAY-001**: Refactoring griglia giocatori
  - CSS Grid responsive: 1 col (< 640px), 2 col (640px+), 3 col (768px+)
  - Aspect ratio cards consistente
  - Gap ottimizzato per touch
- [ ] **LAY-002**: Ottimizzazione dimensioni card
  - Calcolo dinamico dimensioni basato su viewport
  - Contenuto leggibile anche su card piccole
  - Font size responsive

### 🔄 5.2 Interazione Card 3D
**Task Animazioni**:
- [ ] **3D-001**: Click card → Modal overview
  - Animazione scale-up fluida
  - Backdrop blur
  - Gestione focus trap
- [ ] **3D-002**: Rotazione card 360° nel modal
  - Touch/drag per rotazione
  - Wheel/scroll per rotazione desktop
  - Physics-based momentum
  - Visual feedback durante rotazione
- [ ] **3D-003**: Implementazione 3D con CSS Transform
  - Prospettiva realistica
  - Ombre dinamiche
  - Smooth transitions

### 🎯 5.3 Modal Overview
**Task Interfaccia**:
- [ ] **MOD-001**: Layout modal responsive
  - Card centrata con rotazione fluida
  - Bottone "Vai al Profilo" ben posizionato
  - Gesture per chiusura (swipe down)
- [ ] **MOD-002**: Performance ottimizzazioni
  - Lazy loading texture card
  - Debounce eventi touch
  - Memory management per animazioni

---

## 📲 EPIC 6: Fix Bottone "Scarica Card" Mobile
**Priorità**: Alta | **Complessità**: Bassa | **Durata stimata**: 3-5 giorni

### 🔧 6.1 Analisi e Fix
**Obiettivo**: Risolvere problema navigazione dopo download

**Task Debug**:
- [ ] **FIX-001**: Identificare causa blocco navigazione
  - Analisi comportamento attuale
  - Test su diversi browser mobile
  - Identificazione event listeners problematici
- [ ] **FIX-002**: Implementare soluzione
  - Gestione corretta eventi download
  - Ripristino navigazione dopo download
  - Fallback per browser problematici

### 📱 6.2 UX Migliorata
**Task Enhancement**:
- [ ] **UX-001**: Feedback visivo durante download
  - Loading state durante generazione
  - Success message post-download
  - Opzione "Scarica un'altra volta"  
- [ ] **UX-002**: Bottone "Indietro" sempre visibile
  - Pulsante indietro prominente
  - Breadcrumb navigation
  - Gesture swipe-back supportate

---

## 📊 EPIC 7: Fix Confronto Giocatori - Statistiche UP/DOWN
**Priorità**: Media | **Complessità**: Media | **Durata stimata**: 1 settimana

### 🔍 7.1 Debug Statistiche
**Obiettivo**: Correggere visualizzazione UP/DOWN ricevuti

**Task Investigazione**:
- [ ] **DEBUG-001**: Analisi query database
  - Verificare struttura tabella `votes`
  - Controllare logica aggregazione voti
  - Identificare bug nel calcolo
- [ ] **DEBUG-002**: Fix query API
  - Correggere API `/api/stats/player-comparison`
  - Test query aggregate corrette
  - Validazione dati restituiti

### 🎨 7.2 Design Migliorato
**Task Redesign**:
- [ ] **DESIGN-001**: Layout confronto più chiaro
  - Grafici visuali per statistiche
  - Codice colore per differenze
  - Tooltip informativi
- [ ] **DESIGN-002**: Sezione UP/DOWN dedicata
  - Grafici a barre orizzontali
  - Percentuali e totali
  - Periodo di riferimento selezionabile

---

## 📱 EPIC 8: Miglioramento Barra Menu Mobile
**Priorità**: Alta | **Complessità**: Bassa | **Durata stimata**: 2-3 giorni

### 📐 8.1 Ottimizzazione Dimensioni
**Obiettivo**: Barra menu più ergonomica per mobile

**Task Design**:
- [ ] **BAR-001**: Aumento altezza barra menu
  - Da attuale a 64px (iOS standard)
  - Padding verticale aumentato
  - Test di usabilità su device reali
- [ ] **BAR-002**: Riduzione larghezza pulsanti
  - Più spazio per tap accurato
  - Icone più grandi e chiare
  - Feedback haptic per iPhone

### 🎯 8.2 UX Touch-Friendly
**Task Miglioramenti**:
- [ ] **TOUCH-001**: Area tap aumentata
  - Minimo 44px area touch (Apple guidelines)
  - Padding interno pulsanti
- [ ] **TOUCH-002**: Feedback visivo migliorato
  - Active states più evidenti
  - Ripple effects su Android
  - Smooth transitions

---

## 📅 Timeline e Milestone

### 🚀 **Phase 1** (Settimane 1-4): Foundation
- ✅ EPIC 6: Fix Scarica Card
- ✅ EPIC 8: Barra Menu Mobile  
- 🔄 EPIC 5: Menu Giocatori 3D
- 🔄 EPIC 7: Fix Statistiche UP/DOWN

### 🚀 **Phase 2** (Settimane 5-8): Core Features
- 🔄 EPIC 1: Sistema Notifiche
- 🔄 EPIC 2: Prenotazione Partite

### 🚀 **Phase 3** (Settimane 9-12): Polish & AI
- 🔄 EPIC 3: Redesign UX/UI
- 🔄 EPIC 4: AI Generazione Squadre

### 🚀 **Phase 4** (Settimane 13-14): Testing & Deploy
- 🧪 Testing completo
- 🚀 Deploy produzione
- 📊 Monitoring e feedback

---

## 🛠️ Considerazioni Tecniche

### **Stack Tecnologico**
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, Airtable
- **Notifiche**: Firebase Cloud Messaging / Web Push API
- **AI**: Algoritmi custom (no servizi esterni a pagamento)
- **Mobile**: Progressive Web App (PWA)

### **Performance Goals**
- Lighthouse Score > 90
- First Contentful Paint < 2s
- Time to Interactive < 3s
- Bundle Size < 500KB

### **Compatibilità**
- iOS Safari 14+
- Chrome 88+
- Firefox 85+
- Edge 88+

---

## 📈 Metriche di Successo

### **Engagement**
- ⬆️ Tempo sessione medio +30%
- ⬆️ Registrazioni partite +50%
- ⬆️ Retention 7-giorni +25%

### **Usabilità**
- ⬇️ Bounce rate -20%
- ⬆️ Task completion rate +40%
- ⬆️ User satisfaction score 4.5/5

### **Performance**
- ⬇️ Load time -50%
- ⬆️ Mobile usability score 95/100
- ⬇️ Error rate -80%

---

## 🎯 Note Finali

Questo roadmap rappresenta una evoluzione significativa di Calcettinho verso una piattaforma completa di gestione calcetto. Ogni EPIC è progettato per essere implementato incrementalmente, permettendo rilasci frequenti e feedback continuo dagli utenti.

La priorità sulle funzionalità mobile e l'attenzione all'UX garantiranno un'esperienza utente moderna e coinvolgente, mentre le funzionalità di AI e notifiche aggiungeranno valore e automazione alla piattaforma. 