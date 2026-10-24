// ===== Controle da Cidade: interface (painel por papel, painel do território, peças no mapa, bots) =====
let ctSel=null,ctTab="over",ctOpen=false,ctPrev=null,ctSeen=null;
const CCFG=()=>CITY.CFG;
const ctView=()=>NET?Math.max(0,G.P.findIndex(p=>p.mine)):G.cur;
const ctUid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
function ctSelect(t){ctSel=t;ctRender()}
// Executa uma ação. Offline: aplica na hora. Online: o servidor valida e devolve o estado.
async function ctAct(a){a.p=G.cur;a.id=ctUid();
 if(!NET){const r=CITY.apply(G,a);if(!r.ok){if(myTurn())toast(r.reason);return r}log(r.msg);if(r.op&&r.op.A.length)showDice(r.op.A,r.op.D,a.p,r.op.target,r.op.kill,0);render();return r}
 NET.ecoWait=true;NET.send({t:"city",a});
 return new Promise(res=>{NET.ecoRes=res;setTimeout(()=>{if(NET.ecoRes===res){NET.ecoWait=false;NET.ecoRes=null;res({ok:false,reason:"Sem resposta do servidor."})}},3500)})}
function cBtn(a,label){const r=CITY.check(G,Object.assign({p:G.cur},a)),can=myTurn()&&r.ok,why=!myTurn()?"Não é a sua vez.":(r.ok?"":r.reason);
 return `<button class="${can?"":"dis"}" data-why="${why}" data-c="${encodeURIComponent(JSON.stringify(a))}" title="${why}">${label}</button>${can||!why?"":`<span class="why">${why}</span>`}`}
const money=n=>Number(n).toLocaleString("pt-BR");
function cbar(v){const c=G.city,e=c.p[v],st=e.role==="state";
 return st?`<b>🏛 Estado</b> · 💰 ${money(e.money)}${e.reserve?` (reserva ${e.reserve})`:""} · ⚖ legit ${e.legit} · 🏙 estab ${CITY.stability(G)} · ⚡ PA ${e.pa} · 🪖 ${CITY.units(G,v)}`
  :`<b>🏴 Facção</b> · 💰 ${money(e.money)} · 👁 exposição ${e.exposure} (${CITY.expBand(e.exposure)}) · ⚡ PA ${e.pa} · 🪖 ${CITY.units(G,v)} · ${({eco:"💼 Economia",mob:"🚁 Mobilidade",def:"🛡 Defesa",inf:"📣 Influência"})[e.adv]||""}`}
