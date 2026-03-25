# MagnAI — Product Requirements Document

**Author:** AIRchetipo
**Date:** 2026-03-25
**Version:** 1.0

---

## Elevator Pitch

> For **persone a dieta e sportivi**, che hanno il problema di **non sapere quante calorie contiene ciò che mangiano e come adattare la propria alimentazione ai propri obiettivi**, **MagnAI** è una **web app di nutrizione intelligente** che **analizza i piatti tramite foto, stima calorie e macronutrienti, e riadatta il piano alimentare in tempo reale**. A differenza di **MyFitnessPal e app tradizionali di conteggio calorie**, il nostro prodotto **riconosce automaticamente i componenti dei piatti composti, riadatta il piano pasti quando l'utente devia, e offre un'esperienza "scatta e scopri" senza inserimento manuale**.

---

## Vision

Rendere il monitoraggio nutrizionale semplice come scattare una foto — eliminando la frizione del conteggio manuale delle calorie e trasformando ogni pasto in un'opportunità per avvicinarsi ai propri obiettivi di salute.

### Product Differentiator

Il riadattamento intelligente del piano pasti in base alle deviazioni. Quando l'utente mangia qualcosa di diverso dal previsto (es. una torta invece di una banana), MagnAI ricalcola automaticamente i pasti successivi per ribilanciare l'apporto calorico. Nessun competitor offre questa funzionalità in modo nativo e integrato con il riconoscimento visivo.

---

## User Personas

### Persona 1: Giulia

**Role:** Impiegata in smart working
**Age:** 34 | **Background:** Lavora da casa, stile di vita sedentario, ha provato diverse diete senza successo duraturo

**Goals:**
- Perdere 8kg raggiunti negli ultimi 2 anni di lavoro da remoto
- Capire quanto effettivamente mangia senza dover pesare tutto
- Avere un sistema che la aiuti a "recuperare" quando sgarra

**Pain Points:**
- Le app tradizionali richiedono di inserire manualmente ogni alimento — troppo tedioso
- Non sa stimare le porzioni e le calorie a occhio
- Dopo uno sgarro si demoralizza e abbandona la dieta
- I piani alimentari rigidi non si adattano alla vita reale

**Behaviors & Tools:**
- Usa lo smartphone per tutto, preferisce app intuitive
- Fotografa spesso il cibo per i social
- Consulta blog e influencer di nutrizione
- Ha provato MyFitnessPal ma l'ha abbandonata dopo 2 settimane per la complessità

**Motivations:** Sentirsi meglio fisicamente, rientrare nei vestiti preferiti, avere più energia durante la giornata
**Tech Savviness:** Media — usa app quotidianamente ma non è tecnica

#### Customer Journey — Giulia

| Phase | Action | Thought | Emotion | Opportunity |
|---|---|---|---|---|
| Awareness | Vede un post sponsorizzato su Instagram che mostra la funzione "scatta e scopri" | "Sembra molto più semplice delle app che ho provato" | Curiosità, speranza | Comunicare la semplicità rispetto ai competitor |
| Consideration | Scarica l'app, legge le recensioni, confronta con MyFitnessPal | "14 giorni gratis senza carta? Posso provare senza rischi" | Interesse cauto | Trial senza carta di credito abbassa la barriera |
| First Use | Completa l'onboarding, fotografa il primo pranzo | "Wow, ha riconosciuto pasta e insalata separatamente!" | Sorpresa positiva, entusiasmo | Primo risultato accurato crea fiducia immediata |
| Regular Use | Fotografa i pasti quotidianamente, consulta i grafici settimanali | "Sto effettivamente vedendo progressi, e quando sgarro l'app mi ricalcola tutto" | Motivazione, senso di controllo | Il riadattamento pasti riduce la frustrazione post-sgarro |
| Advocacy | Consiglia l'app alle colleghe che vogliono dimagrire | "Finalmente un'app che non mi fa sentire in colpa quando sgarro" | Orgoglio, soddisfazione | Referral program per acquisizione organica |

---

### Persona 2: Marco

**Role:** Personal trainer e atleta amatoriale
**Age:** 28 | **Background:** Si allena 5 volte a settimana, compete in gare di crossfit amatoriali, attento alla composizione corporea

