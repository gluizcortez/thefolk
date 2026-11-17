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

**Estado atual: fatia 5** (as cinco fatias do plano: casa, necessidades e IA;
emprego, dinheiro e modo compra; vizinhos e relações; modo construção; e agora
carreiras e relações aprofundadas: chefe e colegas de verdade, eventos no
expediente, aumento, frilas, negócio próprio, fofoca, reputação, ciúme e
término). A moeda do jogo é o **tostão** (⟡).

> Saves antigos são convertidos sozinhos ao abrir. Da fatia 1: a casa ganha
> ⟡ 1.500, o folk começa sem emprego e com as habilidades no zero. Da fatia 2:
> a casa continua com quem morava nela, a vizinhança passa a existir e
> ninguém conhece ninguém ainda. Da fatia 3: as janelas que eram só desenho
> viram janelas de verdade, nos mesmos lugares, e a casa fica com a mesma cara.
> Da fatia 4: chegam os três chefes e mais uma colega na vizinhança, os colegas
> de trabalho já se conhecem entre si, e quem tinha emprego segue no mesmo
> cargo, sem aumento. Ninguém começa com fama nem fofoca.

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
- **Modo construção**: botão **Construir** ou tecla `C`. O tempo para. Quatro
  abas:
  - **Paredes**: arraste de um canto do chão a outro para levantar uma linha
    de parede (⟡ 14 o metro; trecho que já existe não é cobrado). "Derrubar"
    apaga paredes, portas e janelas pelo mesmo arraste, de graça e sem
    reembolso.
  - **Portas e janelas**: clique numa parede (⟡ 90 a porta, ⟡ 70 a janela).
    Porta deixa passar; janela não, mas clareia o **ambiente** de quem está
    a até três tiles (até três janelas contam).
  - **Pisos**: clique num tile ou arraste um retângulo; oito pisos, de ⟡ 8 a
    ⟡ 15 o tile. Grama tira o piso (de graça) e o tile volta a ser quintal.
  - **Revestimentos**: clique numa face de parede para revestir só aquele
    lado; com `Shift`, o cômodo inteiro. Oito acabamentos, de ⟡ 3 a ⟡ 9.
  Antes de soltar, a prévia mostra a obra em verde (dá) ou vermelho (não dá),
  com o custo e o motivo ao lado do mouse. No modo construção o **botão
  direito** arrasta a câmera. **Desfazer** (`Ctrl+Z`) volta a última obra e
  devolve o que ela custou, até 40 passos.
  O jogo recusa obra que prenda alguém sem saída para a rua, que deixe um
  objeto sem lado para usar ou que passe parede no meio de um móvel. Cômodo
  vazio pode ficar fechado (a porta vem depois). Paredes podem ir até a divisa
  do lote.
- **Moradores**: o jogo novo começa com dois, Tomé Varanda e Lia Sacada, que
  dividem a casa há pouco tempo. Troque quem você controla pelas fichas acima
  do cartão do folk, com `Tab` ou clicando no outro e escolhendo "Controlar".
- **Conversas**: clique em outra pessoa para abrir o menu de conversa, separado
  em amizade, trabalho, romance e provocação. O que aparece depende de como o
  seu folk vê o outro: quem não se conhece só se cumprimenta; abraço pede
  amizade; beijo e pedido de namoro pedem romance. O outro pode não topar, e a
  chance depende de como *ele* vê o seu folk, dos traços dos dois, das
  lembranças e do humor. Depois de cada conversa, sobe uma etiqueta com o que
  mudou ("Amizade +4") ou "não topou".
- **Relações**: botão no cartão do folk. Mostra todo mundo que ele conhece, com
  três barras separadas (amizade, romance e respeito, de -100 a 100), o que o
  outro sente de volta e as lembranças marcantes (primeiro beijo, briga feia,
  desabafo...). Sem contato, amizade e romance esfriam devagar.
