# WAR: Amazonas — versão online (Cloudflare)

Jogo de estratégia territorial inspirado no WAR, com mapa do Amazonas, bots, objetivos secretos,
missões especiais, negociação privada e alianças. Roda local (hot-seat) ou **online** com salas.

## Estrutura
```
public/               front-end estático
  index.html
  css/style.css
  js/map-data.js      polígonos e adjacências dos 36 territórios (editável)
  js/game.js          regras, bots, interface
  js/net.js           cliente multiplayer (WebSocket)
  assets/mapa.jpg     imagem de fundo
src/worker.js         Worker + Durable Object "Room" (uma sala = um objeto)
wrangler.toml         configuração do Cloudflare
```

## Rodar localmente
```bash
npm install
npm run dev          # http://localhost:8787
```
Abra duas abas, clique em **Jogar online**, crie uma sala numa e entre pelo código/link na outra.

## Publicar no Cloudflare (Workers + Durable Objects)
> Use **Workers** (não Pages): Durable Objects não são suportados em Pages Functions.

1. `npx wrangler login`
2. `npm run deploy` → devolve a URL `https://war-amazonas.<sua-conta>.workers.dev`
   (Durable Objects com SQLite funcionam no plano gratuito.)

## Git + deploy automático
```bash
git init && git add . && git commit -m "WAR Amazonas online"
git branch -M main
git remote add origin git@github.com:SEU_USUARIO/war-amazonas.git
git push -u origin main
```
No painel: **Workers & Pages → Create → Import a repository** (Workers Builds), escolha o repositório;
comando de deploy: `npx wrangler deploy`. Cada `git push` publica.

## Como funciona o multiplayer
- O 1º a entrar é o **anfitrião**: escolhe bots, dificuldade e velocidade e inicia.
- Quem está na vez executa as regras no próprio navegador e envia o estado; o anfitrião roda os bots.
- O servidor (Durable Object) **valida quem pode jogar** (só o jogador da vez / anfitrião nos bots),
  **sorteia e guarda os objetivos secretos**, confere a vitória e entrega a cada jogador só o que ele pode ver
  (objetivo próprio; chat de negociação só para os dois envolvidos — os outros veem "X negociando…").
- Quem cair da conexão volta sozinho (o id fica no `localStorage`) e retoma a partida.
- O estado da sala é persistido no Durable Object.

## Limitações conhecidas
- As regras rodam no cliente do jogador da vez: o servidor impede jogar fora da vez e esconde segredos,
  mas **não** reexecuta os combates. Para torneios competitivos, o próximo passo é mover as regras
  (`game.js`) para o servidor.
- Se o anfitrião fechar a aba durante o turno de um bot, o turno só continua quando ele reconectar.
- Sem moderação/rate limit; salas com no máximo 6 jogadores.

---
# Modo Guerra Industrial

Novo modo dentro do mesmo jogo (o WAR tradicional continua igual). Escolha em **Modo** na tela inicial
(ou no lobby online, pelo anfitrião).

## Como iniciar
1. Tela inicial → **Modo: Guerra Industrial — Economia, Indústrias e Conquista**.
2. Escolha jogadores/bots e inicie. No online, o anfitrião escolhe o modo no lobby.
3. Botão **💰 Economia** (abas: Visão geral, Indústrias, Recursos, Mercado, Exército, Relatório).
   Clique num território para construir, melhorar, reparar, demolir, fortificar ou recrutar.
   Na fase de ataque, ligue **🛸 Drone** e toque no território inimigo para atacar uma indústria com drone (qualquer lugar do mapa).

## Rodada
Arrecadação (100/território + comércio) → manutenção (quem não for paga fica **inativa** na rodada) → produção →
consumo de alimentos (`teto(soldados/5)`) → **administração** (construir, mercado, recrutar) → ataque → movimentação.
A rodada 1 é de preparação (sem ataques). O reforço grátis do WAR é substituído por **recrutamento** (50 💰 + 1 🔫).

## Arquivos do modo
| Arquivo | Papel |
|---|---|
| `public/js/industrial.js` | regras puras (economia, indústrias, estoques, recrutamento, abastecimento, operações, reparos, bots econômicos). Usado no navegador, no servidor e nos testes |
| `public/js/industrial-ui.js` | painel econômico, painel do território, ações e bots (interface) |
| `public/js/game.js` | ganchos mínimos (modo, turno, combate, bots) |
| `src/worker.js` | valida as ações econômicas no servidor e processa a economia a cada turno |
| `tests/` | testes automáticos |
| `scripts/build-single.js` | gera um HTML único offline (sem multiplayer) |

Todos os valores estão em `IND.CFG` (início do `industrial.js`): custos, produção, manutenção, níveis, mercado, escassez.

## Testes
```bash
npm install
npm test                 # regras industrial (28) + cidade (24) + balde (8) + integração/jsdom (19)
npm run dev              # em outro terminal:
npm run test:online      # servidor industrial (11) + cidade (12) + dois clientes ponta a ponta (7)
```

