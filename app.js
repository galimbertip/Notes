// GPverse Notes — app principale
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { LANGS, SPEECH_LANGS, detectLang, setLang, getLang, t, applyI18n } from "./i18n.js";
import { Sketch } from "./draw.js";
import { Recorder, speechSupported, extFor, recoverInterrupted } from "./recorder.js";
import { idb } from "./idb.js";

const VERSION = self.GPV_VERSION || "V.?";
const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const configured = !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR-ANON");
const sb = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const state = {
  user: null,
  notes: [],            // [{id,title,body,updated_at}]
  current: null,        // nota aperta
  tab: "text",
  saveTimer: 0,
  signUpMode: false,
  recording: null,      // { recId, noteId }
};

const recorder = new Recorder();
const PALETTE = ["#e6f3fb", "#2ee6ff", "#8b7bff", "#ff5c7a", "#facc15", "#4ade80"];

/* ═════════ Avvio ═════════ */
$$(".app-version").forEach(el => (el.textContent = VERSION));
console.info(`GPverse Notes ${VERSION}`);
fillLangSelects();
setLang(detectLang());
syncLangSelects();
fillSpeechLangs();
updateNet();

const sketch = new Sketch($("#drawCanvas"), $("#canvasWrap"), () => scheduleSave());
buildSwatches();
bindUI();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

if (!configured) {
  showAuth();
  authMsg(t("notConfigured"), "err");
  $$("#authForm button, #authMagic").forEach(b => (b.disabled = true));
} else {
  const { data } = await sb.auth.getSession();
  onSession(data.session);
  sb.auth.onAuthStateChange((_ev, session) => {
    if ((session?.user?.id || null) !== (state.user?.id || null)) onSession(session);
  });
}

/* ═════════ Auth ═════════ */
function showAuth() { $("#authView").hidden = false; $("#appView").hidden = true; }

async function onSession(session) {
  state.user = session?.user || null;
  if (!state.user) { showAuth(); return; }
  $("#authView").hidden = true;
  $("#appView").hidden = false;
  $("#userEmail").textContent = state.user.email || "";
  await recoverInterrupted().catch(() => []);
  await loadNotes();
  flushDrafts();
  flushPending();
}

function authMsg(text, kind = "") {
  const el = $("#authMsg");
  el.textContent = text || "";
  el.className = "msg " + kind;
}

function setAuthMode(signUp) {
  state.signUpMode = signUp;
  $("#authSubmit").dataset.i18n = signUp ? "signUp" : "signIn";
  $("#authToggle").dataset.i18n = signUp ? "haveAccount" : "noAccount";
  $("#authPassword").autocomplete = signUp ? "new-password" : "current-password";
  applyI18n($("#authView"));
  authMsg("");
}

async function submitAuth(e) {
  e.preventDefault();
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  if (!password) { $("#authPassword").focus(); return; }
  $("#authSubmit").disabled = true;
  try {
    if (state.signUpMode) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } });
      if (error) throw error;
      if (!data.session) { authMsg(t("signUpDone"), "ok"); setAuthMode(false); }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    authMsg(err.message || t("error"), "err");
  } finally {
    $("#authSubmit").disabled = false;
  }
}

async function magicLink() {
  const email = $("#authEmail").value.trim();
  if (!email) { $("#authEmail").focus(); return; }
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: appUrl() } });
  authMsg(error ? error.message : t("checkEmail"), error ? "err" : "ok");
}

function appUrl() { return location.origin + location.pathname; }

async function signOut() {
  if (state.recording) await stopRecording();
  await saveNow();
  await sb.auth.signOut();
  state.current = null;
  state.notes = [];
}

/* ═════════ Note ═════════ */
async function loadNotes() {
  try {
    const { data, error } = await sb.from("notes")
      .select("id,title,body,updated_at").order("updated_at", { ascending: false });
    if (error) throw error;
    state.notes = data;
  } catch {
    // offline: usa la cache locale
    const cached = (await idb.all("notes")).filter(n => n.user_id === state.user.id);
    state.notes = cached.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  }
  renderList();
  if (state.current) {
    $("#editor").hidden = false;
  } else if (state.notes.length && window.innerWidth > 800) {
    openNote(state.notes[0].id);
  } else {
    showEmpty();
  }
}

