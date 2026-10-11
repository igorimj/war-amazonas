
// regiões -> bônus por domínio completo
const BG="assets/mapa.jpg";
const RB={c:2,g:2,y:1,o:2,r:3,b:3};
const RULES={minReinf:3,startExtra:5,maxDice:3,objRatio:.6,botDelay:450};
const COLORS=[["Ciano","#22d3ee"],["Amarelo","#facc15"],["Verde","#22c55e"],["Laranja","#ff8a1f"],["Azul","#2f6bff"],["Vermelho","#ef4444"]];
// valida adjacências simétricas
MAP.forEach((t,i)=>t.a.forEach(j=>{if(!MAP[j].a.includes(i))MAP[j].a.push(i)}));
const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms)),rnd=n=>Math.floor(Math.random()*n);
const shuf=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const BOTN=["Cabanos","Caboclos","Seringueiros","Boiúnas","Curupiras","Pirarucus"];
let G=null,busy=false,NET=null,applying=false,lastRollSeen=0;
const myTurn=()=>!NET?G.P[G.cur].human:!!G.P[G.cur].mine;
const isAuth=()=>!!(NET&&G&&!G.over&&(G.P[G.cur].mine||(!G.P[G.cur].human&&NET.host)));
const ans=ok=>NET?NET.send({t:"neg",op:"answer",ok}):answer(ok);
// ===== Setup =====
for(let i=0;i<=6;i++){$("nh").add(new Option(i,i));$("nb").add(new Option(i,i))}
$("nh").value=1;$("nb").value=3;
function rows(){const h=+$("nh").value,b=+$("nb").value;let x="";
 for(let i=0;i<h+b;i++){const bot=i>=h;x+=`<div class="row"><input id="pn${i}" value="${bot?BOTN[i]:'Jogador '+(i+1)}"><span>${bot?'Bot':'Humano'}</span>${bot?`<select id="pd${i}"><option>Fácil</option><option selected>Médio</option><option>Difícil</option></select>`:''}</div>`}
 $("rows").innerHTML=x}
$("nh").onchange=$("nb").onchange=rows;rows();
$("start").onclick=()=>{const h=+$("nh").value,b=+$("nb").value;if(h<1||h+b<2||h+b>6)return void($("start").textContent="⚠ Use 1+ humano e 2–6 participantes no total");
 RULES.botDelay=+$("spd").value;const cs=shuf(COLORS);
 const P=[];for(let i=0;i<h+b;i++)P.push({name:$("pn"+i).value||"P"+i,human:i<h,diff:i<h?0:$("pd"+i).selectedIndex,color:cs[i][1],cn:cs[i][0],alive:true});
 init(P)};
// ===== Estado =====
function init(P){const N=MAP.length;G={P,own:Array(N).fill(-1),tr:Array(N).fill(1),cur:-1,phase:"",pool:0,sel:null,conq:false,round:1,log:[],over:false,allies:[],neg:null,negUsed:false};
 shuf([...Array(N).keys()]).forEach((t,k)=>G.own[t]=k%P.length);
 P.forEach((p,i)=>{const mine=G.own.map((o,t)=>o==i?t:-1).filter(t=>t>=0);for(let k=0;k<RULES.startExtra;k++)G.tr[mine[rnd(mine.length)]]++;
  const others=P.map((_,j)=>j).filter(j=>j!=i);
  const need=Math.ceil(N*RULES.objRatio);
  if(!NET)p.obj=Math.random()<.5&&others.length?{k:"elim",t:others[rnd(others.length)]}:{k:"count",n:Math.max(need,Math.ceil(N/P.length)+4)}});
 $("setup").style.display="none";$("game").style.display="flex";buildMap();log("Partida iniciada com "+P.length+" participantes.");MAP.forEach((t,i)=>{fills[i].style.fill=P[G.own[i]].color;labels[i].textContent=G.tr[i]});if(NET)return netBegin();reveal(0)}
// Revela o objetivo secreto de cada humano antes do início
function reveal(i){const m=$("modal");while(i<G.P.length&&!G.P[i].human)i++;
 if(i>=G.P.length){m.style.display="none";return nextTurn(true)}
 const p=G.P[i];m.style.display="flex";
 m.innerHTML=`<div>Objetivo secreto de<br><b style="color:${p.color};font-size:26px">${p.name}</b><br><small>(${p.cn}) — só este jogador deve olhar a tela</small></div><button class="go" id="rv">Ver meu objetivo</button>`;
 $("rv").onclick=()=>{m.innerHTML=`<div>🔒 <b style="color:${p.color}">${p.name}</b>, seu objetivo:<br><b style="font-size:24px">${objDesc(p)}</b><br><small>Você pode rever depois no botão "Meu objetivo".</small></div><button class="go" id="rv2">Entendi, esconder</button>`;$("rv2").onclick=()=>reveal(i+1)}}