- **Vizinhança**: dez vizinhos aparecem para dar um oi de dia, de vez em
  quando, e vão embora sozinhos. Para chamar alguém que já conhece, use o
  telefone ("Convidar alguém para vir") ou o botão Convidar no painel de
  relações. Visitas agem por conta própria: não usam cama nem chuveiro e não
  gastam o dinheiro da casa. Dá para pedir que vão embora, e quem tem amizade
  60 ou mais pode ser chamado para morar junto (até quatro moradores; traz o
  emprego junto).
- **Chefe e colegas**: cada carreira tem um chefe e colegas que moram na
  vizinhança (podem até aparecer para visitar). No primeiro dia o folk conhece
  todo mundo. O painel Trabalho mostra a equipe e como cada um vê o seu folk.
  Cada turno rende um pouco de amizade com os colegas, e chefe e colegas
  ganham ou perdem respeito conforme o turno foi. O desempenho passa a contar
  também o respeito do chefe e o clima com os colegas.
- **Promoção e demissão**: além do desempenho e das habilidades, o chefe
  precisa respeitar o folk (o painel diz quanto falta). Chefe que não suporta
  o folk demite mesmo com desempenho razoável.
- **Eventos no expediente**: quase todo turno acontece algo (prazo apertado,
  colega que rouba o crédito, almoço, fiscalização, crítico de jornal,
  apresentação para a diretoria...). O jogo pausa e mostra um cartão com as
  escolhas; as que dependem de sorte mostram a chance. Cada escolha mexe em
  desempenho, necessidades, relações, habilidades ou dinheiro, e algumas viram
  fofoca. Sem resposta em uma hora de jogo, o folk decide sozinho pelos traços.
  São 16 eventos, alguns só de uma carreira.
- **Pedir aumento**: no painel Trabalho. O pedido é feito ao chefe no fim do
  próximo turno; a chance (mostrada) depende de desempenho, respeito do chefe,
  lábia e fama. Cada aumento dá +10% (até +50%, zera na promoção). Negado, o
  chefe fica com o pé atrás. Um pedido a cada três dias.
- **Troca de área**: quem já subiu na carreira entra na nova num cargo acima
  do primeiro, se as habilidades permitirem (até um abaixo do cargo atual).
- **Frilas**: aba Frilas do painel Trabalho. Toda manhã, às 6h, o mural traz
  três ofertas (planilha, cartaz, marmitas, bolo de casamento, discurso...),
  cada uma com habilidade mínima, prazo e o objeto onde se faz. Pegue uma e
  clique no objeto ("Fazer o frila"). Quem sabe mais termina antes e ganha um
  extra; estourar o prazo suja o nome.
- **Negócio próprio**: aba Negócio. Três opções (padaria no fogão, letreiros
  no cavalete ou escrivaninha, escritório de contas na escrivaninha). Abrir
  custa e larga o emprego. "Cuidar do negócio" sobe o capricho; o caixa fecha
  todo dia às 21h com fregueses conforme capricho, habilidade e fama, menos a
  despesa do dia. Fechar devolve 25% do investimento.
- **Fofoca e reputação**: brigas, traições, namoros, términos, promoções,
  demissões e feitos no trabalho viram notícia. Quem viu sabe; depois a
  notícia anda sozinha, uma vez por dia, de amigo em amigo pela vizinhança, e
  também no papo dentro de casa (há a conversa "Fofocar"). Cada pessoa que fica
  sabendo mexe na fama de quem é o assunto e na opinião de quem ouviu. A fama
  aparece no painel Relações, com o que o folk anda ouvindo, e muda a chance
  de os outros toparem conversa, os fregueses do negócio e o aumento.
  Fofoqueiros espalham mais; ninguém espalha podre de si mesmo nem de quem é
  muito amigo.
- **Ciúme, exclusividade e término**: gesto romântico com alguém que não é o
  namorado é traição. Quem namora e vê de perto (ou fica sabendo pela fofoca)
  sente ciúme: o romance despenca, nascem lembranças amargas sobre os dois e,
  se não sobrar muito, termina. Quem namora firme resiste a flerte e não sai
  flertando por conta própria. Dá para terminar pela conversa, e namoro que
  esfria demais acaba sozinho.
