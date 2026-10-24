// ===== Guerra Industrial: interface (painel econômico, painel do território, bots) =====
let indSel=null,ecoTab="over",ecoOpen=false,opMode=false;
const ecoUid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const fm=n=>Number(n).toLocaleString("pt-BR");
const indView=()=>NET?Math.max(0,G.P.findIndex(p=>p.mine)):G.cur;       // jogador cujo painel é exibido
function indSelect(t){indSel=t;indRender()}
// Executa uma ação econômica. Offline: aplica na hora. Online: envia ao servidor (que valida e devolve o estado).
async function ecoAct(a){a.p=G.cur;a.id=ecoUid();
 if(!NET){const r=IND.apply(G,a);if(!r.ok){if(myTurn())toast(r.reason);return r}log(r.msg);if(r.op&&r.op.A.length)showDice(r.op.A,r.op.D,a.p,r.op.target,0,r.op.dmg);render();return r}
 NET.ecoWait=true;NET.send({t:"eco",a});
 return new Promise(res=>{NET.ecoRes=res;setTimeout(()=>{if(NET.ecoRes===res){NET.ecoWait=false;NET.ecoRes=null;res({ok:false,reason:"Sem resposta do servidor."})}},3500)})}
function actBtn(a,label,extra=""){const r=IND.check(G,Object.assign({p:G.cur},a)),can=myTurn()&&r.ok,why=!myTurn()?"Não é a sua vez.":(r.ok?"":r.reason);
 return `<button class="${can?"":"dis"}" data-why="${why}" data-a="${encodeURIComponent(JSON.stringify(a))}" title="${why}">${label}</button>${can||!why?"":`<span class="why">${why}</span>`}`}
function bar(v){const e=G.eco.players[v],S=IND.soldiers(G,v);
 return `<b>💰 ${fm(e.money)}</b> · 🪖 ${S} · 🛸 ${e.drones||0} · 🌾 ${e.food} · 🔫 ${e.arms} · ⚙ ${e.metal}${e.shortage?` <span class="bad">⚠ escassez ${e.shortage}</span>`:""}`}
function terrHTML(){const t=indSel;if(t==null)return"";const o=G.own[t],P=G.P[o],C=IND.CFG,me=myTurn()&&o===G.cur,ind=G.eco.ind[t]||{},f=G.eco.fort[t];
 let h=`<div class="nh"><b>${MAP[t].n}</b><button id="tclose">✕</button></div><div>Dono: <b style="color:${P.color}">${P.name}</b> · 🪖 ${G.tr[t]} · +${C.territoryIncome}/rodada</div>`;
 if(o!==G.cur&&myTurn()&&G.phase==="ataque"){const bs=droneBases(),sel=droneBaseFor(t);if(bs.length)h+=`<div>🛸 Base de lançamento: <select id="dbase">${bs.map(b=>`<option value="${b}" ${b===sel?"selected":""}>${MAP[b].n}</option>`).join("")}</select></div>`;else h+=`<div class="why">Sem Indústria Militar ativa: o drone não tem base de lançamento.</div>`}
 h+=`<div>Fortificação: ${f?`sim${f.off?" (sem manutenção)":""} · defesa +${C.fort.defense}`:"não"} ${me&&!f?actBtn({type:"fort",t},`Fortificar (${C.fort.cost})`):""}</div><hr>`;
 for(const c of C.order){const r=ind[c],d=C.cats[c];
  if(r)h+=`<div class="ir">${d.icon} <b>${d.name}</b> N${r.lvl} · ${IND.statusOf(r)} (${r.int}/3)${r.off?" · <span class='bad'>sem manutenção</span>":""} · manut. ${IND.upkeepOf(c,r)}`
   +(o===G.cur&&myTurn()?`<br>${r.lvl<3&&c!=="air"?actBtn({type:"upgrade",t,cat:c},`Melhorar (${C.levels[r.lvl+1].up})`):""} ${r.int<3?actBtn({type:"repair",t,cat:c},`Reparar (${r.int===2?C.repair.damaged:C.repair.inactive})`):""} ${actBtn({type:"demolish",t,cat:c},"Demolir")}`:"")
   +(o!==G.cur&&myTurn()&&c!=="air"?`<br>${actBtn({type:"drone",to:t,cat:c,from:droneBaseFor(t)},`🛸 Atacar com drone (${(G.eco.players[G.cur].drones||0)} no estoque)`)}${IND.airOn(G,t)?`<span class="why">Defesa aérea ativa: decidido nos dados.</span>`:`<span class="why">Sem defesa aérea: a indústria será eliminada.</span>`}`:"")+`</div>`;
  else if(me)h+=`<div class="ir">${d.icon} ${d.name}: ${actBtn({type:"build",t,cat:c},`Construir (${d.cost})`)}</div>`}
 if(o!==G.cur&&myTurn()&&G.phase==="ataque"&&!opMode&&Object.keys(ind).length)h+=`<div class="why">Ative "🛸 Drone" para escolher este alvo sem atacar o território.</div>`;
 if(me)h+=`<hr>Recrutar aqui (${C.recruit.money} + 1 arma cada): <input id="rcn" type="number" min="1" value="1" style="width:56px"> <button id="rcb">Recrutar</button><div class="why" id="rcw"></div>`;
 return h}
