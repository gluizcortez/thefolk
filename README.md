# thefolk

Jogo de simulação de vida para navegador. Você cuida de pessoas (os **folks**) em
uma casa vista de cima, em três quartos: elas têm necessidades que caem com o
tempo, agem sozinhas quando ninguém manda e obedecem a uma fila de ações que
você monta.

Identidade, nomes, interface e arte são originais. O visual segue a tradição dos
jogos de simulação de vida para PC do fim dos anos 90: vista isométrica 2:1,
imagem em baixa resolução com pixels nítidos e cores de 16 bits, pisos e
paredes cheios de textura, móveis arredondados com esmalte e cromados, e gente
de proporção adulta realista. Tudo é modelado em 3D e pintado por código, sem
assets externos e sem copiar nenhum jogo.

**Estado atual: fatia 2** (fatia 1 mais emprego, dinheiro, habilidades e modo
compra). A moeda do jogo é o **tostão** (⟡).

> Saves da fatia 1 são convertidos sozinhos ao abrir: a casa ganha ⟡ 1.500, o
> folk começa sem emprego e com todas as habilidades no zero.

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
- **Gire a câmera** em passos de 90° com `Q` e `E` ou com os botões ⟲ ⟳ no canto
  superior esquerdo.
- O botão **Paredes** alterna entre em corte (some só o que fica na frente da
  câmera), baixas e inteiras.
- A chave "Age por conta própria" liga e desliga a IA do folk.
- **Dinheiro**: o saldo fica no relógio, ao lado do dia da semana. Passe o mouse
  para ver quando chegam as próximas contas. Comida da geladeira e do fogão e
  ligações custam alguns tostões.
- **Trabalho**: botão no cartão do folk (ou clique no saldo). Os classificados
  mostram três carreiras; aceite uma vaga e, uma hora antes do turno, o folk vai
  sozinho até a calçada pegar a condução. Ele some de casa durante o turno e
  volta com o pagamento. Se você cancelar a ida, ou ele estiver desmaiado, ele
  falta. O painel mostra horário, desempenho, próximo cargo e as habilidades que
  faltam para a promoção. Dá para trocar de área ou pedir demissão.
- **Habilidades**: botão no cartão do folk. Culinária, raciocínio, criatividade,
  lábia e fôlego sobem usando objetos (o menu de cada objeto mostra qual
  habilidade ele treina). De mau humor o treino rende metade.
- **Modo compra**: botão **Comprar** ou tecla `B`. O tempo para. Escolha um item
  no catálogo e clique no chão; o chão fica verde onde cabe e vermelho onde não
  cabe. `R` gira, clique direito ou `Esc` desiste. Clicar em um objeto da casa
  abre Mover, Girar e Vender (a venda devolve 70% do valor).
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
  sim/        TypeScript puro, determinístico, sem Three.js nem DOM
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
    skills.ts       experiência, níveis e bônus de habilidade
    career.ts       turnos, desempenho, promoção e demissão
    economy.ts      tostões, contas, preço de revenda e regras de onde um objeto cabe
  data/       conteúdo como dados: objetos (com preço e categoria), traços,
              necessidades, habilidades, carreiras e casa inicial
  game/       cena 3D (Three.js): só lê o estado e manda comandos
    GameView.ts     câmera, luz, entrada do mouse e laço de quadros
    controller.ts   ponte entre a tela, a HUD e a Sim
    art/            modelos e texturas, tudo gerado por código
      textures.ts     texturas pintadas em canvas, com granulado
      build.ts        ajudantes de malha e material
      house.ts        pisos, paredes (com corte), portas e janelas
      furniture.ts    um modelo por objeto, com as âncoras de sentar e deitar
      folk.ts         folk de proporção adulta, rosto e animações
      scenery.ts      jardim, cerca, rua e vizinhança
      palette.ts      cores
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
  sorteia entre as melhores opções. A IA ignora o que a casa não pode pagar.
- **Dinheiro é da casa** (`world.household`), não do folk, pensando nas fatias
  com mais moradores. Pode ficar negativo quando as contas chegam; com saldo
  negativo nada se compra.
- **Contas** a cada três dias, às 10:00: uma parte fixa mais 1,2% do valor dos
  móveis da casa.
- **Habilidades** guardam experiência (1 ponto ≈ 1 minuto de treino puxado). O
  nível n custa `60 × n` pontos a mais que o anterior, até o nível 10. Uma
  interação pode "turbinar" uma necessidade com a habilidade (quem cozinha
  melhor mata mais a fome por minuto).