const log=m=>{G.log.unshift(m);$("log").innerHTML=G.log.slice(0,60).map(x=>"<div>"+x+"</div>").join("")};
const mine=i=>G.own.map((o,t)=>o==i?t:-1).filter(t=>t>=0);
const enemyN=t=>MAP[t].a.filter(j=>G.own[j]!=G.own[t]);
function bonus(i){const m=mine(i);let b=Math.max(RULES.minReinf,Math.floor(m.length/2));
 for(const r in RB){const ts=MAP.map((x,t)=>x.r==r?t:-1).filter(t=>t>=0);if(ts.every(t=>G.own[t]==i))b+=RB[r]}return b}
function objDesc(p){return p.obj.k=="count"?`Controlar ${p.obj.n} territórios (você tem ${mine(G.P.indexOf(p)).length}).`:`Eliminar o grupo ${G.P[p.obj.t].name} (${G.P[p.obj.t].cn}). ${G.P[p.obj.t].alive?"Se outro jogador o eliminar, você terá de eliminar todos os demais.":"Outro jogador o eliminou: agora você precisa eliminar todos os demais."}`}
function win(i){const p=G.P[i];if(!p.obj)return G.P.filter(x=>x.alive).length==1;if(p.obj.k=="count"&&mine(i).length>=p.obj.n)return true;if(p.obj.k=="elim"&&G.P[p.obj.t].killer===i)return true;return G.P.filter(x=>x.alive).length==1}
function checkWin(){for(let i=0;i<G.P.length;i++)if(G.P[i].alive&&win(i)){G.over=true;G.winner=i;if(NET)setTimeout(()=>netSend(true),0);log(`🏆 <b>${G.P[i].name}</b> cumpriu o objetivo e venceu!`);render();showModal(`🏆 <b style="color:${G.P[i].color}">${G.P[i].name}</b> venceu!<br><small>${objDesc(G.P[i])}</small><br><button class="go" onclick="location.reload()">Nova partida</button>`);return true}return false}
// ===== Turnos =====
function nextTurn(first){if(G.over||checkWin())return;let n=G.P.length,c=G.cur;const prev=G.cur;do{c=(c+1)%n}while(!G.P[c].alive);if(!first&&c<=prev){G.round++;tickAlliances()}first=false;
 G.cur=c;G.bonusMode=false;G.noAttack=false;G.negUsed=false;G.cl=[];G.spec=(G.round%SPEC_EVERY==0)?genSpecial(c):null;G.pool=bonus(c);G.phase="reforço";G.sel=null;G.pend=0;G.conq=false;$("objtxt").textContent="";
 log(`— Rodada ${G.round}: vez de <b style="color:${G.P[c].color}">${G.P[c].name}</b> (+${G.pool} tropas)`);render();
 if(G.spec){if(!G.P[c].human)log(`⭐ ${G.P[c].name} recebeu uma missão especial.`);else if(!NET||G.P[c].mine){if(NET)NET.specKey=G.round+"-"+c;specModal(c)}}if(NET)netSend(true);if(!G.P[c].human&&(!NET||NET.host))botTurn()}
function advance(){if(G.bonusMode)return toast("Posicione os 3 soldados de bônus da missão.");if(G.neg)return toast("Encerre a negociação primeiro.");if(G.over||busy&&G.P[G.cur].human)return;G.sel=null;G.pend=0;
 if(G.phase=="reforço"){if(G.pool>0)return toast("Posicione todas as tropas antes de atacar.");G.phase="ataque"}
 else if(G.phase=="ataque")G.phase="movimento";else return nextTurn();render()}