function ecoHTML(){const v=indView(),e=G.eco.players[v],C=IND.CFG,c=IND.calc(G,v),tabs=[["over","Visão geral"],["ind","Indústrias"],["res","Recursos"],["mkt","Mercado"],["army","Exército"],["rep","Relatório"]];
 let h=`<div class="tabs">${tabs.map(([k,n])=>`<button data-tab="${k}" class="${k===ecoTab?"on":""}">${n}</button>`).join("")}<button id="eclose">✕</button></div>`;
 if(ecoTab==="over")h+=`<p><b style="color:${G.P[v].color}">${G.P[v].name}</b> — ${bar(v)}</p><table class="et"><tr><td>Arrecadação territorial</td><td>+${c.terr}</td></tr><tr><td>Receita comercial</td><td>+${c.commerce}</td></tr><tr><td>Manutenção (indústrias + fortificações)</td><td>−${c.upkeep}</td></tr><tr><td>Saldo previsto</td><td><b>${fm(c.moneyAfter)}</b></td></tr><tr><td>Produção prevista</td><td>🌾${c.prod.food} 🔫${c.prod.arms} ⚙${c.prod.metal}</td></tr><tr><td>Consumo de alimentos</td><td>−${c.need} (${c.soldiers} soldados ÷ 5)</td></tr><tr><td>Abastecimento</td><td>${c.deficit?`<span class="bad">déficit de ${c.deficit}</span>`:"ok"}${e.shortage?` · escassez há ${e.shortage} rodada(s)`:""}</td></tr></table>${c.unpaid.length||c.fortUnpaid.length?`<p class="bad">⚠ ${c.unpaid.length+c.fortUnpaid.length} estrutura(s) ficarão sem manutenção.</p>`:""}`;
 else if(ecoTab==="ind"){const it=IND.items(G,v);h+=it.length?`<table class="et"><tr><th>Terr.</th><th>Tipo</th><th>Nv</th><th>Condição</th><th>Manut.</th><th>Produz</th></tr>${it.map(x=>{const pr=IND.prodOf(x.c,x.r,true),pt=Object.keys(pr).map(k=>({food:"🌾",arms:"🔫",metal:"⚙"}[k]+pr[k])).join(" ")||(x.c==="commerce"?"💰"+IND.commerceOf("commerce",x.r,true):"—");return `<tr class="${x.r.off?"off":""}" data-go="${x.t}"><td>${MAP[x.t].n}</td><td>${C.cats[x.c].icon} ${C.cats[x.c].name}</td><td>${x.r.lvl}</td><td>${IND.statusOf(x.r)} ${x.r.int}/3${x.r.off?" ⛔":""}</td><td>${IND.upkeepOf(x.c,x.r)}</td><td>${x.r.int<2?"—":pt}</td></tr>`}).join("")}</table><p class="why">Toque numa linha para abrir o território.</p>`:"<p>Nenhuma indústria ainda. Selecione um território seu e construa.</p>"}
 else if(ecoTab==="res")h+=`<table class="et"><tr><td>💰 Dinheiro</td><td>${fm(e.money)}</td></tr><tr><td>🌾 Alimentos</td><td>${e.food} (+${c.prod.food} / −${c.need})</td></tr><tr><td>🔫 Armas</td><td>${e.arms} (+${c.prod.arms})</td></tr><tr><td>⚙ Metal</td><td>${e.metal} (+${c.prod.metal})</td></tr></table><p class="why">O dinheiro não inclui o valor dos estoques.</p>`;
 else if(ecoTab==="mkt")h+=`<table class="et">${["food","arms","metal"].map(r=>{const n={food:"🌾 Alimento",arms:"🔫 Arma",metal:"⚙ Metal"}[r],m=C.market[r];return `<tr><td>${n}<br><small>compra ${m.buy} · venda ${m.sell} · estoque ${e[r]}</small></td><td>${actBtn({type:"buy",res:r,n:1},"Comprar 1")} ${actBtn({type:"buy",res:r,n:5},"×5")}<br>${actBtn({type:"sell",res:r,n:1},"Vender 1")} ${actBtn({type:"sell",res:r,n:5},"×5")}</td></tr>`}).join("")}</table>`;
 else if(ecoTab==="army"){const m=IND.mine(G,v);h+=`<p>🛸 Drones: <b>${e.drones||0}</b> (${C.drone.cost} 💰 cada) ${actBtn({type:"buydrone",n:1},"+1")} ${actBtn({type:"buydrone",n:3},"+3")}</p><p class="why">Drones atacam indústrias de qualquer território. Sem defesa aérea a indústria é eliminada; com defesa aérea, decide-se nos dados. Exige Fábrica de Armas + Militar ativas.</p><p>🪖 <b>${c.soldiers}</b> soldados · consumo 🌾${c.need}/rodada · recrutar: ${C.recruit.money} 💰 + 1 🔫 cada</p>${e.shortage>=C.shortage.penaltyAt?`<p class="bad">Penalidade: −${C.shortage.penalty} no dado mais alto em combate.</p>`:""}${e.shortage>=C.shortage.desertAt?`<p class="bad">Deserção: ${Math.ceil(c.soldiers*C.shortage.desertPct)} soldado(s) por rodada.</p>`:""}<div class="army">${m.map(t=>`<span data-go="${t}">${MAP[t].n}: ${G.tr[t]}</span>`).join("")}</div>${indSel!=null&&G.own[indSel]===v?`<p>Recrutar em ${MAP[indSel].n}: ${actBtn({type:"recruit",t:indSel,n:1},"+1")} ${actBtn({type:"recruit",t:indSel,n:5},"+5")}</p>`:'<p class="why">Selecione um território seu no mapa para recrutar.</p>'}`}
 else{const r=e.report,l=e.ledger||{};h+=r?`<p><b>Processamento da rodada ${r.round}</b></p><table class="et"><tr><td>Receita territorial</td><td>+${r.terr}</td></tr><tr><td>Receita comercial</td><td>+${r.commerce}</td></tr><tr><td>Manutenção de indústrias</td><td>−${r.upInd}</td></tr><tr><td>Manutenção de fortificações</td><td>−${r.upFort}</td></tr><tr><td>Produção</td><td>🌾${r.prod.food} 🔫${r.prod.arms} ⚙${r.prod.metal}</td></tr><tr><td>Consumo de alimentos</td><td>−${r.consumed}${r.deficit?` (déficit ${r.deficit})`:""}</td></tr><tr><td>Deserção</td><td>${r.desert}</td></tr><tr><td>Saldo → estoques</td><td>💰${fm(r.money)} 🌾${r.food} 🔫${r.arms} ⚙${r.metal}</td></tr></table>${r.deactivated.length?`<p class="bad">Sem manutenção: ${r.deactivated.join(", ")}</p>`:""}`:"<p>Sem relatório ainda.</p>";
  h+=`<p><b>Gastos neste turno</b></p><table class="et">${[["build","Construções"],["upgrade","Melhorias"],["repair","Reparos"],["fort","Fortificações"],["recruit","Recrutamento"],["buy","Compras"],["sell","Vendas (receita)"],["drone","Drones"]].map(([k,n])=>`<tr><td>${n}</td><td>${k==="sell"?"+"+fm(-(l[k]||0)):"−"+fm(l[k]||0)}</td></tr>`).join("")}</table>`}
 return h}