function showEmpty() { $("#editor").hidden = true; $("#emptyState").hidden = false; }

function renderList() {
  const q = $("#searchInput").value.trim().toLowerCase();
  const list = $("#noteList");
  list.innerHTML = "";
  const items = state.notes.filter(n =>
    !q || (n.title || "").toLowerCase().includes(q) || (n.body || "").toLowerCase().includes(q));
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty-li";
    li.textContent = t("noNotes");
    list.append(li);
    return;
  }
  const fmt = new Intl.DateTimeFormat(getLang(), { dateStyle: "medium", timeStyle: "short" });
  for (const n of items) {
    const li = document.createElement("li");
    if (state.current?.id === n.id) li.className = "active";
    li.innerHTML = `<div class="n-title"></div><div class="n-date"></div>`;
    li.querySelector(".n-title").textContent = n.title || t("untitled");
    li.querySelector(".n-date").textContent = n.updated_at ? fmt.format(new Date(n.updated_at)) : "";
    li.onclick = () => { openNote(n.id); closeSidebar(); };
    list.append(li);
  }
}

async function newNote() {
  await saveNow();
  const note = {
    id: crypto.randomUUID(), user_id: state.user.id, title: "", body: "",
    drawing: { height: 1400, strokes: [] }, updated_at: new Date().toISOString(),
  };
  state.notes.unshift({ id: note.id, title: "", body: "", updated_at: note.updated_at });
  showNote(note);
  renderList();
  closeSidebar();
  $("#noteTitle").focus();
  scheduleSave(0);
}

async function openNote(id) {
  if (state.current?.id === id) return;
  await saveNow();
  let note = null;
  try {
    const { data, error } = await sb.from("notes").select("*").eq("id", id).single();
    if (error) throw error;
    note = data;
    idb.put("notes", note).catch(() => {});
  } catch {
    note = await idb.get("notes", id);
  }
  // bozza locale più recente (es. scritta offline)
  const draft = readDraft(id);
  if (draft && (!note || draft.ts > Date.parse(note.updated_at || 0))) {
    note = { ...(note || { id, user_id: state.user.id }), ...draft.payload };
  }
  if (!note) { toast(t("error"), true); return; }
  showNote(note);
  renderList();
}

function showNote(note) {
  state.current = note;
  $("#emptyState").hidden = true;
  $("#editor").hidden = false;
  $("#noteTitle").value = note.title || "";
  $("#noteBody").value = note.body || "";
  sketch.load(note.drawing);
  setSaveState("");
  renderLive();
  if (state.tab === "audio") renderRecordings();
}

async function deleteNote() {
  const n = state.current;
  if (!n || !confirm(t("confirmDelete"))) return;
  if (state.recording?.noteId === n.id) await stopRecording();
  try {
    const { data: recs } = await sb.from("recordings").select("storage_path").eq("note_id", n.id);
    if (recs?.length) await sb.storage.from("audio").remove(recs.map(r => r.storage_path));
    const { error } = await sb.from("notes").delete().eq("id", n.id);
    if (error) throw error;
  } catch (err) { toast(err.message || t("error"), true); return; }
  for (const p of await idb.all("pending")) if (p.noteId === n.id) await idb.del("pending", p.id);
  await idb.del("notes", n.id).catch(() => {});
  clearDraft(n.id);
  clearTimeout(state.saveTimer);
  state.notes = state.notes.filter(x => x.id !== n.id);
  state.current = null;
  renderList();
  showEmpty();
}

/* ═════════ Salvataggio (online + bozze offline) ═════════ */
function collect() {
  const n = state.current;
  n.title = $("#noteTitle").value;
  n.body = $("#noteBody").value;
  n.drawing = sketch.getData();
  return { title: n.title, body: n.body, drawing: n.drawing };
}

function scheduleSave(delay = 900) {
  if (!state.current) return;
  setSaveState(t("saving"));
  const li = state.notes.find(x => x.id === state.current.id);
  if (li) { li.title = $("#noteTitle").value; li.body = $("#noteBody").value; }
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(saveNow, delay);
}