**Goals:**
- Aumentare la massa muscolare mantenendo bassa la percentuale di grasso
- Monitorare i macronutrienti (proteine in particolare) con precisione
- Avere un piano alimentare che si adatti ai giorni di allenamento vs riposo

**Pain Points:**
- Calcolare i macro manualmente è tedioso e soggetto a errori
- Mangia spesso fuori con amici e non sa stimare i macro dei piatti al ristorante
- I piani alimentari statici non tengono conto delle variazioni quotidiane
- Le app generiche non distinguono tra giorni di allenamento e riposo

**Behaviors & Tools:**
- Usa smartwatch per tracking allenamenti
- Segue canali YouTube di fitness e nutrizione
- Prepara meal prep settimanali ma spesso devia il weekend
- Usa fogli Excel per tracciare macro — funzionale ma scomodo

**Motivations:** Performance atletica, estetica fisica, disciplina personale, competizione
**Tech Savviness:** Medio-alta — a suo agio con app e tecnologia, early adopter

#### Customer Journey — Marco

| Phase | Action | Thought | Emotion | Opportunity |
|---|---|---|---|---|
| Awareness | Un amico della palestra gli mostra MagnAI mentre pranzano insieme | "Aspetta, ha riconosciuto il pollo e il riso separatamente con i macro?" | Interesse tecnico, scetticismo | Demo dal vivo tra pari è il canale più efficace |
| Consideration | Prova il trial, testa la precisione su piatti noti di cui conosce i macro | "I numeri sono abbastanza precisi, meglio del mio Excel" | Scetticismo che si trasforma in approvazione | Accuratezza nei macro è il fattore decisivo per questo segmento |
| First Use | Configura il profilo con obiettivo "aumentare massa", fotografa il meal prep | "Bello che distingua i giorni training da quelli di riposo nel piano" | Soddisfazione, sensazione di strumento professionale | Personalizzazione per profilo sportivo crea percezione di valore |
| Regular Use | Usa l'app quotidianamente, apprezza il riadattamento dopo cene fuori | "Sabato ho mangiato pizza, lunedì l'app ha ricalibrato — perfetto" | Fiducia, abitudine consolidata | Il riadattamento automatico fidelizza gli utenti sportivi |
| Advocacy | Consiglia l'app ai clienti del suo studio e sui social fitness | "La uso io per primo e la consiglio ai miei clienti" | Autorevolezza professionale | Potenziale ponte verso il B2B (Vision futura) |

---

## Brainstorming Insights

> Key discoveries and alternative directions explored during the inception session.

### Assumptions Challenged

1. **"Gli utenti vogliono solo contare calorie"** — In realtà il bisogno più profondo è sapere come *reagire* quando non si segue il piano. Il conteggio calorie è il mezzo, il riadattamento è il vero valore.
2. **"Basta riconoscere il piatto intero"** — I piatti composti (wurstel + patatine) richiedono la capacità di identificare e separare i singoli componenti per stime accurate.
3. **"L'AI da sola basta per le stime caloriche"** — L'incrocio con database nutrizionali verificati (Open Food Facts) è essenziale per la credibilità e precisione dei risultati.

### New Directions Discovered

1. **Riadattamento pasti come killer feature** — Spostato da Growth a MVP su suggerimento del team. Questo differenzia MagnAI da tutti i competitor esistenti fin dal lancio.
2. **B2B per professionisti** — Nutrizionisti e personal trainer potrebbero usare MagnAI per i propri clienti. Parcheggiato nella Vision come seconda linea di revenue.
3. **Fallback progressivo per il riconoscimento** — Foto singola → multi-angolazione → descrizione testuale. Garantisce sempre un risultato, anche quando l'AI non riesce a riconoscere il piatto.

---

## Product Scope

### MVP — Minimum Viable Product