function ctTerr(){const t=ctSel;if(t==null)return"";const c=G.city,T=c.t[t],o=G.own[t],P=G.P[o],C=CCFG(),stO=CITY.isState(G,o),me=myTurn()&&o===G.cur,viewer=ctView(),viewerSt=CITY.isState(G,viewer);
 let h=`<div class="nh"><b>${MAP[t].n} ${CITY.regionIcon(t)}</b><button id="tclose">✕</button></div><div>${CITY.regionName(t)} · Dono: <b style="color:${P.color}">${stO?"🏛 ":"🏴 "}${P.name}</b> · 🪖 ${G.tr[t]}</div>`;
 h+=`<div class="why">Influência: Estado ${Math.round(T.st)} · Facção ${Math.round(T.fi)} · Apoio ${Math.round(T.sup)} · Estabilidade ${Math.round(T.stab)}</div><hr>`;
 const kinds=stO?[["fac",C.fac]]:[["biz",C.biz]];
 for(const [kind,defs] of kinds)for(const k of Object.keys(defs)){const d=defs[k],r=CITY.getRec(G,kind,t,k);
  const allowed=kind==="biz"?(k==="front"?true:CITY.special(t)===k):true;if(!r&&!allowed)continue;
  if(r)h+=`<div class="ir">${d.ic} <b>${d.n}</b> N${r.lvl} · ${CITY.statusOf(r)} (${r.int}/3)${r.off?" · <span class='bad'>sem manutenção</span>":""}${r.corr?" · <span class='bad'>corrompida</span>":""}${o!==G.cur||!myTurn()?"":`<br>${r.lvl<3?cBtn({type:"upgrade",kind,t,k},`Melhorar (${C.upgrade[r.lvl+1]})`):""} ${r.int<3?cBtn({type:"repair",kind,t,k},`Reparar (${r.int===2?C.repair.damaged:C.repair.inactive})`):""} ${cBtn({type:"demolish",kind,t,k},"Demolir")}`}${(!stO&&viewerSt)?"":""}</div>`;
  else if(me)h+=`<div class="ir">${d.ic} ${d.n}: ${cBtn({type:"build",kind,t,k},`Construir (${d.cost})`)}</div>`}
 if(stO)for(const k of Object.keys(C.fac)){}
 if(!stO){const f=G.city.fac[t];if(f&&Object.keys(f).length)h+=`<div class="why">Instalações públicas capturadas ficam inativas até o Estado retomar o bairro.</div>`}
 if(myTurn()){const cur=G.cur,st=CITY.isState(G,cur);
  if(st&&!stO)h+=`<hr>${cBtn({type:"oper",t},`🚔 Operação policial (${C.act.oper.cost})`)} ${cBtn({type:"recover",t},`🏴 Recuperação (${C.act.recover.cost})`)} ${CITY.special(t)==="port"?cBtn({type:"fiscal",t},`🛃 Fiscalizar porto (${C.act.fiscal.cost})`):""} ${cBtn({type:"seize",f:o},"⚖️ Apreender ativos")} ${cBtn({type:"focus",f:o},"🕵 Focar investigação")} ${cBtn({type:"witness",f:o},`🛡 Proteger testemunhas (${C.act.witness.cost})`)}`;
  if(st&&me)h+=`<hr>${cBtn({type:"social",t},`🤝 Investimento social (${C.act.social.cost})`)} ${cBtn({type:"anticorr",t},`🧾 Combate à corrupção (${C.act.anticorr.cost})`)}`;
  if(!st&&me)h+=`<hr>${cBtn({type:"infl",t},`📣 Ampliar influência (${C.faction.inflCost})`)}`;
  if(!st&&stO){h+=`<hr>`;for(const k of Object.keys(G.city.fac[t]||{}))h+=cBtn({type:"corrupt",t,k},`🕳 Corromper ${C.fac[k].n} (200)`)}
  if(me)h+=`<hr>Recrutar aqui (${st?C.state.unitCost:C.faction.unitCost} 💰 · ${(G.city.p[cur].recruited||0)}/${CITY.recruitCap(G,cur)} nesta rodada): <input id="rcn" type="number" min="1" value="1" style="width:56px"> <button id="rcb">Recrutar</button><div class="why" id="rcw"></div>`}
 return h}