$("next").onclick=()=>{if(G&&myTurn())advance()};
$("obj").onclick=()=>{if(!G)return;const p=NET?G.P.find(q=>q.mine):G.P[G.cur];if(!p||!p.human||!p.obj)return;$("objtxt").textContent=$("objtxt").textContent?"":"🔒 "+objDesc(p)};
// ===== Combate (separado da UI) =====
function roll(n){return Array.from({length:n},()=>1+rnd(6)).sort((a,b)=>b-a)}
function attack(a,d){const ia=G.own[a],id=G.own[d];if(!MAP[a].a.includes(d)||ia==id||G.tr[a]<2||allied(ia,id)||G.noAttack)return false;
 const A=roll(Math.min(RULES.maxDice,G.tr[a]-1)),D=roll(Math.min(RULES.maxDice,G.tr[d]));let la=0,ld=0;
 for(let k=0;k<Math.min(A.length,D.length);k++)A[k]>D[k]?ld++:la++;
 G.tr[a]-=la;G.tr[d]-=ld;showDice(A,D,ia,id,la,ld);G.lastRoll={A,D,ia,id,la,ld,n:lastRollSeen=(G.lastRoll?G.lastRoll.n:0)+1};
 log(`${MAP[a].n}→${MAP[d].n}: [${A}] x [${D}] | atac −${la}, def −${ld}`);
 $("dice").textContent="⚔ "+A.join(" ")+"  |  🛡 "+D.join(" ");
 if(G.tr[d]<=0){const m=Math.min(A.length,G.tr[a]-1)||1;G.tr[a]-=m;G.tr[d]=m;G.own[d]=ia;G.conq=true;(G.cl=G.cl||[]).push({t:d,o:id});log(`🏴 ${G.P[ia].name} conquistou ${MAP[d].n}!`);
  if(!mine(id).length){G.P[id].alive=false;G.P[id].killer=ia;eliminateAllies(id,ia);log(`☠ ${G.P[id].name} foi eliminado.`)}}
 return true}
// ===== Interação humana =====
function click(t){if(G.neg)return negClick(t);if(G.bonusMode&&myTurn()){if(G.own[t]==G.cur&&G.sel!=t){G.sel=t;G.pend=0}render();return}if(G.over||!myTurn())return;const me=G.cur,ph=G.phase;
 if(ph=="reforço"){if(G.own[t]==me&&G.pool>0&&G.sel!=t){G.sel=t;G.pend=0}}
 else if(ph=="ataque"){if(G.own[t]==me){G.sel=G.tr[t]>1&&G.sel!=t?t:null}
  else if(G.sel!=null&&MAP[G.sel].a.includes(t)){if(allied(me,G.own[t]))return toast("Aliança ativa: ataque bloqueado.");attack(G.sel,t);if(G.own[t]==me)G.sel=null;else if(G.tr[G.sel]<2)G.sel=null;if(checkWin())return}}
 else if(ph=="movimento"){if(G.own[t]==me){if(G.sel==null){if(G.tr[t]>1)G.sel=t}
  else if(t==G.sel)G.sel=null;else if(MAP[G.sel].a.includes(t)){G.tr[G.sel]--;G.tr[t]++;if(G.tr[G.sel]<2)G.sel=null}}}
 render()}
// ===== Bots =====
async function botTurn(){busy=true;const me=G.cur,p=G.P[me],d=p.diff,w=()=>sleep(RULES.botDelay);await w();
 // reforço
 const border=()=>mine(me).filter(t=>enemyN(t).length);
 while(G.pool>0){const b=border();let t;
  if(!b.length)t=mine(me)[0];
  else if(d==0)t=b[rnd(b.length)];
  else if(d==1)t=b.reduce((x,y)=>Math.max(...enemyN(y).map(j=>G.tr[j]))>Math.max(...enemyN(x).map(j=>G.tr[j]))?y:x);
  else{ // difícil: concentra no melhor ponto de ataque
   t=b.reduce((x,y)=>score(y)>score(x)?y:x)}
  const q=d==2?G.pool:Math.min(G.pool,d==1?2:1);G.tr[t]+=q;G.pool-=q;
  if(d==2||d==1)render()}
 function score(t){const e=enemyN(t);return G.tr[t]-Math.min(...e.map(j=>G.tr[j]))+(p.obj.k=="elim"&&e.some(j=>G.own[j]==p.obj.t)?3:0)}
 log(`${p.name} posicionou tropas.`);G.phase="ataque";render();await w();
 // ataque
 const th=[-2,1,2][d];
 for(let it=0;it<60&&!G.over&&!G.noAttack;it++){let c=[];
  for(const a of mine(me))if(G.tr[a]>1)for(const j of enemyN(a)){if(G.P[G.own[j]].alive&&!allied(me,G.own[j])){let s=G.tr[a]-G.tr[j]+(d>0&&G.spec&&G.spec.k=="cor"&&G.own[j]==G.spec.p?2:0);if(d==2&&p.obj.k=="elim"&&G.own[j]==p.obj.t)s+=2;c.push([a,j,s])}}
  c=c.filter(x=>x[2]>=th||(d==0&&Math.random()<.15&&x[2]>=-1));if(!c.length)break;
  const ch=d==0?c[rnd(c.length)]:c.sort((x,y)=>y[2]-x[2])[0];
  while(!G.noAttack&&G.tr[ch[0]]>1&&G.own[ch[1]]!=me&&(d==0||G.tr[ch[0]]-G.tr[ch[1]]>=th)){attack(ch[0],ch[1]);render();await sleep(RULES.botDelay+1100)}
  if(checkWin()){busy=false;return}}
 // movimento: leva tropas do interior para a fronteira
 if(d>0){G.phase="movimento";for(const t of mine(me)){if(G.tr[t]>1&&!enemyN(t).length){const nb=MAP[t].a.find(j=>G.own[j]==me&&enemyN(j).length)??MAP[t].a.find(j=>G.own[j]==me);if(nb!=null){G.tr[nb]+=G.tr[t]-1;G.tr[t]=1}}}render();await w()}
 busy=false;if(!G.over)nextTurn()}