- Onboarding guidato con profilo completo (altezza, peso, età, attività, obiettivo)
- Obiettivi personalizzati proposti dal sistema basati sui dati del profilo
- Selezione cucine di interesse (globalizzata)
- Foto piatto → riconoscimento AI componenti → stima calorie e macronutrienti
- Multi-angolazione come richiesta in caso di incertezza + fallback descrizione testuale
- Incrocio dati AI con Open Food Facts per validazione
- Valutazione adeguatezza piatto rispetto al profilo e frequenza di consumo consigliata
- Suggerimento alternative più leggere
- Storico pasti completo con grafici andamento calorico (giorno, settimana, mese)
- Progresso verso obiettivo personale
- Piano pasti settimanale generato dal sistema
- Riadattamento automatico del piano in caso di deviazioni
- Subscription con trial 14 giorni (senza carta), poi 9,99€/mese o 99,99€/anno
- Gestione abbonamento via Stripe Customer Portal
- Notifiche reminder pasti configurabili (orari, frequenza, on/off)
- App disponibile in italiano e inglese
- PWA installabile su mobile

### Growth Features (Post-MVP)

- Suggerimento alternative più leggere con ricette
- Gamification e streak motivazionali (giorni consecutivi, badge, obiettivi raggiunti)
- Integrazione wearable per dati attività (Apple Health, Google Fit)
- Social features (condivisione progressi, community)
- Database piatti preferiti / piatti ricorrenti dell'utente

### Vision (Future)

- B2B per nutrizionisti e personal trainer (gestione clienti, piani personalizzati)
- AI coach personalizzato con conversazione naturale
- Riconoscimento ingredienti singoli e ricette
- Integrazione con supermercati online per lista della spesa automatica
- Espansione lingue oltre IT/EN

---

## Technical Architecture

> **Proposed by:** Leonardo (Architect)

### System Architecture

Monolite modulare basato su Next.js 15 App Router. Le API Routes gestiscono la logica backend (analisi immagini, calcolo calorie, gestione piani), mentre i Server Components gestiscono il rendering. L'architettura sfrutta il boilerplate esistente con auth, database e UI già configurati.

**Architectural Pattern:** Modular Monolith (Next.js full-stack)

**Main Components:**
- **Auth Module** — Supabase Auth con OAuth (GitHub, Google) — *già implementato nel boilerplate*
- **Profile Module** — Gestione profilo utente, obiettivi, preferenze cucine
- **Vision Module** — Orchestrazione analisi immagini via OpenRouter API
- **Nutrition Module** — Calcolo calorie/macro, integrazione Open Food Facts, valutazione adeguatezza
- **Meal Plan Module** — Generazione piano settimanale, riadattamento deviazioni
- **Tracking Module** — Storico pasti, grafici, progresso verso obiettivo
- **Subscription Module** — Integrazione Stripe (checkout, customer portal, webhooks)
- **Notification Module** — Web Push API con configurazione utente
- **i18n Module** — Internazionalizzazione IT/EN via next-intl

### Technology Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Language | TypeScript | 5.x | Type safety, developer experience, ecosistema Next.js |
| Frontend/Backend | Next.js | 15.x | Boilerplate esistente, App Router, Server Components, API Routes |
| UI Components | shadcn/ui | latest | Boilerplate esistente, componenti accessibili e personalizzabili |
| Styling | Tailwind CSS | 4.x | Boilerplate esistente, utility-first, design tokens in globals.css |
| Database | PostgreSQL | 15+ (Supabase) | Boilerplate esistente, relazionale, robusto per dati strutturati |
| ORM | Prisma | 5.x | Boilerplate esistente, type-safe, migrations |
| Auth | Supabase Auth | latest | Boilerplate esistente, OAuth + session management |
| Storage | Supabase Storage | latest | Boilerplate esistente, per foto piatti |
| AI/Vision | OpenRouter API | latest | Accesso multi-modello (GPT-4o, Gemini, Claude), pay-per-use, flessibile |
| Food Data | Open Food Facts API | v2 | Gratuito, open source, milioni di prodotti con dati nutrizionali |
| Payments | Stripe | latest | Standard industry, zero costi fissi, gestione subscription + trial |
| i18n | next-intl | latest | Integrazione nativa con Next.js App Router |
| PWA | @serwist/next | latest | Service worker, installabilità, esperienza mobile nativa |
| Testing | Vitest + Playwright | latest | Unit + E2E testing, veloce, compatibile Next.js |

### Project Structure

**Organizational pattern:** Feature-based modules within Next.js App Router