- **Lembranças guiam a IA**: com mágoa acumulada o folk evita papo amigável
  com aquela pessoa e pode partir para a briga; com boas lembranças procura
  mais. "Pedir desculpas" aparece para quem guarda mágoa e, aceito, deixa uma
  lembrança boa. Vizinho magoado não aparece sem avisar e topa menos convite.
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
    relations.ts    relações dirigidas (amizade, romance, respeito), afinidade, lembranças
    social.ts       quem pode conversar com quem e a chance de o outro topar
    economy.ts      tostões, contas, preço de revenda e regras de onde um objeto cabe
    build.ts        modo construção: planos de obra, custo, validação, desfazer
  data/       conteúdo como dados: objetos (com preço e categoria), pisos,
              revestimentos e preço de parede, porta e janela (build.ts), traços,
              necessidades, habilidades, carreiras, conversas (socials.ts),
              lembranças (memories.ts), vizinhos (neighbors.ts) e casa inicial
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
- **Paredes nas bordas** entre tiles (não ocupam tile); portas abrem a borda,
  paredes e janelas fecham; objetos bloqueiam os tiles que ocupam. Piso é por
  tile, e revestimento é por face de parede (`grid.coverings["x,y,S"]` é a
  face ao sul do tile x,y); face sem escolha segue o piso do cômodo.
- **Obra como mudança**: todo comando de construção vira um `GridChange` (o
  que muda e para quê). `planBuild` calcula custo e problema sem mexer em nada
  (a prévia da tela usa a mesma função); `Sim.dispatch` aplica, cobra e guarda
  a mudança inversa numa pilha de desfazer que não vai no save. Desfazer
  passa pela mesma validação, porque um móvel pode ter sido posto onde a
  parede estava.
- **Validação de obra** (`checkGrid`): nenhuma parede dentro da área de um
  objeto; todo folk que alcançava a calçada continua alcançando; todo objeto
  que tinha um lado de uso alcançável continua tendo. A referência é sempre a
  calçada, por onde as visitas chegam.
- **Dentro e fora** vêm do piso (`FloorDef.outdoor`): grama é quintal; qualquer
  outro piso é cômodo. Isso decide o corte de paredes da câmera e o lado de
  fora (tijolo) das paredes.
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
- **Relações têm direção**: `world.relations["A>B"]` é como A vê B. Cada uma
  guarda amizade, romance e respeito (-100 a 100), namoro, último contato,
  cansaço e até dez lembranças. Ganhos são multiplicados pela afinidade de
  traços (`likes` / `dislikes` em `traits.ts`), diminuem quando o par repete
  conversa em pouco tempo e ficam mais lentos quanto mais alta a relação.
- **Conversa** é uma ação `social` na fila de quem puxa: ele anda até um tile
  colado no outro, e o outro ganha uma ação `listen` e espera (quem está
  usando um objeto continua usando e conversa assim mesmo; quem está apertado
  termina o que ia fazer). Ao começar, o RNG decide se o outro topa; no fim,
  as mudanças entram nos dois sentidos, as lembranças são gravadas e o
  resultado vai para a tela (`Sim.drainOutcomes`, fora do save).
- **IA social**: conversas entram na mesma lista das opções de objeto, com a
  nota `ganho nas necessidades × chance esperada de topar × gosto pelo tipo de
  conversa`. Ninguém flerta sozinho sem interesse prévio (ou traço romântico)
  nem provoca sem motivo (traço ou antipatia). Pedido de namoro, chamar para
  morar e mandar embora só por ordem do jogador.
- **Visitas** são folks com `visit` preenchido: chegam pela calçada, usam o que
  é de graça e de uso comum, e vão embora no horário, à noite, cansadas ou com
  fome. Entre visitas, o vizinho mora em `world.neighbors` (mesmo id), então
  as relações continuam valendo.
