// ===== Camada multiplayer (WebSocket -> Durable Object "Room") =====
// Modelo: o cliente da vez (ou o anfitrião, nos turnos de bots) executa as regras e envia o estado;
// o servidor valida QUEM pode enviar, guarda os objetivos secretos e entrega a cada jogador só o que ele pode ver.
let sendT=null;
function netSend(force){if(!NET||!G)return;clearTimeout(sendT);
 if(NET.ecoWait){NET.dirty=true;return}
 const go=()=>{const c=JSON.parse(JSON.stringify(G));c.log=c.log.slice(0,60);if(c.mode==="city")delete c.city;NET.send({t:"state",state:c})};
 force?go():sendT=setTimeout(go,60)}
function netId(){let v=localStorage.getItem("war_id");if(!v){v=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now());localStorage.setItem("war_id",v)}return v}
function netOpen(){const proto=location.protocol==="https:"?"wss":"ws";
 const ws=new WebSocket(`${proto}://${location.host}/ws?room=${NET.room}&id=${netId()}&name=${encodeURIComponent(NET.name)}`);
 NET.ws=ws;ws.onmessage=e=>onNet(JSON.parse(e.data));
 ws.onclose=()=>{if(NET&&!NET.leaving&&NET.ws===ws){if(G)toast("Conexão perdida. Reconectando…");setTimeout(()=>NET&&!NET.leaving&&netOpen(),2000)}}}
function netJoin(room,name){NET={room,name,host:false,pub:null,lobby:null,revealed:false,wonShown:false,specKey:"",leaving:false,ws:null,msg:"",
 send(o){if(this.ws&&this.ws.readyState===1)this.ws.send(JSON.stringify(o))}};
 $("setup").style.display="none";$("lobby").style.display="block";renderLobby();netOpen()}
function onNet(m){
 if(NET.ecoWait&&(m.t==="state"||m.t==="err")){NET.ecoWait=false;const res=NET.ecoRes;NET.ecoRes=null;if(res)res(m.t==="err"?{ok:false,reason:m.msg}:{ok:true});if(NET.dirty&&G&&isAuth()){NET.dirty=false;netSend()}}
 if(m.t==="lobby"){NET.lobby=m;NET.pub=m.you;NET.host=m.hostPub===m.you;if(!G)renderLobby()}
 else if(m.t==="state")applyState(m.state);
 else if(m.t==="neg"&&G&&G.neg){if(m.op==="msg"){G.neg.msgs.push({f:G.neg.b,t:String(m.text)});render()}else if(m.op==="answer"&&G.neg.pend){answer(!!m.ok)}}
 else if(m.t==="win"&&G){G.over=true;G.winner=m.winner;showWin()}
 else if(m.t==="draw"&&G){NET.drawing=true;symStageNet()}
 else if(m.t==="syms"){SYMS=m.syms||{};symSig="";if(G)render()}
 else if(m.t==="drawdone"){NET.drawing=false;const o=$("symstage");o.style.display="none";o.innerHTML="";clearInterval(symTimer);if(NET.host&&G&&!G.over&&!G.drawing&&!G.P[G.cur].human&&!busy)botTurn()}
 else if(m.t==="err"){NET.msg=m.msg;if(G)toast(m.msg);else renderLobby()}}
function showWin(){const w=G.P[G.winner];if(!w||NET.wonShown)return;NET.wonShown=true;
 if(G.mode==="city"){showModal(cityWinHTML(G.winner,G.city&&G.city.reason));return}
 showModal(`🏆 <b style="color:${w.color}">${w.name}</b> venceu!<br><small>${w.obj?objDesc(w):""}</small><br><button class="go" onclick="location.href=location.pathname">Voltar ao início</button>`)}
function applyState(s){const first=!G;applying=true;G=s;
 if(first){$("setup").style.display="none";$("lobby").style.display="none";$("game").style.display="flex";buildMap();lastRollSeen=G.lastRoll?G.lastRoll.n:0}
 render();applying=false;$("log").innerHTML=G.log.slice(0,60).map(x=>"<div>"+x+"</div>").join("");
 if(G.lastRoll&&G.lastRoll.n!==lastRollSeen){lastRollSeen=G.lastRoll.n;const r=G.lastRoll;showDice(r.A,r.D,r.ia,r.id,r.la,r.ld)}
 const me=G.P.find(p=>p.mine);
 if(me&&me.obj&&!NET.revealed){NET.revealed=true;showModal(`🔒 <b style="color:${me.color}">${me.name}</b>, seu objetivo secreto:<br><b style="font-size:22px">${objDesc(me)}</b><br><small>Você pode rever no botão "Meu objetivo".</small><br><button class="go" onclick="$('modal').style.display='none'">Entendi</button>`)}
 const key=G.round+"-"+G.cur;
 if(G.spec&&G.P[G.cur].mine&&NET.specKey!==key){NET.specKey=key;specModal(G.cur)}
 if(G.over&&G.winner!=null)showWin();
 else if(NET.host&&!G.over&&!G.drawing&&!G.P[G.cur].human&&!busy)botTurn()}