```
src/
  app/
    [locale]/                  # i18n routing (it, en)
      layout.tsx
      page.tsx                 # Landing page
      dashboard/
        page.tsx               # Dashboard principale (storico, grafici)
      onboarding/
        page.tsx               # Flusso onboarding profilo + obiettivo
      scan/
        page.tsx               # Scatta/carica foto piatto
      meal-plan/
        page.tsx               # Piano pasti settimanale
      profile/
        page.tsx               # Gestione profilo e preferenze
      settings/
        page.tsx               # Notifiche, lingua, account
      subscription/
        page.tsx               # Piani e gestione abbonamento
    auth/
      signin/page.tsx          # Esistente (boilerplate)
      callback/route.ts        # Esistente (boilerplate)
      signout/route.ts         # Esistente (boilerplate)
    api/
      vision/route.ts          # Analisi immagine via OpenRouter
      nutrition/route.ts       # Calcolo calorie + Open Food Facts
      meal-plan/route.ts       # Generazione/riadattamento piano
      subscription/
        webhook/route.ts       # Stripe webhooks
        checkout/route.ts      # Creazione sessione checkout
      notifications/route.ts   # Gestione push notifications
  components/
    ui/                        # shadcn/ui (esistente)
    scan/                      # Componenti fotocamera/upload
    dashboard/                 # Grafici, storico
    meal-plan/                 # Piano pasti, riadattamento
    onboarding/                # Steps onboarding
  lib/
    prisma.ts                  # Esistente (boilerplate)
    utils.ts                   # Esistente (boilerplate)
    supabase/                  # Esistente (boilerplate)
    openrouter.ts              # Client OpenRouter API
    openfoodfacts.ts           # Client Open Food Facts API
    stripe.ts                  # Configurazione Stripe
    nutrition/                 # Logica calcolo calorie, macro, adeguatezza
    meal-plan/                 # Logica generazione e riadattamento piano
  i18n/
    messages/
      it.json
      en.json
    config.ts
prisma/
  schema.prisma                # Esteso con modelli: Profile, Meal, MealPlan, Subscription
public/
  manifest.json                # PWA manifest
  sw.js                        # Service worker
```

### Development Environment

Ambiente di sviluppo locale con Next.js Turbopack (dev server), Supabase CLI per database locale, e variabili d'ambiente per API keys.

**Required tools:** Node.js 20+, npm/pnpm, Supabase CLI, Git

### CI/CD & Deployment

**Build tool:** Next.js (Turbopack per dev, webpack per build)

**Pipeline:** GitHub Actions — lint, type-check, test (Vitest + Playwright), build, deploy

**Deployment:** Vercel (free tier per MVP, scaling automatico)

**Target infrastructure:** Vercel (frontend + API routes) + Supabase (database + auth + storage)

### Architecture Decision Records (ADR)

1. **ADR-001: OpenRouter instead of direct OpenAI** — Scelto per flessibilità multi-modello e ottimizzazione costi. Permette di cambiare modello senza modificare codice.
2. **ADR-002: Open Food Facts as validation layer** — L'AI da sola non è sufficientemente affidabile per stime caloriche. L'incrocio con un database verificato aumenta la precisione e la fiducia dell'utente.
3. **ADR-003: Monolith over microservices** — Per un MVP, un monolite modulare in Next.js è la scelta più pragmatica. Riduce complessità operativa, costi infrastrutturali e tempi di sviluppo.
4. **ADR-004: PWA over native app** — Una PWA offre esperienza mobile nativa (fotocamera, notifiche push, installabilità) senza i costi e tempi di sviluppo di app native separate per iOS e Android.
5. **ADR-005: Stripe for subscriptions** — Zero costi fissi, gestione completa di trial, subscription mensile/annuale, e Customer Portal per self-service utente.
6. **ADR-006: Fallback progressivo per riconoscimento** — Foto singola → multi-angolazione → descrizione testuale. Garantisce sempre un risultato e gestisce i limiti intrinseci dell'AI vision.

---

## Functional Requirements

### Profilo & Onboarding

- **FR1** — L'utente completa un profilo con: altezza, peso, età, livello di attività fisica, obiettivo (perdere peso / mettere massa / ridurre massa grassa / mantenimento)
- **FR2** — Il sistema propone obiettivi personalizzati basati sui dati del profilo (es. "Perdere 5kg", "Aumentare massa muscolare", "Abbassare la % di massa grassa")
- **FR3** — L'utente seleziona le cucine di interesse (italiana, giapponese, messicana, ecc.)
- **FR4** — L'utente può modificare profilo e obiettivi in qualsiasi momento

