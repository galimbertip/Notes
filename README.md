# GPverse Notes · V.0.3.1

Web app per prendere appunti a tastiera, a mano libera (penna o dito) e a voce,
con trascrizione e riascolto sincronizzato. Un progetto **GPverse**.

Nessuna build: HTML + JavaScript puro, backend su **Supabase** (piano gratuito).

## 1. Crea il progetto Supabase (5 minuti)
1. Vai su https://supabase.com → *New project* (regione consigliata: Frankfurt / eu-central).
2. **SQL Editor → New query**: incolla tutto `supabase/schema.sql` e premi *Run*.
   Crea le tabelle `notes` e `recordings`, le regole di sicurezza (ognuno vede solo i suoi dati)
   e il bucket privato `audio`.
   Poi, sempre nel SQL Editor, esegui anche `supabase/002_translation.sql` (traduzioni)
   e `supabase/003_folders.sql` (corsi e cartelle), uno alla volta.
3. **Project Settings → API**: copia *Project URL* e *anon public key* dentro `config.js`.

## 2. Pubblica l'app su GitHub Pages (HTTPS, serve per il microfono)
1. Repository → **Settings → Pages**.
2. *Source*: **Deploy from a branch** · *Branch*: `main` · cartella `/ (root)` → **Save**.
3. Dopo circa un minuto l'app è su **https://galimbertip.github.io/Notes/**.

Poi in Supabase → **Authentication → URL Configuration**:
- *Site URL* = `https://galimbertip.github.io/Notes/`
- *Redirect URLs* = `https://galimbertip.github.io/Notes/**`

Ogni push su `main` ripubblica l'app in automatico.

Per provarla in locale: `python3 -m http.server 8080` nella cartella e apri `http://localhost:8080`.

## 3. Account per i colleghi
La registrazione è aperta: ognuno si crea l'account dalla schermata di accesso e conferma l'email.
Per chiuderla: Supabase → Authentication → Sign In / Providers → disattiva *Allow new users to sign up*,
e aggiungi gli utenti a mano da Authentication → Users → *Invite*.

Nota: il servizio email integrato di Supabase invia poche email l'ora. Se i colleghi sono tanti,
configura un SMTP (Authentication → Emails → SMTP) o disattiva *Confirm email*.

## 4. Traduzione con DeepL (da V.0.2.0)
1. Crea un account **DeepL API Free** su https://www.deepl.com/pro-api (500.000 caratteri/mese gratis).
   Copia la chiave da *Account → API Keys* (finisce con `:fx`).
2. Supabase → **SQL Editor**: esegui `supabase/002_translation.sql`.
3. Supabase → **Edge Functions → Deploy a new function → Via Editor**:
   - nome: `translate` (esattamente così)
   - incolla tutto `supabase/functions/translate/index.ts` al posto del codice di esempio → **Deploy**.
4. Nella funzione `translate` → **Details / Settings**: disattiva **Verify JWT with legacy secret**
   (il controllo dell'utente lo fa già il codice) → *Save*.
5. Supabase → **Edge Functions → Secrets → Add new secret**:
   - `DEEPL_API_KEY` = la tua chiave DeepL
   - facoltativo `USER_MONTHLY_LIMIT` = caratteri al mese per utente (default `100000`)

Uso: nella nota premi 🌐, scegli la lingua. Testo e trascrizioni vengono tradotti e salvati in cache:
riaprire la stessa traduzione non consuma caratteri. La scrittura a mano non viene tradotta.

## Dove funziona cosa
| Funzione | Chrome / Edge (PC, Android) | Safari (iPhone/iPad) | Firefox |
|---|---|---|---|
| Testo, mano libera, registrazione | ✅ | ✅ | ✅ |
| Trascrizione live | ✅ | ✅ (iOS 14.5+) | ❌ (l'audio si registra comunque) |

- La trascrizione live usa il riconoscimento vocale del browser (su Chrome passa dai server Google).
- Su alcuni telefoni Android registrazione e trascrizione insieme possono contendersi il microfono:
  se la trascrizione non parte, l'audio resta comunque registrato.
- Lo schermo resta acceso durante la registrazione (Wake Lock) dove supportato.
- Spazio: 1 GB gratuito su Supabase ≈ 90 ore di audio a 24 kbps; max 50 MB per file (≈ 4,5 ore).

## Struttura
```
index.html            interfaccia
styles.css            tema neon GPverse
version.js            ← versione unica (V.maior.minor.patch)
config.js             ← URL e chiave Supabase
app.js                logica principale (auth, note, salvataggi, audio)
draw.js               mano libera
recorder.js           registrazione + trascrizione live
idb.js                archivio locale (offline e recupero registrazioni)
i18n.js               lingue dell'interfaccia
translate.js          traduzione (chiama la Edge Function)
sw.js, manifest       PWA / offline
vendor/supabase.js    libreria Supabase (inclusa, niente CDN)
supabase/schema.sql   database e sicurezza
supabase/002_translation.sql        aggiornamento per le traduzioni
supabase/003_folders.sql            aggiornamento per corsi e cartelle
supabase/functions/translate/       proxy DeepL (Edge Function)
```

## Rilasciare una nuova versione
1. Cambia `self.GPV_VERSION` in `version.js` (es. `V.0.1.1`).
2. Aggiungi la voce in `CHANGELOG.md`.
3. Commit e push su `main`. Il service worker scarica da solo la nuova versione.

Regola: **patch** = correzioni, **minor** = nuove funzioni, **maior** = cambi che rompono la compatibilità dei dati.