// ----- Lobby -----
function renderLobby(){const el=$("lobby"),L=NET.lobby;
 if(!L){el.innerHTML=`<h1>Sala ${NET.room}</h1><p>${NET.msg||"Conectando…"}</p>`;return}
 const host=NET.host,link=location.origin+location.pathname+"?room="+NET.room,c=L.cfg;
 const sel=(id,opts,v)=>`<select id="${id}">${opts.map(([k,t])=>`<option value="${k}" ${k==v?"selected":""}>${t}</option>`).join("")}</select>`;
 el.innerHTML=`<h1>Sala <span style="letter-spacing:3px">${NET.room}</span></h1>
 <p>Convide amigos com o link:<br><input readonly value="${link}" style="width:100%" onclick="this.select()"></p>
 <div>${L.players.map(p=>`<div class="row"><span class="dot" style="background:${p.online?"#22c55e":"#777"}"></span>${esc(p.name)} ${p.pub===L.hostPub?"👑":""}${p.pub===L.you?" (você)":""}</div>`).join("")}</div>
 ${NET.msg?`<p style="color:#f87171">${esc(NET.msg)}</p>`:""}
 ${host?`<label>Modo ${sel("lm",[["war","WAR tradicional"],["ind","Guerra Industrial"],["city","Controle da Cidade"]],c.mode||"war")}</label><br><label>Bots ${sel("lb",[0,1,2,3,4,5].map(i=>[i,i]),c.bots)} Dificuldade ${sel("ld",[[0,"Fácil"],[1,"Médio"],[2,"Difícil"]],c.diff)} Velocidade ${sel("ls",[[900,"Lenta"],[450,"Normal"],[120,"Rápida"]],c.speed)}</label>
 <button class="go" id="lstart">Iniciar partida</button>`:"<p>Modo: <b>"+(c.mode==="ind"?"Guerra Industrial":c.mode==="city"?"Controle da Cidade":"WAR tradicional")+"</b>. Aguardando o anfitrião iniciar…</p>"}`;
 if(host){const cfg=()=>NET.send({t:"cfg",bots:+$("lb").value,diff:+$("ld").value,speed:+$("ls").value,mode:$("lm").value});
  ["lb","ld","ls","lm"].forEach(i=>$(i).onchange=cfg);$("lstart").onclick=netStart}}
function netStart(){const L=NET.lobby,hs=L.players.filter(p=>p.online),bn=Math.min(L.cfg.bots,6-hs.length);
 if(hs.length+bn<2){NET.msg="Precisa de ao menos 2 participantes (humanos + bots).";return renderLobby()}
 RULES.botDelay=L.cfg.speed;const cs=shuf(COLORS),P=[];
 hs.forEach((h,i)=>P.push({name:h.name,human:true,diff:0,seat:h.pub,mine:h.pub===NET.pub,color:cs[i][1],cn:cs[i][0],alive:true}));
 for(let k=0;k<bn;k++){const i=hs.length+k;P.push({name:BOTN[k],human:false,diff:L.cfg.diff,color:cs[i][1],cn:cs[i][0],alive:true})}
init(P,L.cfg.mode||"war")}
function netBegin(){$("lobby").style.display="none";nextTurn(true);const c=JSON.parse(JSON.stringify(G));NET.send({t:"start",state:c})}
// ----- Tela inicial online -----
$("online").onclick=()=>{const q=new URLSearchParams(location.search).get("room")||"";
 const el=$("lobby");$("setup").style.display="none";el.style.display="block";
 el.innerHTML=`<h1>Jogar online</h1><label>Seu nome <input id="on" value="${esc(localStorage.getItem("war_name")||"Jogador")}"></label>
 <label>Código da sala <input id="orm" value="${esc(q)}" placeholder="ex.: AB12" style="text-transform:uppercase"></label>
 <button class="go" id="ocreate">Criar sala</button> <button id="ojoin">Entrar na sala</button> <button id="oback">Voltar</button>`;
 const go=code=>{const n=$("on").value.trim()||"Jogador";localStorage.setItem("war_name",n);netJoin(code,n)};
 $("ocreate").onclick=()=>go(Math.random().toString(36).slice(2,6).toUpperCase());
 $("ojoin").onclick=()=>{const c=$("orm").value.toUpperCase().replace(/[^A-Z0-9]/g,"");if(c)go(c)};
 $("oback").onclick=()=>{el.style.display="none";$("setup").style.display="block"}};
if(new URLSearchParams(location.search).get("room"))setTimeout(()=>$("online").click(),0);