async function saveNow() {
  clearTimeout(state.saveTimer);
  state.saveTimer = 0;
  const n = state.current;
  if (!n || !state.user) return;
  const payload = collect();
  writeDraft(n.id, payload);
  const ok = await pushNote(n.id, payload);
  if (ok) {
    n.updated_at = ok.updated_at;
    const li = state.notes.find(x => x.id === n.id);
    if (li) { Object.assign(li, { title: payload.title, body: payload.body, updated_at: ok.updated_at }); }
    idb.put("notes", { ...n }).catch(() => {});
    if (state.current?.id === n.id) setSaveState(t("saved"));
    renderList();
  } else if (state.current?.id === n.id) {
    idb.put("notes", { ...n, updated_at: new Date().toISOString() }).catch(() => {});
    setSaveState(t("offlineSaved"), true);
  }
}

async function pushNote(id, payload) {
  try {
    const { data, error } = await sb.from("notes")
      .upsert({ id, ...payload }).select("updated_at").single();
    if (error) throw error;
    clearDraft(id);
    return data;
  } catch { return null; }
}

const draftKey = id => `gpv.draft.${state.user?.id}.${id}`;
function writeDraft(id, payload) {
  try { localStorage.setItem(draftKey(id), JSON.stringify({ ts: Date.now(), payload })); } catch {}
}
function readDraft(id) {
  try { return JSON.parse(localStorage.getItem(draftKey(id)) || "null"); } catch { return null; }
}
function clearDraft(id) { try { localStorage.removeItem(draftKey(id)); } catch {} }

async function flushDrafts() {
  if (!state.user || !navigator.onLine) return;
  const prefix = `gpv.draft.${state.user.id}.`;
  const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
  for (const k of keys) {
    const id = k.slice(prefix.length);
    if (state.current?.id === id && state.saveTimer) continue;
    const d = readDraft(id);
    if (d) await pushNote(id, d.payload);
  }
  if (keys.length) loadNotesListOnly();
}

async function loadNotesListOnly() {
  const { data } = await sb.from("notes").select("id,title,body,updated_at").order("updated_at", { ascending: false });
  if (data) { state.notes = data; renderList(); }
}

function setSaveState(text, off = false) {
  const el = $("#saveState");
  el.textContent = text;
  el.classList.toggle("off", off);
}

/* ═════════ Registrazione ═════════ */
async function toggleRecording() {
  if (state.recording) return stopRecording();
  if (!state.current) return;
  if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) { toast(t("error"), true); return; }
  const recId = crypto.randomUUID();
  const noteId = state.current.id;
  await saveNow();   // la nota deve esistere sul server prima dell'audio
  try {
    await recorder.start({
      recId, noteId, userId: state.user.id, lang: $("#speechLang").value,
      onLevel: drawLevel,
      onTranscript: () => renderLive(),
      onError: () => { $("#speechWarn").hidden = false; },
    });
  } catch (err) {
    toast(err.name === "NotAllowedError" ? t("micDenied") : (err.message || t("error")), true);
    return;
  }
  state.recording = { recId, noteId };
  try { localStorage.setItem("gpv.speechLang", $("#speechLang").value); } catch {}
  $("#speechLang").disabled = true;
  updateRecUI();
  state.timerInt = setInterval(updateTimer, 250);
}

async function stopRecording() {
  const rec = state.recording;
  if (!rec) return;
  clearInterval(state.timerInt);
  const res = await recorder.stop();
  state.recording = null;
  $("#speechLang").disabled = false;
  updateRecUI();
  drawLevel(0);
  $("#recTimer").textContent = "00:00";
  if (res && res.blob.size) {
    const item = {
      id: rec.recId, noteId: rec.noteId, userId: state.user.id, blob: res.blob, mime: res.mime,
      durationMs: res.durationMs, transcript: res.transcript, lang: res.lang, createdAt: Date.now(),
    };
    await idb.put("pending", item);
  }
  await idb.delChunks(rec.recId).catch(() => {});
  await idb.del("live", rec.recId).catch(() => {});
  renderLive();
  if (state.current?.id === rec.noteId) renderRecordings();
  flushPending();
}

