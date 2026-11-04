// GPverse Notes — testi dell'interfaccia (multilingua).
// Per aggiungere una lingua: copia il blocco "it", traduci e aggiungi il codice in LANGS.

export const LANGS = { it: "Italiano", en: "English", de: "Deutsch", fr: "Français", es: "Español" };

// Lingue proposte per la trascrizione vocale (codici BCP-47).
export const SPEECH_LANGS = {
  "it-IT": "Italiano", "en-US": "English (US)", "en-GB": "English (UK)", "de-DE": "Deutsch",
  "fr-FR": "Français", "es-ES": "Español", "pt-PT": "Português", "ro-RO": "Română",
  "pl-PL": "Polski", "ar-SA": "العربية", "zh-CN": "中文", "uk-UA": "Українська",
};

const STR = {
  it: {
    courses: "Corsi", allNotes: "Tutte le note", noFolder: "Senza corso", newFolder: "Nuovo corso", folderNamePrompt: "Nome del corso o della cartella:", renameFolder: "Rinomina", deleteFolder: "Elimina corso", confirmDeleteFolder: "Eliminare \"{name}\"? Le note non vengono cancellate: restano senza corso.", moveToFolder: "Sposta nel corso",
    translate: "Traduci", translateTo: "Traduci in", trRefresh: "Ritraduci", translating: "Traduzione in corso…", trDone: "Tradotto da", trNoDraw: "La scrittura a mano non viene tradotta.", trSameLang: "Già nella lingua scelta", trEmpty: "Niente da tradurre.", trChars: "caratteri questo mese", trUserLimit: "Hai raggiunto il tuo limite mensile di traduzione.", trQuota: "Quota DeepL del mese esaurita: riprova il mese prossimo.", trNotConfigured: "Traduzione non configurata: manca la chiave DeepL sul server.", trNoFunction: "Funzione di traduzione non installata su Supabase.", trBadKey: "Chiave DeepL non valida.", trTooLong: "Testo troppo lungo da tradurre in una volta.",
    passwordRepeat: "Ripeti password", passwordMismatch: "Le due password non coincidono.", passwordShort: "La password deve avere almeno 6 caratteri.", emailExists: "Questa email è già registrata: accedi, o usa il link di accesso.", emailRateLimit: "Troppe email inviate in poco tempo. Riprova tra un'ora.", badCredentials: "Email o password errate.", emailNotConfirmed: "Email non ancora confermata: apri il link che ti abbiamo inviato (controlla anche lo spam).", networkError: "Impossibile raggiungere il server. Controlla la connessione.",
    tagline: "Appunti a tastiera, a mano libera e a voce",
    email: "Email", password: "Password",
    signIn: "Accedi", signUp: "Crea account", magicLink: "Inviami un link di accesso",
    haveAccount: "Hai già un account? Accedi", noAccount: "Non hai un account? Registrati",
    checkEmail: "Controlla la tua email per completare l'accesso.",
    signUpDone: "Account creato. Conferma l'indirizzo dalla email che hai ricevuto, poi accedi.",
    signOut: "Esci",
    notConfigured: "App non ancora collegata a Supabase: compila config.js (vedi README).",
    newNote: "Nuova nota", search: "Cerca…", untitled: "Senza titolo",
    noNotes: "Nessuna nota. Creane una!", pickNote: "Seleziona o crea una nota",
    titlePh: "Titolo della nota", bodyPh: "Scrivi qui i tuoi appunti…",
    tabText: "Testo", tabDraw: "Mano libera", tabAudio: "Audio",
    deleteNote: "Elimina nota", confirmDelete: "Eliminare questa nota con disegni e registrazioni?",
    saved: "Salvato", saving: "Salvataggio…", offlineSaved: "Offline: salvato sul dispositivo",
    pen: "Penna", highlighter: "Evidenziatore", eraser: "Gomma", undo: "Annulla",
    clear: "Cancella tutto", confirmClear: "Cancellare tutto il disegno?",
    penOnly: "Solo penna (il dito scorre)", moreSpace: "Più spazio", size: "Spessore",
    record: "Registra", stop: "Stop", recording: "Registrazione in corso",
    speechLang: "Lingua del parlato", liveTranscript: "Trascrizione live",
    noSpeechApi: "Trascrizione live non supportata da questo browser: l'audio viene comunque registrato.",
    micDenied: "Permesso microfono negato.",
    recordings: "Registrazioni", noRecordings: "Nessuna registrazione in questa nota.",
    pendingUpload: "In attesa di caricamento", uploadFailed: "Caricamento non riuscito, riprovo più tardi",
    deleteRec: "Elimina registrazione", confirmDeleteRec: "Eliminare questa registrazione?",
    noTranscript: "Nessuna trascrizione.", copyTranscript: "Copia trascrizione",
    copied: "Copiato", insertInText: "Inserisci nel testo",
    consentHint: "Ricorda di chiedere il permesso prima di registrare una lezione.",
    online: "Online", offline: "Offline", menu: "Menu", language: "Lingua",
    error: "Errore", loading: "Caricamento…",
  },
  en: {
    courses: "Courses", allNotes: "All notes", noFolder: "No course", newFolder: "New course", folderNamePrompt: "Course or folder name:", renameFolder: "Rename", deleteFolder: "Delete course", confirmDeleteFolder: "Delete \"{name}\"? Notes are kept, without a course.", moveToFolder: "Move to course",
    translate: "Translate", translateTo: "Translate to", trRefresh: "Translate again", translating: "Translating…", trDone: "Translated from", trNoDraw: "Handwriting isn't translated.", trSameLang: "Already in the chosen language", trEmpty: "Nothing to translate.", trChars: "characters this month", trUserLimit: "You've reached your monthly translation limit.", trQuota: "DeepL monthly quota used up: try again next month.", trNotConfigured: "Translation not set up: the DeepL key is missing on the server.", trNoFunction: "Translation function isn't installed on Supabase.", trBadKey: "Invalid DeepL key.", trTooLong: "Text too long to translate at once.",
    passwordRepeat: "Repeat password", passwordMismatch: "The two passwords don't match.", passwordShort: "Password must be at least 6 characters.", emailExists: "This email is already registered: sign in, or use the sign-in link.", emailRateLimit: "Too many emails sent in a short time. Try again in an hour.", badCredentials: "Wrong email or password.", emailNotConfirmed: "Email not confirmed yet: open the link we sent you (check spam too).", networkError: "Can't reach the server. Check your connection.",
    tagline: "Notes by keyboard, by hand and by voice",
    email: "Email", password: "Password",
    signIn: "Sign in", signUp: "Create account", magicLink: "Email me a sign-in link",
    haveAccount: "Already have an account? Sign in", noAccount: "No account? Sign up",
    checkEmail: "Check your email to finish signing in.",
    signUpDone: "Account created. Confirm your address from the email you received, then sign in.",
    signOut: "Sign out",
    notConfigured: "App not connected to Supabase yet: fill in config.js (see README).",
    newNote: "New note", search: "Search…", untitled: "Untitled",
    noNotes: "No notes yet. Create one!", pickNote: "Select or create a note",
    titlePh: "Note title", bodyPh: "Write your notes here…",
    tabText: "Text", tabDraw: "Handwriting", tabAudio: "Audio",
    deleteNote: "Delete note", confirmDelete: "Delete this note with its drawings and recordings?",
    saved: "Saved", saving: "Saving…", offlineSaved: "Offline: saved on this device",
    pen: "Pen", highlighter: "Highlighter", eraser: "Eraser", undo: "Undo",
    clear: "Clear all", confirmClear: "Clear the whole drawing?",
    penOnly: "Pen only (finger scrolls)", moreSpace: "More space", size: "Size",
    record: "Record", stop: "Stop", recording: "Recording",
    speechLang: "Spoken language", liveTranscript: "Live transcript",
    noSpeechApi: "Live transcription isn't supported in this browser: audio is still recorded.",
    micDenied: "Microphone permission denied.",
    recordings: "Recordings", noRecordings: "No recordings in this note.",
    pendingUpload: "Waiting to upload", uploadFailed: "Upload failed, will retry later",
    deleteRec: "Delete recording", confirmDeleteRec: "Delete this recording?",
    noTranscript: "No transcript.", copyTranscript: "Copy transcript",
    copied: "Copied", insertInText: "Insert into text",
    consentHint: "Remember to ask permission before recording a lesson.",
    online: "Online", offline: "Offline", menu: "Menu", language: "Language",
    error: "Error", loading: "Loading…",
  },
  de: {
    courses: "Kurse", allNotes: "Alle Notizen", noFolder: "Ohne Kurs", newFolder: "Neuer Kurs", folderNamePrompt: "Name des Kurses oder Ordners:", renameFolder: "Umbenennen", deleteFolder: "Kurs löschen", confirmDeleteFolder: "\"{name}\" löschen? Die Notizen bleiben erhalten, ohne Kurs.", moveToFolder: "In Kurs verschieben",
    translate: "Übersetzen", translateTo: "Übersetzen in", trRefresh: "Neu übersetzen", translating: "Wird übersetzt…", trDone: "Übersetzt aus", trNoDraw: "Handschrift wird nicht übersetzt.", trSameLang: "Bereits in der gewählten Sprache", trEmpty: "Nichts zu übersetzen.", trChars: "Zeichen diesen Monat", trUserLimit: "Du hast dein monatliches Übersetzungslimit erreicht.", trQuota: "DeepL-Monatskontingent aufgebraucht: nächsten Monat erneut versuchen.", trNotConfigured: "Übersetzung nicht eingerichtet: DeepL-Schlüssel fehlt auf dem Server.", trNoFunction: "Übersetzungsfunktion ist auf Supabase nicht installiert.", trBadKey: "Ungültiger DeepL-Schlüssel.", trTooLong: "Text zu lang für eine Übersetzung.",
    passwordRepeat: "Passwort wiederholen", passwordMismatch: "Die Passwörter stimmen nicht überein.", passwordShort: "Das Passwort muss mindestens 6 Zeichen haben.", emailExists: "Diese E-Mail ist bereits registriert: melde dich an oder nutze den Anmeldelink.", emailRateLimit: "Zu viele E-Mails in kurzer Zeit. Versuche es in einer Stunde erneut.", badCredentials: "E-Mail oder Passwort falsch.", emailNotConfirmed: "E-Mail noch nicht bestätigt: öffne den gesendeten Link (auch im Spam nachsehen).", networkError: "Server nicht erreichbar. Prüfe die Verbindung.",
    tagline: "Notizen per Tastatur, Hand und Stimme",
    email: "E-Mail", password: "Passwort",
    signIn: "Anmelden", signUp: "Konto erstellen", magicLink: "Anmeldelink per E-Mail senden",
    haveAccount: "Schon ein Konto? Anmelden", noAccount: "Kein Konto? Registrieren",
    checkEmail: "Prüfe deine E-Mails, um die Anmeldung abzuschließen.",
    signUpDone: "Konto erstellt. Bestätige die Adresse über die erhaltene E-Mail und melde dich dann an.",
    signOut: "Abmelden",
    notConfigured: "App noch nicht mit Supabase verbunden: config.js ausfüllen (siehe README).",
    newNote: "Neue Notiz", search: "Suchen…", untitled: "Ohne Titel",
    noNotes: "Noch keine Notizen. Erstelle eine!", pickNote: "Notiz auswählen oder erstellen",
    titlePh: "Titel der Notiz", bodyPh: "Schreibe hier deine Notizen…",
    tabText: "Text", tabDraw: "Handschrift", tabAudio: "Audio",
    deleteNote: "Notiz löschen", confirmDelete: "Diese Notiz mit Zeichnungen und Aufnahmen löschen?",
    saved: "Gespeichert", saving: "Speichern…", offlineSaved: "Offline: auf dem Gerät gespeichert",
    pen: "Stift", highlighter: "Marker", eraser: "Radierer", undo: "Rückgängig",
    clear: "Alles löschen", confirmClear: "Die ganze Zeichnung löschen?",
    penOnly: "Nur Stift (Finger scrollt)", moreSpace: "Mehr Platz", size: "Stärke",
    record: "Aufnehmen", stop: "Stopp", recording: "Aufnahme läuft",
    speechLang: "Gesprochene Sprache", liveTranscript: "Live-Transkript",
    noSpeechApi: "Live-Transkription wird in diesem Browser nicht unterstützt: Audio wird trotzdem aufgenommen.",
    micDenied: "Mikrofonzugriff verweigert.",
    recordings: "Aufnahmen", noRecordings: "Keine Aufnahmen in dieser Notiz.",
    pendingUpload: "Wartet auf Upload", uploadFailed: "Upload fehlgeschlagen, neuer Versuch später",
    deleteRec: "Aufnahme löschen", confirmDeleteRec: "Diese Aufnahme löschen?",
    noTranscript: "Kein Transkript.", copyTranscript: "Transkript kopieren",
    copied: "Kopiert", insertInText: "In den Text einfügen",
    consentHint: "Frage vor der Aufnahme eines Unterrichts um Erlaubnis.",
    online: "Online", offline: "Offline", menu: "Menü", language: "Sprache",
    error: "Fehler", loading: "Laden…",
  },
  fr: {
    courses: "Cours", allNotes: "Toutes les notes", noFolder: "Sans cours", newFolder: "Nouveau cours", folderNamePrompt: "Nom du cours ou du dossier :", renameFolder: "Renommer", deleteFolder: "Supprimer le cours", confirmDeleteFolder: "Supprimer « {name} » ? Les notes sont conservées, sans cours.", moveToFolder: "Déplacer vers le cours",
    translate: "Traduire", translateTo: "Traduire en", trRefresh: "Retraduire", translating: "Traduction…", trDone: "Traduit de", trNoDraw: "L'écriture manuscrite n'est pas traduite.", trSameLang: "Déjà dans la langue choisie", trEmpty: "Rien à traduire.", trChars: "caractères ce mois-ci", trUserLimit: "Tu as atteint ta limite mensuelle de traduction.", trQuota: "Quota DeepL du mois épuisé : réessaie le mois prochain.", trNotConfigured: "Traduction non configurée : clé DeepL absente sur le serveur.", trNoFunction: "Fonction de traduction non installée sur Supabase.", trBadKey: "Clé DeepL non valide.", trTooLong: "Texte trop long pour une seule traduction.",
    passwordRepeat: "Répéter le mot de passe", passwordMismatch: "Les deux mots de passe ne correspondent pas.", passwordShort: "Le mot de passe doit contenir au moins 6 caractères.", emailExists: "Cet e-mail est déjà enregistré : connecte-toi ou utilise le lien de connexion.", emailRateLimit: "Trop d'e-mails envoyés en peu de temps. Réessaie dans une heure.", badCredentials: "E-mail ou mot de passe incorrect.", emailNotConfirmed: "E-mail pas encore confirmé : ouvre le lien envoyé (vérifie aussi les spams).", networkError: "Serveur injoignable. Vérifie la connexion.",
    tagline: "Notes au clavier, à main levée et à la voix",
    email: "E-mail", password: "Mot de passe",
    signIn: "Se connecter", signUp: "Créer un compte", magicLink: "M'envoyer un lien de connexion",
    haveAccount: "Déjà un compte ? Se connecter", noAccount: "Pas de compte ? S'inscrire",
    checkEmail: "Vérifie ta boîte mail pour terminer la connexion.",
    signUpDone: "Compte créé. Confirme l'adresse via l'e-mail reçu, puis connecte-toi.",
    signOut: "Se déconnecter",
    notConfigured: "App pas encore reliée à Supabase : remplis config.js (voir README).",
    newNote: "Nouvelle note", search: "Rechercher…", untitled: "Sans titre",
    noNotes: "Aucune note. Crées-en une !", pickNote: "Choisis ou crée une note",
    titlePh: "Titre de la note", bodyPh: "Écris tes notes ici…",
    tabText: "Texte", tabDraw: "Main levée", tabAudio: "Audio",
    deleteNote: "Supprimer la note", confirmDelete: "Supprimer cette note avec ses dessins et enregistrements ?",
    saved: "Enregistré", saving: "Enregistrement…", offlineSaved: "Hors ligne : enregistré sur l'appareil",
    pen: "Stylo", highlighter: "Surligneur", eraser: "Gomme", undo: "Annuler",
    clear: "Tout effacer", confirmClear: "Effacer tout le dessin ?",
    penOnly: "Stylet seul (le doigt fait défiler)", moreSpace: "Plus d'espace", size: "Épaisseur",
    record: "Enregistrer", stop: "Stop", recording: "Enregistrement en cours",
    speechLang: "Langue parlée", liveTranscript: "Transcription en direct",
    noSpeechApi: "Transcription en direct non prise en charge par ce navigateur : l'audio est quand même enregistré.",
    micDenied: "Accès au micro refusé.",
    recordings: "Enregistrements", noRecordings: "Aucun enregistrement dans cette note.",
    pendingUpload: "En attente d'envoi", uploadFailed: "Échec de l'envoi, nouvel essai plus tard",
    deleteRec: "Supprimer l'enregistrement", confirmDeleteRec: "Supprimer cet enregistrement ?",
    noTranscript: "Aucune transcription.", copyTranscript: "Copier la transcription",
    copied: "Copié", insertInText: "Insérer dans le texte",
    consentHint: "Pense à demander l'autorisation avant d'enregistrer un cours.",
    online: "En ligne", offline: "Hors ligne", menu: "Menu", language: "Langue",
    error: "Erreur", loading: "Chargement…",
  },
  es: {
    courses: "Cursos", allNotes: "Todas las notas", noFolder: "Sin curso", newFolder: "Nuevo curso", folderNamePrompt: "Nombre del curso o carpeta:", renameFolder: "Renombrar", deleteFolder: "Eliminar curso", confirmDeleteFolder: "¿Eliminar \"{name}\"? Las notas se conservan, sin curso.", moveToFolder: "Mover al curso",
    translate: "Traducir", translateTo: "Traducir a", trRefresh: "Volver a traducir", translating: "Traduciendo…", trDone: "Traducido de", trNoDraw: "La escritura a mano no se traduce.", trSameLang: "Ya está en el idioma elegido", trEmpty: "Nada que traducir.", trChars: "caracteres este mes", trUserLimit: "Has alcanzado tu límite mensual de traducción.", trQuota: "Cuota mensual de DeepL agotada: inténtalo el mes que viene.", trNotConfigured: "Traducción no configurada: falta la clave DeepL en el servidor.", trNoFunction: "La función de traducción no está instalada en Supabase.", trBadKey: "Clave DeepL no válida.", trTooLong: "Texto demasiado largo para traducirlo de una vez.",
    passwordRepeat: "Repite la contraseña", passwordMismatch: "Las contraseñas no coinciden.", passwordShort: "La contraseña debe tener al menos 6 caracteres.", emailExists: "Este correo ya está registrado: entra o usa el enlace de acceso.", emailRateLimit: "Demasiados correos en poco tiempo. Inténtalo en una hora.", badCredentials: "Correo o contraseña incorrectos.", emailNotConfirmed: "Correo aún no confirmado: abre el enlace que te enviamos (revisa también spam).", networkError: "No se puede contactar con el servidor. Revisa la conexión.",
    tagline: "Apuntes con teclado, a mano y por voz",
    email: "Correo", password: "Contraseña",
    signIn: "Entrar", signUp: "Crear cuenta", magicLink: "Envíame un enlace de acceso",
    haveAccount: "¿Ya tienes cuenta? Entra", noAccount: "¿No tienes cuenta? Regístrate",
    checkEmail: "Revisa tu correo para completar el acceso.",
    signUpDone: "Cuenta creada. Confirma la dirección desde el correo recibido y luego entra.",
    signOut: "Salir",
    notConfigured: "La app aún no está conectada a Supabase: completa config.js (ver README).",
    newNote: "Nueva nota", search: "Buscar…", untitled: "Sin título",
    noNotes: "Aún no hay notas. ¡Crea una!", pickNote: "Elige o crea una nota",
    titlePh: "Título de la nota", bodyPh: "Escribe aquí tus apuntes…",
    tabText: "Texto", tabDraw: "A mano", tabAudio: "Audio",
    deleteNote: "Eliminar nota", confirmDelete: "¿Eliminar esta nota con sus dibujos y grabaciones?",
    saved: "Guardado", saving: "Guardando…", offlineSaved: "Sin conexión: guardado en el dispositivo",
    pen: "Bolígrafo", highlighter: "Resaltador", eraser: "Goma", undo: "Deshacer",
    clear: "Borrar todo", confirmClear: "¿Borrar todo el dibujo?",
    penOnly: "Solo lápiz (el dedo desplaza)", moreSpace: "Más espacio", size: "Grosor",
    record: "Grabar", stop: "Parar", recording: "Grabando",
    speechLang: "Idioma hablado", liveTranscript: "Transcripción en directo",
    noSpeechApi: "Este navegador no admite transcripción en directo: el audio se graba igualmente.",
    micDenied: "Permiso de micrófono denegado.",
    recordings: "Grabaciones", noRecordings: "No hay grabaciones en esta nota.",
    pendingUpload: "Pendiente de subir", uploadFailed: "Error al subir, se reintentará",
    deleteRec: "Eliminar grabación", confirmDeleteRec: "¿Eliminar esta grabación?",
    noTranscript: "Sin transcripción.", copyTranscript: "Copiar transcripción",
    copied: "Copiado", insertInText: "Insertar en el texto",
    consentHint: "Recuerda pedir permiso antes de grabar una clase.",
    online: "En línea", offline: "Sin conexión", menu: "Menú", language: "Idioma",
    error: "Error", loading: "Cargando…",
  },
};

let current = "it";

export function detectLang() {
  try {
    const saved = localStorage.getItem("gpv.lang");
    if (saved && STR[saved]) return saved;
  } catch {}
  const nav = (navigator.language || "it").slice(0, 2).toLowerCase();
  return STR[nav] ? nav : "it";
}

export function setLang(lang) {
  current = STR[lang] ? lang : "it";
  try { localStorage.setItem("gpv.lang", current); } catch {}
  document.documentElement.lang = current;
  applyI18n(document);
}

export function getLang() { return current; }

export function t(key) {
  return (STR[current] && STR[current][key]) ?? STR.it[key] ?? key;
}

export function applyI18n(root) {
  root.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll("[data-i18n-title]").forEach(el => {
    el.title = t(el.dataset.i18nTitle);
    el.setAttribute("aria-label", t(el.dataset.i18nTitle));
  });
}