- **Trabalho**: uma hora antes do turno, uma ação `work` entra na frente da
  fila; ao chegar na calçada o folk sai (`folk.away`) e as necessidades seguem
  caindo com o ritmo do trabalho. A nota do turno soma humor (o peso maior),
  habilidades da carreira acima do esperado para o cargo e atraso. Desempenho
  60 com as habilidades exigidas promove; -60 demite; faltar tira 30.
- **Objetos giram** em quartos de volta (`rot`): a área ocupada e os lados de uso
  giram junto. Um objeto só pode ser posto onde não fica dividido por parede,
  não pisa em ninguém, não fecha passagem para nenhum lugar que o folk
  alcançava e pode ser usado de algum lado.

## Como o visual é feito

- **Câmera ortográfica a 30°**, que dá a projeção 2:1 das vistas isométricas
  clássicas, girando em passos de 90°.
- **Imagem interna pequena** (perto de 600 linhas), ampliada por um fator
  inteiro e sem suavização: os pixels aparecem nítidos, como num monitor da
  época. A câmera anda de pixel em pixel para as texturas não tremerem.
- **Cores de 16 bits** com pontilhado ordenado, aplicado num passo final
  (`retroPass` em `GameView.ts`).
- **Texturas** pintadas em canvas, com cerca de 64 pixels por metro, granulado
  por cima e amostragem sem borrão (`textures.ts`). Cada textura tem um nome; a
  mesma seed pinta sempre a mesma imagem.
- **Formas arredondadas e materiais simples**: sombreamento suave, com brilho
  especular em esmalte, vinil e cromado (o cromado é uma textura de faixas
  claras e escuras). Sem PBR e sem pós-processamento moderno.
- **Luz de maquete**: um sol que vem de trás e da esquerda da câmera, luz de
  céu e sombra de baixa resolução só de móveis, folks e árvores (as paredes não
  projetam sombra). À noite as cores esfriam e os abajures acendem.
- **Folk**: adulto de cerca de sete cabeças de altura, com tronco, braços e
  pernas modelados como cascas suaves (`loft` em `build.ts`), roupa e rosto em
  textura, poses procedurais por juntas e expressão que muda com o humor.
- **Seleção**: anel giratório no chão, sob o folk.

## Adicionando conteúdo

- **Objeto novo**: uma entrada em `src/data/objects.ts` (com `price` e
  `category`; `cost` e `skill` nas interações são opcionais) e os textos em
  `src/i18n/pt-BR.ts`. Ele entra no catálogo do modo compra sozinho, com
  miniatura gerada a partir do modelo. Sem modelo próprio, ele aparece como uma caixa; para
  modelar, registre um `FurnitureSpec` em `src/game/art/furniture.ts` com o mesmo
  id de `art` (o spec também diz onde o folk senta, deita ou fica em pé).
- **Textura nova**: um painter e uma entrada em `SPECS` em
  `src/game/art/textures.ts`; use com `getTexture('nome')`.
- **Traço novo**: `src/data/traits.ts`.
- **Habilidade nova**: `src/data/skills.ts` e o nome em i18n.
- **Carreira nova**: `src/data/careers.ts` (cargos com pagamento, horário, dias
  e exigências) e os nomes em i18n.
- **Ritmo das necessidades**: `src/data/needs.ts`.
- **Casa inicial**: `src/data/house.ts` (mapa em texto, portas e objetos). Duas
  letras com o mesmo `room` formam um cômodo só, sem parede entre elas: é assim
  que a cozinha fica aberta para a sala com outro piso.
- **Piso ou parede novos**: a textura em `textures.ts` e o acabamento em
  `FINISH` / `FLOORS`, em `src/game/art/house.ts`.
- **Tradução**: copie `src/i18n/pt-BR.ts` e registre em `src/i18n/index.ts`.
- **Arte definitiva**: troque o que `src/game/art/` devolve. `getTexture` pode
  passar a carregar imagens e `buildFurniture` / `FolkModel` podem carregar
  modelos prontos (glTF, por exemplo). A simulação não conhece nada de desenho.
- **Mudou o formato do `World`?** Aumente `SAVE_VERSION` em `src/sim/save.ts` e
  registre a migração no mesmo arquivo.

## Roteiro

