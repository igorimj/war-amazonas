// ===== Guerra Industrial: regras de economia (módulo puro, sem DOM) =====
// Usado pelo navegador (window.IND), pelo servidor (Durable Object) e pelos testes (Node).
// Todos os valores ficam em IND.CFG — nada de números espalhados pelo código.
(function(){
const CFG={
 start:{money:2000,soldiers:10,food:20,arms:10,metal:0},
 territoryIncome:100,
 order:["food","arms","steel","commerce","military","air"],
 cats:{
  food:{name:"Alimentícia",icon:"🌾",cost:300,upkeep:40,prod:{food:6}},
  arms:{name:"Fábrica de armas",icon:"🔫",cost:450,upkeep:60,prod:{arms:3}},
  steel:{name:"Siderúrgica",icon:"⚙️",cost:400,upkeep:50,prod:{metal:4}},
  commerce:{name:"Comercial",icon:"🏪",cost:350,upkeep:35,income:100},
  military:{name:"Militar",icon:"🛡️",cost:400,upkeep:50},
  air:{name:"Defesa Aérea",icon:"📡",cost:200,upkeep:0}   // exige Indústria Militar ativa no mesmo território; protege o território contra drones
 },
 levels:{1:{up:0,prod:1,upkeep:1},2:{up:300,prod:1.5,upkeep:1.25},3:{up:500,prod:2,upkeep:1.5}},
 metalCost:{up2:0,up3:0,fort:0},            // metal exigido em melhorias/fortificações (0 = só dinheiro)
 recruit:{money:50,arms:1,perFood:5},
 repair:{damaged:100,inactive:200},
 fort:{cost:300,upkeep:20,defense:1},
 market:{food:{buy:30,sell:20},arms:{buy:70,sell:50},metal:{buy:50,sell:35}},
 shortage:{penaltyAt:2,desertAt:3,desertPct:0.1,penalty:1},
 drone:{cost:150,maxPerTurn:3,dice:3,hitChance:0.95},   // drone: 150 cada; exige Fábrica de Armas + Militar ativas; ataca qualquer território do mapa
 maxDefenseBonus:2
};
const I={CFG,rng:Math.random,map:null};
const MAPREF=()=>I.map||(typeof MAP!=="undefined"?MAP:null);
const no=r=>({ok:false,reason:r}),RES=["food","arms","metal"];
const mine=(G,p)=>{const r=[];G.own.forEach((o,t)=>{if(o===p)r.push(t)});return r};
const soldiers=(G,p)=>mine(G,p).reduce((s,t)=>s+G.tr[t],0);
const E=(G,p)=>G.eco.players[p];
const led=(G,p,k,v)=>{const l=E(G,p).ledger;l[k]=(l[k]||0)+v};
const roll=(n,rng)=>Array.from({length:n},()=>1+Math.floor(rng()*6)).sort((a,b)=>b-a);
Object.assign(I,{mine,soldiers,E});
I.allied=(G,x,y)=>(G.allies||[]).some(a=>a.m.includes(x)&&a.m.includes(y))||(G.truces||[]).some(a=>a.m.includes(x)&&a.m.includes(y));
// ---------- inicialização ----------
I.initEco=function(G){const s=CFG.start;G.mode="ind";
 G.eco={players:G.P.map(()=>({money:s.money,food:s.food,arms:s.arms,metal:s.metal,shortage:0,drones:0,lastRound:0,report:null,ledger:{},prevLedger:{}})),ind:{},fort:{},done:[],ops:[],lastOp:null};return G};
// soldados iniciais iguais para todos (mínimo 1 por território: se algum jogador tiver mais territórios que 10, todos recebem esse total)
I.init=function(G,rng){rng=rng||I.rng;I.initEco(G);
 const counts=G.P.map((_,i)=>mine(G,i).length),S=Math.max(CFG.start.soldiers,...counts);
 G.tr=G.tr.map(()=>1);
 G.P.forEach((_,i)=>{const m=mine(G,i);for(let k=counts[i];k<S;k++)G.tr[m[Math.floor(rng()*m.length)]]++});return G};
// ---------- estruturas ----------
const lv=r=>CFG.levels[r.lvl];
I.statusOf=r=>r.int>=3?"intacta":r.int===2?"danificada":"inativa";
I.upkeepOf=(c,r)=>Math.ceil(CFG.cats[c].upkeep*lv(r).upkeep);
I.prodOf=(c,r,ignoreOff)=>{const o={},pr=CFG.cats[c].prod;if(!pr||r.int<2||(r.off&&!ignoreOff))return o;
 for(const x in pr)o[x]=Math.floor(pr[x]*lv(r).prod*(r.int===2?.5:1));return o};
I.commerceOf=(c,r,ignoreOff)=>(c==="commerce"&&r.int>=2&&(!r.off||ignoreOff))?Math.floor(CFG.cats.commerce.income*(r.int===2?.5:1)):0;
I.items=(G,p)=>{const o=[];for(const t of mine(G,p))for(const c of CFG.order){const r=(G.eco.ind[t]||{})[c];if(r)o.push({t,c,r})}return o};
I.airOn=(G,t)=>{const i=G.eco.ind[t]||{},a=i.air,m=i.military;return !!(a&&a.int>=2&&m&&m.int>=2)};
// base de lançamento: território do jogador com Indústria Militar mais próximo do alvo
I.droneBase=(G,p,to)=>{const M=MAPREF();let best=null,bd=1e18;for(const x of I.items(G,p)){if(x.c!=="military"||x.r.int<2)continue;const d=M?(M[x.t].c[0]-M[to].c[0])**2+(M[x.t].c[1]-M[to].c[1])**2:0;if(d<bd){bd=d;best=x.t}}return best!=null?best:mine(G,p)[0]};
I.hasDroneBase=(G,p)=>{const it=I.items(G,p);return it.some(x=>x.c==="arms"&&x.r.int>=2)&&it.some(x=>x.c==="military"&&x.r.int>=2)};
// invasão: a fortificação do território conquistado é perdida
I.onConquest=(G,t)=>{if(G.eco&&G.eco.fort&&G.eco.fort[t]){delete G.eco.fort[t];return true}return false};
I.defBonus=(G,t)=>{let v=0;const tx=[],f=G.eco.fort[t],m=(G.eco.ind[t]||{}).military;
 if(f&&!f.off){v+=CFG.fort.defense;tx.push("fortificação")}
 if(m&&!m.off&&m.int>=2){v+=m.int===2?1:m.lvl;tx.push("indústria militar")}
 return {v:Math.min(v,CFG.maxDefenseBonus),txt:tx.join(" + ")}};
// ---------- cálculo da rodada (sem alterar o estado) ----------
I.calc=function(G,p){const C=CFG,e=E(G,p),m=mine(G,p),it=I.items(G,p);
 const terr=m.length*C.territoryIncome;let avail=e.money+terr,upInd=0,upFort=0;const paid=[],unpaid=[],fortPaid=[],fortUnpaid=[];
 for(const x of it){if(x.r.int<2)continue;const cost=I.upkeepOf(x.c,x.r);if(avail>=cost){avail-=cost;upInd+=cost;paid.push(x)}else unpaid.push(x)}
 for(const t of m)if(G.eco.fort[t]){if(avail>=C.fort.upkeep){avail-=C.fort.upkeep;upFort+=C.fort.upkeep;fortPaid.push(t)}else fortUnpaid.push(t)}
 let commerce=0;const prod={food:0,arms:0,metal:0};
 for(const x of paid){commerce+=I.commerceOf(x.c,x.r,true);const pr=I.prodOf(x.c,x.r,true);for(const k in pr)prod[k]+=pr[k]}
 const S=soldiers(G,p),need=Math.ceil(S/C.recruit.perFood),have=e.food+prod.food,deficit=Math.max(0,need-have),consumed=Math.min(need,have);
 const shortage=deficit>0?e.shortage+1:0;
 const desert=shortage>=C.shortage.desertAt?Math.min(Math.ceil(S*C.shortage.desertPct),S-m.length):0;
 return {terr,commerce,upInd,upFort,upkeep:upInd+upFort,prod,need,consumed,deficit,shortage,desert,unpaid,fortUnpaid,moneyAfter:e.money+terr+commerce-upInd-upFort,soldiers:S};
};
// ---------- processamento econômico (exatamente 1x por rodada e jogador) ----------
I.process=function(G,p){const e=E(G,p);if(e.lastRound===G.round)return null;e.lastRound=G.round;
 const c=I.calc(G,p),M=MAPREF(),m=mine(G,p);
 I.items(G,p).forEach(x=>{x.r.off=false});c.unpaid.forEach(x=>{x.r.off=true});
 m.forEach(t=>{if(G.eco.fort[t])G.eco.fort[t].off=c.fortUnpaid.includes(t)});
 e.money=c.moneyAfter;e.food=e.food+c.prod.food-c.consumed;e.arms+=c.prod.arms;e.metal+=c.prod.metal;e.shortage=c.shortage;
 let k=c.desert;while(k>0){const t=m.filter(x=>G.tr[x]>1).sort((a,b)=>G.tr[b]-G.tr[a]||a-b)[0];if(t==null)break;G.tr[t]--;k--}
 e.prevLedger=e.ledger;e.ledger={};
 const nm=x=>`${M?M[x.t].n:"T"+(x.t+1)} ${CFG.cats[x.c].name}`;
 e.report={round:G.round,terr:c.terr,commerce:c.commerce,upInd:c.upInd,upFort:c.upFort,upkeep:c.upkeep,prod:c.prod,need:c.need,consumed:c.consumed,deficit:c.deficit,shortage:c.shortage,desert:c.desert-k,
  deactivated:c.unpaid.map(nm).concat(c.fortUnpaid.map(t=>`${M?M[t].n:"T"+(t+1)} Fortificação`)),money:e.money,food:e.food,arms:e.arms,metal:e.metal,soldiers:soldiers(G,p),ledger:e.prevLedger};
 return e.report};
I.startTurn=(G,p)=>{G.eco.ops=[];return I.process(G,p)};
I.reportText=r=>`💰 +${r.terr+r.commerce} (territórios ${r.terr}${r.commerce?`, comércio ${r.commerce}`:""}) · manutenção −${r.upkeep} · produção 🌾${r.prod.food} 🔫${r.prod.arms} ⚙${r.prod.metal} · consumo 🌾${r.consumed}`+(r.deficit?` · ⚠ escassez (${r.shortage}ª rodada)`:"")+(r.desert?` · ${r.desert} soldado(s) desertaram`:"")+(r.deactivated.length?` · sem manutenção: ${r.deactivated.join(", ")}`:"");
// ---------- combate territorial: modificadores (limitados) ----------
I.combatMods=function(G,a,d,A,D){const C=CFG,pa=G.own[a],pd=G.own[d];let t="";
 if(E(G,pa).shortage>=C.shortage.penaltyAt&&A.length){A[0]=Math.max(1,A[0]-C.shortage.penalty);t+=" [atacante em escassez −1]"}
 if(E(G,pd).shortage>=C.shortage.penaltyAt&&D.length){D[0]=Math.max(1,D[0]-C.shortage.penalty);t+=" [defensor em escassez −1]"}
 const b=I.defBonus(G,d);if(b.v>0&&D.length){D[0]=Math.min(6,D[0]+b.v);t+=` [defesa +${b.v}: ${b.txt}]`}
 A.sort((x,y)=>y-x);D.sort((x,y)=>y-x);return t};
// ---------- validação e execução de ações ----------
I.canSupply=(G,p,n)=>{const e=E(G,p),c=I.calc(G,p);return e.food+c.prod.food>=Math.ceil((soldiers(G,p)+n)/CFG.recruit.perFood)};
I.check=function(G,a){const C=CFG;
 if(!G||G.mode!=="ind"||!G.eco)return no("Modo Guerra Industrial inativo.");
 if(G.over)return no("A partida terminou.");
 const p=a.p;if(!Number.isInteger(p)||p!==G.cur)return no("Não é a sua vez.");
 if(!G.P[p].alive)return no("Jogador eliminado.");
 const e=E(G,p),admin=G.phase==="reforço",owns=t=>Number.isInteger(t)&&G.own[t]===p,rec=()=>(G.eco.ind[a.t]||{})[a.cat],M=MAPREF();
 switch(a.type){
  case "build":{if(!admin)return no("Construção só na fase de administração.");if(!owns(a.t))return no("O território não é seu.");
   if(!C.cats[a.cat])return no("Categoria inválida.");if(rec())return no("Já existe esta indústria no território.");
   if(a.cat==="air"){const m=(G.eco.ind[a.t]||{}).military;if(!m||m.int<2)return no("Defesa Aérea exige uma Indústria Militar ativa neste território.")}
   const c=C.cats[a.cat].cost;if(e.money<c)return no(`Dinheiro insuficiente (custa ${c}).`);return {ok:true,cost:c}}
  case "upgrade":{if(!admin)return no("Melhorias só na fase de administração.");if(!owns(a.t))return no("O território não é seu.");const r=rec();if(!r)return no("Indústria inexistente.");if(a.cat==="air")return no("A Defesa Aérea não tem melhorias.");
   if(r.lvl>=3)return no("Nível máximo.");if(r.int<3)return no("Repare a estrutura antes de melhorar.");
   const c=C.levels[r.lvl+1].up,mt=C.metalCost["up"+(r.lvl+1)]||0;if(e.money<c)return no(`Dinheiro insuficiente (custa ${c}).`);if(e.metal<mt)return no(`Metal insuficiente (${mt}).`);return {ok:true,cost:c,metal:mt}}
  case "repair":{if(!admin)return no("Reparos só na fase de administração.");if(!owns(a.t))return no("O território não é seu.");const r=rec();if(!r)return no("Estrutura inexistente ou destruída: construa novamente.");
   if(r.int>=3)return no("Estrutura intacta.");const c=r.int===2?C.repair.damaged:C.repair.inactive;if(e.money<c)return no(`Dinheiro insuficiente (custa ${c}).`);return {ok:true,cost:c}}
  case "demolish":{if(!admin)return no("Demolição só na fase de administração.");if(!owns(a.t))return no("O território não é seu.");if(!rec())return no("Indústria inexistente.");return {ok:true,cost:0}}
  case "fort":{if(!admin)return no("Fortificação só na fase de administração.");if(!owns(a.t))return no("O território não é seu.");if(G.eco.fort[a.t])return no("O território já tem fortificação.");
   if(e.money<C.fort.cost)return no(`Dinheiro insuficiente (custa ${C.fort.cost}).`);if(e.metal<(C.metalCost.fort||0))return no("Metal insuficiente.");return {ok:true,cost:C.fort.cost}}
  case "recruit":{if(!(admin||G.phase==="movimento"))return no("Recrutamento só na administração ou na movimentação.");if(!owns(a.t))return no("Escolha um território seu.");
   const n=a.n;if(!Number.isInteger(n)||n<1||n>999)return no("Quantidade inválida.");
   if(e.shortage>0)return no("Escassez de alimentos: recrutamento bloqueado.");
   if(e.money<n*C.recruit.money)return no(`Dinheiro insuficiente (${n*C.recruit.money}).`);if(e.arms<n*C.recruit.arms)return no(`Armas insuficientes (${n*C.recruit.arms}).`);
   if(!I.canSupply(G,p,n))return no("Abastecimento insuficiente para sustentar o exército resultante.");return {ok:true,cost:n*C.recruit.money}}
  case "buy":case "sell":{if(!admin)return no("O mercado só abre na fase de administração.");if(!RES.includes(a.res))return no("Recurso inválido.");
   const n=a.n;if(!Number.isInteger(n)||n<1||n>9999)return no("Quantidade inválida.");
   if(a.type==="buy"){const c=n*C.market[a.res].buy;if(e.money<c)return no(`Dinheiro insuficiente (${c}).`);return {ok:true,cost:c}}
   if(e[a.res]<n)return no("Você não possui essa quantidade.");return {ok:true,gain:n*C.market[a.res].sell}}
  case "buydrone":{if(!(admin||G.phase==="ataque"))return no("Drones só podem ser comprados na administração ou no ataque.");const n=a.n;if(!Number.isInteger(n)||n<1||n>20)return no("Quantidade inválida.");
   if(!I.hasDroneBase(G,p))return no("Exige Fábrica de Armas e Indústria Militar ativas.");const c=n*C.drone.cost;if(e.money<c)return no(`Dinheiro insuficiente (${c}).`);return {ok:true,cost:c}}
  case "drone":{if(G.round<2)return no("Ataques só a partir da rodada 2.");if(G.phase!=="ataque")return no("Ataque de drone só na fase de ataque.");if(G.noAttack)return no("Ataques encerrados.");
   if((e.drones||0)<1)return no("Você não tem drones (compre no painel Exército).");
   if(!Number.isInteger(a.to)||G.own[a.to]===undefined||G.own[a.to]===p)return no("Alvo inválido: escolha um território inimigo.");
   if(I.allied(G,p,G.own[a.to]))return no("Aliança/paz ativa com o dono do alvo.");
   if(a.from!==undefined&&!(owns(a.from)&&((G.eco.ind[a.from]||{}).military||{int:0}).int>=2))return no("A base de lançamento precisa ser um território seu com Indústria Militar ativa.");
   if(a.cat==="air"||!C.cats[a.cat])return no("Alvo inválido.");if(!(G.eco.ind[a.to]||{})[a.cat])return no("O alvo não possui essa indústria (ou já foi destruída).");
   if(G.eco.ops.length>=C.drone.maxPerTurn)return no(`Limite de ${C.drone.maxPerTurn} ataques de drone por turno.`);return {ok:true,cost:0}}
 }
 return no("Ação desconhecida.")};
I.apply=function(G,a,rng){rng=rng||I.rng;const C=CFG;
 if(G&&G.eco&&a&&a.id&&G.eco.done.includes(a.id))return no("Ação duplicada ignorada.");
 const r=I.check(G,a);if(!r.ok)return r;const p=a.p,e=E(G,p),M=MAPREF(),T=t=>M?M[t].n:"T"+(t+1);let msg="",op=null;
 switch(a.type){
  case "build":e.money-=r.cost;(G.eco.ind[a.t]=G.eco.ind[a.t]||{})[a.cat]={lvl:1,int:3,off:false};led(G,p,"build",r.cost);msg=`🏗 ${G.P[p].name} construiu ${C.cats[a.cat].name} em ${T(a.t)}.`;break;
  case "upgrade":{const x=G.eco.ind[a.t][a.cat];e.money-=r.cost;e.metal-=r.metal;x.lvl++;led(G,p,"upgrade",r.cost);msg=`⬆ ${C.cats[a.cat].name} em ${T(a.t)} agora é nível ${x.lvl}.`;break}
  case "repair":{const x=G.eco.ind[a.t][a.cat];e.money-=r.cost;x.int=3;x.off=false;led(G,p,"repair",r.cost);msg=`🔧 ${C.cats[a.cat].name} em ${T(a.t)} foi reparada.`;break}
  case "demolish":delete G.eco.ind[a.t][a.cat];msg=`💥 ${G.P[p].name} demoliu ${C.cats[a.cat].name} em ${T(a.t)}.`;break;
  case "fort":e.money-=r.cost;e.metal-=(C.metalCost.fort||0);G.eco.fort[a.t]={off:false};led(G,p,"fort",r.cost);msg=`🧱 ${G.P[p].name} fortificou ${T(a.t)}.`;break;
  case "recruit":e.money-=r.cost;e.arms-=a.n*C.recruit.arms;G.tr[a.t]+=a.n;led(G,p,"recruit",r.cost);msg=`🪖 ${G.P[p].name} recrutou ${a.n} soldado(s) em ${T(a.t)}.`;break;
  case "buy":e.money-=r.cost;e[a.res]+=a.n;led(G,p,"buy",r.cost);msg=`🛒 ${G.P[p].name} comprou ${a.n} de ${a.res}.`;break;
  case "sell":e[a.res]-=a.n;e.money+=r.gain;led(G,p,"sell",-r.gain);msg=`💱 ${G.P[p].name} vendeu ${a.n} de ${a.res}.`;break;
  case "buydrone":e.money-=r.cost;e.drones=(e.drones||0)+a.n;led(G,p,"drone",r.cost);msg=`🛸 ${G.P[p].name} comprou ${a.n} drone(s).`;break;
  case "drone":{e.drones--;G.eco.ops.push(a.to);const tgt=G.eco.ind[a.to][a.cat],pd=G.own[a.to],before=tgt.int;let A=[],D=[],dmg=0,undefended=!I.airOn(G,a.to);
   let outcome;
   if(undefended){const hit=rng()<C.drone.hitChance;dmg=hit?before:0;outcome=hit?"hit":"miss"}   // sem defesa aérea: sem dados; 95% elimina, 5% erra
   else{A=roll(C.drone.dice,rng);D=roll(Math.min(3,Math.max(1,G.tr[a.to])),rng);
    if(E(G,p).shortage>=C.shortage.penaltyAt)A[0]=Math.max(1,A[0]-C.shortage.penalty);
    if(E(G,pd).shortage>=C.shortage.penaltyAt)D[0]=Math.max(1,D[0]-C.shortage.penalty);
    if(G.eco.ind[a.to].air.int<3)D[0]=Math.max(1,D[0]-1);
    D[0]=Math.min(6,D[0]+I.defBonus(G,a.to).v);A.sort((x,y)=>y-x);D.sort((x,y)=>y-x);
    const pairs=Math.min(A.length,D.length);let won=0,lost=0;for(let k=0;k<pairs;k++)A[k]>D[k]?won++:lost++;
    if(won===pairs&&pairs>=2)dmg=2;else if(won>lost)dmg=1}
   if(dmg){tgt.int=Math.max(0,before-dmg);if(tgt.int===0)delete G.eco.ind[a.to][a.cat]}
   if(!undefended)outcome=dmg===0?"down":(before-dmg<=0?"hit":"dmg");
   op={by:p,target:pd,to:a.to,cat:a.cat,A,D,aLoss:0,dmg,before,after:Math.max(0,before-dmg),destroyed:dmg>0&&before-dmg<=0,undefended,outcome,base:a.from!==undefined?a.from:I.droneBase(G,p,a.to),n:(G.eco.opSeq=(G.eco.opSeq||0)+1)};G.eco.lastOp=op;
   const nm=C.cats[a.cat].name;
   op.text=outcome==="hit"?`O drone eliminou a indústria ${nm}.`:outcome==="miss"?"O drone errou o alvo.":outcome==="down"?"O drone foi abatido pela defesa aérea.":`O drone danificou a indústria ${nm}.`;
   msg=`🛸 ${G.P[p].name}: ${op.text} (${G.P[pd].name}, ${T(a.to)})`+(undefended?"":` [${A}] x [${D}]`);break}
 }
 if(a.id){G.eco.done.push(a.id);if(G.eco.done.length>60)G.eco.done.shift()}
 return {ok:true,msg,op}};
// ---------- bots (mesmas regras dos humanos: usam I.check/I.apply) ----------
I.botNext=function(G,p,diff){const C=CFG,e=E(G,p),m=mine(G,p),c=I.calc(G,p),S=soldiers(G,p),M=MAPREF();
 const reserve=[100,150,200][diff]+c.upkeep,cnt=k=>I.items(G,p).filter(x=>x.c===k).length;
 const can=a=>I.check(G,Object.assign({p},a)).ok;
 const threat=t=>Math.max(0,...M[t].a.filter(j=>G.own[j]!==p).map(j=>G.tr[j]));
 const interior=m.slice().sort((a,b)=>threat(a)-threat(b)||a-b),border=m.slice().sort((a,b)=>threat(b)-threat(a)||a-b);
 const want=k=>{const t=interior.find(x=>!(G.eco.ind[x]||{})[k]);return t==null?null:{type:"build",t,cat:k}};
 const afford=(cost)=>e.money-cost>=reserve;
 if(diff>=1||e.money>reserve+300)for(const x of I.items(G,p))if(x.r.int<3&&["food","arms","commerce"].includes(x.c)){const cost=x.r.int===2?C.repair.damaged:C.repair.inactive;if(afford(cost)&&can({type:"repair",t:x.t,cat:x.c}))return {type:"repair",t:x.t,cat:x.c}}
 const foodNeed=Math.ceil((S+3)/C.recruit.perFood);
 if((e.shortage>0||e.food+c.prod.food<foodNeed+2)&&cnt("food")<3){const a=want("food");if(a&&e.money-C.cats.food.cost>=Math.min(reserve,100)&&can(a))return a}
 const plan=diff===0?[["food",1],["commerce",1],["arms",1]]:diff===1?[["food",2],["arms",1],["commerce",1],["steel",1],["arms",2],["military",1]]:[["food",2],["arms",2],["commerce",2],["military",1],["steel",1]];
 for(const [k,lim] of plan)if(cnt(k)<lim){const a=want(k);if(a&&afford(C.cats[k].cost)&&can(a))return a}
 if(diff>=1){const t=m.find(x=>(G.eco.ind[x]||{}).military&&!(G.eco.ind[x]||{}).air);if(t!=null&&afford(C.cats.air.cost)&&can({type:"build",t,cat:"air"}))return {type:"build",t,cat:"air"}}
 if(diff>=1&&(e.drones||0)<(diff===2?3:1)&&afford(C.drone.cost+100)&&can({type:"buydrone",n:1}))return {type:"buydrone",n:1};
 if(diff>=1){const t=border.find(x=>!G.eco.fort[x]&&threat(x)>=G.tr[x]);if(t!=null&&afford(C.fort.cost)&&can({type:"fort",t}))return {type:"fort",t}}
 if(diff===2)for(const x of I.items(G,p))if(["food","arms"].includes(x.c)&&x.r.lvl<2&&x.r.int===3&&afford(C.levels[2].up+100)&&can({type:"upgrade",t:x.t,cat:x.c}))return {type:"upgrade",t:x.t,cat:x.c};
 if(e.metal>8&&can({type:"sell",res:"metal",n:e.metal-4}))return {type:"sell",res:"metal",n:e.metal-4};
 if(e.shortage>0&&afford(C.market.food.buy*4)&&can({type:"buy",res:"food",n:4}))return {type:"buy",res:"food",n:4};
 let nMax=Math.min(e.arms,Math.floor((e.money-reserve)/C.recruit.money),diff===0?3:10);
 for(let n=nMax;n>=1;n--){const t=border[0]!=null?border[0]:m[0];if(can({type:"recruit",t,n}))return {type:"recruit",t,n}}
 return null};
I.botOp=function(G,p,diff){if(diff===0||G.round<2||G.phase!=="ataque")return null;const e=E(G,p),C=CFG;
 if((e.drones||0)<1||G.eco.ops.length>=C.drone.maxPerTurn)return null;
 const val={arms:5,food:4,commerce:4,steel:3,military:3};let best=null;
 G.own.forEach((o,to)=>{if(o===p||I.allied(G,p,o))return;for(const cat in (G.eco.ind[to]||{})){if(cat==="air")continue;const r=G.eco.ind[to][cat],un=!I.airOn(G,to);
   if(!un&&(diff<2||G.tr[to]>3))continue;      // médio só ataca alvos sem defesa aérea; difícil aceita risco moderado
   const sc=val[cat]*r.lvl*(un?3:1)-(un?0:G.tr[to]+I.defBonus(G,to).v);if((!best||sc>best.sc)&&I.check(G,{p,type:"drone",to,cat}).ok)best={sc,to,cat}}});
 return best?{type:"drone",to:best.to,cat:best.cat}:null};
if(typeof module!=="undefined"&&module.exports)module.exports=I;else globalThis.IND=I;
})();
