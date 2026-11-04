# Changelog — GPverse Notes

Formato versione: **V.maior.minor.patch** (fonte unica: `version.js`).

## V.0.3.1 — 2026-11-04
- Trascrizione live: se il riconoscimento vocale del browser fallisce, l'app mostra il motivo (es. errore "network" su Chromium/Brave/Opera/Edge per Linux) invece di restare muta.
- Riquadro "Trascrizione live" visibile da subito con lo stato: avvio, in ascolto, interrotta.
- Dopo 3 errori consecutivi smette di riprovare; l'audio continua comunque a registrarsi.

## V.0.3.0 — 2026-11-04
- Corsi e cartelle: nella barra laterale crea un corso (es. "Sicurezza – Modulo generale"), rinominalo o eliminalo.
- Ogni corso ha un colore e il numero di note; "Tutte le note" e "Senza corso" sempre disponibili.
- Le nuove note nascono nel corso selezionato; nella nota un menu permette di spostarla (o di creare un corso al volo).
- La ricerca trova le note in tutti i corsi; l'ultimo corso aperto viene ricordato.
- Eliminando un corso le note non si perdono: restano "Senza corso".
- Richiede `supabase/003_folders.sql`; senza, l'app funziona come prima e la sezione corsi resta nascosta.

## V.0.2.0 — 2026-11-03
- Traduzione con DeepL: pulsante 🌐 nella nota, 16 lingue di destinazione.
- Traduce titolo, testo e trascrizioni (con i tempi: clic su una riga tradotta → salta nell'audio; originale al passaggio del mouse).
- Traduzioni salvate in cache: riaprirle non consuma caratteri; si rifanno solo se il testo cambia o con "Ritraduci".
- Chiave DeepL protetta sul server (Supabase Edge Function `translate`), mai nel browser.
- Limite mensile di caratteri per utente (default 100.000) e contatore visibile.
- Copia/inserisci trascrizione usa la versione mostrata (originale o tradotta).
- Salvare una traduzione non cambia più la data di modifica della nota.

## V.0.1.2 — 2026-11-03
- Registrazione: password da inserire due volte, controllo lunghezza minima.
- Messaggi chiari per gli errori di accesso (email già registrata, troppe email, credenziali errate, email non confermata, rete assente).
- Libreria Supabase inclusa nel repository (niente più dipendenza da CDN esterni, avvio offline più affidabile).
- Se l'app non parte, viene mostrato l'errore invece di non fare nulla.

## V.0.1.1 — 2026-11-03
- Collegata al progetto Supabase "Notes" (Frankfurt).
- Pubblicazione su GitHub Pages: https://galimbertip.github.io/Notes/

## V.0.1.0 — 2026-11-02
Prima versione.
- Accesso con email + password o link via email (Supabase Auth), account multipli: ognuno vede solo i propri appunti (RLS).
- Note con titolo e testo da tastiera, salvataggio automatico.
- Mano libera con penna/dito: pressione, evidenziatore, gomma, colori, spessore, annulla, "solo penna" (il dito scorre, palmo ignorato), pagina che si allunga da sola.
- Registrazione audio Opus ~24 kbps con trascrizione live (Web Speech API) e scelta della lingua del parlato.
- Riascolto con trascrizione sincronizzata: clic su una riga per saltare a quel punto; copia o inserisci la trascrizione nel testo.
- Audio salvato ogni secondo sul dispositivo: se la pagina si chiude, la registrazione viene recuperata al riavvio.
- Funziona offline (PWA installabile): bozze e registrazioni vengono caricate al ritorno della rete.
- Interfaccia in italiano, inglese, tedesco, francese e spagnolo.
- Versione visibile nel footer.

## Prossime
- In valutazione — esportazione PDF; ritrascrizione accurata con Whisper nel browser; condivisione note con i colleghi.