let flushing = false;
async function flushPending() {
  if (flushing || !state.user || !navigator.onLine) return;
  flushing = true;
  try {
    const items = (await idb.all("pending")).filter(p => p.userId === state.user.id);
    for (const p of items) {
      try {
        // la nota potrebbe essere stata creata offline
        const d = readDraft(p.noteId);
        if (d) await pushNote(p.noteId, d.payload);
        const path = `${state.user.id}/${p.id}.${extFor(p.mime)}`;
        const up = await sb.storage.from("audio").upload(path, p.blob, { contentType: p.mime.split(";")[0], upsert: true });
        if (up.error) throw up.error;
        const { error } = await sb.from("recordings").upsert({
          id: p.id, note_id: p.noteId, storage_path: path, mime_type: p.mime,
          duration_ms: Math.round(p.durationMs), speech_lang: p.lang, transcript: p.transcript || [],
          created_at: new Date(p.createdAt).toISOString(),
        });
        if (error) throw error;
        await idb.del("pending", p.id);
        if (state.current?.id === p.noteId && state.tab === "audio") renderRecordings();
      } catch (err) {
        console.warn("upload", err);
        toast(t("uploadFailed"), true);
      }
    }
  } finally { flushing = false; }
}

function updateRecUI() {
  const on = !!state.recording;
  $("#recBtn").classList.toggle("on", on);
  $("#recLabel").dataset.i18n = on ? "stop" : "record";
  $("#recLabel").textContent = t(on ? "stop" : "record");
  $("#recDot").hidden = !on;
}

function updateTimer() { $("#recTimer").textContent = fmtTime(recorder.elapsed()); }

function drawLevel(level) {
  const c = $("#levelMeter");
  const ctx = c.getContext("2d");
  const w = c.width, h = c.height, bars = 30;
  ctx.clearRect(0, 0, w, h);
  state.levels = state.levels || new Array(bars).fill(0);
  state.levels.push(level); state.levels.shift();
  const bw = w / bars;
  state.levels.forEach((v, i) => {
    const bh = Math.max(2, v * h);
    ctx.fillStyle = i > bars * 0.66 ? "#8b7bff" : "#2ee6ff";
    ctx.globalAlpha = 0.35 + 0.65 * (i / bars);
    ctx.fillRect(i * bw + 1, (h - bh) / 2, bw - 2, bh);
  });
  ctx.globalAlpha = 1;
}

function renderLive() {
  const show = !!state.recording && state.current?.id === state.recording.noteId && speechSupported;
  $("#liveBox").hidden = !show;
  if (!show) return;
  const box = $("#liveText");
  box.innerHTML = "";
  for (const s of recorder.segments || []) box.append(segLine(s, null));
  if (recorder.interim) {
    const d = document.createElement("div");
    d.className = "interim";
    d.textContent = recorder.interim;
    box.append(d);
  }
  box.scrollTop = box.scrollHeight;
}

async function renderRecordings() {
  const n = state.current;
  const list = $("#recList");
  if (!n) return;
  const token = (state.recToken = Symbol());
  let rows = [];
  try {
    const { data, error } = await sb.from("recordings").select("*").eq("note_id", n.id).order("created_at");
    if (error) throw error;
    rows = data;
  } catch {}
  const pend = (await idb.all("pending")).filter(p => p.noteId === n.id);
  if (token !== state.recToken) return;   // nel frattempo si è cambiata nota
  list.innerHTML = "";
  const ids = new Set(rows.map(r => r.id));
  const all = [
    ...rows.map(r => ({ ...r, pending: false })),
    ...pend.filter(p => !ids.has(p.id)).map(p => ({
      id: p.id, pending: true, blob: p.blob, duration_ms: p.durationMs, transcript: p.transcript,
      created_at: new Date(p.createdAt).toISOString(), speech_lang: p.lang,
    })),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at));

  if (!all.length) {
    list.innerHTML = `<p class="muted"></p>`;
    list.firstChild.textContent = t("noRecordings");
    return;
  }
  const fmt = new Intl.DateTimeFormat(getLang(), { dateStyle: "short", timeStyle: "short" });
  for (const r of all) list.append(recItem(r, fmt));
}