function indRender(){if(!G||G.mode!=="ind")return;const v=indView();indPieces();if(G.phase!=="ataque"||!myTurn())opMode=false;
 $("opb").style.display=(myTurn()&&G.phase==="ataque"&&G.round>1&&!G.over)?"":"none";$("opb").textContent="🛸 Drone: "+(opMode?"ON (toque no alvo)":"OFF");
 $("ecobar").innerHTML=bar(v);$("ecob").style.display="";
 const tp=$("terr");if(indSel!=null){tp.style.display="block";tp.innerHTML=terrHTML();if($("dbase"))$("dbase").onchange=()=>{userBase=+$("dbase").value;indRender()};$("tclose").onclick=()=>{indSel=null;indRender()};
  if($("rcb"))$("rcb").onclick=async()=>{const r=await ecoAct({type:"recruit",t:indSel,n:+$("rcn").value});if(!r.ok&&$("rcw"))$("rcw").textContent=r.reason}}else tp.style.display="none";
 const ep=$("ecop");if(ecoOpen){ep.style.display="block";ep.innerHTML=ecoHTML();$("eclose").onclick=()=>{ecoOpen=false;indRender()};
  ep.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{ecoTab=b.dataset.tab;indRender()});ep.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>indSelect(+b.dataset.go))}else ep.style.display="none";
 for(const box of [tp,ep])box.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{if(b.classList.contains("dis")){if(b.dataset.why)toast(b.dataset.why);return}const a=JSON.parse(decodeURIComponent(b.dataset.a));ecoAct(a)})}