// ===== Render =====
let polys=[],labels=[],fills=[];
function buildMap(){const s=$("svg"),NS="http://www.w3.org/2000/svg";s.innerHTML='<image href="'+BG+'" x="0" y="0" width="1475" height="1066"/>';
 MAP.forEach((t,i)=>{const f=document.createElementNS(NS,"path");f.setAttribute("d",t.d);f.setAttribute("fill-rule","evenodd");f.style.fillOpacity=1;f.style.pointerEvents="none";s.appendChild(f);fills[i]=f});
 MAP.forEach((t,i)=>{const pl=document.createElementNS(NS,"path");pl.setAttribute("d",t.d);pl.setAttribute("fill-rule","evenodd");pl.setAttribute("class","t");pl.addEventListener("click",()=>{if(!drag)click(i)});s.appendChild(pl);polys[i]=pl});
 MAP.forEach((t,i)=>{const c=document.createElementNS(NS,"text");c.setAttribute("x",t.c[0]);c.setAttribute("y",t.c[1]+11);c.setAttribute("font-size",32);s.appendChild(c);labels[i]=c;const k=document.createElementNS(NS,"text");k.setAttribute("x",t.c[0]);k.setAttribute("y",t.c[1]-16);k.setAttribute("font-size",15);k.textContent=t.n;s.appendChild(k)})}
function render(){const me=G.cur;
 MAP.forEach((t,i)=>{const o=G.own[i];fills[i].style.fill=G.P[o].color;labels[i].textContent=G.tr[i]+(G.sel==i&&G.pend&&(G.phase=="reforço"||G.bonusMode)?"+"+G.pend:"");
  let cl="t";if(G.sel==i)cl+=" sel";else if(G.sel!=null&&G.P[me].human){if(G.phase=="ataque"&&MAP[G.sel].a.includes(i)&&G.own[i]!=me&&!allied(me,G.own[i]))cl+=" adj";if(G.phase=="movimento"&&MAP[G.sel].a.includes(i)&&G.own[i]==me)cl+=" mv"}
  polys[i].setAttribute("class",cl)});
 const p=G.P[me];$("info").innerHTML=`<b style="color:${p.color}">${p.name}</b> ${p.human?"":"(bot)"}<br>Rodada ${G.round} · Fase: <b>${G.phase}</b>${G.phase=="reforço"?` · tropas a posicionar: <b>${G.pool}</b>`:""}${G.conq?"<br>✔ conquistou neste turno":""}`;
 $("players").innerHTML=G.P.map((q,i)=>`<div class="row" style="${q.alive?"":"opacity:.4;text-decoration:line-through"}"><span class="dot" style="background:${q.color}"></span>${q.name}${i==me?" ◀":""} — ${mine(i).length} terr.</div>`).join("");
 $("next").textContent=G.phase=="reforço"?"Ir para ataque":G.phase=="ataque"?"Ir para movimento":"Encerrar turno";
 $("next").disabled=!myTurn()||G.over;uiFort();uiNeg();if(NET&&!applying&&isAuth())netSend()}