## Decisões e limitações
- **Soldados** = tropas nos territórios. Cada território exige ≥1, então o inicial é `max(10, nº de territórios)`, igual para todos.
- **Metal** só tem uso em `metalCost` (0 por padrão, configurável) e na venda — a especificação não define quantidades.
- Estruturas **inativas por dano** (integridade 1) não pagam manutenção; **danificadas** pagam e produzem 50%.
- **Ataque a indústrias só com drones** (qualquer território do mapa). Comprar drone: 150 💰 cada; exige Fábrica de Armas **e** Indústria Militar ativas. Cada ataque consome 1 drone (máx. 3 por turno).
- **Defesa Aérea**: 200 💰, só pode ser construída num território que já tenha Indústria Militar ativa (sem a base militar ela deixa de funcionar); não tem melhorias; manutenção 0 (configurável em `IND.CFG.cats.air.upkeep`).
  Sem defesa aérea no território-alvo **não há dados**: 95% de chance de o drone eliminar a indústria ("O drone eliminou a indústria X") e 5% de errar ("O drone errou o alvo": nada acontece com a indústria e o atacante só perde o drone; `IND.CFG.drone.hitChance`). O drone voa da Indústria Militar mais próxima até a indústria-alvo, com explosão; com defesa aérea o ataque é decidido nos dados (3 dados do drone × dados do defensor, empate favorece a defesa; todos os pares ganhos = −2 de integridade, maioria = −1).
