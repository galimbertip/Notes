// GPverse Notes — collaborazione in tempo reale (Supabase Realtime).
// Le regole di sicurezza del database valgono anche qui: ognuno riceve solo
// le modifiche delle note che può vedere.

// Modifiche al database: note, registrazioni, condivisioni.
export function startRealtime(sb, userId, { note, recording, share, status }) {
  const ch = sb.channel(`gpv-db-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, p => note && note(p))
    .on("postgres_changes", { event: "*", schema: "public", table: "recordings" }, p => recording && recording(p))
    .on("postgres_changes", { event: "*", schema: "public", table: "shares" }, p => share && share(p))
    .subscribe(s => status && status(s));
  return () => { try { sb.removeChannel(ch); } catch {} };
}

// Chi ha aperta la stessa nota in questo momento.
export function joinNote(sb, noteId, me, onPeers) {
  const ch = sb.channel(`gpv-note-${noteId}`, { config: { presence: { key: me.id } } });
  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState() || {};
    const peers = [];
    for (const [key, metas] of Object.entries(state)) {
      if (key === me.id) continue;                   // io, anche da un altro dispositivo
      const email = metas && metas[0] && metas[0].email;
      if (email && !peers.includes(email)) peers.push(email);
    }
    onPeers(peers);
  });
  ch.subscribe(async s => {
    if (s === "SUBSCRIBED") { try { await ch.track({ email: me.email, at: Date.now() }); } catch {} }
  });
  return () => { try { ch.untrack(); } catch {} try { sb.removeChannel(ch); } catch {} };
}