function showModal(h){const m=$("modal");m.innerHTML=h;m.style.display="flex"}
function toast(t){const e=$("toast");e.textContent=t;e.style.display="block";setTimeout(()=>e.style.display="none",2200)}
// ===== Dados coloridos por jogador =====
let dt1,dt2,ivd;
function dieHTML(v,c,st){const n=parseInt(c.slice(1),16),L=((n>>16)*.3+((n>>8)&255)*.59+(n&255)*.11)/255,pc=L>.6?"#222":"#fff";
 const pos={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[v];
 return `<div class="die ${st}" style="--c:${c}">${[...Array(9).keys()].map(i=>`<i style="${pos.includes(i)?"background:"+pc:"visibility:hidden"}"></i>`).join("")}</div>`}
function showDice(A,D,ia,id,la,ld){clearTimeout(dt1);clearTimeout(dt2);clearInterval(ivd);const ca=G.P[ia].color,cd=G.P[id].color,n=Math.min(A.length,D.length),box=$("dicebox");
 const draw=(fin)=>{const st=(arr,att)=>arr.map((v,k)=>{if(!fin)return dieHTML(1+rnd(6),att?ca:cd,"roll");let cl="";if(k<n){const aw=A[k]>D[k];cl=(att?aw:!aw)?"win":"lose"}return dieHTML(v,att?ca:cd,cl)}).join("");
  box.innerHTML=`<div class="dr"><b style="color:${ca}">⚔ ${G.P[ia].name}</b><div>${st(A,true)}</div></div><div class="dr"><b style="color:${cd}">🛡 ${G.P[id].name}</b><div>${st(D,false)}</div></div><div class="dv">${fin?`Atacante perdeu ${la} · Defensor perdeu ${ld} (empate favorece a defesa)`:"Rolando…"}</div>`};
 box.style.display="block";draw(false);ivd=setInterval(()=>draw(false),150);
 dt1=setTimeout(()=>{clearInterval(ivd);draw(true)},550);dt2=setTimeout(()=>{box.style.display="none"},3000)}
// ===== Painel de reforço (estilo fortificar) =====
function uiFort(){const p=G.P[G.cur];
 const tx={"reforço":"Distribua suas tropas em seus territórios","ataque":"Toque num território seu e depois num inimigo vizinho para atacar","movimento":"Mova tropas entre territórios vizinhos seus"}[G.phase];
 $("banner").style.borderTopColor=p.color;$("banner").innerHTML=`<i style="color:${p.color}">JOGADOR ${p.name.toUpperCase()}</i><br>${myTurn()?tx:(p.human?"Aguardando a jogada…":"Turno do bot…")}`;
 const on=myTurn()&&!G.over&&(G.phase=="reforço"||G.bonusMode)&&G.sel!=null&&G.own[G.sel]==G.cur&&!G.neg;
 $("fort").style.display=on?"block":"none";if(!on)return;
 $("fpend").textContent=G.pend;$("fcur").textContent=G.tr[G.sel];$("fmax").textContent=G.pool}
function hold(id,d){const b=$(id);let iv,to;const step=()=>{if(!G||G.sel==null)return;const np=G.pend+d;if(np<0||np>G.pool)return;G.pend=np;render()};
 const stop=()=>{clearTimeout(to);clearInterval(iv)};
 b.addEventListener("pointerdown",e=>{e.preventDefault();step();to=setTimeout(()=>iv=setInterval(step,70),350)});
 ["pointerup","pointerleave","pointercancel"].forEach(ev=>b.addEventListener(ev,stop))}
hold("fm",-1);hold("fp",1);
$("fx").onclick=()=>{G.sel=null;G.pend=0;render()};
$("fo").onclick=()=>{if(G.sel==null)return;G.tr[G.sel]+=G.pend;G.pool-=G.pend;if(G.pend)log(`+${G.pend} tropas em ${MAP[G.sel].n}`);G.pend=0;G.sel=null;if(G.bonusMode&&G.pool<=0){G.bonusMode=false;G.pool=0;G.phase="movimento";toast("Ataques encerrados: só resta a movimentação.")}render()};
// ===== Alianças e negociação =====
const NEG_EVERY=5;
const allied=(x,y)=>G.allies.some(al=>al.m.includes(x)&&al.m.includes(y));
const inAlly=x=>G.allies.some(al=>al.m.includes(x));
const spare=i=>mine(i).reduce((a,t)=>a+G.tr[t]-1,0);
const esc=x=>x.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
function tickAlliances(){G.allies.forEach(al=>al.left--);
 G.allies.filter(al=>al.left<=0).forEach(al=>log(`🤝 A aliança ${G.P[al.m[0]].name} + ${G.P[al.m[1]].name} terminou.`));G.allies=G.allies.filter(al=>al.left>0)}
// Se um aliado é eliminado, o parceiro também é derrotado; seus territórios vão para quem eliminou
function eliminateAllies(id,ia){G.allies.filter(al=>al.m.includes(id)).forEach(al=>{const q=al.m.find(x=>x!=id);
 if(G.P[q].alive){G.P[q].alive=false;G.P[q].killer=ia;G.own.forEach((o,t)=>{if(o==q)G.own[t]=ia});log(`☠ ${G.P[q].name} caiu junto com seu aliado e foi eliminado (territórios passam a ${G.P[ia].name}).`)}});
 G.allies=G.allies.filter(al=>!al.m.includes(id))}
function uiNeg(){checkSpecial();const b=$("negb"),p=G.P[G.cur];
 b.style.display=(myTurn()&&!G.over&&!G.neg&&G.round%NEG_EVERY==0&&G.phase=="reforço"&&!G.negUsed)?"":"none";
 $("players").innerHTML+=G.allies.map(al=>`<div>🤝 ${G.P[al.m[0]].name} + ${G.P[al.m[1]].name} — restam ${al.left} rodada(s)</div>`).join("");
 specUI();if(G.neg)$("banner").innerHTML=`<i style="color:${G.P[G.neg.a].color}">${G.P[G.neg.a].name.toUpperCase()}</i><br>negociando…`;
 renderNeg()}
$("negb").onclick=()=>{const me=G.cur,others=G.P.map((p,i)=>i).filter(i=>i!=me&&G.P[i].alive),m=$("modal");m.style.display="flex";
 m.innerHTML=`<div>Negociar com quem?</div>`+others.map(i=>`<button data-i="${i}" style="border-left:14px solid ${G.P[i].color}">${G.P[i].name}</button>`).join("")+`<button id="nc">Cancelar</button>`;
 m.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{m.style.display="none";G.neg={a:me,b:+b.dataset.i,msgs:[],mode:null,pend:null,tmp:{},hidden:false};G.negUsed=true;G.sel=null;G.pend=0;log(`${G.P[me].name} negociando…`);render()});
 $("nc").onclick=()=>m.style.display="none"};