$("ecob").onclick=()=>{ecoOpen=!ecoOpen;indRender()};
$("opb").onclick=()=>{opMode=!opMode;indRender()};
// ----- bots: mesmas ações (e validações) dos humanos -----
async function indBotEco(me,d){let n=0;while(n++<14&&!G.over){const a=IND.botNext(G,me,d);if(!a)break;const r=await ecoAct(a);if(!r.ok)break;render();await sleep(Math.max(60,RULES.botDelay/2))}
 log(`${G.P[me].name} administrou sua economia.`)}
async function indBotOps(me,d){for(let k=0;k<2&&!G.over;k++){const a=IND.botOp(G,me,d);if(!a)break;const r=await ecoAct(a);if(!r.ok)break;render();await sleep(RULES.botDelay)}}
$("mode").onchange=()=>{const m=$("mode").value;$("modedesc").innerHTML={war:"<small>Conquiste territórios com dados, como no WAR clássico.</small>",ind:"<small>Administre dinheiro, alimentos, armas, fábricas e soldados para dominar a cidade. A primeira rodada é só de preparação.</small>",city:"<small>Um jogador comanda o Estado e luta para recuperar a cidade; os demais lideram facções independentes que disputam território, dinheiro clandestino e influência. O papel de Estado é sorteado.</small>"}[m]};

// ----- peças de indústria no mapa + animação de destruição -----
const PC={air:["#4a6fa5","📡"],food:["#3f9d4a","🌾"],arms:["#b4443c","🔫"],steel:["#6b7480","⚙️"],commerce:["#d9a520","🏪"],military:["#3b6fd6","🛡️"],fort:["#8a6a4a","🧱"]};
let pcPrev=null,fortPrev=null;
let opSeen=null,userBase=null;
const droneBases=()=>IND.items(G,G.cur).filter(x=>x.c==="military"&&x.r.int>=2).map(x=>x.t);
const droneBaseFor=t=>{const b=droneBases();if(!b.length)return undefined;return b.includes(userBase)?userBase:IND.droneBase(G,G.cur,t)};const holdKeys=new Map();
function smallBoom(x,y){const gf=$("fx"),NS="http://www.w3.org/2000/svg",g=document.createElementNS(NS,"g");g.setAttribute("transform",`translate(${x} ${y})`);
 g.innerHTML=`<circle class="shock" r="6" fill="#ff7b2e66" stroke="#ffb347" stroke-width="3"/><text class="boom" text-anchor="middle" dy="6" font-size="20">💥</text>`;gf.appendChild(g);setTimeout(()=>g.remove(),1000)}
