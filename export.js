// GPverse Notes — esportazione della nota in PDF (tramite la stampa del browser → "Salva come PDF").

import { drawStroke, LOGICAL_W } from "./draw.js";

// colori neon dell'app → colori leggibili su carta bianca
const PRINT_COLORS = {
  "#e6f3fb": "#111827", "#2ee6ff": "#0e7490", "#8b7bff": "#6d28d9",
  "#ff5c7a": "#dc2626", "#facc15": "#ca8a04", "#4ade80": "#15803d",
};

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// disegno → immagine PNG su sfondo bianco, ritagliata all'altezza usata
export function drawingToPng(drawing) {
  const strokes = drawing?.strokes || [];
  if (!strokes.length) return null;
  let maxY = 0;
  for (const s of strokes) for (const p of s.p) maxY = Math.max(maxY, p[1] + s.w * 4);
  const h = Math.min(drawing.height || 1400, Math.ceil(maxY + 30));
  const scale = 1.6;                                    // nitido in stampa
  const c = document.createElement("canvas");
  c.width = Math.round(LOGICAL_W * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  for (const s of strokes) {
    const col = s.t === "hl" ? s.c : (PRINT_COLORS[(s.c || "").toLowerCase()] || s.c);
    drawStroke(ctx, { ...s, c: col });
  }
  return c.toDataURL("image/png");
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * doc = {
 *   title, folder: {name,color}|null, updatedAt, body, translatedNote: "Tradotto in …"|null,
 *   drawingPng|null, recordings: [{ when, duration_ms, lang, segments:[{t,text}] }],
 *   labels: { … }, version, lang
 * }
 */
export function buildHtml(doc) {
  const L = doc.labels;
  const recs = doc.recordings.map(r => `
    <section class="rec">
      <h3>${esc(r.when)} <small>· ${fmtTime(r.duration_ms || 0)}${r.lang ? " · " + esc(r.lang) : ""}</small></h3>
      ${r.segments.length
        ? `<table>${r.segments.map(s => `<tr><td class="ts">${fmtTime(s.t)}</td><td>${esc(s.text)}</td></tr>`).join("")}</table>`
        : `<p class="muted">${esc(L.noTranscript)}</p>`}
    </section>`).join("");

  return `<!doctype html>
<html lang="${esc(doc.lang)}"><head><meta charset="utf-8">
<title>${esc(doc.title || L.untitled)}</title>
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { box-sizing: border-box; }
  body { font: 11pt/1.55 "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 0; background: #fff; }
  header { border-bottom: 2px solid #0e7490; padding-bottom: 8px; margin-bottom: 16px; }
  .brand { font: 600 8pt/1 system-ui, sans-serif; letter-spacing: .12em; color: #6d28d9; text-transform: uppercase; }
  h1 { font-size: 20pt; margin: 6px 0 4px; line-height: 1.2; }
  .meta { font-size: 9pt; color: #4b5563; }
  .tag { display: inline-block; padding: 0 6px; border-radius: 4px; border: 1px solid; font-size: 8.5pt; margin-right: 6px; }
  h2 { font-size: 13pt; color: #0e7490; border-bottom: 1px solid #d1d5db; padding-bottom: 3px; margin: 22px 0 10px; break-after: avoid; }
  h3 { font-size: 10.5pt; margin: 14px 0 6px; break-after: avoid; }
  h3 small { font-weight: 400; color: #6b7280; }
  .body { white-space: pre-wrap; }
  .note { font-size: 9pt; color: #6d28d9; margin: -4px 0 8px; }
  img.drawing { width: 100%; border: 1px solid #e5e7eb; border-radius: 4px; }
  table { border-collapse: collapse; width: 100%; }
  td { vertical-align: top; padding: 2px 0; }
  td.ts { width: 52px; color: #0e7490; font: 9pt ui-monospace, monospace; padding-top: 3px; }
  tr { break-inside: avoid; }
  .muted { color: #6b7280; }
  footer { margin-top: 28px; font-size: 8pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 6px; }
  .hint { position: fixed; top: 0; left: 0; right: 0; background: #0b1118; color: #2ee6ff; padding: 10px 14px; font: 13px system-ui; text-align: center; }
  @media print { .hint { display: none; } }
  @media screen { body { max-width: 820px; margin: 56px auto 40px; padding: 0 20px; } }
</style></head>
<body>
  <div class="hint">${esc(L.printHint)}</div>
  <header>
    <div class="brand">GPverse Notes</div>
    <h1>${esc(doc.title || L.untitled)}</h1>
    <div class="meta">
      ${doc.folder ? `<span class="tag" style="color:${esc(PRINT_COLORS[doc.folder.color] || "#0e7490")}">${esc(doc.folder.name)}</span>` : ""}
      ${esc(doc.updatedAt)}
    </div>
  </header>
  ${doc.body != null ? `<h2>${esc(L.text)}</h2>${doc.translatedNote ? `<p class="note">${esc(doc.translatedNote)}</p>` : ""}
    <div class="body">${doc.body.trim() ? esc(doc.body) : `<span class="muted">—</span>`}</div>` : ""}
  ${doc.drawingPng ? `<h2>${esc(L.drawing)}</h2><img class="drawing" src="${doc.drawingPng}" alt="">` : ""}
  ${doc.recordings.length ? `<h2>${esc(L.transcripts)}</h2>${doc.recTranslated ? `<p class="note">${esc(doc.recTranslated)}</p>` : ""}${recs}` : ""}
  <footer>${esc(L.generated)} · GPverse Notes ${esc(doc.version)}</footer>
</body></html>`;
}

// Apre la finestra di stampa. `win` va aperta subito al clic (altrimenti il browser la blocca).
export function printHtml(html, win) {
  if (win && !win.closed) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    const go = () => { win.focus(); win.print(); };
    const imgs = [...win.document.images];
    Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })))
      .then(() => setTimeout(go, 250));
    return;
  }
  // finestra bloccata: stampa da un iframe nascosto
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.append(f);
  f.contentDocument.open();
  f.contentDocument.write(html);
  f.contentDocument.close();
  setTimeout(() => {
    f.contentWindow.focus();
    f.contentWindow.print();
    setTimeout(() => f.remove(), 60_000);
  }, 400);
}