function propText(p){const n=G.neg,A=G.P[n.a].name,B=G.P[n.b].name;
 return p.type=="sell"?`${A} cede ${MAP[p.t].n} e recebe ${p.n} soldado(s) de ${B}.`:p.type=="swap"?`${A} cede ${MAP[p.give].n} e recebe ${MAP[p.want].n}.`:`Aliança temporária por 2 rodadas.`}
function renderNeg(){const el=$("neg"),n=G.neg;if(!n){el.style.display="none";return}
 el.style.display="block";if(NET&&!G.P[n.a].mine&&!(n.b>=0&&G.P[n.b].mine)){el.innerHTML=`<div class="nh"><span><b style="color:${G.P[n.a].color}">${G.P[n.a].name}</b> negociando…</span></div>`;return}const A=G.P[n.a],B=G.P[n.b],bot=!B.human,amI=!NET||A.mine,amT=!!NET&&B.mine;
 if(n.hidden){el.innerHTML=`<div class="nh"><span><b style="color:${A.color}">${A.name}</b> negociando…</span><button id="nshow">Mostrar chat</button></div>`;$("nshow").onclick=()=>{n.hidden=false;renderNeg()};return}
 const msgs=n.msgs.map(m=>`<div><b style="color:${G.P[m.f].color}">${G.P[m.f].name}:</b> ${esc(m.t)}</div>`).join("")||"<i>Sem mensagens</i>";
 let pr="";
 if(n.mode=="sellPick"||n.mode=="swapGive")pr="Clique no mapa no <b>seu</b> território que será cedido.";
 else if(n.mode=="swapWant")pr=`Clique no mapa no território de <b>${B.name}</b> que você quer em troca.`;
 else if(n.mode=="sellN")pr=`Ceder ${MAP[n.tmp.t].n}. Soldados que quer receber (máx ${spare(n.b)}): <input id="nn" type="number" min="1" max="${spare(n.b)}" value="1" style="width:60px"> <button id="nprop">Propor</button>`;
 const pend=n.pend?`<div class="pp">📨 ${propText(n.pend)}${bot||(NET&&!amT)?"<br><i>Aguardando resposta…</i>":`<br><button class="go" id="nacc">Aceitar (${B.name})</button> <button id="nrej">Recusar</button>`}</div>`:"";
 const lock=(n.pend||n.mode||n.used)?"disabled":"";
 el.innerHTML=`<div class="nh"><b>🔒 ${A.name} ↔ ${B.name}</b><span><button id="nhide">Ocultar</button> <button id="nend">Encerrar</button></span></div>
 <div class="nlog" id="nlog">${msgs}</div>
 <div class="nrow"><select id="nfrom">${NET?`<option value="${amI?n.a:n.b}">${amI?A.name:B.name}</option>`:`<option value="${n.a}">${A.name}</option>${bot?"":`<option value="${n.b}">${B.name}</option>`}`}</select><input id="nin" placeholder="Mensagem…"><button id="nsend">Enviar</button></div>
 ${pend}<div class="nprompt">${pr}${n.mode?` <button id="ncan">Cancelar</button>`:""}${n.used&&!n.pend?"<br><i>Opção já utilizada nesta negociação.</i>":""}</div>
 <div class="nopts" style="${NET&&!amI?"display:none":""}"><button id="o1" ${lock}>Ceder território por Soldados</button><button id="o2" ${lock}>Troca de territórios</button><button id="o3" ${lock}>Formar Aliança Temporária</button></div>`;
 const lg=$("nlog");lg.scrollTop=lg.scrollHeight;
 $("nhide").onclick=()=>{n.hidden=true;renderNeg()};
 $("nend").onclick=()=>{if(NET&&!amI)return toast("Só quem iniciou pode encerrar.");G.neg=null;log("Negociação encerrada.");render()};
 const send=()=>{const t=$("nin").value.trim();if(!t)return;if(NET&&!amI){NET.send({t:"neg",op:"msg",text:t});$("nin").value="";return}n.msgs.push({f:+$("nfrom").value,t});
  if(bot)setTimeout(()=>{if(G.neg===n){n.msgs.push({f:n.b,t:["Estou ouvindo.","Use os botões para fazer uma proposta.","Hmm, vamos ver."][rnd(3)]});renderNeg()}},700);
  renderNeg();$("nin").focus()};
 $("nsend").onclick=send;$("nin").onkeydown=e=>{if(e.key=="Enter")send()};
 $("o1").onclick=()=>{if(mine(n.a).length<2)return toast("Você precisa de ao menos 2 territórios.");if(spare(n.b)<1)return toast("O outro jogador não tem soldados sobrando.");n.mode="sellPick";renderNeg()};
 $("o2").onclick=()=>{n.mode="swapGive";renderNeg()};
 $("o3").onclick=()=>{if(inAlly(n.a)||inAlly(n.b))return toast("Um dos jogadores já está em uma aliança.");propose({type:"ally"})};
 if($("ncan"))$("ncan").onclick=()=>{n.mode=null;renderNeg()};
 if($("nprop"))$("nprop").onclick=()=>{const q=Math.floor(+$("nn").value);if(!(q>=1&&q<=spare(n.b)))return toast("Quantidade inválida.");propose({type:"sell",t:n.tmp.t,n:q})};
 if($("nacc")){$("nacc").onclick=()=>ans(true);$("nrej").onclick=()=>ans(false)}}
