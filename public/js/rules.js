// ===== Regras (botão "📖 Regras"): texto de como jogar, gerado a partir das configurações atuais =====
const fmn=n=>Number(n).toLocaleString("pt-BR");
function rulesInd(){const C=IND.CFG,c=C.cats,L=C.levels,m=C.market;
 return `<h2>🏭 Guerra Industrial</h2>
<p>É o WAR (conquista de territórios com dados) com <b>economia</b>: você administra dinheiro, alimentos, armas, metal e soldados. Não existe reforço grátis — soldados são <b>recrutados</b>. O objetivo secreto funciona como no WAR.</p>
<h3>Início</h3><p>💰 ${fmn(C.start.money)} · 🌾 ${C.start.food} · 🔫 ${C.start.arms} · ⚙ ${C.start.metal} · 🪖 ${C.start.soldiers} soldados (mínimo de 1 por território, igual para todos).</p>
<h3>A rodada</h3><ol>
<li><b>Arrecadação:</b> +${C.territoryIncome} por território e +${c.commerce.income} por Indústria Comercial ativa.</li>
<li><b>Manutenção:</b> cada indústria e fortificação cobra manutenção. Sem dinheiro, a estrutura fica <b>inativa</b> naquela rodada (o saldo nunca fica negativo).</li>
<li><b>Produção:</b> indústrias ativas produzem recursos.</li>
<li><b>Abastecimento:</b> o exército consome <b>teto(soldados ÷ ${C.recruit.perFood})</b> alimentos.</li>
<li><b>Administração:</b> construa, melhore, repare, compre/venda no mercado e recrute.</li>
<li><b>Ataque</b> (a partir da <b>rodada 2</b>) e <b>movimentação</b>, como no WAR. A rodada 1 é de preparação.</li></ol>
<h3>Indústrias (máx. 1 de cada tipo por território)</h3><table class="et">
<tr><th>Tipo</th><th>Custo</th><th>Manut.</th><th>Efeito</th></tr>
<tr><td>🌾 Alimentícia</td><td>${c.food.cost}</td><td>${c.food.upkeep}</td><td>+${c.food.prod.food} alimento/rodada</td></tr>
<tr><td>🔫 Fábrica de armas</td><td>${c.arms.cost}</td><td>${c.arms.upkeep}</td><td>+${c.arms.prod.arms} armas/rodada</td></tr>
<tr><td>⚙️ Siderúrgica</td><td>${c.steel.cost}</td><td>${c.steel.upkeep}</td><td>+${c.steel.prod.metal} metal/rodada</td></tr>
<tr><td>🏪 Comercial</td><td>${c.commerce.cost}</td><td>${c.commerce.upkeep}</td><td>+${c.commerce.income} dinheiro/rodada</td></tr>
<tr><td>🛡️ Militar</td><td>${c.military.cost}</td><td>${c.military.upkeep}</td><td>bônus de defesa no território e base dos drones</td></tr>
<tr><td>📡 Defesa Aérea</td><td>${c.air.cost}</td><td>${c.air.upkeep}</td><td>exige Militar no mesmo território; protege contra drones</td></tr></table>
<p><b>Níveis:</b> nível 2 custa ${L[2].up} (produção +50%, manutenção +25%); nível 3 custa ${L[3].up} (produção ×2, manutenção +50%).
<b>Integridade</b> (3 pontos): intacta = produção total · danificada = 50% · inativa = nada · destruída = precisa construir de novo. Reparar: ${C.repair.damaged} (danificada) ou ${C.repair.inactive} (inativa).</p>
<h3>Recrutamento e escassez</h3>
<p>Cada soldado custa <b>${C.recruit.money} 💰 + ${C.recruit.arms} 🔫</b> e só é permitido se o exército resultante puder ser alimentado. Sem alimentos: recrutamento bloqueado; após <b>${C.shortage.penaltyAt} rodadas</b> seguidas de escassez, −${C.shortage.penalty} no dado mais alto em combate; após <b>${C.shortage.desertAt}</b>, ${Math.round(C.shortage.desertPct*100)}% das tropas desertam por rodada. Voltando a ter alimento, tudo se normaliza.</p>
<h3>Mercado</h3><p>🌾 compra ${m.food.buy} / venda ${m.food.sell} · 🔫 compra ${m.arms.buy} / venda ${m.arms.sell} · ⚙ compra ${m.metal.buy} / venda ${m.metal.sell}.</p>
<h3>Fortificação</h3><p>Custa ${C.fort.cost} (manutenção ${C.fort.upkeep}) e dá bônus defensivo; é desenhada como uma <b>muralha na cor do dono</b>. Ela é <b>perdida quando o território é invadido</b>. Bônus defensivos somam no máximo +${C.maxDefenseBonus} no dado mais alto do defensor.</p>
<h3>Ataque a indústrias: drones</h3><ul>
<li>Só <b>drones</b> atacam indústrias, em <b>qualquer território</b> do mapa (a partir da rodada 2, fase de ataque, até ${C.drone.maxPerTurn} por turno).</li>
<li>Cada drone custa <b>${C.drone.cost}</b> e exige <b>Fábrica de Armas + Indústria Militar</b> ativas. Ele parte da base de lançamento (uma Indústria Militar sua — escolha no painel do território inimigo).</li>
<li><b>Sem Defesa Aérea</b> no alvo: sem dados — <b>${Math.round(C.drone.hitChance*100)}%</b> de eliminar a indústria, ${100-Math.round(C.drone.hitChance*100)}% de errar (você só perde o drone).</li>
<li><b>Com Defesa Aérea:</b> decidido nos dados (empate favorece a defesa). Pode ser abatido, danificar ou destruir.</li></ul>
<h3>Como usar a interface</h3><ul><li><b>💰 Economia</b>: abas Visão geral, Indústrias, Recursos, Mercado, Exército e Relatório.</li><li>Toque num território para ver e usar suas opções; botões cinza mostram o motivo ao tocar.</li><li>Para atacar indústrias, ligue <b>🛸 Drone</b> na fase de ataque e toque no território inimigo.</li><li>Zoom e arrastar o mapa nos botões + − ⌂.</li></ul>`}
function rulesCity(){const C=CITY.CFG,S=C.state,F=C.faction,f=C.fac,b=C.biz,a=C.act;
 return `<h2>🏙 Controle da Cidade — Estado × Facções</h2>
<p>Um jogador comanda o <b>Estado</b> (sorteado) e os demais lideram <b>facções independentes</b>. O Estado quer recuperar a cidade e enfraquecer a economia ilegal; as facções querem influência, dinheiro e territórios. Os combates usam os dados do WAR. Tudo é abstrato (jogo de gestão).</p>
<h3>Recursos</h3><ul>
<li><b>🏛 Estado:</b> 💰 orçamento ${fmn(S.budget)} · ⚖ legitimidade ${S.legit} · 🏙 estabilidade · ⚡ ${C.pa.state} pontos de ação (PA) por rodada · ${S.extraUnits} unidades extras.</li>
<li><b>🏴 Facção:</b> 💰 dinheiro clandestino ${fmn(F.money)} · 👁 exposição (0–100) · ⚡ ${C.pa.faction} PA · uma <b>vantagem</b> sorteada (Economia +10% de renda, Mobilidade, Defesa ou Influência).</li></ul>
<h3>A rodada</h3><ol><li><b>Receita e manutenção</b> (1× por rodada).</li><li><b>Gestão:</b> construir, investir, recrutar, corromper, reduzir exposição.</li><li><b>Confrontos</b> (a partir da <b>rodada 2</b>): ataques do WAR e ações especiais.</li><li><b>Movimentação.</b></li><li><b>Consequências</b> no fim da rodada: influência, estabilidade, apoio, legitimidade, investigações e um <b>evento</b> (a partir da rodada 3).</li></ol>
<h3>Mapa</h3><p>Cada território tem um tipo: 🏠 residencial, 🏬 comercial, 🏭 industrial, 🏚️ periferia, ⛏️ <b>garimpo</b> e ⚓ <b>porto</b> (ícone de âncora no extremo sul do território). Porto e garimpo só rendem com o negócio correspondente.</p>
<h3>Estado — instalações</h3><table class="et"><tr><th>Instalação</th><th>Custo</th><th>Manut.</th><th>Função</th></tr>
<tr><td>🚓 Delegacia</td><td>${f.police.cost}</td><td>${f.police.up}</td><td>reduz influência da facção, reforça a defesa e acelera investigações</td></tr>
<tr><td>⚖️ Centro de Justiça</td><td>${f.justice.cost}</td><td>${f.justice.up}</td><td>permite apreender ativos</td></tr>
<tr><td>🏥 Hospital</td><td>${f.health.cost}</td><td>${f.health.up}</td><td>recupera estabilidade e reduz danos civis</td></tr>
<tr><td>🏫 Escola/Centro comunitário</td><td>${f.school.cost}</td><td>${f.school.up}</td><td>aumenta o apoio popular</td></tr>
<tr><td>🛃 Alfândega</td><td>${f.customs.cost}</td><td>${f.customs.up}</td><td>permite fiscalizar portos</td></tr></table>
<p><b>Ações do Estado</b> (1 PA cada, 1× por alvo por rodada): 🚔 operação policial (dados; reduz tropas da facção), 🏴 recuperação territorial, ⚖️ apreensão de ativos (exige investigação concluída + Centro de Justiça), 🛃 fiscalização portuária (exige Alfândega), 🤝 investimento social, 🧾 combate à corrupção, 🛡 proteção de testemunhas, 🏦 reserva de emergência e 🚁 Força Tática (move até ${S.tf.max} unidades entre quaisquer territórios seus).
Recrutar: ${S.unitCost} por unidade. O limite por rodada <b>não é fixo</b>: cresce com o número de territórios e com os <b>investimentos do Estado</b> em fiscalização, proteção de testemunhas, apreensão e investigação concluída.</p>
<h3>Facções — negócios</h3><table class="et"><tr><th>Negócio</th><th>Custo</th><th>Manut.</th><th>Renda</th></tr>
<tr><td>⚓ Porto (só em porto)</td><td>${b.port.cost}</td><td>${b.port.up}</td><td>${b.port.inc}</td></tr>
<tr><td>⛏️ Garimpo (só em garimpo)</td><td>${b.gar.cost}</td><td>${b.gar.up}</td><td>${b.gar.inc} (reduz apoio popular)</td></tr>
<tr><td>🏪 Fachada (em qualquer território seu)</td><td>${b.front.cost}</td><td>${b.front.up}</td><td>${b.front.inc} (cai pela metade com exposição alta)</td></tr></table>
<p><b>Ações das facções:</b> 🕳 corromper instalação pública (${Math.round(F.corrChance*100)}% de sucesso; desvia renda; falhar aumenta a exposição), 🫥 reduzir exposição (${F.hideCost}), 📣 ampliar influência (${F.inflCost}) e recrutar (${F.unitCost} por unidade). O limite por rodada <b>não é fixo</b>: quanto mais <b>territórios, negócios e influência</b>, mais soldados a facção consegue recrutar.</p>
<h3>Influência, estabilidade e legitimidade</h3><ul>
<li><b>Influência</b> (0–100 por lado em cada território) aumenta a renda da facção, dá +1 na defesa quando ≥ 70 e vale pontos. Não troca o dono: o dono só muda por ataque.</li>
<li><b>Estabilidade</b> reduz a arrecadação do Estado quando baixa.</li>
<li><b>Legitimidade</b> do Estado cai com danos civis e serviços sem manutenção e reduz a arrecadação.</li>
<li><b>Exposição</b> alta (≥ ${C.exposureHigh}) torna a facção mais fácil de investigar e dá −1 ao atacante contra o Estado.</li></ul>
<h3>Investigação</h3><p>O Estado acumula pontos contra uma facção (por rodada, mais com delegacias); com ${a.invNeed} a investigação é <b>concluída</b> por ${a.invHold} rodadas e libera apreensão (${Math.round(a.seize*100)}% do dinheiro). A facção <b>não vê</b> o progresso; o Estado só vê a faixa de exposição.</p>
<h3>Como vencer</h3><p>Existe <b>um único objetivo</b>: <b>dominar todos os territórios da cidade</b>. Vence quem controlar tudo — o Estado ou uma facção. Não há limite de rodadas, pontuação, metas de patrimônio nem objetivos secretos. Se uma facção vencer, a cidade vira um <b>Narco-Estado</b>.</p>
<h3>Símbolo da facção</h3><p>Antes da partida, cada jogador humano tem <b>2 minutos</b> para desenhar o símbolo da sua facção (ou o emblema do Estado) com pincel, borracha, <b>setas, círculos, balde de pintura</b>, textos e símbolos. O <b>fundo é fixo na cor do jogador e não pode ser pintado</b> (o balde só preenche formas fechadas que você desenhar). O desenho vira o plano de fundo dos seus territórios e, ao conquistar um território, ele passa a exibir o símbolo de quem conquistou. Você pode <b>pular</b> o desenho (o território fica só com a cor) e, se o tempo acabar, o jogo segue normalmente.</p>
<h3>Negociação, trégua e alianças</h3><ul><li><b>Estado × facção:</b> só é possível negociar <b>trégua momentânea de ${CITY.TRUCE_ROUNDS} rodadas</b> (nada mais). Se o outro lado aceitar, <b>nenhum dos dois pode atacar o outro</b> (ataques do WAR, operação policial e recuperação territorial) enquanto a trégua durar. Facção não forma aliança com o Estado.</li><li><b>Entre facções:</b> valem as opções do WAR (ceder território por soldados, troca de territórios e aliança temporária).</li><li><b>Medidas Desesperadas</b> só existem entre facções (o Estado não as usa).</li></ul>
<h3>Como usar a interface</h3><ul><li><b>🏙 Cidade</b>: abas Visão geral, Territórios, Instalações/Negócios, Ações, Investigações/Exposição, Eventos e Relatório.</li><li>Toque num território para ver influência, apoio, estabilidade e as ações disponíveis; botões cinza mostram o motivo ao tocar.</li></ul>`}
function rulesOpen(){if(!G||(G.mode!=="ind"&&G.mode!=="city"))return;const el=$("rules");el.innerHTML=`<div class="rhead"><b>📖 Regras</b><button id="rclose">✕ Fechar</button></div><div class="rbody">${G.mode==="ind"?rulesInd():rulesCity()}</div>`;el.style.display="block";el.scrollTop=0;$("rclose").onclick=()=>{el.style.display="none"}}
$("rulesb").onclick=()=>{const el=$("rules");if(el.style.display==="block")el.style.display="none";else rulesOpen()};
