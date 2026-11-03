# Changelog — GPverse Notes

Formato versione: **V.maior.minor.patch** (fonte unica: `version.js`).

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
- V.0.2.0 — traduzione nella propria lingua con DeepL API Free (proxy su Supabase Edge Function).
- In valutazione — ritrascrizione accurata con Whisper nel browser; esportazione PDF; cartelle/corsi.
