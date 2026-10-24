import IND from "../public/js/industrial.js";
import MAP from "../public/js/map-data.js";
import CITY from "../public/js/city.js";
import CITY_REGIONS from "../public/js/city-regions.js";
IND.map = MAP; // o servidor usa as MESMAS regras econômicas do cliente
CITY.map = MAP; CITY.regions = CITY_REGIONS;

// Worker: serve os arquivos estáticos (public/) e encaminha /ws para a sala (Durable Object).
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === "/ws") {
      const room = (u.searchParams.get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      if (!room) return new Response("sala inválida", { status: 400 });
      return env.ROOM.get(env.ROOM.idFromName(room)).fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
};

const rnd = (n) => Math.floor(Math.random() * n);

export class Room {
  constructor(state) {
    this.state = state;
    this.conns = new Map(); // id -> WebSocket
    this.L = { players: [], hostId: null, cfg: { bots: 1, diff: 1, speed: 450, mode: "war" } };
    this.G = null; // estado completo (com objetivos secretos)
    this.syms = {}; // símbolos desenhados (PNG transparente) por índice de jogador
    this.draw = null; // etapa de desenho: { pending:Set<idx> }
    state.blockConcurrencyWhile(async () => {
      const d = await state.storage.get("d");
      if (d) { this.L = d.L; this.G = d.G; this.syms = d.syms || {}; }
    });
  }
  save() { return this.state.storage.put("d", { L: this.L, G: this.G, syms: this.syms }); }
  send(id, o) { const w = this.conns.get(id); if (w) try { w.send(JSON.stringify(o)); } catch {} }

  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("use WebSocket", { status: 426 });
    const u = new URL(req.url);
    const id = u.searchParams.get("id") || "";
    const name = (u.searchParams.get("name") || "Jogador").slice(0, 20);
    if (id.length < 8) return new Response("id inválido", { status: 400 });
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    let p = this.L.players.find((x) => x.id === id);
    if (!p) {
      if (this.G) { server.send(JSON.stringify({ t: "err", msg: "A partida já começou." })); server.close(1000); return new Response(null, { status: 101, webSocket: client }); }
      if (this.L.players.length >= 6) { server.send(JSON.stringify({ t: "err", msg: "Sala cheia (6)." })); server.close(1000); return new Response(null, { status: 101, webSocket: client }); }
      p = { id, pub: crypto.randomUUID().slice(0, 8), name, online: true };
      this.L.players.push(p);
      if (!this.L.hostId) this.L.hostId = id;
    } else { p.online = true; }
    const old = this.conns.get(id);
    if (old) try { old.close(1000, "replaced"); } catch {}
    this.conns.set(id, server);
    server.addEventListener("message", (e) => { try { this.onMsg(id, JSON.parse(e.data)); } catch (err) {} });
    server.addEventListener("close", () => this.onClose(id, server));
    this.sendLobby();
    if (this.G) this.send(id, { t: "state", state: this.view(id) });
    if (Object.keys(this.syms).length) this.send(id, { t: "syms", syms: this.syms });
    if (this.draw && this.G) { const i = this.G.P.findIndex((x) => x.pid === id); if (i >= 0 && this.draw.pending.has(i)) this.send(id, { t: "draw", seconds: 120 }); }
    await this.save();
    return new Response(null, { status: 101, webSocket: client });
  }

  sendLobby() {
    const hostPub = (this.L.players.find((p) => p.id === this.L.hostId) || {}).pub;
    const players = this.L.players.map((p) => ({ pub: p.pub, name: p.name, online: p.online }));
    for (const p of this.L.players)
      this.send(p.id, { t: "lobby", you: p.pub, hostPub, players, cfg: this.L.cfg, started: !!this.G });
  }
  onClose(id, ws) {
    if (this.conns.get(id) !== ws) return;
    this.conns.delete(id);
    const p = this.L.players.find((x) => x.id === id);
    if (p) p.online = false;
    if (!this.G) {
      this.L.players = this.L.players.filter((x) => x.id !== id);
      if (this.L.hostId === id) this.L.hostId = (this.L.players[0] || {}).id || null;
    }
    this.sendLobby();
    if (!this.L.players.length || (this.G && !this.L.players.some((x) => x.online) && this.G.over)) this.state.storage.deleteAll();
    else this.save();
  }

  // Visão filtrada: cada jogador só recebe o próprio objetivo; o anfitrião também recebe os dos bots.
  view(id) {
    const G = JSON.parse(JSON.stringify(this.G));
    G.drawing = !!this.draw;
    const aPid = G.neg ? this.G.P[G.neg.a].pid : null;
    const bPid = G.neg && G.neg.b >= 0 ? this.G.P[G.neg.b].pid : null;
    G.P.forEach((p, i) => {
      p.mine = this.G.P[i].pid === id;
      if (!G.over && !p.mine && !(id === this.L.hostId && !p.human)) delete p.obj;
      delete p.pid; delete p.seat;
    });
    if (G.mode === "city" && G.city) {
      const seen = new Set();
      this.G.P.forEach((p, i) => { if (p.pid === id || (id === this.L.hostId && !p.human)) seen.add(i); });
      if (G.over) G.P.forEach((_, i) => seen.add(i));
      CITY.filterView(G, seen);
    }
    if (G.neg && id !== aPid && id !== bPid) G.neg = { a: G.neg.a, b: -1, msgs: [], pend: null, mode: null, tmp: {}, hidden: false };
    return G;
  }
  broadcast(except) {
    for (const p of this.L.players) if (p.id !== except) this.send(p.id, { t: "state", state: this.view(p.id) });
  }

  winnerOf(s) {
    if (s.mode === "city") { const v = CITY.victory(s); return v ? v.winner : null; }
    const alive = s.P.filter((x) => x.alive).length;
    for (let i = 0; i < s.P.length; i++) {
      const p = s.P[i];
      if (!p.alive) continue;
      if (p.obj && p.obj.k === "count" && s.own.filter((o) => o === i).length >= p.obj.n) return i;
      if (p.obj && p.obj.k === "elim" && s.P[p.obj.t].killer === i) return i;
      if (alive === 1) return i;
    }
    return null;
  }

  onMsg(id, m) {
    const isHost = id === this.L.hostId;
    if (m.t === "cfg" && isHost && !this.G) {
      const c = this.L.cfg;
      c.bots = Math.max(0, Math.min(5, m.bots | 0));
      c.diff = Math.max(0, Math.min(2, m.diff | 0));
      c.speed = [120, 450, 900].includes(m.speed) ? m.speed : 450;
      c.mode = ["ind", "city"].includes(m.mode) ? m.mode : "war";
      this.sendLobby(); this.save();
    } else if (m.t === "start" && isHost && !this.G) {
      const s = m.state;
      if (!s || !Array.isArray(s.P) || s.P.length < 2 || s.P.length > 6 || !Array.isArray(s.own)) return;
      for (const p of s.P) {
        if (p.human) {
          const pl = this.L.players.find((x) => x.pub === p.seat);
          if (!pl) return this.send(id, { t: "err", msg: "Jogador inválido." });
          p.pid = pl.id;
        }
        delete p.seat; delete p.mine;
      }
      const N = s.own.length, need = Math.ceil(N * 0.6);
      s.P.forEach((p, i) => {
        const others = s.P.map((_, j) => j).filter((j) => j !== i);
        p.obj = Math.random() < 0.5 && others.length
          ? { k: "elim", t: others[rnd(others.length)] }
          : { k: "count", n: Math.min(N, Math.max(need, Math.ceil(N / s.P.length) + 4)) };
      });
      s.seq = 1; s.over = false; s.winner = null;
      s.mode = this.L.cfg.mode;
      if (s.mode === "ind") { IND.initEco(s); IND.startTurn(s, s.cur); } else if (s.mode === "city") { delete s.eco; CITY.init(s); CITY.startTurn(s, s.cur); } else delete s.eco;
      this.G = s; this.syms = {}; this.save(); this.sendLobby(); this.broadcast(null);
      const hs = s.P.map((p, i) => (p.human ? i : -1)).filter((i) => i >= 0);
      if (s.mode === "city" && hs.length >= 1) this.startDraw(hs); // etapa de desenho dos símbolos (2 min)
    } else if (m.t === "state") this.onState(id, m.state);
    else if (m.t === "eco") this.onEco(id, m.a);
    else if (m.t === "city") this.onCity(id, m.a);
    else if (m.t === "leave") this.onLeave(id);
    else if (m.t === "sym") this.onSym(id, m.data);
    else if (m.t === "neg") this.onNeg(id, m);
  }

  onState(id, s) {
    const G = this.G;
    if (this.draw) { this.send(id, { t: "state", state: this.view(id) }); return; }
    if (!G || G.over || !s) return;
    const cur = G.P[G.cur];
    const ok = cur.pid === id || (!cur.human && id === this.L.hostId);
    if (!ok || !Array.isArray(s.own) || s.own.length !== G.own.length || !Array.isArray(s.P) || s.P.length !== G.P.length) {
      this.send(id, { t: "state", state: this.view(id) }); // ressincroniza
      return;
    }
    s.P.forEach((p, i) => { p.pid = G.P[i].pid; p.obj = G.P[i].obj; delete p.mine; delete p.seat; });
    let changed = false;
    s.mode = G.mode;
    if (G.mode === "city") {
      s.city = G.city; // a cidade pertence ao servidor: o cliente nunca a altera
      s.allies = (s.allies || []).filter((al) => CITY.canAlly(s, al.m[0], al.m[1])); // facções não se aliam ao Estado
      s.truces = (s.truces || []).filter((t) => CITY.sameSide(s, t.m[0], t.m[1]) || t.left <= CITY.TRUCE_ROUNDS); // Estado×facção: só trégua de até 2 rodadas
      for (let t = 0; t < s.own.length; t++) {
        const diff = G.tr[t] - s.tr[t];
        if (diff > 0 && G.own[t] !== s.cur) CITY.afterCombat(s, s.cur, G.own[t], 0, diff, t); // baixas do defensor
        if (s.own[t] !== G.own[t]) { CITY.onConquest(s, t, s.own[t], G.own[t]); changed = true; }
      }
      if (s.round !== G.round) CITY.endRound(s);
      if (s.cur !== G.cur || s.round !== G.round) { CITY.startTurn(s, s.cur); changed = true; }
    }
    if (G.mode === "ind") {
      s.eco = G.eco; // economia pertence ao servidor: o cliente nunca a altera
      for (let t = 0; t < s.own.length; t++) if (s.own[t] !== G.own[t] && IND.onConquest(s, t)) changed = true; // invasão desfaz a fortificação
      if (s.cur !== G.cur || s.round !== G.round) { IND.startTurn(s, s.cur); if (s.eco.lastTurnMsg === undefined) {} changed = true; }
    }
    const w = this.winnerOf(s);
    const clientSaidOver = !!s.over;
    s.over = w !== null; s.winner = w;
    s.seq = (G.seq || 0) + 1;
    this.G = s; this.save();
    this.broadcast(changed ? null : id);
    if (w !== null && !clientSaidOver) this.send(id, { t: "win", winner: w });
  }

  // ----- etapa de desenho dos símbolos: cada humano tem 2 minutos; o fundo é a cor do jogador (nunca pintado) -----
  startDraw(hs) {
    this.draw = { pending: new Set(hs) };
    for (const p of this.L.players) this.send(p.id, { t: "draw", seconds: 120 });
    clearTimeout(this.drawTimer);
    this.drawTimer = setTimeout(() => this.endDraw(), 128000);
    this.broadcast(null); // inclui o indicador "drawing" (bots esperam)
  }
  endDraw() {
    if (!this.draw) return;
    this.draw = null; clearTimeout(this.drawTimer);
    for (const p of this.L.players) this.send(p.id, { t: "drawdone" });
    this.save(); this.broadcast(null);
  }
  onSym(id, data) {
    const G = this.G;
    if (!this.draw || !G) return;
    const i = G.P.findIndex((x) => x.pid === id);
    if (i < 0 || !this.draw.pending.has(i)) return;
    if (typeof data === "string" && data.length <= 70000 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data)) this.syms[i] = data;
    this.draw.pending.delete(i); this.save();
    for (const p of this.L.players) this.send(p.id, { t: "syms", syms: this.syms });
    if (!this.draw.pending.size) this.endDraw();
  }

  // "Sair do jogo": antes da partida libera a vaga; durante a partida um bot assume o lugar do jogador.
  onLeave(id) {
    const ws = this.conns.get(id), G = this.G;
    this.conns.delete(id);
    this.L.players = this.L.players.filter((x) => x.id !== id);
    try { ws && ws.close(1000, "leave"); } catch {}
    if (this.L.hostId === id) this.L.hostId = (this.L.players.find((x) => x.online) || this.L.players[0] || {}).id || null;
    if (G) {
      const li = G.P.findIndex((x) => x.pid === id);
      if (this.draw && li >= 0) { this.draw.pending.delete(li); if (!this.draw.pending.size) this.endDraw(); }
      const p = G.P.find((x) => x.pid === id);
      if (p) { const nm = p.name; p.human = false; p.diff = 1; delete p.pid; p.name = nm + " (bot)"; G.log.unshift(`🚪 ${nm} saiu do jogo; um bot assumiu o lugar.`); }
      if (!G.P.some((x) => x.human && x.alive)) { this.G = null; this.L.players = []; this.state.storage.deleteAll(); return; }
      G.seq = (G.seq || 0) + 1;
    } else if (!this.L.players.length) { this.state.storage.deleteAll(); return; }
    this.sendLobby(); this.save(); if (G) this.broadcast(null);
  }

  // Ações do modo Controle da Cidade: o servidor valida (vez, papel, fase, recursos) e é o único que altera a cidade.
  onCity(id, a) {
    const G = this.G;
    if (this.draw) { this.send(id, { t: "err", msg: "Aguardando os desenhos dos símbolos." }); return; }
    if (!G || G.over || G.mode !== "city" || !a || typeof a !== "object") return;
    const cur = G.P[G.cur];
    if (!(cur.pid === id || (!cur.human && id === this.L.hostId))) { this.send(id, { t: "err", msg: "Não é a sua vez." }); return; }
    const act = { p: G.cur, type: String(a.type), id: typeof a.id === "string" ? a.id.slice(0, 40) : undefined };
    for (const k of ["t", "n", "from", "to", "f"]) if (a[k] !== undefined) act[k] = Number(a[k]);
    for (const k of ["kind", "k"]) if (a[k] !== undefined) act[k] = String(a[k]);
    if (a.back) act.back = true;
    const r = CITY.apply(G, act);
    if (!r.ok) { this.send(id, { t: "err", msg: r.reason }); return; }
    if (r.msg) { G.log.unshift(r.msg); if (G.log.length > 80) G.log.length = 80; }
    if (r.op && r.op.A.length) G.lastRoll = { A: r.op.A, D: r.op.D, ia: act.p, id: r.op.target, la: r.op.kill, ld: 0, n: ((G.lastRoll && G.lastRoll.n) || 0) + 1 };
    G.seq = (G.seq || 0) + 1;
    this.save(); this.broadcast(null);
  }

  // Ações econômicas: o servidor valida (vez, fase, saldo, estoques) e é o único que altera a economia.
  onEco(id, a) {
    const G = this.G;
    if (!G || G.over || G.mode !== "ind" || !a || typeof a !== "object") return;
    const cur = G.P[G.cur];
    if (!(cur.pid === id || (!cur.human && id === this.L.hostId))) { this.send(id, { t: "err", msg: "Não é a sua vez." }); return; }
    const act = { p: G.cur, type: String(a.type), id: typeof a.id === "string" ? a.id.slice(0, 40) : undefined };
    for (const k of ["t", "n", "from", "to"]) if (a[k] !== undefined) act[k] = Number(a[k]);
    for (const k of ["cat", "res"]) if (a[k] !== undefined) act[k] = String(a[k]);
    const r = IND.apply(G, act);
    if (!r.ok) { this.send(id, { t: "err", msg: r.reason }); return; }
    if (r.msg) { G.log.unshift(r.msg); if (G.log.length > 80) G.log.length = 80; }
    if (r.op && r.op.A.length) G.lastRoll = { A: r.op.A, D: r.op.D, ia: act.p, id: r.op.target, la: 0, ld: r.op.dmg, n: ((G.lastRoll && G.lastRoll.n) || 0) + 1 };
    G.seq = (G.seq || 0) + 1;
    this.save(); this.broadcast(null);
  }

  onNeg(id, m) {
    const G = this.G;
    if (!G || !G.neg || G.neg.b < 0) return;
    if (G.P[G.neg.b].pid !== id) return;
    const to = G.P[G.neg.a].pid;
    if (m.op === "msg") this.send(to, { t: "neg", op: "msg", text: String(m.text || "").slice(0, 300) });
    else if (m.op === "answer") this.send(to, { t: "neg", op: "answer", ok: !!m.ok });
  }
}