function recItem(r, fmt) {
  const el = document.createElement("div");
  el.className = "rec-item" + (r.pending ? " pending" : "");
  el.innerHTML = `
    <div class="rec-row">
      <div><div class="r-title"></div><div class="r-sub"></div></div>
      <span class="spacer"></span>
      <button class="icon-btn" data-act="copy"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 011-1h9"/></svg></button>
      <button class="icon-btn" data-act="insert"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h7M17 15v6M14 18h6"/></svg></button>
      <button class="icon-btn danger" data-act="del"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>
    </div>
    <audio controls preload="metadata"></audio>
    <div class="transcript"></div>`;
  el.querySelector(".r-title").textContent = fmt.format(new Date(r.created_at));
  el.querySelector(".r-sub").textContent =
    `${fmtTime(r.duration_ms || 0)} · ${SPEECH_LANGS[r.speech_lang] || r.speech_lang || ""}` +
    (r.pending ? ` · ${t("pendingUpload")}` : "");
  el.querySelector('[data-act="copy"]').title = t("copyTranscript");
  el.querySelector('[data-act="insert"]').title = t("insertInText");
  el.querySelector('[data-act="del"]').title = t("deleteRec");

  const audio = el.querySelector("audio");
  if (r.pending) audio.src = URL.createObjectURL(r.blob);
  else sb.storage.from("audio").createSignedUrl(r.storage_path, 3600 * 6)
    .then(({ data }) => { if (data) audio.src = data.signedUrl; });

  const tr = el.querySelector(".transcript");
  const segs = r.transcript || [];
  if (!segs.length) { tr.innerHTML = `<span class="muted"></span>`; tr.firstChild.textContent = t("noTranscript"); }
  const lines = segs.map(s => { const l = segLine(s, audio); tr.append(l); return l; });
  audio.addEventListener("timeupdate", () => {
    const ms = audio.currentTime * 1000;
    let idx = -1;
    segs.forEach((s, i) => { if (s.t <= ms) idx = i; });
    lines.forEach((l, i) => l.classList.toggle("now", i === idx));
  });

  const text = () => segs.map(s => `[${fmtTime(s.t)}] ${s.text}`).join("\n");
  el.querySelector('[data-act="copy"]').onclick = async () => {
    try { await navigator.clipboard.writeText(text()); toast(t("copied")); } catch { toast(t("error"), true); }
  };
  el.querySelector('[data-act="insert"]').onclick = () => {
    const body = $("#noteBody");
    body.value = (body.value ? body.value.replace(/\s*$/, "") + "\n\n" : "") + text() + "\n";
    scheduleSave();
    switchTab("text");
  };
  el.querySelector('[data-act="del"]').onclick = async () => {
    if (!confirm(t("confirmDeleteRec"))) return;
    if (r.pending) await idb.del("pending", r.id);
    else {
      await sb.storage.from("audio").remove([r.storage_path]);
      const { error } = await sb.from("recordings").delete().eq("id", r.id);
      if (error) { toast(error.message, true); return; }
    }
    renderRecordings();
  };
  return el;
}

function segLine(s, audio) {
  const d = document.createElement("div");
  d.className = "seg-line";
  d.innerHTML = `<span class="ts"></span><span></span>`;
  d.firstChild.textContent = fmtTime(s.t);
  d.lastChild.textContent = s.text;
  if (audio) d.onclick = () => { audio.currentTime = s.t / 1000; audio.play(); };
  return d;
}

