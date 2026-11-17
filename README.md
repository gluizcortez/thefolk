# thefolk

Jogo de simulação de vida para navegador. Você cuida de pessoas (os **folks**) em
uma casa isométrica: elas têm necessidades que caem com o tempo, agem sozinhas
quando ninguém manda e obedecem a uma fila de ações que você monta.

Identidade, nomes, interface e arte são originais. Toda a arte é desenhada por
código, sem assets externos.

**Estado atual: fatia 1** (um folk, casa pronta, necessidades, IA autônoma,
fila de ações, pathfinding, relógio com velocidades e save/load).

## Rodando

Requer Node 20 ou mais novo.

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm test         # testes do núcleo de simulação (Vitest)
npm run build    # checa tipos e gera o site estático em dist/
npm run preview  # serve o dist/ localmente
```

## Como jogar

- **Clique em um objeto** para abrir o menu de interações; a escolha entra na fila.
- **Clique no chão** para mandar o folk até ali.
- A **fila** fica embaixo, no centro. O ✕ cancela qualquer item, inclusive o atual.
  Itens tracejados são decisões do próprio folk.
- **Relógio** no topo: pausa e três velocidades. Atalhos: `Espaço`, `1`, `2`, `3`.
- **Arraste** para mover a câmera, **role** para aproximar. `Esc` fecha o menu.
- A chave "Age por conta própria" liga e desliga a IA do folk.
- **Salvar / Carregar / Novo jogo** no canto superior direito. O jogo também
  salva sozinho a cada 30 segundos e continua de onde parou ao reabrir.

## Deploy na Vercel

O jogo é um site estático, sem backend.

1. Suba o repositório para o GitHub.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
3. A Vercel detecta o Vite sozinha. O `vercel.json` já fixa: build `npm run build`,
   saída `dist`.
4. Clique em **Deploy**. Cada push na `main` gera um novo deploy.

Pela linha de comando: `npx vercel` (prévia) e `npx vercel --prod` (produção).

## Arquitetura

O núcleo de simulação é separado da renderização (estilo hexagonal).

```
src/
  sim/        TypeScript puro, determinístico, sem Phaser nem DOM
    types.ts        estado (World), definições e comandos
    sim.ts          classe Sim: step() avança 1 minuto; dispatch() recebe comandos
    needs.ts        decaimento, efeitos e humor
    ai.ts           IA por utilidade
    pathfinding.ts  A* no grid
    grid.ts         paredes nas bordas, navegação, tiles de uso
    clock.ts        relógio e velocidades
    rng.ts          RNG com seed (mulberry32)
    world.ts        criação do mundo a partir de um mapa em texto
    save.ts         formato de save versionado e migrações
  data/       conteúdo como dados: objetos, traços, necessidades, casa inicial
  game/       cena Phaser: só lê o estado e manda comandos
    art/            todo o desenho por código (trocável por sprites)
  ui/         HUD em HTML/CSS por cima do canvas
  i18n/       textos da interface (pt-BR.ts)
  platform/   IndexedDB
tests/        testes do núcleo
```

Decisões principais do núcleo:

- **Tick fixo**: 1 tick = 1 minuto de jogo. A velocidade só muda quantos ticks
  rodam por segundo real (2, 6 ou 20). A simulação nunca vê tempo real.
- **Determinismo**: o estado do RNG mora no `World`. Mesma seed e mesmos comandos
  dão o mesmo futuro, e salvar e carregar não muda nada (há teste para isso).
- **Estado puro**: `World` é JSON puro; o save é o próprio estado mais uma versão.
- **Porta única**: o jogador só altera o mundo por `Sim.dispatch(comando)`.
- **Paredes nas bordas** entre tiles (não ocupam tile); portas abrem a borda;
  objetos bloqueiam os tiles que ocupam.
- **IA por utilidade**: cada interação anuncia efeitos por minuto. A nota é
  `ganho × urgência × peso do traço`, dividida por um custo de distância; o folk
  sorteia entre as melhores opções.

## Adicionando conteúdo

- **Objeto novo**: uma entrada em `src/data/objects.ts` e os textos em
  `src/i18n/pt-BR.ts`. Sem desenho próprio, ele aparece como uma caixa; para
  desenhar, adicione um painter em `src/game/art/objects.ts` com o mesmo id de `art`.
- **Traço novo**: `src/data/traits.ts`.
- **Ritmo das necessidades**: `src/data/needs.ts`.
- **Casa inicial**: `src/data/house.ts` (mapa em texto, portas e objetos).
- **Tradução**: copie `src/i18n/pt-BR.ts` e registre em `src/i18n/index.ts`.
- **Sprites definitivos**: troque as funções de `src/game/art/` (objetos, folk,
  terreno). A simulação não conhece nada de desenho.
- **Mudou o formato do `World`?** Aumente `SAVE_VERSION` em `src/sim/save.ts` e
  registre a migração no mesmo arquivo.

## Roteiro

1. **Fatia 1 (feita)**: um folk, casa pronta, necessidades, IA, fila, A*, relógio, save/load.
2. Emprego, dinheiro, habilidades e modo compra.
3. Outros folks, interações sociais e sistema de relações.
4. Modo construção.
5. Carreiras e relações aprofundadas.

## Limitações conhecidas da fatia 1

- Um único folk e uma única casa; nada de dinheiro, emprego, habilidades,
  compra ou construção ainda.
- "Social" só se recupera pelo telefone, já que não há outros folks.
- "Ambiente" é calculado por proximidade de objetos (raio em tiles), não por cômodo.
- Sem morte: fome no zero só derruba o humor. Energia no zero causa desmaio e
  bexiga no zero causa um acidente.
- O humor é exibido, mas ainda não muda o que o folk aceita fazer.
- Objetos não têm rotação nem estados (sujo, quebrado), e o folk fica em pé ao
  lado da maioria deles (senta de fato só no sofá e na privada, deita na cama).
- O folk não tem horário: dorme quando a energia cai, de dia ou de noite.
- Um save por navegador (um slot), sem exportar ou importar arquivo.
- Sem som e sem música.
- Pensado para desktop com mouse; em telas pequenas funciona, mas apertado.
