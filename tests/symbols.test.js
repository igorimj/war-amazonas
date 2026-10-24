// Balde de pintura do editor de símbolos: nunca pinta o fundo (node tests/symbols.test.js)
const assert=require("node:assert/strict");const {symFloodFill}=require("../public/js/symbols.js");let ok=0;
const T=(n,f)=>{try{f();ok++;console.log("  ✔",n)}catch(e){console.log("  ✘",n,"\n   ",e.message);process.exitCode=1}};
const W=64,H=64,mk=()=>new Uint8ClampedArray(W*H*4),put=(d,x,y,rgb=[255,255,255],a=255)=>{const i=(y*W+x)*4;d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];d[i+3]=a};
const rect=(d,x0,y0,x1,y1,gap)=>{for(let x=x0;x<=x1;x++){put(d,x,y0);put(d,x,y1)}for(let y=y0;y<=y1;y++){put(d,x0,y);put(d,x1,y)}if(gap)for(let y=y0+5;y<y0+9;y++)put(d,x0,y,[0,0,0],0)};
const px=(d,x,y)=>{const i=(y*W+x)*4;return [d[i],d[i+1],d[i+2],d[i+3]]};
console.log("Balde do editor de símbolos");
T("preenche o interior de uma forma fechada",()=>{const d=mk();rect(d,16,16,48,48);const r=symFloodFill(d,W,H,30,30,"#ef4444");assert.ok(r.ok);assert.deepEqual(px(d,30,30),[239,68,68,255]);assert.deepEqual(px(d,20,45),[239,68,68,255]);assert.ok(r.count>=31*31-5)});
T("o fundo (região transparente ligada à borda) NÃO pode ser pintado",()=>{const d=mk();rect(d,16,16,48,48);const r=symFloodFill(d,W,H,5,5,"#ef4444");assert.equal(r.ok,false);assert.match(r.reason,/fundo/);assert.equal(px(d,5,5)[3],0,"nada foi alterado");assert.equal(px(d,60,60)[3],0)});
T("tela totalmente em branco: clicar não pinta nada",()=>{const d=mk();const r=symFloodFill(d,W,H,32,32,"#ffffff");assert.equal(r.ok,false);assert.ok(d.every(v=>v===0))});
T("forma aberta (com abertura) vaza para o fundo e é recusada",()=>{const d=mk();rect(d,16,16,48,48,true);const r=symFloodFill(d,W,H,30,30,"#22c55e");assert.equal(r.ok,false);assert.equal(px(d,30,30)[3],0)});
T("forma gigante (≈ o próprio fundo) é recusada",()=>{const d=mk();rect(d,1,1,62,62);const r=symFloodFill(d,W,H,30,30,"#22c55e");assert.equal(r.ok,false)});
T("clicar no traço recolore só aquele traço (mesma cor)",()=>{const d=mk();rect(d,10,10,30,30);rect(d,40,40,55,55);const r=symFloodFill(d,W,H,10,20,"#facc15");assert.ok(r.ok);assert.deepEqual(px(d,10,20),[250,204,21,255]);assert.deepEqual(px(d,30,30),[250,204,21,255]);assert.deepEqual(px(d,40,45),[255,255,255,255],"outra forma intacta");assert.equal(px(d,20,20)[3],0,"interior continua transparente")});
T("fora da área é recusado",()=>{const d=mk();assert.equal(symFloodFill(d,W,H,-1,5,"#ffffff").ok,false);assert.equal(symFloodFill(d,W,H,5,99,"#ffffff").ok,false)});
T("bordas suaves (anti-aliasing) são cobertas pelo preenchimento",()=>{const d=mk();rect(d,16,16,48,48);for(let x=17;x<48;x++)put(d,x,17,[255,255,255],120);const r=symFloodFill(d,W,H,30,30,"#3b82f6");assert.ok(r.ok);assert.deepEqual(px(d,30,17),[59,130,246,255])});
console.log(`\n${ok} testes passaram`);
