// Traduzione con DeepL tramite la Edge Function "translate" di Supabase.

// Lingue di destinazione (codici DeepL)
export const TARGETS = {
  "IT": "Italiano", "EN-GB": "English (UK)", "EN-US": "English (US)", "DE": "Deutsch",
  "FR": "Français", "ES": "Español", "PT-PT": "Português", "PT-BR": "Português (BR)",
  "RO": "Română", "PL": "Polski", "NL": "Nederlands", "UK": "Українська", "RU": "Русский",
  "TR": "Türkçe", "AR": "العربية", "ZH": "中文",
};

const FROM_UI = { it: "IT", en: "EN-GB", de: "DE", fr: "FR", es: "ES" };

export function defaultTarget(uiLang) {
  try {
    const saved = localStorage.getItem("gpv.trTarget");
    if (saved && TARGETS[saved]) return saved;
  } catch {}
  return FROM_UI[uiLang] || "IT";
}

export function rememberTarget(code) {
  try { localStorage.setItem("gpv.trTarget", code); } catch {}
}

// "it-IT" → "IT": lingua sorgente per DeepL
export function sourceFromSpeech(speechLang) {
  return (speechLang || "").slice(0, 2).toUpperCase() || undefined;
}

export function sameLanguage(source, target) {
  return !!source && target.slice(0, 2) === source.slice(0, 2);
}

// hash veloce per capire se il testo originale è cambiato
export function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export async function translateTexts(sb, texts, target, source) {
  const { data, error } = await sb.functions.invoke("translate", {
    body: { texts, target_lang: target, ...(source ? { source_lang: source } : {}) },
  });
  if (error) {
    let info = {};
    try { info = await error.context.json(); } catch {}
    const status = error.context && error.context.status;
    const e = new Error(info.error || error.message || "error");
    e.code = info.error || (status === 404 ? "no_function" : /fetch|network/i.test(error.message || "") ? "network" : "error");
    e.usage = info.usage;
    throw e;
  }
  return data;
}