- **Fatia 5 em módulos puros**: `sim/work.ts` (chefe e colegas, eventos do
  expediente, aumento, troca de área), `sim/hustle.ts` (mural de frilas e
  negócio), `sim/gossip.ts` (notícias, reputação, ciúme, término) e
  `sim/people.ts` (alguém do mundo, esteja no lote ou só na vizinhança). A
  `Sim` só chama esses módulos nos ganchos certos (saída e volta do turno,
  fim de conversa, 4h, 6h e 21h) e passa o log como função.
- **Chefe e colegas são vizinhos** (`Neighbor.career`, `boss`): as relações
  com eles são as mesmas `world.relations` de sempre, então respeito do chefe,
  fofoca e lembranças valem igual dentro e fora do trabalho.
- **Evento pendente** fica em `folk.away.event` com um prazo; o jogador
  responde por `workChoice` ou o folk escolhe sozinho no prazo (peso por
  traço e pela chance de dar certo). Tudo sorteado pelo RNG do mundo.
- **Notícias** (`world.news`) guardam quem sabe (`knownBy`). Aprender uma
  notícia é o único lugar que mexe em fama (`world.reputation`) e dispara
  ciúme, então ver, ouvir no papo e ouvir pela rede seguem a mesma regra.
- **Objetos de vários lugares** (`slots`): sofá, mesa e caixa de som aceitam
  dois. Quem chega num objeto cheio espera até meia hora e desiste.
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
- **Traço novo**: `src/data/traits.ts` (com `likes`, `dislikes` e o gosto
  por tipo de conversa em `social`).
- **Conversa nova**: `src/data/socials.ts` (requisitos, chance base, mudanças
  em quem puxa e em quem ouve, lembranças e animação) e o texto em i18n.
- **Lembrança nova**: `src/data/memories.ts` (com o peso que ela tem na
  próxima conversa).
- **Vizinho novo**: `src/data/neighbors.ts`.
- **Habilidade nova**: `src/data/skills.ts` e o nome em i18n.
- **Carreira nova**: `src/data/careers.ts` (cargos com pagamento, horário, dias
  e exigências) e os nomes em i18n.
- **Ritmo das necessidades**: `src/data/needs.ts`.
- **Casa inicial**: `src/data/house.ts` (mapa em texto, portas, janelas e objetos). Duas
  letras com o mesmo `room` formam um cômodo só, sem parede entre elas: é assim
  que a cozinha fica aberta para a sala com outro piso.
- **Piso ou revestimento novo**: a entrada em `src/data/build.ts` (nome e
  preço), o texto em i18n e a textura em `textures.ts`. Pisos usam a textura
  com o mesmo id (registre o id em `FLOOR_ART`, em `src/game/art/house.ts`);
  revestimentos são ligados à textura e à cortina da janela em `COVER_ART`, no
  mesmo arquivo. Preço de parede, porta e janela e o ambiente da janela
  também ficam em `data/build.ts`.
- **Tradução**: copie `src/i18n/pt-BR.ts` e registre em `src/i18n/index.ts`.
- **Arte definitiva**: troque o que `src/game/art/` devolve. `getTexture` pode
  passar a carregar imagens e `buildFurniture` / `FolkModel` podem carregar
  modelos prontos (glTF, por exemplo). A simulação não conhece nada de desenho.
- **Evento do expediente**: `src/data/workEvents.ts` (ator, carreiras, cargo
  mínimo, peso, escolhas com teste de sorte e resultados) e os textos em i18n
  nas chaves `wev.<id>...`.
- **Frila ou negócio**: `src/data/gigs.ts` (habilidade, nível mínimo, trabalho,
  pagamento, prazo e objetos). O objeto precisa de uma interação com
  `task: 'gig'` ou `task: 'business'` em `objects.ts`.
- **Notícia**: `src/data/news.ts` (efeito na fama, opinião de quem ouve,
  vontade de espalhar, se dá ciúme e quanto dura).