function ctHTML(){const v=ctView(),c=G.city,e=c.p[v],st=e.role==="state",C=CCFG(),calc=CITY.calc(G,v);
 const tabs=[["over","Visão geral"],["terr","Territórios"],["str",st?"Instalações":"Negócios"],["act","Ações"],["inv",st?"Investigações":"Exposição"],["ev","Eventos"],["rep","Relatório"]];
 let h=`<div class="tabs">${tabs.map(([k,n])=>`<button data-tab="${k}" class="${k===ctTab?"on":""}">${n}</button>`).join("")}<button id="eclose">✕</button></div>`;
 if(ctTab==="over"){const N=MAP.length,sc=G.P.map((p,i)=>({p,i,n:CITY.mine(G,i).length})).sort((x,y)=>y.n-x.n).map(({p,i,n})=>`<tr><td>${p.role==="state"?"🏛":"🏴"} <span style="color:${p.color}">${p.name}</span></td><td>${n}/${N} territórios</td><td>${Math.round(n/N*100)}%</td></tr>`).join("");
  h+=`<p>${cbar(v)}</p><p>🎯 <b>Único objetivo:</b> dominar <b>todos</b> os territórios da cidade. Você tem <b>${CITY.mine(G,v).length}/${N}</b>.</p><table class="et"><tr><td>Rodada</td><td>${G.round}</td></tr><tr><td>Receita prevista</td><td>+${calc.income+calc.gain+calc.biz}</td></tr><tr><td>Manutenção prevista</td><td>−${calc.up+calc.unitPaid}</td></tr><tr><td>Saldo previsto</td><td><b>${money(calc.moneyAfter)}</b></td></tr><tr><td>Recrutamento nesta rodada</td><td>${e.recruited||0} / <b>${CITY.recruitCap(G,v)}</b></td></tr>${st?`<tr><td>Pontos de investimento</td><td>${e.investPts||0} <span class="why">(fiscalização, proteção, apreensão, investigação)</span></td></tr>`:`<tr><td>Patrimônio</td><td>${money(CITY.wealth(G,v))}</td></tr>`}</table><p><b>Domínio da cidade</b></p><table class="et">${sc}</table>${calc.unpaid.length?`<p class="bad">⚠ ${calc.unpaid.length} estrutura(s) sem manutenção.</p>`:""}`}
 else if(ctTab==="terr"){h+=`<table class="et"><tr><th>Terr.</th><th>Tipo</th><th>Dono</th><th>Est/Fac</th><th>Apoio</th></tr>${MAP.map((m,t)=>`<tr data-go="${t}"><td>${m.n}</td><td>${CITY.regionIcon(t)}</td><td style="color:${G.P[G.own[t]].color}">${CITY.isState(G,G.own[t])?"🏛":"🏴"}</td><td>${Math.round(c.t[t].st)}/${Math.round(c.t[t].fi)}</td><td>${Math.round(c.t[t].sup)}</td></tr>`).join("")}</table>`}
 else if(ctTab==="str"){const it=CITY.items(G,v);h+=it.length?`<table class="et"><tr><th>Terr.</th><th>Tipo</th><th>Nv</th><th>Estado</th><th>Manut.</th></tr>${it.map(x=>`<tr class="${x.r.off?"off":""}" data-go="${x.t}"><td>${MAP[x.t].n}</td><td>${C[x.kind][x.k].ic} ${C[x.kind][x.k].n}</td><td>${x.r.lvl}</td><td>${CITY.statusOf(x.r)}${x.r.corr?" 🕳":""}</td><td>${CITY.upkeepOf(x.kind,x.k,x.r)}</td></tr>`).join("")}</table>`:"<p>Nada construído. Selecione um território seu no mapa.</p>"}
 else if(ctTab==="act"){const ids=[];if(st){ids.push(`${cBtn({type:"reserve",n:200},"🏦 Reservar 200")} ${cBtn({type:"reserve",n:200,back:true},"Liberar 200 (taxa 10%)")}`,`<span class="why">Operação, recuperação, apreensão, fiscalização, social e combate à corrupção: selecione o território no mapa.</span>`)}else ids.push(`${cBtn({type:"hide"},`🫥 Reduzir exposição (${C.faction.hideCost})`)}`,`<span class="why">Negócios, influência e corrupção: selecione o território no mapa.</span>`);
  h+=`<p>⚡ Pontos de ação: <b>${e.pa}</b></p>${ids.join("<br>")}<p>Movimentação especial: ${st?`Força Tática — mova até ${C.state.tf.max} unidades entre quaisquer territórios seus (${C.state.tf.cost} 💰, 1 PA).`:`${e.adv==="mob"?"Mobilidade: 1 deslocamento livre por rodada entre territórios seus.":"Sem a vantagem Mobilidade."}`} <span class="why">Escolha origem e destino com o botão abaixo.</span></p><p><select id="tfa">${CITY.mine(G,v).map(t=>`<option value="${t}">${MAP[t].n} (${G.tr[t]})</option>`).join("")}</select> → <select id="tfb">${CITY.mine(G,v).map(t=>`<option value="${t}">${MAP[t].n}</option>`).join("")}</select> <input id="tfn" type="number" min="1" value="1" style="width:50px"> <button id="tfgo">Deslocar</button></p>`}
 else if(ctTab==="inv"){if(st){const fl=CITY.factions(G);h+=`<p>Foco atual: <b>${e.focus!=null?G.P[e.focus].name:"automático (mais exposta)"}</b> · pontos necessários: ${C.act.invNeed}</p><table class="et">${fl.map(f=>`<tr><td style="color:${G.P[f].color}">${G.P[f].name}</td><td>${e.inv&&e.inv[f]||0}/${C.act.invNeed}</td><td>${e.invDone&&e.invDone[f]>0?`✔ concluída (${e.invDone[f]}) ${e.prot&&e.prot[f]>0?"🛡":""}`:"em andamento"}</td><td>exp. ${(c.p[f].exposure!=null)?c.p[f].exposure:c.p[f].exposureBand||"?"}</td></tr>`).join("")}</table>${fl.map(f=>cBtn({type:"focus",f},`Focar ${G.P[f].name}`)).join(" ")}`}
  else h+=`<p>Exposição: <b>${e.exposure}</b> (${CITY.expBand(e.exposure)}). Acima de ${C.exposureHigh}: negócios de fachada rendem pela metade e o atacante sofre −1 contra o Estado.</p><p class="why">Você não vê o progresso das investigações do Estado — só sinais indiretos.</p><p>${cBtn({type:"hide"},`Reduzir exposição (${C.faction.hideCost})`)}</p>`}
 else if(ctTab==="ev"){h+=`<p><b>Eventos ativos:</b> ${c.mods.length?c.mods.map(m=>`${m.n||m.k} (${m.left})`).join(", "):"nenhum"}</p><table class="et">${c.eventLog.slice(0,8).map(e=>`<tr><td>R${e.round}</td><td><b>${e.n}</b><br><span class="why">${e.txt}</span></td></tr>`).join("")||"<tr><td>Sem eventos ainda (a partir da rodada 3).</td></tr>"}</table>`}
 else{const r=e.report,l=e.ledger||{};h+=r?`<p><b>Rodada ${r.round}</b></p><table class="et"><tr><td>Receita</td><td>+${r.income}</td></tr><tr><td>Desvios/corrupção</td><td>+${r.gain}</td></tr><tr><td>Negócios</td><td>+${r.biz}</td></tr><tr><td>Manutenção</td><td>−${r.up}</td></tr><tr><td>Unidades</td><td>−${r.uc}</td></tr><tr><td>Saldo</td><td>💰${money(r.money)}</td></tr></table>${r.unpaid.length?`<p class="bad">Sem manutenção: ${r.unpaid.join(", ")}</p>`:""}`:"<p>Sem relatório ainda.</p>";h+=`<p>Gasto neste turno: −${money(l.spent||0)}</p>`}
 return h}
