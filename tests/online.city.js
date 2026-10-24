// Servidor no modo Controle da Cidade (precisa de `npm run dev`): node tests/online.city.js [porta]
const WebSocket=require("ws"),assert=require("node:assert/strict");const PORT=process.argv[2]||8787,MAP=require("../public/js/map-data.js");
const room="CTY"+Math.floor(Math.random()*900+100),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mk=(id,name)=>new Promise(r=>{const ws=new WebSocket(`ws://localhost:${PORT}/ws?room=${room}&id=${id}&name=${name}`);ws.msgs=[];ws.on("message",d=>ws.msgs.push(JSON.parse(d)));ws.on("open",()=>r(ws))});
const last=(w,t)=>[...w.msgs].reverse().find(m=>m.t===t),send=(w,o)=>w.send(JSON.stringify(o));
(async()=>{let ok=0;const T=(n,c)=>{assert.ok(c,n);ok++;console.log("  ✔",n)};
 const A=await mk("aaaaaaaa-cty","Ana"),B=await mk("bbbbbbbb-cty","Beto");await sleep(300);const pa=last(A,"lobby").you,pb=last(B,"lobby").you;
 send(A,{t:"cfg",bots:0,diff:1,speed:450,mode:"city"});await sleep(150);
 const N=MAP.length,st={P:[{name:"Ana",human:true,seat:pa,alive:true,color:"#f00",cn:"V"},{name:"Beto",human:true,seat:pb,alive:true,color:"#00f",cn:"A"}],own:MAP.map((_,i)=>i%2),tr:MAP.map(()=>1),cur:0,round:2,phase:"reforço",allies:[],truces:[],neg:null,log:[],pool:0};
 send(A,{t:"start",state:st});await sleep(350);let sa=last(A,"state").state,sb=last(B,"state").state;
 T("etapa de desenho: os dois humanos recebem o aviso e os bots/ações esperam",!!last(A,"draw")&&!!last(B,"draw")&&sa.drawing===true);
 send(A,{t:"city",a:{type:"hide",id:"d0"}});await sleep(150);T("ações são recusadas durante o desenho",/desenhos/.test(last(A,"err").msg));
 send(A,{t:"sym",data:"data:image/png;base64,iVBORw0KGgo="});await sleep(200);T("símbolo válido é guardado e enviado a todos",last(B,"syms").syms[sa.P.findIndex(p=>p.mine)]!==undefined||Object.keys(last(B,"syms").syms).length===1);
 send(B,{t:"sym",data:"javascript:alert(1)"});await sleep(300);const sy=last(A,"syms").syms;T("conteúdo inválido é recusado (sem símbolo, mas o jogador é liberado)",Object.keys(sy).length===1&&!!last(A,"drawdone")&&!!last(B,"drawdone"));
 sa=last(A,"state").state;sb=last(B,"state").state;T("ao terminar todos os desenhos o jogo libera as ações",sa.drawing===false);
 T("servidor sorteou 1 Estado e 1 facção e criou a cidade",sa.mode==="city"&&sa.city&&sa.P.filter(p=>p.role==="state").length===1&&sa.P.filter(p=>p.role==="faction").length===1);
 T("cada jogador recebe só o próprio objetivo (e o servidor o gerou)",sa.P[0].obj&&sa.P[0].obj.k==="city"&&!sa.P[1].obj&&sb.P[1].obj&&!sb.P[0].obj);
 const S=sa.city.stateIdx,F=1-S,W=sa.cur===0?A:B,O=W===A?B:A;const fv=(S===0?sb:sa);
 T("a facção não vê dinheiro/exposição do Estado nem o progresso de investigação",fv.city.p[S].inv===undefined&&fv.city.p[S].invDone===undefined);
 const sv=(S===0?sa:sb);T("o Estado só vê faixa de exposição, nunca o dinheiro da facção",sv.city.p[F].money===undefined&&["alta","média","baixa"].includes(sv.city.p[F].exposureBand));
 const t=sa.own.findIndex(o=>o===S);
 send(O,{t:"city",a:{type:"build",kind:"fac",t,k:"police",id:"c0"}});await sleep(200);T("jogador fora da vez é recusado",last(O,"err")&&/vez/.test(last(O,"err").msg));
 const s2=W===A?sa:sb;const stSide=sa.cur===S;
 if(stSide){send(W,{t:"city",a:{type:"build",kind:"fac",t,k:"police",id:"c1"}});await sleep(250);const v=last(O,"state").state;T("construção validada no servidor e sincronizada",v.city.fac[t]&&v.city.fac[t].police);
  send(W,{t:"city",a:{type:"build",kind:"fac",t,k:"police",id:"c1"}});await sleep(200);T("ação duplicada/segunda delegacia recusada",/duplicada|Já existe/.test(last(W,"err").msg));
  send(W,{t:"city",a:{type:"build",kind:"biz",t,k:"front",id:"c2"}});await sleep(200);T("Estado não constrói negócios de facção",/Estado só constrói|instalações/.test(last(W,"err").msg))}
 else{const ft=sa.own.findIndex((o,i)=>o===sa.cur&&!/^$/.test(String(i)));send(W,{t:"city",a:{type:"build",kind:"biz",t:ft,k:"front",id:"c1"}});await sleep(250);const v=last(O,"state").state;T("negócio da facção validado e sincronizado",v.city.biz[ft]&&v.city.biz[ft].front);
  send(W,{t:"city",a:{type:"build",kind:"fac",t:ft,k:"police",id:"c2"}});await sleep(200);T("facção não constrói instalações públicas",/Facções só administram|negócios/.test(last(W,"err").msg))}
 const forged=JSON.parse(JSON.stringify(last(W,"state")?last(W,"state").state:sa));forged.city.p[sa.cur].money=999999;send(W,{t:"state",state:forged});await sleep(200);
 const cur0=sa.cur;send(W,{t:"city",a:{type:"recruit",t:sa.own.findIndex(o=>o===cur0),n:1,id:"c9"}});await sleep(250);const after=last(O,"state").state;const seenBy=after.city.p[cur0].money!==undefined?after:last(W,"state").state;T("snapshot adulterado não altera o dinheiro (a facção só vê o próprio dinheiro)",seenBy.city.p[cur0].money<100000&&seenBy.city.p[cur0].money>=0);
 const turn=JSON.parse(JSON.stringify(after));turn.cur=1-cur0;turn.phase="reforço";send(W,{t:"state",state:turn});await sleep(300);const nx=last(O,"state").state;
 T("troca de turno: o servidor processa a economia do próximo jogador exatamente uma vez",nx.city.p[nx.cur].lastRound===nx.round&&nx.city.p[nx.cur].pa>0);
 const m1=nx.city.p[nx.cur].money;send(W,{t:"state",state:turn});await sleep(200);T("reenvio do mesmo estado não duplica a renda",last(O,"state").state.city.p[nx.cur].money===m1);
 const al=JSON.parse(JSON.stringify(last(O,"state").state));al.allies=[{m:[0,1],left:2}];al.cur=nx.cur;send(nx.cur===cur0?W:O,{t:"state",state:al});await sleep(250);T("o servidor remove aliança entre Estado e facção",!(last(A,"state").state.allies||[]).length);
 send(B,{t:"leave"});await sleep(300);const sl=last(A,"state").state;T("ao sair, um bot assume o papel",sl.P[1].human===false);
 console.log(`\n${ok} verificações do servidor (cidade) passaram`);process.exit(0)})().catch(e=>{console.error("✘",e.message);process.exit(1)});
