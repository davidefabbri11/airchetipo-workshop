# AIRchetipo Workshop

Questo è un workshop pratico in cui costruirai un prodotto digitale da zero usando l'AI come copilota e il framework [AIRchetipo](https://github.com/techreloaded-ar/airchetipo) come guida metodologica. Il boilerplate di partenza include Next.js 15, Supabase (auth e storage), Prisma, Tailwind CSS v4 e shadcn/ui — tutto già configurato per permetterti di concentrarti sul prodotto, non sull'infrastruttura.

## Guida Setup (per partecipanti al workshop)

### Prerequisiti

- **Node.js** v18+ installato ([nodejs.org](https://nodejs.org))
- **Git** installato
- Un account **GitHub** (per fare la fork e per il login OAuth)
- Un account **Supabase** gratuito ([supabase.com](https://supabase.com))

---

### Step 1 — Fork e clone del repository

1. Vai sulla pagina GitHub del repository e clicca **Fork** in alto a destra
2. Clona la tua fork sulla tua macchina:

```bash
git clone https://github.com/techreloaded-ar/airchetipo-workshop.git
cd airchetipo-workshop
```

---

### Step 2 — Crea un progetto Supabase

1. Vai su [supabase.com](https://supabase.com) e fai login
2. Clicca **New Project**
3. Scegli un nome, una password per il database e la region (scegli la più vicina a te)
4. Salva la password da qualche parte
5. Aspetta che il progetto sia pronto

---

### Step 3 — Configura le variabili d'ambiente

1. Copia il file di esempio:

```bash
cp .env.local.example .env
```

2. Clicca il pulsante **Connect** nella top bar di Supabase e inserisci i valori in `.env`:

- nel tab **Connection String** → Type **URI**, Method **Session Pooler** → copia la connection string nella variabile **`DATABASE_URL`** in `.env`
> **Attenzione**: nella connection string, sostituisci `[YOUR-PASSWORD]` con la password che hai scelto quando hai creato il progetto.
- nel tab **App Frameworks** → seleziona **Next.js** →  copia i valori **`NEXT_PUBLIC_SUPABASE_URL`** e **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`** in `.env`

---

### Step 4 — Installa le dipendenze

```bash
npm install
```

---

### Step 5 — Avvia il server di sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser.

---

### Step 6 — Testa il login

1. Vai su [http://localhost:3000/auth/signin](http://localhost:3000/auth/signin)
2. Clicca su **Registrati** e crea un account con email e password
3. Effettua il login con le credenziali appena create
4. Verrai reindirizzato alla dashboard

---

## Comandi utili

| Comando | Descrizione |
|---|---|
| `npm run dev` | Avvia il server di sviluppo (Turbopack) |
| `npm run build` | Build di produzione |
| `npm run start` | Avvia il server di produzione |
| `npm run db:push` | Applica lo schema Prisma al database |
| `npm run db:studio` | Apri Prisma Studio (GUI per il database) |
| `npm run db:generate` | Rigenera il Prisma Client |

## API Routes

Il boilerplate include una API route di esempio su `/api/hello`:

```bash
# GET
curl http://localhost:3000/api/hello

# POST
curl -X POST http://localhost:3000/api/hello \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'
```

## Troubleshooting

### "Invalid API key" o errori di autenticazione
- Verifica che `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` siano corretti in `.env.local`
- Assicurati di non avere spazi extra nei valori

### "Can't reach database server"
- Verifica che `DATABASE_URL` sia corretto in `.env.local`
- Assicurati di aver sostituito `[YOUR-PASSWORD]` con la password reale del database


### Il login OAuth non funziona
- Verifica che i provider GitHub e/o Google siano attivati nel Supabase Dashboard → Authentication → Providers
- Assicurati che il Redirect URL nel Supabase Dashboard includa `http://localhost:3000`

### Dopo `npm install` da errore su Prisma
- Prova a eseguire manualmente: `npx prisma generate`

## Deploy su Vercel

### 1. Prepara il repository

Assicurati che il codice sia pushato su GitHub e che il progetto faccia build correttamente in locale:

```bash
npm run build
```

### 2. Importa il progetto su Vercel

1. Vai su [vercel.com](https://vercel.com) e accedi con il tuo account GitHub
2. Clicca **Add New → Project**
3. Seleziona il repository dalla lista (autorizza l'accesso se richiesto)
4. Vercel rileva automaticamente Next.js — lascia le impostazioni di default

### 3. Configura le variabili d'ambiente

Prima di cliccare Deploy, aggiungi queste variabili nella sezione **Environment Variables**:

| Variabile | Valore |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL (Session Pooler, porta 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Chiave pubblica Supabase |

### 4. Clicca Deploy

Vercel eseguirà build e deploy. Al termine riceverai un URL pubblico (es. `https://tuo-progetto.vercel.app`).

### 5. Aggiorna i redirect OAuth sui servizi esterni

Per far funzionare il login OAuth, devi aggiornare gli URL di redirect su **Supabase** e sul provider OAuth che utilizzi (es. Google).

**Su Supabase:**
1. Apri il [Supabase Dashboard](https://supabase.com/dashboard) e seleziona il tuo progetto
2. Vai su **Authentication → URL Configuration**
3. Aggiungi il tuo URL Vercel alla lista dei **Redirect URLs**:
   ```
   https://tuo-progetto.vercel.app/auth/callback
   ```

**Sul provider OAuth (GitHub / Google):**
- **GitHub**: vai su [github.com/settings/developers](https://github.com/settings/developers) → la tua OAuth App → aggiorna **Authorization callback URL** con `https://tuo-progetto.vercel.app/auth/callback`
- **Google**: vai sulla [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → il tuo OAuth Client → aggiungi `https://tuo-progetto.vercel.app` tra gli **Authorized redirect URIs**

---

### Troubleshooting Deploy

**Build fallisce con errore Prisma "Cannot find module"**
- Vercel deve generare il Prisma Client durante il build. Verifica che `postinstall` in `package.json` includa `prisma generate`. Se manca, aggiungilo:
  ```json
  "scripts": {
    "postinstall": "prisma generate"
  }
  ```

**"Can't reach database server" in produzione**
- Verifica che `DATABASE_URL` usi la porta `5432` (Transaction Pooler),
- Controlla che la password nel connection string sia corretta (no `[YOUR-PASSWORD]` placeholder)

**OAuth login redirect non funziona**
- Assicurati di aver aggiunto `https://tuo-progetto.vercel.app/auth/callback` nei Redirect URLs di Supabase
- Verifica che `NEXT_PUBLIC_SUPABASE_URL` sia configurata correttamente nelle env di Vercel

**Le modifiche alle variabili d'ambiente non hanno effetto**
- Dopo aver modificato le env su Vercel, è necessario fare un **Redeploy** (Deployments → ultimo deploy → Redeploy)
