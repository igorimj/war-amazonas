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