### Riconoscimento Piatto & Calorie

- **FR5** — L'utente scatta una foto o carica un'immagine di un piatto
- **FR6** — Il sistema analizza l'immagine e identifica i componenti del piatto (es. wurstel + patatine fritte)
- **FR7** — Il sistema stima calorie e macronutrienti (proteine, carboidrati, grassi) per ogni componente e totale
- **FR8** — Se il riconoscimento è incerto, il sistema chiede foto da angolazioni diverse
- **FR9** — Come ultimo fallback, l'utente può descrivere il piatto testualmente
- **FR10** — Il sistema incrocia i dati AI con Open Food Facts per validare le stime caloriche

### Valutazione & Suggerimenti

- **FR11** — Il sistema valuta l'adeguatezza del piatto rispetto al profilo e obiettivo dell'utente
- **FR12** — Il sistema suggerisce una frequenza di consumo consigliata per quel piatto
- **FR13** — Il sistema suggerisce alternative più leggere quando il piatto eccede il budget calorico

### Storico & Tracking

- **FR14** — L'utente visualizza lo storico completo dei pasti registrati
- **FR15** — L'utente visualizza grafici dell'andamento calorico nel tempo (giornaliero, settimanale, mensile)
- **FR16** — Il sistema mostra il progresso verso l'obiettivo personale

### Pianificazione & Riadattamento Pasti

- **FR17** — Il sistema genera un piano pasti settimanale basato su profilo, obiettivo e cucine preferite
- **FR18** — Quando l'utente devia dal piano (es. mangia torta invece di banana), il sistema riadatta i pasti successivi per ribilanciare le calorie
- **FR19** — L'utente può accettare, modificare o rigenerare il piano suggerito

### Subscription & Pagamenti

- **FR20** — L'utente accede a un free trial di 14 giorni senza inserire carta di credito
- **FR21** — Al termine del trial, l'utente sceglie piano mensile (9,99 EUR) o annuale (99,99 EUR)
- **FR22** — L'utente gestisce il proprio abbonamento (upgrade, downgrade, cancellazione) tramite Stripe Customer Portal

### Notifiche

- **FR23** — Il sistema invia reminder configurabili per registrare i pasti (colazione, pranzo, cena, spuntini)
- **FR24** — L'utente può personalizzare orari, frequenza e tipologia di notifiche
- **FR25** — L'utente può disattivare completamente le notifiche

### Internazionalizzazione

- **FR26** — L'app è disponibile in italiano e inglese
- **FR27** — L'utente seleziona la lingua preferita

---

## Non-Functional Requirements

### Security

- Le foto dei pasti sono dati personali sensibili — storage su Supabase Storage con accesso autenticato e policy RLS
- I dati del profilo (peso, altezza, età, obiettivi) sono protetti tramite Row Level Security (RLS) di Supabase — ogni utente accede solo ai propri dati
- Nessun dato di pagamento transita o viene memorizzato sui nostri server — gestione completa tramite Stripe
- Le API keys (OpenRouter, Stripe) sono gestite server-side e mai esposte al client
- Comunicazioni HTTPS obbligatorie

### Integrations

- **OpenRouter API** — Riconoscimento immagini e analisi piatti tramite modelli AI vision (GPT-4o, Gemini, Claude)
- **Open Food Facts API** — Database nutrizionale open source per validazione e arricchimento dati calorici
- **Stripe** — Gestione subscription (checkout, customer portal, webhooks per eventi di pagamento)
- **Web Push API** — Notifiche push browser/PWA per reminder pasti configurabili

---

## Next Steps

1. **Backlog** — Decomporre i requisiti funzionali in epic e user stories con priorità
2. **UX Design** — Definire i flussi di interazione dettagliati e wireframes per le feature MVP
3. **Detailed Architecture** — Approfondire le decisioni tecniche sulle aree critiche (schema DB, prompt AI, logica riadattamento pasti)
4. **Validation** — Testare il riconoscimento piatti con OpenRouter su un campione di piatti reali per validare la precisione

---

_PRD generated via AIRchetipo Product Inception — 2026-03-25_
_Session conducted by: User with the AIRchetipo team_
