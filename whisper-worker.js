// GPverse Notes — Whisper nel browser (Web Worker)
// Il modello viene scaricato una sola volta da Hugging Face e resta nella cache del browser.

const TF_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";

let tf = null;
let asr = null;
let loadedKey = "";
let cancelled = false;

async function lib() {
  if (!tf) {
    tf = await import(TF_URL);
    tf.env.allowLocalModels = false;
    tf.env.useBrowserCache = true;
  }
  return tf;
}

// Modelli quantizzati q8 su WASM: funzionano su qualsiasi PC/telefono, senza GPU.
async function load(model) {
  const { pipeline } = await lib();
  if (asr && loadedKey === model) return;
  asr = null;
  const progress_callback = p => {
    if (p.status === "progress" && p.total) {
      self.postMessage({ type: "download", file: p.file, loaded: p.loaded, total: p.total });
    }
  };
  asr = await pipeline("automatic-speech-recognition", model, { device: "wasm", dtype: "q8", progress_callback });
  loadedKey = model;
}

self.onmessage = async ({ data }) => {
  if (data.type === "cancel") { cancelled = true; return; }
  if (data.type === "load") {
    cancelled = false;
    try {
      await load(data.model);
      self.postMessage({ type: "ready" });
    } catch (e) {
      self.postMessage({ type: "error", message: String(e && e.message || e) });
    }
    return;
  }
  if (data.type === "chunk") {
    // un blocco di max 30 s di audio a 16 kHz
    if (cancelled) { self.postMessage({ type: "chunkDone", id: data.id, segments: [], cancelled: true }); return; }
    try {
      const out = await asr(data.audio, {
        language: data.language || null,
        task: "transcribe",
        return_timestamps: true,
        chunk_length_s: 30,
      });
      const offset = data.offsetMs;
      const parts = Array.isArray(out.chunks) && out.chunks.length
        ? out.chunks.map(c => ({ t: offset + Math.round((c.timestamp?.[0] ?? 0) * 1000), text: (c.text || "").trim() }))
        : [{ t: offset, text: (out.text || "").trim() }];
      self.postMessage({ type: "chunkDone", id: data.id, segments: parts.filter(p => p.text) });
    } catch (e) {
      self.postMessage({ type: "error", id: data.id, message: String(e && e.message || e) });
    }
  }
};