/* ═════════ UI ═════════ */
function bindUI() {
  $("#authForm").addEventListener("submit", submitAuth);
  $("#authMagic").onclick = magicLink;
  $("#authToggle").onclick = () => setAuthMode(!state.signUpMode);
  $("#signOutBtn").onclick = signOut;

  $("#newNoteBtn").onclick = newNote;
  $("#searchInput").addEventListener("input", renderList);
  $("#noteTitle").addEventListener("input", () => scheduleSave());
  $("#noteBody").addEventListener("input", () => scheduleSave());
  $("#deleteNoteBtn").onclick = deleteNote;

  $$(".tab").forEach(b => (b.onclick = () => switchTab(b.dataset.tab)));

  $$(".tool").forEach(b => (b.onclick = () => {
    $$(".tool").forEach(x => x.classList.toggle("active", x === b));
    sketch.tool = b.dataset.tool;
  }));
  $("#penSize").oninput = e => (sketch.size = +e.target.value);
  $("#penOnly").onchange = e => {
    sketch.penOnly = e.target.checked;
    try { localStorage.setItem("gpv.penOnly", e.target.checked ? "1" : ""); } catch {}
  };
  try { if (localStorage.getItem("gpv.penOnly")) { $("#penOnly").checked = true; sketch.penOnly = true; } } catch {}
  $("#undoBtn").onclick = () => sketch.undo();
  $("#moreSpaceBtn").onclick = () => sketch.addSpace();
  $("#clearDrawBtn").onclick = () => { if (confirm(t("confirmClear"))) sketch.clear(); };

  $("#recBtn").onclick = toggleRecording;
  if (!speechSupported) $("#speechWarn").hidden = false;

  $("#menuBtn").onclick = () => { $("#sidebar").classList.add("open"); $("#scrim").classList.add("show"); };
  $("#scrim").onclick = closeSidebar;

  for (const sel of ["#langSelect", "#authLang"]) {
    $(sel).onchange = e => {
      setLang(e.target.value);
      syncLangSelects();
      setAuthMode(state.signUpMode);
      updateRecUI();
      updateNet();
      renderList();
      if (state.current && state.tab === "audio") renderRecordings();
    };
  }

  window.addEventListener("online", () => { updateNet(); flushDrafts(); flushPending(); });
  window.addEventListener("offline", updateNet);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveNow(); });
  window.addEventListener("beforeunload", e => {
    if (state.saveTimer) saveNow();
    if (state.recording) { e.preventDefault(); e.returnValue = ""; }
  });
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveNow(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && state.tab === "draw"
        && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
      e.preventDefault(); sketch.undo();
    }
  });
}

function switchTab(tab) {
  state.tab = tab;
  $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $$(".panel").forEach(p => (p.hidden = p.dataset.panel !== tab));
  if (tab === "draw") sketch.resize();
  if (tab === "audio") { renderRecordings(); renderLive(); }
}

function closeSidebar() { $("#sidebar").classList.remove("open"); $("#scrim").classList.remove("show"); }

function buildSwatches() {
  const box = $("#swatches");
  PALETTE.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "swatch" + (i === 0 ? " active" : "");
    b.style.background = c;
    b.style.color = c;
    b.title = c;
    b.onclick = () => {
      $$(".swatch").forEach(x => x.classList.toggle("active", x === b));
      sketch.color = c;
      if (sketch.tool === "eraser") $$(".tool")[0].click();
    };
    box.append(b);
  });
}

function fillLangSelects() {
  for (const sel of ["#langSelect", "#authLang"]) {
    $(sel).innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  }
}
function syncLangSelects() { $("#langSelect").value = getLang(); $("#authLang").value = getLang(); }

function fillSpeechLangs() {
  const sel = $("#speechLang");
  sel.innerHTML = Object.entries(SPEECH_LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  let saved = null;
  try { saved = localStorage.getItem("gpv.speechLang"); } catch {}
  const nav = navigator.language || "it-IT";
  sel.value = saved && SPEECH_LANGS[saved] ? saved
    : SPEECH_LANGS[nav] ? nav
    : Object.keys(SPEECH_LANGS).find(k => k.startsWith(nav.slice(0, 2))) || "it-IT";
}

function updateNet() {
  const on = navigator.onLine;
  const el = $("#netState");
  el.textContent = t(on ? "online" : "offline");
  el.classList.toggle("off", !on);
}

let toastTimer = 0;
function toast(msg, err = false) {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast show" + (err ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = "toast"), 3200);
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