- **Chefe ou colega**: um vizinho com `career` em `neighbors.ts` (`boss: true`
  para o chefe). Laços entre vizinhos ficam em `NEIGHBOR_TIES`.
- **Mudou o formato do `World`?** Aumente `SAVE_VERSION` em `src/sim/save.ts` e
  registre a migração no mesmo arquivo.

## Roteiro

1. **Fatia 1 (feita)**: um folk, casa pronta, necessidades, IA, fila, A*, relógio, save/load.
2. **Fatia 2 (feita)**: emprego, dinheiro, habilidades e modo compra.
3. **Fatia 3 (feita)**: outros folks, interações sociais e sistema de relações.
4. **Fatia 4 (feita)**: modo construção.
5. **Fatia 5 (feita)**: carreiras e relações aprofundadas.

## Limitações conhecidas da fatia 5

- O turno continua acontecendo fora da tela: o folk some e os eventos chegam
  como cartões, não como cenas no trabalho. Chefe e colegas não trabalham de
  verdade (não têm turno nem necessidades fora do lote); só as relações deles
  são reais.
- Colegas e chefe não sobem de cargo, não são demitidos nem mudam de emprego.
  Se o chefe se mudar para a casa, a vaga de chefe fica vazia (ninguém barra
  promoção nessa carreira).
- Um evento de cada vez por folk, com no máximo dois por turno. Não há eventos
  em cadeia (consequência que volta dias depois) nem eventos em casa.
- O negócio próprio não tem estoque, funcionário, preço ajustável nem
  fregueses visitando a casa: é um caixa diário calculado. Frila e negócio
  não são escolhidos pela IA; só o jogador manda.
- A fofoca é sobre fatos que a simulação conhece (as notícias de
  `news.ts`); não há boato inventado nem fofoca falsa. Fora do lote ela anda
  uma vez por dia, de uma vez, e não aparece na tela quem contou para quem.
- Não há casamento, noivado, filhos nem divórcio; namoro continua sendo o
  vínculo mais forte. Também não há conversa em grupo.
- A reputação é um número só (não separa fama no trabalho e fama no
  bairro) e volta devagar para o meio todo dia.
- Os três chefes e a colega nova usam os mesmos rostos e corpos dos outros
  vizinhos, com cores diferentes.
- Os pesos dos eventos, chances e efeitos foram calibrados por testes e
  simulação, não por muitas horas de jogo; alguns podem estar fortes ou
  fracos demais.

### Ainda valem da fatia 4

- Um andar só, sem telhado, escada, porão, cercas, piscina ou terreno com
  desnível. O lote tem o tamanho fixo de sempre (17 × 14).
- Só um modelo de porta e um de janela, sempre do mesmo tamanho (1 m). Não há
  porta dupla, arco, janela alta, portão nem porta trancada; portas continuam
  sempre abertas no desenho.
- Paredes só em linha reta pelas bordas dos tiles: nada de parede diagonal,
  meia parede, mureta ou coluna solta.
- "Dentro" é qualquer tile com piso que não seja grama, não um cômodo fechado
  com teto. Um piso no meio do quintal conta como cômodo para o corte de
  paredes e para o lado de dentro da parede.
- Derrubar não devolve dinheiro, e trocar piso ou revestimento não reembolsa o
  que estava lá. Só o desfazer devolve, e só a obra inteira (o traço todo).
- A pilha de desfazer vale enquanto o jogo está aberto: não vai no save e some
  ao carregar ou começar um jogo novo.
- Construir não aumenta as contas da casa (só os móveis contam) nem o valor do
  lote, e não existe vender a casa ou mudar de lote.
- Janelas só mexem no ambiente (até +12 com três janelas perto). Não há luz do
  dia entrando nem diferença entre cômodo com e sem janela à noite.