- Valores iniciais: dinheiro **2000**; fortificação **300** (manutenção 20). A muralha de um território fortificado é desenhada na **cor do jogador** com contorno branco, para se distinguir de um território sem fortificação.
- O drone parte da Indústria Militar escolhida como **base de lançamento** (seletor no painel do território inimigo; padrão: a mais próxima) e voa até a indústria-alvo.
- **Invasão desfaz a fortificação** do território conquistado (as indústrias continuam e passam ao conquistador).
- Territórios pequenos: o tamanho dos ícones é calculado pelo raio do território; nos minúsculos o código (T#) é ocultado para caber as peças.
- Bônus defensivos (fortificação +1, militar +1/+2) limitam-se a **+2 no dado mais alto** do defensor.
- Online: dinheiro, estoques, indústrias e operações são decididos **pelo servidor**; os dados do combate territorial e as
  posições das tropas continuam vindo do cliente da vez (como no WAR online anterior).
- Salvar/carregar: o estado é JSON puro (testado), mas não há botão de salvar offline; online, a sala persiste no Durable Object.


---
# Modo Controle da Cidade (Estado × Facções)

Terceiro modo, independente do WAR e da Guerra Industrial (`G.mode = "city"`). Escolha em **Modo → Controle da Cidade — Estado × Facções**
(ou no lobby online). **O papel de Estado é sorteado** entre os participantes (no online, pelo servidor); os demais são facções (2 a 6 jogadores no total).
Conteúdo ilegal é **abstrato** (renda clandestina, cargas fictícias): só mecânicas de jogo.

## Arquivos
| Arquivo | Papel |
|---|---|
| `public/js/city.js` | regras puras (papéis, economia, instalações, negócios, influência, estabilidade, legitimidade, investigação, corrupção, ações, eventos, vitória, bots, filtro de informação). Usado no navegador, no servidor e nos testes |
| `public/js/city-regions.js` | tipo de região de cada território (editável; critérios no cabeçalho do arquivo) |
| `public/js/city-ui.js` | painel por papel (7 abas), painel do território, peças no mapa, bots |
| `src/worker.js` | sorteio de papéis, objetivos secretos, validação das ações, processamento de rodada e filtro de informação por jogador |
| `tests/city.test.js`, `tests/online.city.js` | testes |

Todos os valores estão em `CITY.CFG` (início do `city.js`).

## Regras implementadas
- **Mapa:** tabela fixa em `city-regions.js` (o mapa e as adjacências não mudam). **Portos nos territórios T36, T12, T19, T25, T31, T34, T35 e T7** (no máximo um por território), cada um com um **ícone próprio (âncora)** desenhado no extremo sul do território; 2 garimpos (T10 e T11) e os demais tipos (residencial, comercial, industrial, periferia).
- **Alianças:** facções **não podem** se aliar ao Estado (bloqueado na interface, na lógica e no servidor); entre facções a aliança do WAR continua valendo.
- **Estado:** orçamento 3000, legitimidade 70, 4 pontos de ação (PA), ~38% dos territórios + 10 unidades extras. Instalações: Delegacia 300/40, Centro de Justiça 400/50, Hospital 350/45, Escola 250/30, Alfândega 500/60 (valores de manutenção não dados no texto foram sugeridos), com nível, integridade, reparo e corrupção.
  Ações: operação policial (dados), recuperação territorial, apreensão (exige investigação concluída + Centro de Justiça), investimento social, fiscalização portuária (exige Alfândega), combate à corrupção, proteção de testemunhas, reserva de emergência e Força Tática (desloca até 3 unidades entre territórios seus).
- **Facções:** dinheiro 800, 3 PA, exposição 0–100, vantagem sorteada (Economia, Mobilidade, Defesa, Influência). Negócios: Porto (só em porto), Garimpo (só em garimpo; reduz apoio popular) e Fachada; corrupção de instalações públicas (60% de sucesso, +exposição), reduzir exposição, ampliar influência, recrutar.
- **Rodada:** gestão (construir/investir/recrutar) → ataque (WAR + ações especiais) → movimentação; rodada 1 sem ataques; fim de rodada atualiza influência, estabilidade, legitimidade, investigações e sorteia um **evento** (a partir da rodada 3).
- **Combate:** dados do WAR; modificadores limitados a **+2** na defesa (delegacia, influência alta, vantagem Defesa); exposição alta penaliza o atacante em −1. Conquistar um território pelo Estado apreende os negócios; instalações capturadas por facções ficam inativas até o Estado retomar.
- **Vitória (única):** **dominar todos os territórios da cidade** — vale para o Estado e para as facções. Não há limite de rodadas, pontuação, metas de patrimônio, colapso nem objetivos secretos. Se uma **facção** vencer, a tela de vitória mostra o **nome da facção** e, em destaque, **"Este lugar agora é um Narco-Estado"**; se o Estado vencer, mostra que a cidade foi recuperada.
- **Recrutamento (sem teto fixo):** o limite por rodada = `base + territórios×0,5 + negócios×1 + influência total/100` para as facções, e `base + territórios×0,5 + pontos de investimento×0,5` para o Estado. Os **pontos de investimento do Estado** vêm de fiscalização portuária (1), proteção de testemunhas (1), apreensão de ativos (2) e investigação concluída (2). Valores em `CITY.CFG.recruit` / `CITY.CFG.investPts`. Também continua limitado pelo dinheiro disponível.
- **Informação secreta:** facções não veem o progresso das investigações; o Estado só vê a faixa de exposição (exata após investigação concluída); o dinheiro das facções é privado; 
- **Bots:** Estado e facções, 3 dificuldades, com personalidade (economia, expansão, defesa, investigação); usam `CITY.check/apply`, como os humanos.

## Limitações
- Cartas de evento: um baralho de 8 eventos determinísticos sorteado no início (sem mão de cartas para os jogadores).
- Negociação: entre **Estado e facção** só existe a opção **Trégua momentânea de 2 rodadas** (nada de cessão, troca ou aliança); durante a trégua nenhum lado ataca o outro (WAR, operação policial e recuperação territorial). Entre facções valem as opções do WAR. As **Medidas Desesperadas** só existem entre facções. A duração conta a rodada atual, como nas alianças.
- Online: dinheiro, instalações, negócios, influência, legitimidade e investigações são decididos pelo servidor; os dados do combate territorial e as tropas continuam vindo do jogador da vez.
- Os valores de manutenção das instalações além da Delegacia e os limiares de vitória são **sugestões de balanceamento**.


## Regras no jogo
Os modos **Guerra Industrial** e **Controle da Cidade** têm o botão **📖 Regras** (à esquerda do 🚪 Sair, no topo do mapa). O texto é gerado em `public/js/rules.js` a partir de `IND.CFG` / `CITY.CFG`, então os números sempre acompanham a configuração.


## Cidade: negócio de fachada e símbolos das facções
- **Negócio de fachada** pode ser construído em **qualquer território** da facção (inclusive porto e garimpo), no máximo um por território.
- **Etapa de desenho** (modo Cidade, para **cada jogador humano**, inclusive jogando sozinho contra bots; `public/js/symbols.js`): cada jogador tem **2 minutos** (`SYM_SECONDS`) para desenhar o símbolo da facção (o Estado, o emblema). O **fundo é fixo na cor do jogador**: o desenho fica numa camada transparente e há pincel, borracha, **seta, círculo (com opção de preencher), balde**, texto e símbolos; o **balde só preenche formas fechadas** desenhadas pelo jogador — clicar no fundo (região transparente ligada à borda), numa forma aberta ou numa forma gigante é recusado (`symFloodFill`, com testes) — as cores iguais/próximas do fundo são bloqueadas. É possível **pular**; ao acabar o tempo o jogo segue sozinho.
  Online todos desenham ao mesmo tempo (bots e ações esperam); no mesmo aparelho (hot-seat) um jogador de cada vez. O servidor aceita só PNG até 70 KB, de quem é jogador humano, durante a etapa.
- O símbolo é exibido como plano de fundo de cada território do dono (recortado no polígono) e **segue o conquistador**; quem pulou fica só com a cor.
