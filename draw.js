// Mano libera: tratti vettoriali con pressione, evidenziatore, gomma a tratto,
// modalità "solo penna" (il dito scorre la pagina, il palmo viene ignorato).

export const LOGICAL_W = 1000;
const LINE_GAP = 40;

export class Sketch {
  constructor(canvas, wrap, onChange) {
    this.canvas = canvas;
    this.wrap = wrap;
    this.ctx = canvas.getContext("2d");
    this.base = document.createElement("canvas");
    this.bctx = this.base.getContext("2d");
    this.onChange = onChange;
    this.data = { height: 1400, strokes: [] };
    this.tool = "pen";
    this.color = "#e6f3fb";
    this.size = 3;
    this.penOnly = false;
    this.undoStack = [];
    this.cur = null;          // tratto in corso
    this.pan = null;          // scorrimento col dito in modalità solo penna
    this.erasing = false;
    this.activePointer = null;
    this.raf = 0;

    canvas.addEventListener("pointerdown", e => this.down(e));
    canvas.addEventListener("pointermove", e => this.move(e));
    canvas.addEventListener("pointerup", e => this.up(e));
    canvas.addEventListener("pointercancel", e => this.up(e));
    canvas.addEventListener("contextmenu", e => e.preventDefault());
    new ResizeObserver(() => this.resize()).observe(wrap);
  }

  load(drawing) {
    const d = drawing && Array.isArray(drawing.strokes) ? drawing : { height: 1400, strokes: [] };
    this.data = { height: d.height || 1400, strokes: d.strokes.slice() };
    this.undoStack = [];
    this.resize();
  }
  getData() { return this.data; }

  // ─ dimensioni ─
  resize() {
    const avail = this.wrap.clientWidth - parseFloat(getComputedStyle(this.wrap).paddingLeft) * 2;
    const cssW = Math.max(200, Math.min(LOGICAL_W, avail));
    this.scale = cssW / LOGICAL_W;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssH = this.data.height * this.scale;
    for (const c of [this.canvas, this.base]) {
      c.width = Math.round(cssW * this.dpr);
      c.height = Math.round(cssH * this.dpr);
    }
    this.canvas.style.height = cssH + "px";
    this.renderBase();
  }

  // ─ disegno ─
  setTransform(ctx) {
    const k = this.scale * this.dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
  }

  renderBase() {
    const ctx = this.bctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.base.width, this.base.height);
    this.setTransform(ctx);
    // righe del quaderno
    ctx.strokeStyle = "rgba(46,230,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = LINE_GAP * 2; y < this.data.height; y += LINE_GAP) { ctx.moveTo(0, y); ctx.lineTo(LOGICAL_W, y); }
    ctx.stroke();
    for (const s of this.data.strokes) drawStroke(ctx, s);
    this.frame();
  }

  frame() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.base, 0, 0);
    if (this.cur) { this.setTransform(ctx); drawStroke(ctx, this.cur); }
  }

  schedule() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.frame(); });
  }

  // ─ input ─
  pos(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / this.scale;
    const y = (e.clientY - r.top) / this.scale;
    const p = e.pointerType === "mouse" ? 0.5 : (e.pressure > 0 ? e.pressure : 0.5);
    return [round(x), round(y), Math.round(p * 100) / 100];
  }

  down(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // palmo: se una penna sta già scrivendo ignora i tocchi
    if (this.activePointer !== null && this.activePointer !== e.pointerId) return;
    if (this.penOnly && e.pointerType === "touch") {
      this.pan = { id: e.pointerId, y: e.clientY, x: e.clientX, top: this.wrap.scrollTop, left: this.wrap.scrollLeft };
      this.canvas.setPointerCapture(e.pointerId);
      return;
    }
    e.preventDefault();
    this.activePointer = e.pointerId;
    this.canvas.setPointerCapture(e.pointerId);
    const pt = this.pos(e);
    if (this.tool === "eraser") {
      this.pushUndo();
      this.erasing = true;
      this.eraseAt(pt);
      return;
    }
    this.cur = {
      t: this.tool === "highlighter" ? "hl" : "pen",
      c: this.color,
      w: this.size,
      p: [pt],
    };
    this.schedule();
  }

  move(e) {
    if (this.pan && e.pointerId === this.pan.id) {
      this.wrap.scrollTop = this.pan.top - (e.clientY - this.pan.y);
      this.wrap.scrollLeft = this.pan.left - (e.clientX - this.pan.x);
      return;
    }
    if (e.pointerId !== this.activePointer) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) {
      const pt = this.pos(ev);
      if (this.erasing) { this.eraseAt(pt); continue; }
      if (!this.cur) continue;
      const last = this.cur.p[this.cur.p.length - 1];
      if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) < 0.8) continue;
      this.cur.p.push(pt);
    }
    if (this.cur) this.schedule();
  }

  up(e) {
    if (this.pan && e.pointerId === this.pan.id) { this.pan = null; return; }
    if (e.pointerId !== this.activePointer) return;
    this.activePointer = null;
    if (this.erasing) { this.erasing = false; this.changed(); return; }
    if (!this.cur) return;
    this.pushUndo();
    this.data.strokes.push(this.cur);
    const maxY = Math.max(...this.cur.p.map(p => p[1]));
    this.cur = null;
    if (maxY > this.data.height - 120) { this.data.height += 600; this.resize(); }
    else this.renderBase();
    this.changed();
  }

  eraseAt([x, y]) {
    const r = Math.max(10, this.size * 3);
    const before = this.data.strokes.length;
    this.data.strokes = this.data.strokes.filter(s => !hits(s, x, y, r));
    if (this.data.strokes.length !== before) this.renderBase();
  }

  // ─ comandi ─
  pushUndo() {
    this.undoStack.push(JSON.stringify(this.data));
    if (this.undoStack.length > 60) this.undoStack.shift();
  }
  undo() {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.data = JSON.parse(prev);
    this.resize();
    this.changed();
  }
  clear() {
    this.pushUndo();
    this.data.strokes = [];
    this.renderBase();
    this.changed();
  }
  addSpace() {
    this.pushUndo();
    this.data.height += 700;
    this.resize();
    this.wrap.scrollTo({ top: this.wrap.scrollHeight, behavior: "smooth" });
    this.changed();
  }
  changed() { this.onChange && this.onChange(); }
}

function round(v) { return Math.round(v * 10) / 10; }

function hits(s, x, y, r) {
  const rr = r + (s.t === "hl" ? s.w * 2 : s.w / 2);
  const pts = s.p;
  if (pts.length === 1) return Math.hypot(pts[0][0] - x, pts[0][1] - y) <= rr;
  for (let i = 1; i < pts.length; i++) {
    if (distSeg(x, y, pts[i - 1], pts[i]) <= rr) return true;
  }
  return false;
}

function distSeg(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}

export function drawStroke(ctx, s) {
  const pts = s.p;
  if (!pts.length) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = s.c;
  ctx.fillStyle = s.c;

  if (s.t === "hl") {
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = s.w * 4;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], widthFor(s.w, pts[0][2]) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  // segmenti con spessore variabile secondo la pressione, raccordati sui punti medi
  let prevMid = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const mid = i === pts.length - 1 ? b : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.lineWidth = widthFor(s.w, (a[2] + b[2]) / 2);
    ctx.beginPath();
    ctx.moveTo(prevMid[0], prevMid[1]);
    ctx.quadraticCurveTo(a[0], a[1], mid[0], mid[1]);
    ctx.stroke();
    prevMid = mid;
  }
  ctx.restore();
}

function widthFor(w, p) { return w * (0.35 + 1.1 * (p ?? 0.5)); }