function negClick(t){const n=G.neg;if(!n||n.hidden)return;if(NET&&!G.P[n.a].mine)return;
 if(n.mode=="sellPick"){if(G.own[t]!=n.a)return toast("Escolha um território seu.");n.tmp.t=t;n.mode="sellN";renderNeg()}
 else if(n.mode=="swapGive"){if(G.own[t]!=n.a)return toast("Escolha um território seu.");n.tmp.give=t;n.mode="swapWant";renderNeg()}
 else if(n.mode=="swapWant"){if(G.own[t]!=n.b)return toast("Escolha um território do outro jogador.");propose({type:"swap",give:n.tmp.give,want:t})}}
function propose(p){const n=G.neg;n.pend=p;n.mode=null;n.used=true;n.msgs.push({f:n.a,t:"[Proposta] "+propText(p)});renderNeg();
 if(!G.P[n.b].human)setTimeout(()=>{if(G.neg!==n||n.pend!==p)return;const b=n.b,d=G.P[b].diff;let ok=false;
  if(p.type=="ally")ok=Math.random()<[.7,.5,.4][d];
  else if(p.type=="sell")ok=spare(b)>=p.n&&MAP[p.t].a.some(j=>G.own[j]==b);
  else ok=G.tr[p.give]>=G.tr[p.want];
  answer(ok)},1000)}
function answer(ok){const n=G.neg,p=n.pend;if(!p)return;n.pend=null;
 if(ok&&!applyProp(p))ok=false;
 n.msgs.push({f:n.b,t:ok?"Aceito.":"Recuso."});if(ok&&G.neg){}
 render();if(ok)checkWin()}
function applyProp(p){const n=G.neg,a=n.a,b=n.b;
 if(p.type=="ally"){if(inAlly(a)||inAlly(b))return false;G.allies.push({m:[a,b],left:2});log(`🤝 Aliança formada: ${G.P[a].name} + ${G.P[b].name} (2 rodadas).`);return true}
 if(p.type=="sell"){if(G.own[p.t]!=a||spare(b)<p.n||mine(a).length<2)return false;G.own[p.t]=b;let k=p.n;
  while(k>0){const t=mine(b).filter(x=>G.tr[x]>1).sort((x,y)=>G.tr[y]-G.tr[x])[0];if(t==null)break;G.tr[t]--;k--}
  G.pool+=p.n-k;log(`📜 ${MAP[p.t].n} passou de ${G.P[a].name} para ${G.P[b].name}; ${G.P[a].name} recebeu ${p.n-k} soldado(s).`);return true}
 if(G.own[p.give]!=a||G.own[p.want]!=b)return false;G.own[p.give]=b;G.own[p.want]=a;log(`🔁 Troca: ${MAP[p.give].n} ⇄ ${MAP[p.want].n} (${G.P[a].name} e ${G.P[b].name}).`);return true}