1. **Fatia 1 (feita)**: um folk, casa pronta, necessidades, IA, fila, A*, relógio, save/load.
2. **Fatia 2 (feita)**: emprego, dinheiro, habilidades e modo compra.
3. Outros folks, interações sociais e sistema de relações.
4. Modo construção.
5. Carreiras e relações aprofundadas.

## Limitações conhecidas da fatia 2

- O dia de trabalho ainda é uma caixa-preta: o folk some e volta. Eventos com
  escolhas no meio do turno, chefe e colegas de verdade, pedido de aumento,
  freelas e negócio próprio ficam para a fatia 5.
- São três carreiras com cinco cargos cada, sem troca de área com
  aproveitamento: quem troca começa do primeiro cargo da nova.
- Não há condução desenhada: o folk anda até a calçada e some.
- O folk sai assim que chega na calçada (até uma hora antes do turno) e passa
  esse tempo "no trabalho"; não espera na rua.
- O trabalho não treina habilidades; só objetos treinam.
- Não há falência nem cobrador: com saldo negativo só não se compra nada.
  As contas são um valor único, sem detalhe de luz, água etc.
- O catálogo tem 21 objetos, um modelo de cada (sem variações de cor ou de
  qualidade, sem "versão barata" e "versão cara").
- Objetos giram, mas não ficam colados na parede sozinhos, não há desfazer no
  modo compra e não dá para comprar paredes, portas ou pisos (fatia 4).
- Objetos comprados com o mesmo modelo dos de detalhe (o sofá, por exemplo)
  trazem junto o tapete decorativo do modelo.
- Comida tem custo por refeição, mas não existe estoque de mantimentos nem
  compras de mercado.
- As habilidades não têm efeito visual (o quadro do cavalete não melhora com a
  criatividade) e não dão dinheiro direto (vender quadros, por exemplo).
- Um único folk e uma única casa; sem construção ainda.
- "Social" só se recupera pelo telefone, já que não há outros folks.
- "Ambiente" é calculado por proximidade de objetos (raio em tiles), não por cômodo.
- Sem morte: fome no zero só derruba o humor. Energia no zero causa desmaio e
  bexiga no zero causa um acidente.
- O humor muda o desempenho no trabalho e o ritmo do treino, mas ainda não
  muda o que o folk aceita fazer.
- Objetos não têm estados (sujo, quebrado), e o folk fica em pé ao lado da
  maioria deles (senta de fato no sofá, na poltrona, na escrivaninha, na
  bicicleta e na privada, e deita na cama).
- O visual é 3D gerado por código: as texturas são pinturas procedurais, não
  arte feita à mão, e os modelos são montados com formas simples (caixas
  arredondadas, cilindros, sólidos de revolução e cascas).
- O folk é animado por juntas rígidas, sem esqueleto com pele: cotovelos e
  joelhos mostram a emenda de perto. Só existe um tipo de corpo. Ele não troca
  de roupa (toma banho vestido, atrás do vidro embaçado) e não segura objetos
  na mão (livro, prato, fone, panela).
- O fogão só é usado quando o jogador manda (a IA continua indo à geladeira), a
  bancada é só enfeite e a mesa com as duas cadeiras é um objeto único.
- Quadros, canteiros de flores, portas abertas e janelas são só cenário: não
  existem na simulação e as portas não abrem nem fecham.
- A imagem em baixa resolução e as cores de 16 bits são fixas; não há opção de
  alta resolução.
- O desempenho só foi medido em navegador sem placa de vídeo; não foi testado
  em máquina real nem em celular.
- A câmera gira só em quatro ângulos fixos e não tem inclinação ajustável.
- O clique atravessa paredes: dá para acertar um móvel escondido atrás de uma
  parede inteira.
- A casa não tem telhado nem segundo andar; as casas vizinhas são só cenário.
- O Three.js deixa o pacote com cerca de 700 kB (188 kB comprimido).
- Os detalhes de cena (tapetes, itens sobre os móveis, carro, varal, poste, banco) são só decoração: não entram na simulação e não podem ser usados pelo folk.
- O folk não tem horário: dorme quando a energia cai, de dia ou de noite, e a
  IA não planeja o sono em função do turno do dia seguinte.
- Um save por navegador (um slot), sem exportar ou importar arquivo.
- Sem som e sem música.
- Pensado para desktop com mouse; em telas pequenas funciona, mas apertado.
