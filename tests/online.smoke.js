// Teste de fumaça do servidor (precisa de `npm run dev` rodando em localhost:8787): node tests/online.smoke.js [porta]
const WebSocket=require("ws"),assert=require("node:assert/strict");const PORT=process.argv[2]||8787,MAP=require("../public/js/map-data.js");
const room="IND"+Math.floor(Math.random()*900+100),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mk=(id,name)=>new Promise(r=>{const ws=new WebSocket(`ws://localhost:${PORT}/ws?room=${room}&id=${id}&name=${name}`);ws.msgs=[];ws.on("message",d=>ws.msgs.push(JSON.parse(d)));ws.on("open",()=>r(ws))});
const last=(w,t)=>[...w.msgs].reverse().find(m=>m.t===t),send=(w,o)=>w.send(JSON.stringify(o));
(async()=>{let ok=0;const T=(n,c)=>{assert.ok(c,n);ok++;console.log("  ✔",n)};
 const A=await mk("aaaaaaaa-ind","Ana"),B=await mk("bbbbbbbb-ind","Beto");await sleep(300);const pa=last(A,"lobby").you,pb=last(B,"lobby").you;
 send(A,{t:"cfg",bots:0,diff:1,speed:450,mode:"ind"});await sleep(150);
 const N=MAP.length,st={P:[{name:"Ana",human:true,seat:pa,alive:true,color:"#f00",cn:"V"},{name:"Beto",human:true,seat:pb,alive:true,color:"#00f",cn:"A"}],own:MAP.map((_,i)=>i%2),tr:MAP.map(()=>1),cur:0,round:2,phase:"reforço",allies:[],truces:[],neg:null,log:[],pool:0};
 for(let i=0;i<10;i++){st.tr[i*2]+=1}
 send(A,{t:"start",state:st});await sleep(300);let sa=last(A,"state").state,sb=last(B,"state").state;
 T("servidor criou a economia (modo ind) e processou a 1ª rodada",sa.mode==="ind"&&sa.eco.players[0].money===2000+18*100&&sa.eco.players[1].money===2000);
 T("Beto não vê o objetivo de Ana",!sb.P[0].obj&&!!sb.P[1].obj);
 const t=sa.own.findIndex(o=>o===0);
 send(B,{t:"eco",a:{type:"build",t,cat:"food",id:"b1"}});await sleep(200);T("jogador fora da vez é recusado",last(B,"err")&&/vez/.test(last(B,"err").msg));
 send(A,{t:"eco",a:{type:"build",t,cat:"food",id:"a1"}});await sleep(250);sb=last(B,"state").state;
 T("construção validada no servidor e sincronizada para todos",sb.eco.ind[t].food.lvl===1&&sb.eco.players[0].money===2000+1800-300);
 const m=sb.eco.players[0].money;send(A,{t:"eco",a:{type:"build",t,cat:"food",id:"a1"}});await sleep(200);T("ação duplicada é recusada",/duplicada|Já existe/.test(last(A,"err").msg));
 send(A,{t:"eco",a:{type:"build",t,cat:"food",id:"a2"}});await sleep(200);T("segunda indústria da mesma categoria é recusada",/Já existe/.test(last(A,"err").msg));
 send(A,{t:"eco",a:{type:"buy",res:"metal",n:-5,id:"a3"}});await sleep(150);T("quantidade negativa recusada",/inválida/.test(last(A,"err").msg));
 // cliente tenta forjar dinheiro no snapshot
 const forged=JSON.parse(JSON.stringify(last(A,"state").state));forged.eco.players[0].money=999999;send(A,{t:"state",state:forged});await sleep(200);
 send(A,{t:"eco",a:{type:"fort",t,id:"a4"}});await sleep(200);sb=last(B,"state").state;T("snapshot adulterado não altera a economia",sb.eco.players[0].money===m-300);
 // fim de turno: servidor processa a economia de Beto exatamente uma vez
 const turn=JSON.parse(JSON.stringify(sb));turn.cur=1;turn.phase="reforço";send(A,{t:"state",state:turn});await sleep(300);sb=last(B,"state").state;
 T("turno de Beto: arrecadação 18×100 aplicada uma vez",sb.eco.players[1].money===2000+1800&&sb.cur===1);
 send(A,{t:"state",state:turn});await sleep(200);sb=last(B,"state").state;T("reenvio do mesmo estado não duplica pagamentos",sb.eco.players[1].money===2000+1800);
 // sair do jogo: bot assume o lugar e a partida continua
 send(B,{t:"leave"});await sleep(300);const sl=last(A,"state").state;T("ao sair, um bot assume o jogador e a sala segue",sl.P[1].human===false&&/\(bot\)/.test(sl.P[1].name)&&!sl.P[1].pid);
 console.log(`\n${ok} verificações do servidor passaram`);process.exit(0)})().catch(e=>{console.error("✘",e.message);process.exit(1)});