// ===== Missão Especial (a cada 7 rodadas, opcional) =====
const SPEC_EVERY=7;
function genSpecial(i){const foe=t=>G.own[t]!=i&&!allied(i,G.own[t]),T=MAP.map((x,t)=>t).filter(foe),o=[];
 if(T.filter(t=>(t+1)%2==0).length>=2)o.push({k:"par",need:2,txt:"Conquistar 2 territórios de número par (ex.: T2, T4)."});
 if(T.filter(t=>(t+1)%2==1).length>=2)o.push({k:"impar",need:2,txt:"Conquistar 2 territórios de número ímpar (ex.: T1, T3)."});
 G.P.forEach((q,j)=>{if(j!=i&&q.alive&&!allied(i,j)&&mine(j).length>=2)o.push({k:"cor",p:j,need:2,txt:`Conquistar 2 territórios da cor ${q.cn} (jogador ${q.name}).`})});
 if(T.length>=3)o.push({k:"qtd",need:3,txt:"Conquistar 3 territórios neste turno."});
 if(!o.length)return null;return Object.assign(o[rnd(o.length)],{done:false})}
function specCount(){const s=G.spec,me=G.cur,u=[...new Map((G.cl||[]).filter(x=>G.own[x.t]==me).map(x=>[x.t,x])).values()];
 return u.filter(x=>s.k=="par"?(x.t+1)%2==0:s.k=="impar"?(x.t+1)%2==1:s.k=="cor"?x.o==s.p:true).length}
function checkSpecial(){const s=G.spec;if(!s||s.done||G.over||(NET&&!isAuth())||specCount()<s.need)return;s.done=true;const me=G.cur,p=G.P[me];
 log(`⭐ ${p.name} cumpriu a missão especial: +3 soldados!`);
 if(p.human){G.pool+=3;G.bonusMode=true;G.noAttack=true;G.sel=null;G.pend=0;toast("Missão cumprida! Posicione os 3 soldados. Seus ataques deste turno terminaram.");render()}
 else{const b=mine(me).filter(t=>enemyN(t).length),L=b.length?b:mine(me);G.tr[L[rnd(L.length)]]+=3;G.noAttack=true}}
function specUI(){const s=G.spec;$("spec").innerHTML=s&&myTurn()?`⭐ <b>Missão especial</b> (opcional, só nesta rodada)<br>${s.txt}<br>Progresso: ${specCount()}/${s.need}${s.done?" ✔ cumprida (+3 soldados)":""}`:""}
function specModal(c){showModal(`⭐ <b>Missão Especial</b> (opcional, vale só nesta rodada)<br><b style="color:${G.P[c].color}">${G.P[c].name}</b>: ${G.spec.txt}<br>Ao cumprir durante os ataques, você ganha +3 soldados para posicionar onde quiser, mas seus ataques do turno terminam (só resta a movimentação).<br><button class="go" onclick="$('modal').style.display='none'">Entendi</button>`)}
// ===== Zoom / pan =====
let vb=[0,0,1475,1066],drag=false,st=null;const V0=[...vb];
const setVB=()=>$("svg").setAttribute("viewBox",vb.join(" "));
function zoom(f){const cx=vb[0]+vb[2]/2,cy=vb[1]+vb[3]/2;vb[2]*=f;vb[3]*=f;vb[0]=cx-vb[2]/2;vb[1]=cy-vb[3]/2;setVB()}
$("zi").onclick=()=>zoom(.8);$("zo").onclick=()=>zoom(1.25);$("zr").onclick=()=>{vb=[...V0];setVB()};
$("mapw").addEventListener("wheel",e=>{e.preventDefault();zoom(e.deltaY<0?.9:1.1)},{passive:false});
$("svg").addEventListener("pointerdown",e=>{st={x:e.clientX,y:e.clientY};drag=false});
window.addEventListener("pointermove",e=>{if(!st)return;const dx=e.clientX-st.x,dy=e.clientY-st.y;if(Math.abs(dx)+Math.abs(dy)>6)drag=true;
 if(drag){const k=vb[2]/$("svg").clientWidth;vb[0]-=dx*k;vb[1]-=dy*k;st={x:e.clientX,y:e.clientY};setVB()}});
window.addEventListener("pointerup",()=>{st=null;setTimeout(()=>drag=false,0)});