// drone voando da base (Indústria Militar) até a indústria-alvo; explosão no fim
function droneFx(op){const gf=$("fx"),NS="http://www.w3.org/2000/svg";if(!gf)return;
 const tp=(pcPrev&&pcPrev.get(op.to+":"+op.cat))||{x:MAP[op.to].c[0],y:MAP[op.to].c[1]};
 const bp=(pcPrev&&pcPrev.get(op.base+":military"))||{x:MAP[op.base].c[0],y:MAP[op.base].c[1]};
 let ex=tp.x,ey=tp.y;
 if(op.outcome==="down"){ex=bp.x+(tp.x-bp.x)*.7;ey=bp.y+(tp.y-bp.y)*.7}
 else if(op.outcome==="miss"){ex=tp.x+(Math.random()<.5?-1:1)*(20+Math.random()*10);ey=tp.y+(Math.random()<.5?-1:1)*(15+Math.random()*8)}
 const ang=Math.atan2(ey-bp.y,ex-bp.x)*180/Math.PI,dur=Math.max(1400,Math.min(2600,Math.hypot(ex-bp.x,ey-bp.y)*3.2)),rot=(x,y)=>`<ellipse class="rotor" cx="${x}" cy="${y}" rx="5.5" ry="1.5" fill="#e8f4ff"/>`;
 const line=document.createElementNS(NS,"line");for(const [k,v] of Object.entries({x1:bp.x,y1:bp.y,x2:ex,y2:ey,class:"dtrail"}))line.setAttribute(k,v);gf.appendChild(line);
 const puff=document.createElementNS(NS,"circle");for(const [k,v] of Object.entries({cx:bp.x,cy:bp.y,r:6,fill:"#fff",class:"dpuff"}))puff.setAttribute(k,v);gf.appendChild(puff);
 const dr=document.createElementNS(NS,"g");dr.setAttribute("class","drone");dr.setAttribute("transform",`translate(${bp.x} ${bp.y})`);
 dr.innerHTML=`<g transform="rotate(${ang}) scale(1.4)"><rect x="-8" y="-4.5" width="16" height="9" rx="3" fill="#1f2630" stroke="#b9cde3" stroke-width="1.5"/><polygon points="8,-3 14,0 8,3" fill="#ff4d4d"/>${rot(-6,-9)}${rot(-6,9)}${rot(6,-9)}${rot(6,9)}</g>`;gf.appendChild(dr);
 const t0=performance.now(),ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
 const step=now=>{const k=Math.min(1,(now-t0)/dur),e=ease(k);dr.setAttribute("transform",`translate(${bp.x+(ex-bp.x)*e} ${bp.y+(ey-bp.y)*e})`);if(k<1)requestAnimationFrame(step);else{dr.remove();line.remove()}};
 requestAnimationFrame(step);setTimeout(()=>{dr.remove();line.remove();puff.remove()},dur+800);
 if(op.outcome!=="hit")setTimeout(()=>smallBoom(ex,ey),dur);          // erro / abatido / dano: pequena explosão
 else{holdKeys.set(op.to+":"+op.cat,Date.now()+dur);setTimeout(indRender,dur+60)}  // a peça some só quando o drone chega
 const t=$("toast");if(t){t.textContent=op.text;t.style.background=op.outcome==="hit"||op.outcome==="dmg"?"#b45309":"#334155";t.style.display="block";clearTimeout(t._h);t._h=setTimeout(()=>{t.style.display="none";t.style.background=""},3200)}}