- Pisos e revestimentos não mexem no ambiente, só no visual.
- Quadros nas paredes, canteiros e enfeites do quintal (banco, bebedouro,
  varal) continuam sendo cenário: aparecem sozinhos em paredes livres e somem
  quando a obra ocupa o lugar deles.
- No modo construção a mira das paredes inteiras pega a primeira parede que o
  raio acerta; numa parede cortada (baixa), mira-se pelo chão perto dela.

### Ainda valem da fatia 3

- Conversas são sempre entre duas pessoas; não há conversa em grupo, festa nem
  atividade a dois em objetos (jogar, cozinhar junto, dançar junto conta só
  como dividir o objeto).
- Folks não se esbarram: dois podem ficar no mesmo tile por um instante. Quem
  conversa escolhe um lado livre, mas no meio do caminho atravessa os outros.
- A plaquinha sobre quem puxa conversa mostra só o tipo de conversa, não o
  assunto. As animações de abraço e beijo aproximam os dois, mas os corpos
  podem se atravessar um pouco.
- Visitas não comem, não tomam banho nem dormem na casa, e vão embora com
  fome ou cansadas. Não há visita de grupo nem "toque a campainha": quem chega
  já entra.
- Não dá para mudar alguém para fora de casa, nem criar folks novos: os
  moradores novos só vêm da vizinhança fixa (dez pessoas).
- A casa pronta tem duas camas de solteiro; com três ou quatro moradores, quem
  ficar sem cama espera vagar ou acaba desmaiando de sono (compre outra).
- Os vizinhos usam os mesmos cinco tipos de rosto e cabelo, com cores
  diferentes; só existe um tipo de corpo.

### Ainda valem da fatia 2

- São três carreiras com cinco cargos cada.
- Não há condução desenhada: o folk anda até a calçada e some.
- O folk sai assim que chega na calçada (até uma hora antes do turno) e passa
  esse tempo "no trabalho"; não espera na rua.
- O turno em si não treina habilidades; só objetos, frilas, negócio e alguns
  eventos do expediente treinam.
- Não há falência nem cobrador: com saldo negativo só não se compra nada.
  As contas são um valor único, sem detalhe de luz, água etc.
- O catálogo tem 21 objetos, um modelo de cada (sem variações de cor ou de
  qualidade, sem "versão barata" e "versão cara").
- Objetos giram, mas não ficam colados na parede sozinhos e não há desfazer no
  modo compra (só no modo construção).
- Objetos comprados com o mesmo modelo dos de detalhe (o sofá, por exemplo)
  trazem junto o tapete decorativo do modelo.
- Comida tem custo por refeição, mas não existe estoque de mantimentos nem
  compras de mercado.
- As habilidades não têm efeito visual (o quadro do cavalete não melhora com a
  criatividade) e não dão dinheiro direto (vender quadros, por exemplo).
- Uma única casa.
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
- Quadros, canteiros de flores e portas abertas são só cenário: não existem na
  simulação e as portas não abrem nem fecham.
- A imagem em baixa resolução e as cores de 16 bits são fixas; não há opção de
  alta resolução.
- O desempenho só foi medido em navegador sem placa de vídeo; não foi testado
  em máquina real nem em celular.
- A câmera gira só em quatro ângulos fixos e não tem inclinação ajustável.
- O clique atravessa paredes: dá para acertar um móvel escondido atrás de uma
  parede inteira.
- A casa não tem telhado nem segundo andar; as casas vizinhas são só cenário.
- O Three.js deixa o pacote com cerca de 820 kB (225 kB comprimido).
- Os detalhes de cena (tapetes, itens sobre os móveis, carro, varal, poste, banco) são só decoração: não entram na simulação e não podem ser usados pelo folk.
- O folk não tem horário: dorme quando a energia cai, de dia ou de noite, e a
  IA não planeja o sono em função do turno do dia seguinte.
- Um save por navegador (um slot), sem exportar ou importar arquivo.
- Sem som e sem música.
- Pensado para desktop com mouse; em telas pequenas funciona, mas apertado.
