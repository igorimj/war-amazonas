// ===== Controle da Cidade (Estado × Facções): regras puras, sem DOM =====
// Usado no navegador (window.CITY), no servidor e nos testes. Todos os números ficam em CITY.CFG.
// Conteúdo ilegal é ABSTRATO (renda clandestina, cargas fictícias): apenas mecânicas de jogo.
(function(){
const CFG={
 pa:{state:4,faction:3},
 state:{budget:3000,legit:70,extraUnits:10,startShare:.38,tax:80,unitCost:60,unitUpkeep:2,tf:{cost:50,max:3}},
 faction:{money:800,extraUnits:5,unitCost:50,unitUpkeep:1,exposureDecay:3,corrGain:60,corrChance:.6,hideCost:200,hideAmount:15,inflCost:100,inflAmount:15},
 reg:{res:{n:"Residencial",ic:"🏠",fac:40,stab:60},com:{n:"Comercial",ic:"🏬",fac:90,stab:60},ind:{n:"Industrial/Logística",ic:"🏭",fac:60,stab:60},per:{n:"Periferia",ic:"🏚️",fac:50,stab:40}},
 fac:{police:{n:"Delegacia",ic:"🚓",cost:300,up:40},justice:{n:"Centro de Justiça",ic:"⚖️",cost:400,up:50},health:{n:"Hospital",ic:"🏥",cost:350,up:45},school:{n:"Escola/Centro comunitário",ic:"🏫",cost:250,up:30},customs:{n:"Alfândega",ic:"🛃",cost:500,up:60}},
 biz:{port:{n:"Porto",ic:"⚓",cost:400,up:50,inc:150,exp:6},gar:{n:"Garimpo",ic:"⛏️",cost:350,up:40,inc:120,exp:8,sup:-6},front:{n:"Negócio de fachada",ic:"🏪",cost:250,up:30,inc:100,exp:3}},
 upgrade:{2:150,3:250},eff:{1:1,2:1.5,3:2},upk:{1:1,2:1.25,3:1.5},repair:{damaged:100,inactive:200},
 act:{oper:{cost:100},recover:{cost:60},social:{cost:120},anticorr:{cost:100},witness:{cost:150},fiscal:{cost:80},invHold:3,invNeed:6,seize:.25,fiscalRounds:2,witnessRounds:3},
 maxDefBonus:2,exposureHigh:70,
 // Capacidade de recrutamento por rodada (sem teto fixo): cresce com território, negócios e influência (facção) ou território e investimentos (Estado)
 recruit:{state:{base:3,perTerr:.5,perInvest:.5},faction:{base:2,perTerr:.5,perBiz:1,perInfl:1}},
 investPts:{fiscal:1,witness:1,seize:2,invDone:2},   // pontos de investimento do Estado
 score:{state:{terr:.4,stab:.3,legit:.2,sup:.1},faction:{terr:.35,wealth:.3,inf:.2,biz:.15},objective:15,wealthRef:6000}   // só para o placar informativo
};
const I={CFG,rng:Math.random,map:null,regions:null};
const no=r=>({ok:false,reason:r}),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),roll=(n,rng)=>Array.from({length:n},()=>1+Math.floor(rng()*6)).sort((a,b)=>b-a);
const REGS=()=>I.regions||(typeof CITY_REGIONS!=="undefined"?CITY_REGIONS:[]),MAPR=()=>I.map||(typeof MAP!=="undefined"?MAP:null);
const mine=(G,p)=>{const r=[];G.own.forEach((o,t)=>{if(o===p)r.push(t)});return r};
const units=(G,p)=>mine(G,p).reduce((s,t)=>s+G.tr[t],0);
const shuf=(a,rng)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const CP=(G,i)=>G.city.p[i],isSt=(G,i)=>G.city.stateIdx===i;
I.mine=mine;I.units=units;I.isState=isSt;I.cp=CP;
I.bizCount=(G,p)=>{let n=0;for(const t of mine(G,p))for(const k in (G.city.biz[t]||{}))n++;return n};
I.recruitCap=function(G,p){const c=G.city,e=c.p[p],m=mine(G,p),R=CFG.recruit;
 if(isSt(G,p))return Math.max(1,Math.floor(R.state.base+m.length*R.state.perTerr+(e.investPts||0)*R.state.perInvest));
 const infl=m.reduce((a,t)=>a+c.t[t].fi,0)/100;return Math.max(1,Math.floor(R.faction.base+m.length*R.faction.perTerr+I.bizCount(G,p)*R.faction.perBiz+infl*R.faction.perInfl))};
// Facções NÃO podem formar aliança com o Estado (entre facções, a aliança do WAR continua valendo)
I.canAlly=(G,a,b)=>!(G.city&&isSt(G,a)!==isSt(G,b));
// Estado × facção: a ÚNICA negociação permitida é uma trégua de 2 rodadas (nenhum lado ataca o outro). Entre facções valem as opções do WAR.
I.sameSide=(G,a,b)=>isSt(G,a)===isSt(G,b);
I.TRUCE_ROUNDS=2;
I.truced=(G,x,y)=>(G.truces||[]).some(t=>t.m.includes(x)&&t.m.includes(y))||(G.allies||[]).some(t=>t.m.includes(x)&&t.m.includes(y));
I.rtype=t=>{const c=REGS()[t]||"res";return c==="port"?"ind":c==="gar"?"per":c};
I.special=t=>{const c=REGS()[t];return c==="port"||c==="gar"?c:null};
I.regionName=t=>{const s=I.special(t);return CFG.reg[I.rtype(t)].n+(s==="port"?" (Porto)":s==="gar"?" (Garimpo)":"")};
I.regionIcon=t=>{const s=I.special(t);return s==="port"?"⚓":s==="gar"?"⛏️":CFG.reg[I.rtype(t)].ic};
// ---------- estruturas (instalações do Estado / negócios das facções) ----------
const SET=(G,kind)=>G.city[kind],DEFS=kind=>CFG[kind];
const getRec=(G,kind,t,k)=>(G.city[kind][t]||{})[k];
const upkeepOf=(kind,k,r)=>Math.ceil(DEFS(kind)[k].up*CFG.upk[r.lvl]);
I.upkeepOf=upkeepOf;I.getRec=getRec;
I.statusOf=r=>r.int>=3?"intacta":r.int===2?"danificada":"inativa";
I.items=(G,p)=>{const kind=isSt(G,p)?"fac":"biz",o=[];for(const t of mine(G,p))for(const k of Object.keys(DEFS(kind))){const r=getRec(G,kind,t,k);if(r)o.push({kind,t,k,r})}return o};
// fator de eficiência de uma instalação do Estado (0 se inativa/capturada)
I.eff=(G,t,k)=>{const r=getRec(G,"fac",t,k);if(!r||r.int<2||r.off||!isSt(G,G.own[t]))return 0;return CFG.eff[r.lvl]*(r.int===2?.5:1)*(r.corr?.5:1)};
const mods=(G,k)=>G.city.mods.filter(m=>m.k===k);
const modMul=(G,k)=>mods(G,k).reduce((a,m)=>a*m.v,1);
I.expBand=x=>x>=70?"alta":x>=35?"média":"baixa";
// ---------- inicialização ----------
I.init=function(G,rng){rng=rng||I.rng;const n=G.P.length,N=G.own.length,C=CFG;G.mode="city";
 const stateIdx=Math.floor(rng()*n),others=G.P.map((_,i)=>i).filter(i=>i!==stateIdx);
 const normal=[],special=[];for(let t=0;t<N;t++)(I.special(t)?special:normal).push(t);
 const k=Math.round(N*C.state.startShare),st=shuf(normal,rng).slice(0,k),rest=shuf([...normal.filter(t=>!st.includes(t)),...special],rng);
 st.forEach(t=>G.own[t]=stateIdx);rest.forEach((t,j)=>G.own[t]=others[j%others.length]);
 G.tr=G.tr.map(()=>1);
 const add=(p,x)=>{const m=mine(G,p);for(let j=0;j<x;j++)G.tr[m[Math.floor(rng()*m.length)]]++};
 add(stateIdx,C.state.extraUnits);others.forEach(f=>add(f,C.faction.extraUnits));
 const advs=shuf(["eco","mob","def","inf"],rng),persona=["eco","exp","def","inv"];
 G.P.forEach((p,i)=>{p.role=i===stateIdx?"state":"faction";if(!p.human)p.persona=persona[Math.floor(rng()*4)]});
 const base=()=>({lastRound:0,pa:0,done:[],ledger:{},prevLedger:{},report:null,recruited:0,investPts:0});
 G.city={stateIdx,fac:{},biz:{},mods:[],lastEnd:0,civil:0,fiscal:{},fiscalFull:{},lastOp:null,opSeq:0,done:[],winner:null,reason:"",
  deck:shuf([0,1,2,3,4,5,6,7],rng),eventLog:[],
  t:G.own.map((o,t)=>({st:o===stateIdx?60:20,fi:o===stateIdx?20:60,sup:50,stab:C.reg[I.rtype(t)].stab})),
  p:G.P.map((_,i)=>i===stateIdx?Object.assign(base(),{role:"state",money:C.state.budget,legit:C.state.legit,reserve:0,inv:{},invDone:{},prot:{},focus:null}):
   Object.assign(base(),{role:"faction",money:C.faction.money,exposure:0,adv:advs[others.indexOf(i)%4]}))};
 // objetivo único e público: dominar todos os territórios
 G.P.forEach(p=>{p.obj={k:"city",kind:"dominate",text:"Dominar todos os territórios da cidade. Este é o único objetivo: quem controlar tudo vence."}});
 return G};
// ---------- cálculo e processamento da rodada ----------
I.wealth=(G,p)=>{const e=CP(G,p);let w=e.money;for(const x of I.items(G,p))w+=Math.round(DEFS(x.kind)[x.k].cost*(x.r.int/3));return w};
I.calc=function(G,p){const C=CFG,c=G.city,e=CP(G,p),m=mine(G,p),st=isSt(G,p);let income=0,gain=0;const items=I.items(G,p),paid=[],unpaid=[];
 if(st){const lf=.5+e.legit/200;for(const t of m){let b=C.state.tax*clamp(c.t[t].stab/100,.4,1)*lf;if(Object.values(G.city.fac[t]||{}).some(r=>r.corr))b*=.75;income+=b}income=Math.floor(income*modMul(G,"income"))}
 else{for(const t of m)income+=C.reg[I.rtype(t)].fac*(.5+c.t[t].fi/200);income=Math.floor(income*modMul(G,"income"));
  for(const t in c.fac)for(const k in c.fac[t])if(c.fac[t][k].corr&&c.fac[t][k].by===p)gain+=C.faction.corrGain}
 let avail=e.money+income+gain,up=0;
 for(const x of items){if(x.r.int<2)continue;const cost=upkeepOf(x.kind,x.k,x.r);if(avail>=cost){avail-=cost;up+=cost;paid.push(x)}else unpaid.push(x)}
 let biz=0,exp=0;
 if(!st){for(const x of paid){const d=C.biz[x.k];let v=d.inc*C.eff[x.r.lvl]*(x.r.int===2?.5:1);
   if(x.k==="front"&&e.exposure>=C.exposureHigh)v*=.5;
   if(x.k==="port"){if(c.fiscalFull[x.t])v=0;else if((c.fiscal[x.t]||0)>0)v*=.4;if(mods(G,"portStrike").length)v=0}
   if(x.k==="gar")v*=modMul(G,"garBoost");biz+=Math.floor(v);exp+=d.exp*x.r.lvl}
  for(const t in c.fac)for(const k in c.fac[t])if(c.fac[t][k].corr&&c.fac[t][k].by===p)exp+=5;
  if(e.adv==="eco")biz=Math.floor(biz*1.1)}
 const uc=units(G,p)*(st?C.state.unitUpkeep:C.faction.unitUpkeep),unitPaid=Math.min(avail,uc);
 return {income,gain,biz,up,uc,unitPaid,unpaid,exp,moneyAfter:avail-unitPaid+biz,unitShort:uc-unitPaid};
};
I.process=function(G,p){const e=CP(G,p);if(e.lastRound===G.round)return null;e.lastRound=G.round;
 const c=I.calc(G,p),M=MAPR(),st=isSt(G,p);
 I.items(G,p).forEach(x=>{x.r.off=false});c.unpaid.forEach(x=>{x.r.off=true});
 e.money=c.moneyAfter;if(st&&c.unitShort>0)e.shortfall=1;else e.shortfall=0;
 if(!st)e.exposure=clamp(e.exposure+c.exp-CFG.faction.exposureDecay,0,100);
 e.pa=CFG.pa[e.role];e.done=[];e.recruited=0;e.prevLedger=e.ledger;e.ledger={};
 const nm=x=>`${M?M[x.t].n:"T"+(x.t+1)} ${DEFS(x.kind)[x.k].n}`;
 e.report={round:G.round,income:c.income,gain:c.gain,biz:c.biz,up:c.up,uc:c.unitPaid,unpaid:c.unpaid.map(nm),money:e.money,exposure:st?null:e.exposure,legit:st?e.legit:null,ledger:e.prevLedger};
 return e.report};
I.startTurn=(G,p)=>{G.city.done=[];return I.process(G,p)};
I.reportText=r=>`💰 +${r.income+r.gain+r.biz} · manutenção −${r.up+r.uc}`+(r.unpaid.length?` · sem manutenção: ${r.unpaid.join(", ")}`:"");
I.stability=G=>{const m=mine(G,G.city.stateIdx);return m.length?Math.round(m.reduce((a,t)=>a+G.city.t[t].stab,0)/m.length):0};
I.avgSup=G=>{const t=G.city.t;return Math.round(t.reduce((a,x)=>a+x.sup,0)/t.length)};
// ---------- fim de rodada: influência, estabilidade, legitimidade, investigações, eventos, vitória ----------
const EVENTS=[
 {n:"Crise econômica",txt:"Todas as rendas −20% por 2 rodadas.",f:(G)=>G.city.mods.push({k:"income",v:.8,left:2,n:"Crise econômica"})},
 {n:"Denúncia anônima",txt:"Uma facção sofre +20 de exposição e a investigação avança.",f:(G,r)=>{const f=I.factions(G);if(!f.length)return;const x=f[Math.floor(r()*f.length)];CP(G,x).exposure=clamp(CP(G,x).exposure+20,0,100);const s=CP(G,G.city.stateIdx);s.inv[x]=(s.inv[x]||0)+2}},
 {n:"Greve no porto",txt:"Os portos não rendem nesta rodada.",f:(G)=>G.city.mods.push({k:"portStrike",v:1,left:1,n:"Greve no porto"})},
 {n:"Enchente",txt:"Um bairro perde estabilidade e uma instalação é danificada.",f:(G,r)=>{const t=Math.floor(r()*G.own.length);G.city.t[t].stab=clamp(G.city.t[t].stab-20,0,100);for(const k in G.city.fac[t]||{}){G.city.fac[t][k].int=Math.max(1,G.city.fac[t][k].int-1);break}}},
 {n:"Descoberta de garimpo",txt:"Garimpos rendem +30% por 2 rodadas.",f:(G)=>G.city.mods.push({k:"garBoost",v:1.3,left:2,n:"Descoberta de garimpo"})},
 {n:"Investigação importante",txt:"O Estado ganha +3 pontos contra a facção mais exposta.",f:(G)=>{const f=I.factions(G).sort((a,b)=>CP(G,b).exposure-CP(G,a).exposure)[0];if(f!==undefined){const s=CP(G,G.city.stateIdx);s.inv[f]=(s.inv[f]||0)+3}}},
 {n:"Orçamento extra",txt:"O Estado recebe +300.",f:(G)=>{CP(G,G.city.stateIdx).money+=300}},
 {n:"Apoio comunitário",txt:"O apoio popular sobe em toda a cidade.",f:(G)=>G.city.t.forEach(x=>x.sup=clamp(x.sup+5,0,100))}];
I.EVENTS=EVENTS;I.factions=G=>G.P.map((_,i)=>i).filter(i=>i!==G.city.stateIdx&&G.P[i].alive!==false);
I.endRound=function(G,rng){rng=rng||I.rng;const c=G.city;if(c.lastEnd===G.round||G.round<2)return null;c.lastEnd=G.round;const C=CFG,S=CP(G,c.stateIdx),log=[];
 for(let t=0;t<G.own.length;t++){const T=c.t[t],o=G.own[t];
  if(isSt(G,o)){const f=k=>I.eff(G,t,k);T.st=clamp(T.st+6*f("police"),0,100);T.fi=clamp(T.fi-6*f("police")-3*f("school"),0,100);T.sup=clamp(T.sup+5*f("school"),0,100);T.stab=clamp(T.stab+2*f("police")+4*f("health"),0,100)}
  else{const fp=CP(G,o);T.fi=clamp(T.fi+3+(fp.adv==="inf"?2:0),0,100);T.st=clamp(T.st-3,0,100);
   if(getRec(G,"biz",t,"gar")&&!getRec(G,"biz",t,"gar").off)T.sup=clamp(T.sup+C.biz.gar.sup,0,100)}
  T.sup=clamp(T.sup+Math.sign(50-T.sup),0,100);if(I.rtype(t)==="per")T.stab=clamp(T.stab-1,0,100)}
 // legitimidade
 const inactive=I.items(G,c.stateIdx).filter(x=>x.r.off).length;let dl=-Math.floor(c.civil/3)-2*inactive-(S.shortfall?3:0)+(I.avgSup(G)>=55?1:0)+(S.social?1:0);c.civil=0;S.social=0;
 S.legit=clamp(S.legit+dl,0,100);if(dl)log.push(`Legitimidade ${dl>0?"+":""}${dl}`);
 // investigações
 const pol=mine(G,c.stateIdx).reduce((a,t)=>a+I.eff(G,t,"police"),0);const fl=I.factions(G);
 const target=S.focus!=null&&fl.includes(S.focus)?S.focus:fl.sort((a,b)=>CP(G,b).exposure-CP(G,a).exposure)[0];
 if(target!==undefined){S.inv[target]=(S.inv[target]||0)+1+Math.floor(pol)+(CP(G,target).exposure>=50?1:0);if(S.inv[target]>=C.act.invNeed){S.inv[target]=0;S.invDone[target]=C.act.invHold;S.investPts=(S.investPts||0)+C.investPts.invDone;log.push("Investigação concluída")}}
 for(const f in S.invDone){if(S.prot[f]>0)S.prot[f]--;else if(S.invDone[f]>0)S.invDone[f]--}
 for(const t in c.fiscal){if(c.fiscal[t]>0)c.fiscal[t]--;if(!c.fiscal[t])delete c.fiscalFull[t]}
 c.mods.forEach(m=>m.left--);c.mods=c.mods.filter(m=>m.left>0);
 if(c.deck.length&&G.round>=3){const e=EVENTS[c.deck.pop()];e.f(G,rng);c.eventLog.unshift({round:G.round,n:e.n,txt:e.txt});log.push(`Evento: ${e.n}`)}
 c.endLog=log;return log};
// ---------- pontuação e vitória ----------
I.score=function(G,p){const c=G.city,C=CFG,N=G.own.length,m=mine(G,p),e=CP(G,p);let s=0;
 const objOK=(()=>{const o=G.P[p].obj;if(!o)return false;if(o.kind==="recover")return o.ts.filter(t=>G.own[t]===p).length>=Math.min(2,o.ts.length);if(o.kind==="wealth")return I.wealth(G,p)>=o.n;if(o.kind==="logistics")return o.ts.some(t=>G.own[t]===p);return false})();
 if(isSt(G,p)){const w=C.score.state;s=w.terr*(m.length/N*100)+w.stab*I.stability(G)+w.legit*e.legit+w.sup*I.avgSup(G)}
 else{const w=C.score.faction,inf=m.length?m.reduce((a,t)=>a+c.t[t].fi,0)/m.length:0,bz=Math.min(1,I.items(G,p).filter(x=>x.r.int>=2).length/3)*100;s=w.terr*(m.length/N*100)+w.wealth*Math.min(1,I.wealth(G,p)/C.score.wealthRef)*100+w.inf*inf+w.biz*bz}
 return Math.round((s+(objOK?C.score.objective:0))*10)/10};
// ÚNICO objetivo: dominar TODOS os territórios da cidade (vale para o Estado e para as facções)
I.victory=function(G){const c=G.city;if(!c)return null;if(c.winner!==null)return {winner:c.winner,reason:c.reason};
 const owners=new Set(G.own);if(owners.size!==1)return null;const w=[...owners][0];c.winner=w;c.reason=isSt(G,w)?"O Estado recuperou todos os territórios da cidade.":"A facção dominou todos os territórios da cidade.";return {winner:w,reason:c.reason}};
// ---------- combate territorial: modificadores limitados, consequências e conquista ----------
I.combatMods=function(G,a,d,A,D){const c=G.city,pa=G.own[a],pd=G.own[d];let b=0;const tx=[];
 if(isSt(G,pd)&&I.eff(G,d,"police")>0){b+=1;tx.push("delegacia")}
 if(c.t[d][isSt(G,pd)?"st":"fi"]>=70){b+=1;tx.push("influência")}
 if(!isSt(G,pd)&&CP(G,pd).adv==="def"){b+=1;tx.push("vantagem Defesa")}
 b=Math.min(b,CFG.maxDefBonus);let t="";
 if(b>0&&D.length){D[0]=Math.min(6,D[0]+b);t+=` [defesa +${b}: ${tx.join(" + ")}]`}
 if(!isSt(G,pa)&&isSt(G,pd)&&CP(G,pa).exposure>=CFG.exposureHigh&&A.length){A[0]=Math.max(1,A[0]-1);t+=" [atacante muito exposto −1]"}
 A.sort((x,y)=>y-x);D.sort((x,y)=>y-x);return t};
I.afterCombat=function(G,ia,id,la,ld,d){const c=G.city,T=c.t[d],S=CP(G,c.stateIdx);
 if(isSt(G,ia)&&ld){const h=Object.keys(G.city.fac[d]||{}).length&&I.eff(G,d,"health")?.5:1;c.civil+=ld*h;T.stab=clamp(T.stab-5*ld*h,0,100);T.sup=clamp(T.sup-3*ld*h,0,100)}
 if(!isSt(G,ia)&&isSt(G,id)&&ld){T.stab=clamp(T.stab-3*ld,0,100)}};
I.onConquest=function(G,t,ia,id){const c=G.city,T=c.t[t],out=[];
 if(isSt(G,ia)){if(c.biz[t]&&Object.keys(c.biz[t]).length){out.push(`negócios apreendidos em T${t+1}`);delete c.biz[t]}T.st=Math.max(T.st,40);T.fi=Math.min(T.fi,40)}
 else{T.fi=Math.max(T.fi,40);T.st=Math.min(T.st,40);if(c.fac[t])for(const k in c.fac[t]){out.push(`instalação capturada em T${t+1}`);break}}
 return out};
I.civil=(G,n)=>{G.city.civil+=n};
// ---------- ações: validação e execução ----------
const cost=a=>{const C=CFG;switch(a.type){case"social":return C.act.social.cost;case"anticorr":return C.act.anticorr.cost;case"witness":return C.act.witness.cost;case"oper":return C.act.oper.cost;case"recover":return C.act.recover.cost;case"fiscal":return C.act.fiscal.cost;case"corrupt":return 200;case"hide":return C.faction.hideCost;case"infl":return C.faction.inflCost;default:return 0}};
const PAC=new Set(["social","anticorr","witness","oper","recover","seize","fiscal","corrupt","hide","infl"]);
I.check=function(G,a){const C=CFG;
 if(!G||G.mode!=="city"||!G.city)return no("Modo Controle da Cidade inativo.");if(G.over)return no("A partida terminou.");
 const p=a.p;if(!Number.isInteger(p)||p!==G.cur)return no("Não é a sua vez.");if(G.P[p].alive===false)return no("Jogador eliminado.");
 const e=CP(G,p),st=isSt(G,p),own=t=>Number.isInteger(t)&&G.own[t]===p,M=MAPR(),mg=G.phase==="reforço",att=G.phase==="ataque",mv=G.phase==="movimento",c=G.city;
 const key=a.type+":"+(a.t!==undefined?a.t:a.f!==undefined?a.f:"");
 if(PAC.has(a.type)){if(e.pa<1)return no("Sem pontos de ação nesta rodada.");if(e.done.includes(key))return no("Esta ação já foi feita nesta rodada para este alvo.");if(e.money<cost(a))return no(`Dinheiro insuficiente (${cost(a)}).`)}
 const faction=x=>Number.isInteger(x)&&x!==c.stateIdx&&G.P[x]&&G.P[x].alive!==false;
 const adjState=t=>M&&M[t].a.some(j=>G.own[j]===c.stateIdx);
 switch(a.type){
  case"build":{if(!mg)return no("Construção só na fase de gestão.");const kind=st?"fac":"biz";if(a.kind!==kind)return no(st?"O Estado só constrói instalações públicas.":"Facções só administram negócios.");
   if(!own(a.t))return no("O território não é seu.");const d=CFG[kind][a.k];if(!d)return no("Tipo inválido.");if(getRec(G,kind,a.t,a.k))return no("Já existe neste território.");
   if(kind==="biz"&&a.k!=="front"&&I.special(a.t)!==a.k)return no(a.k==="port"?"O Porto só existe em território de porto.":"O Garimpo só existe em território de garimpo.");
   if(e.money<d.cost)return no(`Dinheiro insuficiente (custa ${d.cost}).`);return {ok:true,cost:d.cost}}
  case"upgrade":{if(!mg)return no("Melhorias só na fase de gestão.");const r=getRec(G,a.kind,a.t,a.k);if(!r||!own(a.t))return no("Estrutura inexistente.");if(r.lvl>=3)return no("Nível máximo.");if(r.int<3)return no("Repare antes de melhorar.");const c2=C.upgrade[r.lvl+1];if(e.money<c2)return no(`Dinheiro insuficiente (custa ${c2}).`);return {ok:true,cost:c2}}
  case"repair":{if(!mg)return no("Reparos só na fase de gestão.");const r=getRec(G,a.kind,a.t,a.k);if(!r||!own(a.t))return no("Estrutura inexistente ou destruída.");if(r.int>=3)return no("Estrutura intacta.");const c2=r.int===2?C.repair.damaged:C.repair.inactive;if(e.money<c2)return no(`Dinheiro insuficiente (custa ${c2}).`);return {ok:true,cost:c2}}
  case"demolish":{if(!mg)return no("Demolição só na fase de gestão.");if(!getRec(G,a.kind,a.t,a.k)||!own(a.t))return no("Estrutura inexistente.");return {ok:true,cost:0}}
  case"recruit":{if(!(mg||mv))return no("Recrutamento só na gestão ou na movimentação.");if(!own(a.t))return no("Escolha um território seu.");const n=a.n,u=st?C.state:C.faction,cap=I.recruitCap(G,p);if(!Number.isInteger(n)||n<1||n>999)return no("Quantidade inválida.");
   if(e.recruited+n>cap)return no(`Limite de ${cap} recrutas por rodada (cresce com território, negócios, influência e investimentos).`);if(e.money<n*u.unitCost)return no(`Dinheiro insuficiente (${n*u.unitCost}).`);return {ok:true,cost:n*u.unitCost}}
  case"reserve":{if(!st)return no("Só o Estado tem reserva de emergência.");if(!mg)return no("Só na fase de gestão.");const n=a.n;if(!Number.isInteger(n)||n<1)return no("Quantidade inválida.");if(a.back){if(e.reserve<n)return no("Reserva insuficiente.")}else if(e.money<n)return no("Orçamento insuficiente.");return {ok:true,cost:0}}
  case"focus":{if(!st)return no("Só o Estado investiga.");if(!faction(a.f))return no("Alvo inválido.");return {ok:true,cost:0}}
  case"social":{if(!st)return no("Ação do Estado.");if(!mg)return no("Só na fase de gestão.");if(!own(a.t))return no("Escolha um bairro controlado pelo Estado.");return {ok:true,cost:cost(a)}}
  case"anticorr":{if(!st)return no("Ação do Estado.");if(!mg)return no("Só na fase de gestão.");if(!own(a.t))return no("Escolha um território do Estado.");if(!Object.values(c.fac[a.t]||{}).some(r=>r.corr))return no("Sem corrupção detectada neste território.");return {ok:true,cost:cost(a)}}
  case"witness":{if(!st)return no("Ação do Estado.");if(!mg)return no("Só na fase de gestão.");if(!faction(a.f))return no("Alvo inválido.");if(!(e.invDone[a.f]>0))return no("Sem investigação concluída contra esta facção.");return {ok:true,cost:cost(a)}}
  case"oper":{if(!st)return no("Ação do Estado.");if(G.round<2)return no("Ataques só a partir da rodada 2.");if(!att)return no("Só na fase de confrontos.");if(!Number.isInteger(a.t)||!faction(G.own[a.t]))return no("Escolha um território de facção.");if(I.truced(G,p,G.own[a.t]))return no("Trégua ativa: o Estado não pode atacar esta facção.");if(!adjState(a.t))return no("Precisa de território do Estado vizinho ao alvo.");return {ok:true,cost:cost(a)}}
  case"recover":{if(!st)return no("Ação do Estado.");if(G.round<2)return no("Só a partir da rodada 2.");if(!att)return no("Só na fase de confrontos.");if(!Number.isInteger(a.t)||!faction(G.own[a.t]))return no("Escolha um território de facção.");if(I.truced(G,p,G.own[a.t]))return no("Trégua ativa: o Estado não pode atacar esta facção.");if(!adjState(a.t))return no("Precisa de território do Estado vizinho ao alvo.");return {ok:true,cost:cost(a)}}
  case"seize":{if(!st)return no("Ação do Estado.");if(!att)return no("Só na fase de confrontos.");if(!faction(a.f))return no("Alvo inválido.");if(!(e.invDone[a.f]>0))return no("Exige investigação concluída.");if(!mine(G,p).some(t=>I.eff(G,t,"justice")>0))return no("Exige Centro de Justiça ativo.");return {ok:true,cost:0}}
  case"fiscal":{if(!st)return no("Ação do Estado.");if(!(att||mg))return no("Só na gestão ou nos confrontos.");if(!Number.isInteger(a.t)||I.special(a.t)!=="port"||isSt(G,G.own[a.t]))return no("Escolha um porto controlado por uma facção.");if(!mine(G,p).some(t=>I.eff(G,t,"customs")>0))return no("Exige Alfândega ativa.");return {ok:true,cost:cost(a)}}
  case"corrupt":{if(st)return no("Ação das facções.");if(!mg)return no("Só na fase de gestão.");if(!Number.isInteger(a.t)||G.own[a.t]!==c.stateIdx)return no("Escolha um território do Estado.");if(!getRec(G,"fac",a.t,a.k))return no("Instalação inexistente.");if(getRec(G,"fac",a.t,a.k).corr)return no("Já corrompida.");
   if(!M||!M[a.t].a.some(j=>G.own[j]===p))return no("Precisa de território seu vizinho ao alvo.");return {ok:true,cost:cost(a)}}
  case"hide":{if(st)return no("Ação das facções.");if(!mg)return no("Só na fase de gestão.");if(e.exposure<=0)return no("Sem exposição.");return {ok:true,cost:cost(a)}}
  case"infl":{if(st)return no("Ação das facções.");if(!mg)return no("Só na fase de gestão.");if(!own(a.t))return no("O território não é seu.");return {ok:true,cost:cost(a)}}
  case"tf":{if(!mv)return no("Só na fase de movimentação.");if(st){if(e.pa<1)return no("Sem pontos de ação.");if(e.money<C.state.tf.cost)return no(`Dinheiro insuficiente (${C.state.tf.cost}).`)}else if(e.adv!=="mob")return no("Exige a vantagem Mobilidade.");
   if(e.done.includes("tf"))return no("Já usada nesta rodada.");if(!own(a.from)||!own(a.to)||a.from===a.to)return no("Escolha dois territórios seus.");const n=a.n;if(!Number.isInteger(n)||n<1||n>C.state.tf.max||G.tr[a.from]-1<n)return no(`Mova de 1 a ${C.state.tf.max} unidades, mantendo 1 na origem.`);return {ok:true,cost:st?C.state.tf.cost:0}}
 }
 return no("Ação desconhecida.")};
I.apply=function(G,a,rng){rng=rng||I.rng;const C=CFG,c=G.city;
 if(G&&c&&a&&a.id&&(c.ids||[]).includes(a.id))return no("Ação duplicada ignorada.");
 const r=I.check(G,a);if(!r.ok)return r;const p=a.p,e=CP(G,p),M=MAPR(),T=t=>M?M[t].n:"T"+(t+1),nm=G.P[p].name;let msg="",res={};
 const spend=n=>{e.money-=n;e.ledger.spent=(e.ledger.spent||0)+n};
 if(PAC.has(a.type)){e.pa--;e.done.push(a.type+":"+(a.t!==undefined?a.t:a.f!==undefined?a.f:""))}
 switch(a.type){
  case"build":spend(r.cost);(c[a.kind][a.t]=c[a.kind][a.t]||{})[a.k]={lvl:1,int:3,off:false};msg=`🏗 ${nm} construiu ${C[a.kind][a.k].n} em ${T(a.t)}.`;break;
  case"upgrade":{const x=getRec(G,a.kind,a.t,a.k);spend(r.cost);x.lvl++;msg=`⬆ ${C[a.kind][a.k].n} em ${T(a.t)} agora é nível ${x.lvl}.`;break}
  case"repair":{const x=getRec(G,a.kind,a.t,a.k);spend(r.cost);x.int=3;x.off=false;msg=`🔧 ${C[a.kind][a.k].n} em ${T(a.t)} foi reparada.`;break}
  case"demolish":delete c[a.kind][a.t][a.k];msg=`💥 ${nm} demoliu ${C[a.kind][a.k].n} em ${T(a.t)}.`;break;
  case"recruit":spend(r.cost);G.tr[a.t]+=a.n;e.recruited+=a.n;msg=`🪖 ${nm} recrutou ${a.n} em ${T(a.t)}.`;break;
  case"reserve":if(a.back){e.reserve-=a.n;e.money+=Math.floor(a.n*.9);msg=`🏦 Reserva liberada (${a.n}, taxa de 10%).`}else{e.money-=a.n;e.reserve+=a.n;msg=`🏦 ${nm} reservou ${a.n} para emergências.`}break;
  case"focus":e.focus=a.f;msg=`🕵 O Estado definiu um foco de investigação.`;break;
  case"social":spend(r.cost);c.t[a.t].sup=clamp(c.t[a.t].sup+15,0,100);c.t[a.t].stab=clamp(c.t[a.t].stab+10,0,100);e.social=1;msg=`🤝 Investimento social em ${T(a.t)}.`;break;
  case"anticorr":spend(r.cost);for(const k in c.fac[a.t]){delete c.fac[a.t][k].corr;delete c.fac[a.t][k].by}msg=`🧾 Combate à corrupção em ${T(a.t)}.`;break;
  case"witness":spend(r.cost);e.investPts=(e.investPts||0)+C.investPts.witness;e.prot[a.f]=C.act.witnessRounds;msg=`🛡 Proteção de testemunhas ativada (${C.act.witnessRounds} rodadas).`;break;
  case"oper":{spend(r.cost);const pd=G.own[a.t],A=roll(3,rng),D=roll(Math.min(3,Math.max(1,G.tr[a.t])),rng),mt=I.combatMods(G,G.own.findIndex((o,j)=>o===p&&M&&M[a.t].a.includes(j)),a.t,A,D);
   let hit=0;for(let k=0;k<Math.min(A.length,D.length);k++)if(A[k]>D[k])hit++;const kill=Math.min(hit,G.tr[a.t]-1);G.tr[a.t]-=kill;c.t[a.t].fi=clamp(c.t[a.t].fi-10*hit,0,100);c.t[a.t].st=clamp(c.t[a.t].st+5*hit,0,100);I.civil(G,kill>0?1:0);
   c.lastOp={by:p,target:pd,t:a.t,A,D,kill,n:++c.opSeq};msg=`🚔 Operação policial em ${T(a.t)}: [${A}] x [${D}] — ${kill} baixa(s) da facção${mt}.`;res={op:c.lastOp};break}
  case"recover":spend(r.cost);c.t[a.t].fi=clamp(c.t[a.t].fi-15,0,100);c.t[a.t].st=clamp(c.t[a.t].st+15,0,100);c.t[a.t].stab=clamp(c.t[a.t].stab+5,0,100);msg=`🏴 Recuperação territorial: influência do Estado sobe em ${T(a.t)}.`;break;
  case"seize":{const f=CP(G,a.f),amt=Math.floor(f.money*(C.act.seize+.1*Math.max(...mine(G,p).map(t=>I.eff(G,t,"justice")))-.1));f.money-=Math.max(0,amt);e.money+=Math.max(0,amt);e.invDone[a.f]=0;e.investPts=(e.investPts||0)+C.investPts.seize;f.exposure=Math.max(0,f.exposure-10);e.done.push("seize:"+a.f);msg=`⚖️ Apreensão de ativos: ${Math.max(0,amt)} apreendidos de ${G.P[a.f].name}.`;res={seized:amt};break}
  case"fiscal":{spend(r.cost);e.investPts=(e.investPts||0)+C.investPts.fiscal;const o=G.own[a.t];c.fiscal[a.t]=C.act.fiscalRounds;if(e.invDone[o]>0)c.fiscalFull[a.t]=true;msg=`🛃 Fiscalização portuária em ${T(a.t)} (${c.fiscalFull[a.t]?"carga apreendida":"renda reduzida"}).`;break}
  case"corrupt":{spend(r.cost);const x=getRec(G,"fac",a.t,a.k);if(rng()<C.faction.corrChance){x.corr=true;x.by=p;e.exposure=clamp(e.exposure+5,0,100);msg=`🕳 ${nm} corrompeu ${C.fac[a.k].n} em ${T(a.t)}.`;res={success:true}}else{e.exposure=clamp(e.exposure+10,0,100);msg=`🕳 Tentativa de corrupção de ${nm} falhou em ${T(a.t)}.`;res={success:false}}break}
  case"hide":spend(r.cost);e.exposure=Math.max(0,e.exposure-C.faction.hideAmount);msg=`🫥 ${nm} reduziu a exposição.`;break;
  case"infl":spend(r.cost);c.t[a.t].fi=clamp(c.t[a.t].fi+C.faction.inflAmount,0,100);c.t[a.t].st=clamp(c.t[a.t].st-10,0,100);msg=`📣 ${nm} ampliou a influência em ${T(a.t)}.`;break;
  case"tf":{if(isSt(G,p)){spend(r.cost);e.pa--}G.tr[a.from]-=a.n;G.tr[a.to]+=a.n;e.done.push("tf");msg=`🚁 ${nm} deslocou ${a.n} unidade(s) de ${T(a.from)} para ${T(a.to)}.`;break}
 }
 if(a.id){c.ids=c.ids||[];c.ids.push(a.id);if(c.ids.length>60)c.ids.shift()}
 return Object.assign({ok:true,msg},res)};
// ---------- visão filtrada (informação secreta) ----------
I.filterView=function(G,seen){const c=G.city;if(!c)return;const S=c.stateIdx;
 const stateSeen=seen.has(S);
 c.p.forEach((e,i)=>{if(seen.has(i))return;if(i===S){delete e.inv;delete e.invDone;delete e.prot;delete e.focus}else{e.exposureBand=I.expBand(e.exposure);const known=stateSeen&&c.p[S].invDone&&c.p[S].invDone[i]>0;if(!known)delete e.exposure;if(!stateSeen||!known)delete e.money;delete e.adv}});
 if(!stateSeen){}};
// ---------- bots (mesmas regras dos humanos) ----------
I.botNext=function(G,p,diff){const C=CFG,c=G.city,e=CP(G,p),st=isSt(G,p),m=mine(G,p),M=MAPR(),persona=G.P[p].persona||"eco",can=a=>I.check(G,Object.assign({p},a)).ok;
 const threat=t=>Math.max(0,...M[t].a.filter(j=>G.own[j]!==p).map(j=>G.tr[j])),byThreat=m.slice().sort((a,b)=>threat(b)-threat(a)||a-b);
 const calc=I.calc(G,p),reserve=[100,150,200][diff]+calc.up+calc.uc,rich=c0=>e.money-c0>=reserve,mg=G.phase==="reforço",att=G.phase==="ataque";
 const cnt=k=>I.items(G,p).filter(x=>x.k===k).length;
 if(st){
  if(mg){
   const fl=I.factions(G);if(diff>=1&&fl.length&&e.focus==null)return {type:"focus",f:fl.sort((a,b)=>CP(G,b).exposure-CP(G,a).exposure)[0]};
   if(Object.keys(c.fac).some(t=>can({type:"anticorr",t:+t})))return {type:"anticorr",t:+Object.keys(c.fac).find(t=>can({type:"anticorr",t:+t}))};
   const order=persona==="inv"?["police","justice","school","health","customs"]:persona==="def"?["police","health","school","justice","customs"]:persona==="eco"?["school","police","health","justice","customs"]:["police","school","justice","health","customs"];
   const lim={police:diff===0?1:2,school:1,health:1,justice:diff>=1?1:0,customs:diff>=1&&m.length&&fl.some(f=>mine(G,f).some(t=>I.special(t)==="port"))?1:0};
   for(const k of order){if(cnt(k)<lim[k]&&rich(C.fac[k].cost)){const t=(k==="police"?byThreat:m.slice().sort((a,b)=>c.t[a].stab-c.t[b].stab)).find(x=>!getRec(G,"fac",x,k));if(t!=null&&can({type:"build",kind:"fac",t,k}))return {type:"build",kind:"fac",t,k}}}
   if(diff>=1&&rich(C.act.social.cost)){const t=m.slice().sort((a,b)=>c.t[a].stab-c.t[b].stab)[0];if(t!=null&&c.t[t].stab<55&&can({type:"social",t}))return {type:"social",t}}
   if(diff===2){const f=fl.find(x=>can({type:"witness",f:x}));if(f!==undefined&&rich(C.act.witness.cost))return {type:"witness",f}}
   const n=Math.min(I.recruitCap(G,p)-e.recruited,Math.floor((e.money-reserve)/C.state.unitCost));for(let k=Math.min(n,diff===0?2:99);k>=1;k--){const t=byThreat[0]!=null?byThreat[0]:m[0];if(can({type:"recruit",t,n:k}))return {type:"recruit",t,n:k}}
  }
  if(att&&G.round>=2){
   const fl=I.factions(G);for(const f of fl)if(diff>=1&&can({type:"seize",f}))return {type:"seize",f};
   if(diff>=1)for(const f of fl)for(const t of mine(G,f))if(I.special(t)==="port"&&can({type:"fiscal",t}))return {type:"fiscal",t};
   if(diff>=1&&rich(C.act.oper.cost)){const tg=[];for(const f of fl)for(const t of mine(G,f))if(can({type:"oper",t}))tg.push(t);tg.sort((a,b)=>G.tr[a]-G.tr[b]);if(tg.length)return {type:"oper",t:tg[0]}}
   if(diff===2)for(const f of fl)for(const t of mine(G,f))if(can({type:"recover",t})&&rich(C.act.recover.cost))return {type:"recover",t}}
  return null}
 // facção
 if(mg){
  if(diff>=1&&e.exposure>=60&&can({type:"hide"}))return {type:"hide"};
  for(const t of m){const sp=I.special(t);if(sp&&!getRec(G,"biz",t,sp)&&rich(C.biz[sp].cost)&&can({type:"build",kind:"biz",t,k:sp}))return {type:"build",kind:"biz",t,k:sp}}
  const want=persona==="exp"?1:persona==="eco"?2:1;if(cnt("front")<(diff===0?1:want)){const t=m.find(x=>!I.special(x)&&!getRec(G,"biz",x,"front"));if(t!=null&&rich(C.biz.front.cost)&&can({type:"build",kind:"biz",t,k:"front"}))return {type:"build",kind:"biz",t,k:"front"}}
  if(diff>=1)for(const x of I.items(G,p))if(x.r.int<3&&rich(C.repair.damaged)&&can({type:"repair",kind:"biz",t:x.t,k:x.k}))return {type:"repair",kind:"biz",t:x.t,k:x.k};
  if(diff>=1&&e.exposure<40){for(const t in c.fac)for(const k in c.fac[t])if(can({type:"corrupt",t:+t,k})&&rich(200))return {type:"corrupt",t:+t,k}}
  if(diff>=1){const t=m.find(x=>c.t[x].fi<45);if(t!=null&&rich(C.faction.inflCost)&&can({type:"infl",t}))return {type:"infl",t}}
  for(let k=Math.min(I.recruitCap(G,p)-e.recruited,diff===0?2:99);k>=1;k--){const t=byThreat[0]!=null?byThreat[0]:m[0];if(rich(C.faction.unitCost*k)&&can({type:"recruit",t,n:k}))return {type:"recruit",t,n:k}}}
 return null};
if(typeof module!=="undefined"&&module.exports)module.exports=I;else globalThis.CITY=I;
})();
