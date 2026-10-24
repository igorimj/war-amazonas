// ===== Símbolo da facção: editor de desenho (2 minutos) =====
// O fundo é FIXO na cor do jogador e nunca é pintado: o desenho vive numa camada transparente
// (só pincel, borracha, texto e símbolos — sem balde de tinta). O PNG transparente é exibido sobre a cor do território.
let SYMS={},SYM_SECONDS=120,symTimer=null;
const SYM_COLORS=["#ffffff","#000000","#facc15","#ef4444","#22c55e","#3b82f6","#a855f7","#fb923c","#22d3ee","#f472b6","#9ca3af","#7c2d12"];
const SYM_STAMPS=["★","☠","⚔","👑","🔱","🐍","🦅","🐺","🔥","⚡","✝","☯","♛","✪","❖","🦂","🌙","☀","♦","🛡"];
const symDist=(a,b)=>{const p=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16));const A=p(a),B=p(b);return Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2])};
const symTitle=i=>G.P[i].role==="state"?"Desenhe o emblema do Estado":"Desenhe o símbolo da sua facção";
// Balde: preenche SOMENTE formas fechadas desenhadas pelo jogador. Clicar no fundo (região transparente ligada à borda) é recusado.
function symFloodFill(d,w,h,x,y,hex){x=Math.floor(x);y=Math.floor(y);if(!(x>=0&&y>=0&&x<w&&y<h))return {ok:false,reason:"Fora da área de desenho."};
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),at=(px,py)=>(py*w+px)*4,a0=at(x,y),startOpaque=d[a0+3]>=40,sr=d[a0],sg=d[a0+1],sb=d[a0+2];
 const match=i=>startOpaque?(d[i+3]>=40&&Math.hypot(d[i]-sr,d[i+1]-sg,d[i+2]-sb)<=40):d[i+3]<40;
 const seen=new Uint8Array(w*h),stack=[y*w+x],region=[];seen[y*w+x]=1;let touches=false;
 while(stack.length){const p=stack.pop();region.push(p);const px=p%w,py=(p/w)|0;if(px===0||py===0||px===w-1||py===h-1)touches=true;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=px+dx,ny=py+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const q=ny*w+nx;if(seen[q]||!match(at(nx,ny)))continue;seen[q]=1;stack.push(q)}}
 if(!startOpaque&&touches)return {ok:false,reason:"O fundo não pode ser pintado. Feche uma forma e clique dentro dela."};
 if(!startOpaque&&region.length>w*h*.85)return {ok:false,reason:"Área grande demais: é o fundo."};
 for(const p of region){const i=p*4;d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];d[i+3]=255}
 if(!startOpaque)for(const p of region){const px=p%w,py=(p/w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=px+dx,ny=py+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const i=at(nx,ny);if(!seen[ny*w+nx]&&d[i+3]>0&&d[i+3]<255){d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];d[i+3]=255}}}   // cobre o serrilhado da borda
 return {ok:true,count:region.length}}
