// GPverse Notes — trascrizione di una registrazione con Whisper (gira tutto nel browser).

export const MODELS = {
  fast: { id: "Xenova/whisper-base", size: "~80 MB" },
  accurate: { id: "Xenova/whisper-small", size: "~250 MB" },
};

// codice lingua del parlato (es. "it-IT") → nome lingua Whisper
const LANG = {
  it: "italian", en: "english", de: "german", fr: "french", es: "spanish", pt: "portuguese",
  ro: "romanian", pl: "polish", ar: "arabic", zh: "chinese", uk: "ukrainian", nl: "dutch",
  ru: "russian", tr: "turkish",
};

const SR = 16000;
const CHUNK_S = 30;

export function whisperLang(speechLang) {
  return LANG[(speechLang || "").slice(0, 2).toLowerCase()] || null;   // null = rilevamento automatico
}

export function getModelChoice() {
  try { const v = localStorage.getItem("gpv.whisperModel"); if (MODELS[v]) return v; } catch {}
  return "fast";
}
export function setModelChoice(v) { try { localStorage.setItem("gpv.whisperModel", v); } catch {} }

// audio registrato → Float32 mono a 16 kHz
export async function decodeTo16k(blob) {
  const buf = await blob.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let decoded;
  try {
    const ctx = new Ctx({ sampleRate: SR });
    decoded = await ctx.decodeAudioData(buf.slice(0));
    ctx.close();
  } catch {
    // alcuni browser non accettano sampleRate: decodifica e ricampiona a mano
    const ctx = new Ctx();
    decoded = await ctx.decodeAudioData(buf.slice(0));
    ctx.close();
  }
  const len = decoded.length;
  const mono = new Float32Array(len);
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const d = decoded.getChannelData(c);
    for (let i = 0; i < len; i++) mono[i] += d[i] / decoded.numberOfChannels;
  }
  if (decoded.sampleRate === SR) return mono;
  const ratio = decoded.sampleRate / SR;
  const out = new Float32Array(Math.floor(len / ratio));
  for (let i = 0; i < out.length; i++) {
    const x = i * ratio, i0 = Math.floor(x), f = x - i0;
    out[i] = mono[i0] * (1 - f) + (mono[i0 + 1] ?? mono[i0]) * f;
  }
  return out;
}

let worker = null;
let busy = false;
export function isBusy() { return busy; }

function getWorker() {
  if (!worker) worker = new Worker(new URL("./whisper-worker.js", import.meta.url), { type: "module" });
  return worker;
}

// Trascrive un blob audio. onProgress({phase:'download'|'decode'|'transcribe', ...})
// Restituisce i segmenti [{t, text}] oppure null se annullato.
export async function transcribe(blob, { model, language, onProgress }) {
  if (busy) throw new Error("busy");
  busy = true;
  const w = getWorker();
  let cancelHandler = null;
  const job = { cancelled: false };
  const cancel = () => { job.cancelled = true; w.postMessage({ type: "cancel" }); cancelHandler && cancelHandler(); };

  const promise = (async () => {
    try {
      // 1) modello
      const files = {};
      await new Promise((resolve, reject) => {
        cancelHandler = () => reject(Object.assign(new Error("cancelled"), { cancelled: true }));
        w.onmessage = ({ data }) => {
          if (data.type === "download") {
            files[data.file] = data;
            const loaded = Object.values(files).reduce((a, f) => a + f.loaded, 0);
            const total = Object.values(files).reduce((a, f) => a + f.total, 0);
            onProgress && onProgress({ phase: "download", loaded, total });
          } else if (data.type === "device") {
            onProgress && onProgress({ phase: "device", device: data.device });
          } else if (data.type === "ready") resolve();
          else if (data.type === "error") reject(new Error(data.message));
        };
        w.postMessage({ type: "load", model: MODELS[model].id });
      });

      // 2) audio
      onProgress && onProgress({ phase: "decode" });
      const audio = await decodeTo16k(blob);
      const step = SR * CHUNK_S;
      const n = Math.max(1, Math.ceil(audio.length / step));

      // 3) un blocco alla volta, così si vede l'avanzamento e si può annullare
      const segments = [];
      for (let i = 0; i < n; i++) {
        if (job.cancelled) return null;
        onProgress && onProgress({ phase: "transcribe", done: i, total: n });
        const piece = audio.slice(i * step, Math.min(audio.length, (i + 1) * step));
        if (piece.length < SR * 0.3) continue;
        const res = await new Promise((resolve, reject) => {
          cancelHandler = () => resolve({ cancelled: true });
          w.onmessage = ({ data }) => {
            if (data.type === "chunkDone" && data.id === i) resolve(data);
            else if (data.type === "error") reject(new Error(data.message));
          };
          w.postMessage({ type: "chunk", id: i, audio: piece, offsetMs: i * CHUNK_S * 1000, language }, [piece.buffer]);
        });
        if (res.cancelled || job.cancelled) return null;
        for (const s of res.segments) {
          // Whisper a volte ripete la stessa frase sui silenzi: scarta i doppioni consecutivi
          if (segments.length && segments[segments.length - 1].text === s.text) continue;
          segments.push(s);
        }
      }
      onProgress && onProgress({ phase: "transcribe", done: n, total: n });
      return segments;
    } catch (e) {
      if (e.cancelled) return null;
      throw e;
    } finally {
      busy = false;
    }
  })();
  return { promise, cancel };
}