function indPieces(){const gp=$("pieces"),gf=$("fx");if(!gp)return;const cur=new Map(),NS="http://www.w3.org/2000/svg";
 MAP.forEach((m,t)=>{const list=[];for(const c of IND.CFG.order){const r=(G.eco.ind[t]||{})[c];if(r)list.push({c,r})}
  if(codes[t])codes[t].style.display="";if(!list.length)return;
  const w=m.w||30,fs=Math.max(15,Math.min(32,w*.95)),fcode=Math.max(9,Math.min(15,w*.55)),span=2*w*.95;let ir=Math.max(4,Math.min(12,w*.36)),sp,per,rows,hide=false;
  const need=()=>{sp=2*ir+(ir>7?3:1.5);per=Math.max(1,Math.floor(2*w*1.0/sp));rows=Math.ceil(list.length/per);return fs*.9+rows*sp};
  while(need()>span-fcode&&ir>4)ir=Math.max(4,ir-.5);
  if(need()>span-fcode){hide=true;while(need()>span&&ir>4)ir=Math.max(4,ir-.5)}   // território minúsculo: esconde o código para caber as peças
  if(hide&&codes[t])codes[t].style.display="none";
  const y0=m.c[1]+fs*.34+ir+1;
  list.forEach((p,i)=>{const row=Math.floor(i/per),cnt=Math.min(per,list.length-row*per),x=m.c[0]+((i%per)-(cnt-1)/2)*sp,y=y0+row*sp;cur.set(t+":"+p.c,{x,y,c:p.c,r:p.r,ir})})});
 const lo=G.eco.lastOp;if(opSeen===null)opSeen=lo?lo.n||0:0;else if(lo&&lo.n&&lo.n!==opSeen){opSeen=lo.n;droneFx(lo)}
 for(const [k,until] of holdKeys){if(Date.now()>=until)holdKeys.delete(k);else if(!cur.has(k)&&pcPrev&&pcPrev.has(k))cur.set(k,pcPrev.get(k))}   // mantém a peça até o drone chegar
 if(pcPrev)for(const [k,o] of pcPrev)if(!cur.has(k)){const g=document.createElementNS(NS,"g");g.setAttribute("transform",`translate(${o.x} ${o.y})`);
   g.innerHTML=`<circle class="shock" r="10" fill="none" stroke="#ffb347" stroke-width="4"/><circle class="shock s2" r="8" fill="#ff7b2e55"/><text class="boom" text-anchor="middle" dy="8" font-size="26">💥</text><text class="smoke" text-anchor="middle" dy="4" font-size="20">${PC[o.c][1]}</text>`;
   gf.appendChild(g);setTimeout(()=>g.remove(),1100)}
 pcPrev=cur;
 const gw=$("forts");if(gw){const fs=[];MAP.forEach((m,t)=>{if(G.eco.fort[t])fs.push(t)});
  gw.innerHTML=fs.map(t=>{const off=G.eco.fort[t].off,nw=fortPrev&&!fortPrev.has(t);
   const col=off?"#8a8a8a":G.P[G.own[t]].color;
   return `<g class="fortwall${nw?" new":""}" opacity="${off?.5:1}"><path d="${MAP[t].d}" fill-rule="evenodd" fill="none" stroke="#fff" stroke-width="11" stroke-linejoin="round"/><path d="${MAP[t].d}" fill-rule="evenodd" fill="none" stroke="${col}" stroke-width="6.5" stroke-linejoin="round"/><path d="${MAP[t].d}" fill-rule="evenodd" fill="none" stroke="#0b1d2a" stroke-width="1.8" stroke-dasharray="6 4" stroke-linejoin="round"/></g>`}).join("");fortPrev=new Set(fs)}
 gp.innerHTML=[...cur.values()].map(o=>{const bad=o.r.int<2||o.r.off,dmg=o.r.int===2;
  return `<g transform="translate(${o.x} ${o.y})" opacity="${bad?.5:1}"><circle r="${o.ir}" fill="${PC[o.c][0]}" stroke="${dmg?"#ff9f1c":bad?"#ef4444":"#fff"}" stroke-width="${dmg||bad?3:2}" ${dmg?'stroke-dasharray="4 2"':""}/><text class="pcem" text-anchor="middle" dy="${(o.ir*.38).toFixed(1)}" font-size="${(o.ir*1.15).toFixed(1)}">${PC[o.c][1]}</text>${o.c!=="air"&&o.r.lvl>1&&o.ir>=9?`<circle cx="${o.ir*.75}" cy="${-o.ir*.75}" r="${o.ir*.5}" fill="#111" stroke="#fff"/><text class="pclv" x="${o.ir*.75}" y="${-o.ir*.75+3}" text-anchor="middle" font-size="${o.ir*.75}">${o.r.lvl}</text>`:""}</g>`}).join("")}
