// Registrazione audio (MediaRecorder, Opus ~24 kbps) + trascrizione live (Web Speech API).
// Ogni secondo di audio viene salvato subito in IndexedDB: se la pagina si chiude
// a metà lezione, la registrazione viene recuperata al prossimo avvio.

import { idb } from "./idb.js";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"];
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

export const speechSupported = !!SR;

export function pickMime() {
  if (!window.MediaRecorder) return "";
  return MIME_CANDIDATES.find(m => MediaRecorder.isTypeSupported?.(m)) || "";
}

export function extFor(mime) {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  return "webm";
}

export class Recorder {
  constructor() { this.active = false; }

  async start({ recId, noteId, userId, lang, onLevel, onTranscript, onError }) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.recId = recId;
    this.lang = lang;
    this.mime = pickMime();
    this.seq = 0;
    this.chunks = [];
    this.segments = [];
    this.interim = "";
    this.onTranscript = onTranscript;
    this.onError = onError;
    this.startedAt = Date.now();
    this.active = true;

    const opts = { audioBitsPerSecond: 24000 };
    if (this.mime) opts.mimeType = this.mime;
    this.mr = new MediaRecorder(this.stream, opts);
    this.mime = this.mr.mimeType || this.mime || "audio/webm";

    await idb.put("live", {
      id: recId, noteId, userId, mime: this.mime, lang, startedAt: this.startedAt, transcript: [],
    });

    this.mr.ondataavailable = e => {
      if (!e.data || !e.data.size) return;
      this.chunks.push(e.data);
      idb.put("chunks", { recId, seq: this.seq++, blob: e.data }).catch(() => {});
    };
    this.mr.start(1000);

    this.startMeter(onLevel);
    this.startSpeech();
    this.requestWakeLock();
  }

  elapsed() { return this.active ? Date.now() - this.startedAt : 0; }

  // ─ livello microfono ─
  startMeter(onLevel) {
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      const src = this.ac.createMediaStreamSource(this.stream);
      this.an = this.ac.createAnalyser();
      this.an.fftSize = 512;
      src.connect(this.an);
      const buf = new Uint8Array(this.an.fftSize);
      const tick = () => {
        if (!this.active) return;
        this.an.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) { const d = (v - 128) / 128; sum += d * d; }
        onLevel && onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        this.meterRaf = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* meter facoltativo */ }
  }

  // ─ trascrizione live ─
  startSpeech() {
    if (!SR) return;
    const rec = new SR();
    rec.lang = this.lang;
    rec.continuous = true;
    rec.interimResults = true;
    let segStart = null;

    rec.onresult = ev => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const text = r[0].transcript.trim();
        if (segStart === null) segStart = Math.max(0, this.elapsed() - 1500);
        if (r.isFinal) {
          if (text) this.segments.push({ t: segStart, text });
          segStart = null;
          this.persistTranscript();
        } else {
          interim += text + " ";
        }
      }
      this.interim = interim.trim();
      this.onTranscript && this.onTranscript(this.segments, this.interim);
    };
    rec.onerror = ev => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        this.speechDenied = true;
        this.onError && this.onError(ev.error);
      }
    };
    // il riconoscimento si ferma da solo dopo pause/limiti: lo riavviamo finché registriamo
    rec.onend = () => {
      if (this.active && !this.speechDenied) setTimeout(() => { try { rec.start(); } catch {} }, 250);
    };
    try { rec.start(); } catch {}
    this.speech = rec;
  }

  persistTranscript() {
    idb.get("live", this.recId).then(m => {
      if (m) { m.transcript = this.segments; return idb.put("live", m); }
    }).catch(() => {});
  }

  async requestWakeLock() {
    try { this.wake = await navigator.wakeLock?.request("screen"); } catch {}
  }

  async stop() {
    if (!this.active) return null;
    this.active = false;
    const durationMs = Date.now() - this.startedAt;
    cancelAnimationFrame(this.meterRaf);
    try { this.speech && this.speech.stop(); } catch {}
    if (this.interim) { this.segments.push({ t: Math.max(0, durationMs - 3000), text: this.interim }); this.interim = ""; }

    await new Promise(res => {
      this.mr.onstop = res;
      try { this.mr.stop(); } catch { res(); }
    });
    this.stream.getTracks().forEach(t => t.stop());
    try { await this.ac?.close(); } catch {}
    try { await this.wake?.release(); } catch {}

    return {
      blob: new Blob(this.chunks, { type: this.mime }),
      mime: this.mime,
      durationMs,
      transcript: this.segments,
      lang: this.lang,
    };
  }
}

// Recupero di registrazioni interrotte (pagina chiusa, crash, batteria…)
export async function recoverInterrupted() {
  const lives = await idb.all("live");
  const recovered = [];
  for (const m of lives) {
    const chunks = (await idb.chunksOf(m.id)).sort((a, b) => a.seq - b.seq);
    if (chunks.length) {
      const item = {
        id: m.id, noteId: m.noteId, userId: m.userId, mime: m.mime, lang: m.lang,
        blob: new Blob(chunks.map(c => c.blob), { type: m.mime }),
        durationMs: chunks.length * 1000,
        transcript: m.transcript || [],
        createdAt: m.startedAt,
      };
      await idb.put("pending", item);
      recovered.push(item);
    }
    await idb.delChunks(m.id);
    await idb.del("live", m.id);
  }
  return recovered;
}
