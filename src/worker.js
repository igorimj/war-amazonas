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
    this.L = { players: [], hostId: null, cfg: { bots: 1, diff: 1, speed: 450 } };
    this.G = null; // estado completo (com objetivos secretos)
    state.blockConcurrencyWhile(async () => {
      const d = await state.storage.get("d");
      if (d) { this.L = d.L; this.G = d.G; }
    });
  }
  save() { return this.state.storage.put("d", { L: this.L, G: this.G }); }
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
    const aPid = G.neg ? this.G.P[G.neg.a].pid : null;
    const bPid = G.neg && G.neg.b >= 0 ? this.G.P[G.neg.b].pid : null;
    G.P.forEach((p, i) => {
      p.mine = this.G.P[i].pid === id;
      if (!G.over && !p.mine && !(id === this.L.hostId && !p.human)) delete p.obj;
      delete p.pid; delete p.seat;
    });
    if (G.neg && id !== aPid && id !== bPid) G.neg = { a: G.neg.a, b: -1, msgs: [], pend: null, mode: null, tmp: {}, hidden: false };
    return G;
  }
  broadcast(except) {
    for (const p of this.L.players) if (p.id !== except) this.send(p.id, { t: "state", state: this.view(p.id) });
  }

  winnerOf(s) {
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
      this.G = s; this.save(); this.sendLobby(); this.broadcast(null);
    } else if (m.t === "state") this.onState(id, m.state);
    else if (m.t === "neg") this.onNeg(id, m);
  }

  onState(id, s) {
    const G = this.G;
    if (!G || G.over || !s) return;
    const cur = G.P[G.cur];
    const ok = cur.pid === id || (!cur.human && id === this.L.hostId);
    if (!ok || !Array.isArray(s.own) || s.own.length !== G.own.length || !Array.isArray(s.P) || s.P.length !== G.P.length) {
      this.send(id, { t: "state", state: this.view(id) }); // ressincroniza
      return;
    }
    s.P.forEach((p, i) => { p.pid = G.P[i].pid; p.obj = G.P[i].obj; delete p.mine; delete p.seat; });
    const w = this.winnerOf(s);
    const clientSaidOver = !!s.over;
    s.over = w !== null; s.winner = w;
    s.seq = (G.seq || 0) + 1;
    this.G = s; this.save();
    this.broadcast(id);
    if (w !== null && !clientSaidOver) this.send(id, { t: "win", winner: w });
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