function ctRender(){if(!G||G.mode!=="city"||!G.city)return;const v=ctView(),c=G.city;ctSyms();ctPieces();
 $("ecobar").innerHTML=cbar(v);$("ecob").style.display="";$("ecob").textContent="🏙 Cidade";
 const tp=$("terr");if(ctSel!=null){tp.style.display="block";tp.innerHTML=ctTerr();$("tclose").onclick=()=>{ctSel=null;ctRender()};
  if($("rcb"))$("rcb").onclick=async()=>{const r=await ctAct({type:"recruit",t:ctSel,n:+$("rcn").value});if(!r.ok&&$("rcw"))$("rcw").textContent=r.reason}}else tp.style.display="none";
 const ep=$("ecop");if(ctOpen){ep.style.display="block";ep.innerHTML=ctHTML();$("eclose").onclick=()=>{ctOpen=false;ctRender()};
  ep.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{ctTab=b.dataset.tab;ctRender()});ep.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>ctSelect(+b.dataset.go));
  if($("tfgo"))$("tfgo").onclick=()=>ctAct({type:"tf",from:+$("tfa").value,to:+$("tfb").value,n:+$("tfn").value})}else ep.style.display="none";
 for(const box of [tp,ep])box.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{if(b.classList.contains("dis")){if(b.dataset.why)toast(b.dataset.why);return}ctAct(JSON.parse(decodeURIComponent(b.dataset.c)))});
 const lo=c.lastOp;if(ctSeen===null)ctSeen=lo?lo.n:0;else if(lo&&lo.n!==ctSeen){ctSeen=lo.n}}