function symEditor(title,bg,onFinish){const ov=$("symstage");ov.style.display="flex";
 const allowed=SYM_COLORS.filter(c=>symDist(c,bg)>110);let color=allowed[0]||"#ffffff",tool="pen",size=8,tsize=44,stamp=SYM_STAMPS[0],text="",touched=false,undo=[],drawing=false,last=null,start=null,base=null,done=false,fillShape=false;
 ov.innerHTML=`<div class="symcard"><h2>${title}</h2><div class="symrow"><span id="symtime">${Math.floor(SYM_SECONDS/60)}:${String(SYM_SECONDS%60).padStart(2,"0")}</span><button id="symskip">Pular desenho</button><button class="go" id="symdone">Concluir</button></div>
 <div class="symbox" style="background:${bg}"><canvas id="symcv" width="256" height="256"></canvas></div>
 <div class="symtools"><button data-tool="pen" class="on">✏️ Pincel</button><button data-tool="erase">🧽 Borracha</button><button data-tool="arrow">➡️ Seta</button><button data-tool="circle">⭕ Círculo</button><button data-tool="bucket">🪣 Balde</button><button data-tool="text">🔤 Texto</button><button data-tool="stamp">⭐ Símbolo</button></div>
 <div class="symtools"><button id="symundo">↩ Desfazer</button><button id="symclear">🗑 Limpar</button></div>
 <div class="symopts" id="symopts"></div><div class="why bad" id="symmsg"></div>
 <div class="symsw">${SYM_COLORS.map(c=>`<button class="sw ${allowed.includes(c)?"":"off"}" data-col="${c}" style="background:${c}" ${allowed.includes(c)?"":"disabled"} title="${allowed.includes(c)?"":"Cor igual à do fundo: bloqueada"}"></button>`).join("")}</div>
 <p class="why">O fundo é fixo na cor da facção e não pode ser pintado. Use pincel, formas, textos e símbolos por cima; o balde só preenche formas fechadas.</p></div>`;
 const cv=$("symcv"),cx=cv.getContext("2d");cx.lineCap="round";cx.lineJoin="round";
 const msg=t=>{const m=$("symmsg");if(m)m.textContent=t||""};
 const pt=e=>{const r=cv.getBoundingClientRect(),k=256/(r.width||256);return [(e.clientX-r.left)*k,(e.clientY-r.top)*k]};
 const snap=()=>{try{undo.push(cx.getImageData(0,0,256,256));if(undo.length>15)undo.shift()}catch(e){}};
 const opts=()=>{$("symopts").innerHTML=tool==="pen"||tool==="erase"||tool==="arrow"?`Espessura <input id="symsz" type="range" min="2" max="40" value="${size}">`:tool==="circle"?`Espessura <input id="symsz" type="range" min="2" max="40" value="${size}"> <label><input id="symfill" type="checkbox" ${fillShape?"checked":""}> Preencher círculo</label> <span class="why">Arraste para desenhar</span>`:tool==="bucket"?`<span class="why">Clique <b>dentro de uma forma fechada</b> para preencher. O fundo não pode ser pintado.</span>`:tool==="text"?`Texto <input id="symtxt" maxlength="12" value="${text}" placeholder="ex.: CV"> Tamanho <input id="symtsz" type="range" min="16" max="90" value="${tsize}"> <span class="why">Toque no desenho para colocar</span>`:`<div class="symgrid">${SYM_STAMPS.map(s=>`<button data-st="${s}" class="${s===stamp?"on":""}">${s}</button>`).join("")}</div> Tamanho <input id="symtsz" type="range" min="24" max="120" value="${tsize}"> <span class="why">Toque no desenho para carimbar</span>`;
  if($("symsz"))$("symsz").oninput=e=>size=+e.target.value;if($("symtxt"))$("symtxt").oninput=e=>text=e.target.value;if($("symtsz"))$("symtsz").oninput=e=>tsize=+e.target.value;if($("symfill"))$("symfill").onchange=e=>fillShape=e.target.checked;
  ov.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>{stamp=b.dataset.st;opts()})};
 opts();
 ov.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>{tool=b.dataset.tool;msg("");ov.querySelectorAll("[data-tool]").forEach(x=>x.classList.toggle("on",x===b));opts()});
 ov.querySelectorAll("[data-col]").forEach(b=>b.onclick=()=>{if(b.disabled)return;color=b.dataset.col;ov.querySelectorAll("[data-col]").forEach(x=>x.classList.toggle("sel",x===b))});
 const first=ov.querySelector("[data-col]:not(.off)");if(first)first.classList.add("sel");
 const place=(x,y,str,sz)=>{snap();cx.globalCompositeOperation="source-over";cx.fillStyle=color;cx.font=`bold ${sz}px sans-serif`;cx.textAlign="center";cx.textBaseline="middle";cx.fillText(str,x,y);touched=true};
 const shape=(x0,y0,x1,y1)=>{cx.globalCompositeOperation="source-over";cx.strokeStyle=color;cx.fillStyle=color;cx.lineWidth=size;
  if(tool==="arrow"){cx.beginPath();cx.moveTo(x0,y0);cx.lineTo(x1,y1);cx.stroke();const a=Math.atan2(y1-y0,x1-x0),L=Math.max(14,size*3);cx.beginPath();cx.moveTo(x1,y1);cx.lineTo(x1-L*Math.cos(a-.45),y1-L*Math.sin(a-.45));cx.moveTo(x1,y1);cx.lineTo(x1-L*Math.cos(a+.45),y1-L*Math.sin(a+.45));cx.stroke()}
  else{cx.beginPath();cx.ellipse((x0+x1)/2,(y0+y1)/2,Math.max(1,Math.abs(x1-x0)/2),Math.max(1,Math.abs(y1-y0)/2),0,0,Math.PI*2);if(fillShape)cx.fill();cx.stroke()}};
 cv.addEventListener("pointerdown",e=>{const [x,y]=pt(e);msg("");
  if(tool==="text"){if(text.trim())place(x,y,text.trim(),tsize);return}if(tool==="stamp"){place(x,y,stamp,tsize);return}
  if(tool==="bucket"){try{const img=cx.getImageData(0,0,256,256),r=symFloodFill(img.data,256,256,x,y,color);if(!r.ok){msg(r.reason);return}snap();cx.putImageData(img,0,0);touched=true}catch(err){msg("Não foi possível preencher.")}return}
  if(tool==="arrow"||tool==="circle"){try{base=cx.getImageData(0,0,256,256)}catch(err){base=null}start=[x,y];drawing=true;try{cv.setPointerCapture(e.pointerId)}catch(_){}return}
  snap();drawing=true;last=[x,y];cx.globalCompositeOperation=tool==="erase"?"destination-out":"source-over";cx.strokeStyle=color;cx.fillStyle=color;cx.lineWidth=size;cx.beginPath();cx.arc(x,y,size/2,0,7);cx.fill();touched=tool==="pen"?true:touched;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
 cv.addEventListener("pointermove",e=>{if(!drawing)return;const [x,y]=pt(e);
  if(start){if(base)cx.putImageData(base,0,0);shape(start[0],start[1],x,y);return}
  cx.beginPath();cx.moveTo(last[0],last[1]);cx.lineTo(x,y);cx.stroke();last=[x,y]});
 const up=e=>{if(drawing&&start){const [x,y]=e&&e.clientX!==undefined?pt(e):start;if(base)cx.putImageData(base,0,0);if(Math.hypot(x-start[0],y-start[1])>3){if(base){undo.push(base);if(undo.length>15)undo.shift()}shape(start[0],start[1],x,y);touched=true}start=null;base=null}drawing=false;cx.globalCompositeOperation="source-over"};
 cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",()=>{if(base)cx.putImageData(base,0,0);start=null;base=null;drawing=false});
 $("symundo").onclick=()=>{const u=undo.pop();if(u)cx.putImageData(u,0,0)};
 $("symclear").onclick=()=>{snap();cx.clearRect(0,0,256,256);touched=false};
 const finish=skip=>{if(done)return;done=true;clearInterval(symTimer);const data=(!skip&&touched)?cv.toDataURL("image/png"):null;ov.innerHTML="";onFinish(data)};
 $("symdone").onclick=()=>finish(false);$("symskip").onclick=()=>finish(true);
 const end=Date.now()+SYM_SECONDS*1000;clearInterval(symTimer);
 symTimer=setInterval(()=>{const left=Math.max(0,Math.ceil((end-Date.now())/1000));const el=$("symtime");if(el){el.textContent=Math.floor(left/60)+":"+String(left%60).padStart(2,"0");el.classList.toggle("low",left<=15)}if(left<=0)finish(false)},250)}
// Hot-seat (vários humanos no mesmo aparelho): um de cada vez, 2 minutos cada
function symStageSeq(done){const hs=G.P.map((p,i)=>p.human?i:-1).filter(i=>i>=0);let k=0;const ov=$("symstage");
 const next=()=>{if(k>=hs.length){ov.style.display="none";ov.innerHTML="";return done()}const i=hs[k++],p=G.P[i];ov.style.display="flex";
  ov.innerHTML=`<div class="symcard"><h2 style="color:${p.color}">${p.name}</h2><p>${symTitle(i)}. Passe o aparelho para <b>${p.name}</b>: você terá ${Math.round(SYM_SECONDS/60)} minutos.</p><button class="go" id="symgo">Começar a desenhar</button> <button id="symno">Pular desenho</button></div>`;
  $("symgo").onclick=()=>symEditor(symTitle(i),p.color,d=>{if(d)SYMS[i]=d;next()});$("symno").onclick=next};next()}
// Online: cada jogador desenha o seu ao mesmo tempo
function symStageNet(){const me=G.P.findIndex(p=>p.mine);const ov=$("symstage");if(me<0||!G.P[me].human)return;
 symEditor(symTitle(me),G.P[me].color,d=>{NET.send({t:"sym",data:d});ov.style.display="flex";ov.innerHTML=`<div class="symcard"><h2>Símbolo enviado</h2><p>Aguardando os outros jogadores terminarem…</p></div>`})}

if(typeof module!=="undefined"&&module.exports)module.exports={symFloodFill,symDist};