// ----- peças no mapa: instalações (Estado) e negócios (facções) + ícone do tipo de região no código -----
const CPC={police:["#3b6fd6","🚓"],justice:["#7a5cc7","⚖️"],health:["#d94a6a","🏥"],school:["#d9a520","🏫"],customs:["#4a8f8f","🛃"],port:["#2f6f9f","⚓"],gar:["#8a6a2a","⛏️"],front:["#7a7a7a","🏪"]};
function ctPieces(){const gp=$("pieces");if(!gp)return;const c=G.city,cur=new Map();
 MAP.forEach((m,t)=>{if(codes[t])codes[t].textContent=m.n+" "+CITY.regionIcon(t);const list=[];
  for(const kind of ["fac","biz"])for(const k in (c[kind][t]||{}))if(k!=="port")list.push({k,r:c[kind][t][k]});if(codes[t])codes[t].style.display="";if(!list.length)return;
  const w=m.w||30,fs=Math.max(15,Math.min(32,w*.95)),fcode=Math.max(9,Math.min(15,w*.55)),span=2*w*.95;let ir=Math.max(4,Math.min(12,w*.36)),sp,per,rows,hide=false;
  const need=()=>{sp=2*ir+(ir>7?3:1.5);per=Math.max(1,Math.floor(2*w*1.0/sp));rows=Math.ceil(list.length/per);return fs*.9+rows*sp};
  while(need()>span-fcode&&ir>4)ir=Math.max(4,ir-.5);if(need()>span-fcode){hide=true;while(need()>span&&ir>4)ir=Math.max(4,ir-.5)}if(hide&&codes[t])codes[t].style.display="none";
  const y0=m.c[1]+fs*.34+ir+1;list.forEach((p,i)=>{const row=Math.floor(i/per),cnt=Math.min(per,list.length-row*per);cur.set(t+":"+p.k,{x:m.c[0]+((i%per)-(cnt-1)/2)*sp,y:y0+row*sp,k:p.k,r:p.r,ir})})});
 if(ctPrev){const gf=$("fx"),NS="http://www.w3.org/2000/svg";for(const [key,o] of ctPrev)if(!cur.has(key)){const g=document.createElementNS(NS,"g");g.setAttribute("transform",`translate(${o.x} ${o.y})`);g.innerHTML=`<circle class="shock" r="10" fill="none" stroke="#ffb347" stroke-width="4"/><text class="boom" text-anchor="middle" dy="8" font-size="26">💥</text>`;gf.appendChild(g);setTimeout(()=>g.remove(),1100)}}
 ctPrev=cur;
 const ports=ctPorts();
 gp.innerHTML=ports+[...cur.values()].map(o=>{const bad=o.r.int<2||o.r.off||o.r.corr;return `<g transform="translate(${o.x} ${o.y})" opacity="${bad?.55:1}"><circle r="${o.ir}" fill="${CPC[o.k][0]}" stroke="${o.r.corr?"#a855f7":o.r.int===2?"#ff9f1c":bad?"#ef4444":"#fff"}" stroke-width="${bad||o.r.int===2?3:2}"/><text class="pcem" text-anchor="middle" dy="${(o.ir*.38).toFixed(1)}" font-size="${(o.ir*1.15).toFixed(1)}">${CPC[o.k][1]}</text></g>`}).join("")}
// ----- símbolo da facção como plano de fundo dos territórios (acompanha o dono: conquistar = passa a exibir o símbolo de quem conquistou) -----
let symSig="";
function ctSyms(){const g=$("syms");if(!g)return;const sig=G.own.join(",")+"|"+Object.keys(SYMS).map(k=>k+":"+SYMS[k].length).join(",");if(sig===symSig)return;symSig=sig;let h="";
 MAP.forEach((m,t)=>{const u=SYMS[G.own[t]];if(!u)return;const w=m.w||30,sz=Math.max(60,Math.min(170,w*2.3));h+=`<clipPath id="sc${t}"><path d="${m.d}" fill-rule="evenodd"/></clipPath><image data-t="${t}" href="${u}" x="${m.c[0]-sz/2}" y="${m.c[1]-sz/2}" width="${sz}" height="${sz}" clip-path="url(#sc${t})" opacity=".92"/>`});g.innerHTML=h}
// ----- ícone dos portos: sempre no extremo sul do território (dentro do polígono) -----
const spotCache={};
function ctRings(t){return MAP[t].d.split("Z").filter(Boolean).map(seg=>seg.replace(/^M/,"").split("L").map(p=>p.split(",").map(Number)))}
function inRings(R,x,y){let c=false;for(const r of R)for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,yi]=r[i],[xj,yj]=r[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}
function portSpot(t){if(spotCache[t])return spotCache[t];const R=ctRings(t),r=Math.max(8,Math.min(13,(MAP[t].w||30)*.4));let maxY=-1,minX=1e9,maxX=-1;
 R.forEach(q=>q.forEach(p=>{if(p[1]>maxY)maxY=p[1];if(p[0]<minX)minX=p[0];if(p[0]>maxX)maxX=p[0]}));
 const fits=(x,y)=>{if(!inRings(R,x,y))return false;let n=0;for(let a=0;a<8;a++)if(inRings(R,x+Math.cos(a*Math.PI/4)*r*.95,y+Math.sin(a*Math.PI/4)*r*.95))n++;return n>=6};   // pelo menos 6 de 8 pontos do ícone dentro: chega bem perto da ponta sul
 for(let y=maxY-r*.4;y>maxY-140;y-=1.5){const xs=[];for(let x=minX+r;x<=maxX-r;x+=2)if(fits(x,y))xs.push(x);if(xs.length)return spotCache[t]={x:xs[Math.floor(xs.length/2)],y,r}}
 return spotCache[t]={x:MAP[t].c[0],y:MAP[t].c[1]+(MAP[t].w||30)*.5,r}}
function ctPorts(){const c=G.city;let h="";for(let t=0;t<MAP.length;t++){if(CITY.special(t)!=="port")continue;const sp=portSpot(t),R=sp.r,rec=CITY.getRec(G,"biz",t,"port"),o=G.own[t],st=CITY.isState(G,o),act=rec&&rec.int>=2&&!rec.off,fisc=(c.fiscal[t]||0)>0;
  const ring=fisc?"#ff9f1c":!rec?"#ffffff":act?"#ffd54a":"#ef4444",dash=(fisc||(rec&&!act))?' stroke-dasharray="3 2"':"";
  h+=`<g class="portico" data-t="${t}" transform="translate(${sp.x.toFixed(1)} ${sp.y.toFixed(1)})" opacity="${rec?1:.8}"><circle r="${R}" fill="#1c6aa5" stroke="${ring}" stroke-width="${rec?3:2}"${dash}/><g transform="scale(${(R/12).toFixed(2)})" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="0" cy="-6.5" r="2"/><line x1="0" y1="-4.5" x2="0" y2="7"/><line x1="-4" y1="-1.5" x2="4" y2="-1.5"/><path d="M-7 2.5 Q-7 8 0 8 Q7 8 7 2.5"/><path d="M-9 -9.5 Q-6 -11 -3 -9.5" stroke-width="1.2" opacity=".7"/></g>${rec&&rec.lvl>1?`<circle cx="${R*.75}" cy="${-R*.75}" r="${R*.45}" fill="#111" stroke="#fff"/><text class="pclv" x="${R*.75}" y="${-R*.75+3}" text-anchor="middle" font-size="${R*.65}">${rec.lvl}</text>`:""}${rec&&rec.corr?"":""}</g>`}
 return h}
$("ecob").addEventListener("click",()=>{if(G&&G.mode==="city"){ctOpen=!ctOpen;ctRender()}});
// ----- bots: mesmas ações e validações dos humanos -----
async function ctBotAct(me,d){let n=0;while(n++<16&&!G.over){const a=CITY.botNext(G,me,d);if(!a)break;const r=await ctAct(a);if(!r.ok)break;render();await sleep(Math.max(60,RULES.botDelay/2))}
 log(`${G.P[me].name} administrou ${G.P[me].role==="state"?"o orçamento":"seus negócios"}.`)}
async function ctBotOps(me,d){let n=0;while(n++<6&&!G.over){const a=CITY.botNext(G,me,d);if(!a)break;const r=await ctAct(a);if(!r.ok)break;render();await sleep(RULES.botDelay)}}
