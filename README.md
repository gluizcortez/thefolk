# thefolk

Jogo de simulação de vida para navegador. Você cuida de pessoas (os **folks**) em
uma casa vista de cima, em três quartos: elas têm necessidades que caem com o
tempo e fazem o que você manda: cada clique é uma ordem, e o `Shift` monta
uma fila. Parados, esperam com gestos (e sofrem as consequências se ninguém
cuidar deles).

Identidade, nomes, interface e arte são originais. O visual segue a tradição dos
jogos de simulação de vida para PC do fim dos anos 90: vista isométrica 2:1,
imagem em baixa resolução com pixels nítidos e cores de 16 bits, pisos e
paredes cheios de textura, móveis arredondados com esmalte e cromados, e gente
de proporção adulta realista. Tudo é modelado em 3D e pintado por código, sem
assets externos e sem copiar nenhum jogo.

**Estado atual: os dois planos de evolução estão completos.** O primeiro
([docs/plano-evolucao.md](docs/plano-evolucao.md)) trouxe a casa, as
necessidades, o trabalho, as relações, a obra, o bairro e as gerações; o
segundo ([docs/plano-evolucao-2.md](docs/plano-evolucao-2.md)) pôs o jogador
no comando de tudo, deixou o tempo mais lento, trocou a HUD, aprofundou as
atividades, fez folks, roupas e objetos por peças, refez o criador com traços
e abriu a cidade de Arribada com o bairro dentro dela. A moeda do jogo é o
**tostão** (⟡).

> Saves antigos são convertidos sozinhos ao abrir, de qualquer versão (o save
> atual é o v34).

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

Este guia é do jogo como ele está agora, no fim do segundo plano. A história
de como cada parte chegou fica no [Roteiro](#roteiro).

### Os primeiros minutos

1. **Crie uma família** (ou use a pronta, Tomé Varanda e Lia Sacada). O
   criador tem sete passos: membros, aparência, roupas, traços, sonho de
   vida, gostos e laços. Na revisão, escolha se a morte vale e se o relógio
   da vida anda.
2. A família aparece na casa dela, na **Vila Taramela**, um dos três bairros
   de **Arribada**. O cartão **Primeiros passos**, no canto de cima, ensina o
   básico em seis dicas que somem quando você faz o que elas pedem; dá para
   pular e rever depois em Opções.
3. **Ninguém age sozinho.** Sem ordem, o folk espera com gestos (olha em
   volta, boceja, põe a mão na barriga) e um balão mostra o que ele quer. Se
   ninguém cuidar, ele passa fome, sono e vontade de banheiro de verdade.
4. Arrume logo um **trabalho**: pelo jornal (chega às 6h na calçada) ou no
   computador. Sem renda, o dinheiro do começo dura umas três semanas; depois
   disso só a cesta da prefeitura impede a fome.

### Comandar

- **Clique num objeto ou numa pessoa**: abre o menu em anel com o que dá para
  fazer. O que não dá aparece em cinza com o motivo. Mais de seis opções viram
  grupos.
- A escolha **substitui** o que o folk fazia, com saída limpa (levanta,
  deixa o prato, encerra a conversa). Com **`Shift`**, vai para o fim da
  **fila** (até 8 ações). A fila fica em ícones em cima do painel: clique num
  ícone para cancelar, arraste para mudar a ordem.
- **Clique no chão** para mandar andar até ali.
- **Quem você comanda**: clique no morador, no retrato da coluna da esquerda
  (clique duplo leva a câmera até ele) ou use `Tab`.
- Visitas, prestadores, bebês e as outras famílias da cidade têm vida
  própria. A carona do trabalho e o ônibus da escola chamam sozinhos; os
  reflexos (ouvir quem puxou conversa, correr do fogo) aparecem tracejados na
  fila.

### Tempo

- O relógio fica embaixo: **pausa** (`Espaço` ou `0`), **1** (um minuto de jogo
  por segundo), **2** (três), **3** (dez) e **pular** (`4`, uma hora por
  segundo), que só acende quando todos dormem, estão fora ou fazem algo longo
  e volta sozinho quando alguém fica livre.
- O dia é lento de propósito: dá tempo de mandar cada passo. Comprar e
  construir param o tempo.
- Eventos do trabalho pausam o jogo para você escolher.

### Câmera e vista

- **Arraste** para mover, **role** para aproximar e afastar. O zoom vai da casa
  até a cidade inteira sem trocar de tela.
- `Q` e `E` (ou ⟲ ⟳) giram em passos de 90°.
- Quatro **modos de vista** no canto de cima: telhado, paredes inteiras,
  recortadas e baixas (`Home` e `End` trocam, `P` fixa). O telhado some
  sozinho de perto e na obra.
- `PageUp` e `PageDown` (ou ▲ ▼) mudam o andar que se vê.

### Necessidades, humor e o painel do folk

- Oito necessidades: fome, energia, higiene, banheiro, conforto, diversão,
  social e ambiente. O humor sai delas, das sensações (bom papo, cama boa,
  conta atrasada) e dos traços.
- O **painel** no canto tem oito abas: necessidades, sensações, habilidades,
  trabalho e escola, relações, traços e sonho, desejos e inventário.
- De mau humor, ou muito apertado, o folk **recusa** esforço (estudar,
  limpar, malhar) e diz por quê.
- **Desejos do dia**: até três por manhã; cumpridos, dão ânimo e pontos para os
  **benefícios** do sonho de vida.

### Atividades

- Tudo é feito em etapas que se veem: sentar, cozinhar (pegar na geladeira,
  picar na bancada, mexer no fogão, servir na travessa), comer à mesa ou com o
  prato no colo, lavar a louça, tomar banho, deitar.
- **TV** tem canais e é vista do melhor assento; dá para conversar sentado.
- Computador, livros (o progresso fica salvo), cavalete, instrumentos,
  exercícios e jogos de mesa treinam **habilidades**. O menu de cada objeto
  diz qual.
- A casa suja, enche o lixo e quebra: clique no objeto para **Limpar**,
  **Consertar** ou **Fazer revisão**, e na bagunça para recolher.

### Dinheiro e comida

- O saldo fica ao lado do relógio; passe o mouse para ver as contas. Um selo
  ✉ avisa que tem conta na caixa de correio: mande alguém pagar. Conta
  atrasada demais traz o oficial para levar móveis.
- As contas chegam a cada três dias: uma parte fixa, uma parte pelo valor dos
  móveis e a luz que ficou acesa. Com a casa do começo, ficam perto de
  ⟡ 80 a ⟡ 100.
- **Comida**: a geladeira guarda porções. Peça mercado pelo telefone, compre no
  mercado do centro ou na feira de sábado, ou colha do jardim.
- **Cesta da prefeitura**: casa sem comida, sem nada a caminho e sem dinheiro
  para o mercado recebe uma cesta de graça durante o dia, no máximo a cada
  dois dias. É uma rede, não um salário: o aviso lembra de arrumar trabalho.
- Um emprego no primeiro cargo mais ou menos empata com as contas e a comida
  de um casal; dois empregos, ou uma promoção, fazem sobrar.

### Trabalho e escola

- Dez carreiras de dez cargos. Uma hora antes do turno a carona encosta na
  calçada; o folk vai sozinho, some durante o turno e volta pago.
- **Promoção** pede desempenho, habilidades, amigos da família e o respeito
  do chefe. No painel Trabalho dá para **pedir aumento**, mudar o **jeito** do
  turno (caprichar, ir com calma, fazer amigos) e ver a equipe.
- Quase todo turno tem um **evento** com escolhas (prazo apertado, colega que
  rouba o crédito, fiscalização).
- **Frilas** no mural de cada manhã e **negócio próprio** são caminhos sem
  patrão. Jovens pegam meio período; idosos se aposentam com pensão.
- Crianças vão de ônibus para a escola, trazem lição e boletim.

### Gente

- Clique em alguém para conversar: amizade, trabalho, romance e provocação.
  O que aparece depende de como o seu folk vê o outro; a resposta, de como o
  outro vê o seu folk, dos traços, das lembranças, do humor e dos **assuntos**
  de que cada um gosta.
- Três barras por relação (amizade, romance, respeito) e lembranças que
  ficam. Sem contato, esfria.
- Telefone e **celular** (Cidade › Celular): ligar, convidar para vir, marcar
  encontro num lugar da cidade, dar festa.
- Namoro, noivado com aliança, casamento em casa, morar junto, bebê ou
  adoção, divórcio. Fofoca anda pela cidade e mexe na fama.

### Família

- **Cidade › Família**: quem mora junto, fundos e bens, dividir a família,
  juntar com outra, chamar alguém para morar, mandar para a gaveta.
- A **gaveta de famílias** guarda famílias fora de casa; dá para pôr uma num
  lote vago ou numa casa à venda, com ou sem móveis, e trocar de família
  jogada (o tempo das outras segue resumido).
- O criador abre também num folk em jogo (cabelo e roupa no espelho, traços
  com o benefício certo).
- Com o **relógio da vida** ligado, todos envelhecem (bebê, criança, jovem,
  adulto, idoso) e a família tem árvore e álbum.

### Comprar

- **Comprar** (`B`). Escolha no catálogo, clique no chão: verde cabe,
  vermelho não. `R` gira, `Esc` desiste, `Ctrl+Z` desfaz a compra.
- Muitos objetos são **por peças** (braço, encosto, pé, tampo) com estilo
  por parte; enfeites vão em cima de tampos e na parede.
- Clicar num objeto da casa abre mover, girar, guardar no inventário e
  vender (vale menos com o tempo e o uso).
- Roupas se compram no guarda-roupa (chegam em casa) ou na loja do centro.

### Construir

- **Construir** (`C`). Abas de paredes, portas e janelas, pisos,
  revestimentos, telhado, escada e andares, quintal (piscina, cerca, caminho,
  jardim). A prévia mostra verde ou vermelho, o custo e o motivo. `Ctrl+Z`
  desfaz até 40 obras e devolve o dinheiro.
- O jogo recusa obra que prenda alguém, tranque um objeto ou corte um móvel.

### Cidade

- Afaste o zoom até o mapa de **Arribada**: três bairros, centro, praça,
  biblioteca, academia com piscina, mercado, loja, cinema, bar, parque com
  lago, escola, prefeitura, hospital e delegacia.
- Clique no nome de um lugar: horário, lotação, preço e o que fazer lá. Vá a
  pé, de bicicleta, de carro (garagem) ou de táxi. Visite vizinhos pelo lote
  deles.
- A cidade tem vida: os outros namoram, casam, têm filhos, mudam de emprego e
  de casa. O **jornal** conta; a **feira** é aos sábados, há xadrez e concurso
  de culinária aos domingos e festa junina no fim do mês. Dá para deixar a
  cidade **parada** (no Jornal, "História da cidade") se quiser só a sua
  família andando.

### Perigos

- Fogo (fogão com pouca Culinária, lareira, choque), gatuno à noite (leva
  objetos de valor que cabem nos braços: nunca geladeira, fogão, cama ou
  vaso), afogamento e fome. Extintor, detector de fumaça e alarme ajudam;
  bombeiros e polícia vêm pelo telefone.
- Com a morte ligada, **Seu Sereno** vem buscar, e às vezes aceita uma
  barganha no par ou ímpar. Sem morte, quem passa do limite desmaia, escapa por um triz e fica um tempo
  de molho.

### Opções

- **Opções**: salvar, três vagas de jogo com miniatura (exportar e importar),
  som e volumes, tamanho da letra, tabela de atalhos (`H`) e rever os
  primeiros passos.
- **Imagem**: **Automática** (bonita enquanto o jogo anda bem; se engasgar
  por alguns segundos, fica leve sozinha e avisa), **Bonita** ou **Leve** (sem
  sombras e só os vizinhos de porta detalhados). "Mostrar quadros por
  segundo" põe um contador no alto da tela. As sombras só aparecem de perto
  em qualquer modo.

### Atalhos

| Tecla | Faz |
| --- | --- |
| `Espaço`, `0` | pausa e volta |
| `1` `2` `3` `4` | velocidades (4 = pular) |
| `Shift` + clique | põe na fila |
| `Tab` | próximo morador |
| `Q` `E` | gira a câmera |
| `Home` `End` `P` | modos de vista e fixar |
| `PageUp` `PageDown` | andar de cima e de baixo |
| `B` `C` | comprar e construir |
| `R` | gira o objeto na mão |
| `Ctrl+Z` | desfaz compra ou obra |
| `Esc` | fecha o menu ou desiste |
| `H` | tabela de atalhos |

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
    pace.ts         plano 2: quando dá para pular e os gestos de quem espera ordem
    activity.ts     plano 2: lugares nos objetos, área de visão, postura, etapas e canais da TV
    kitchen.ts      plano 2: pratos da casa, etapas do cozinhar, travessa com porções, esfriar e estragar
    hobbies.ts      plano 2: livros com progresso, romance/programa/música, quadro no cavalete, corrida e janela
    rng.ts          RNG com seed (mulberry32)
    world.ts        criação do mundo a partir de um mapa em texto
    save.ts         formato de save versionado e migrações
    skills.ts       experiência, níveis e bônus de habilidade
    career.ts       turnos, desempenho, promoção e demissão
    relations.ts    relações dirigidas (amizade, romance, respeito), afinidade, lembranças
    social.ts       quem pode conversar com quem e a chance de o outro topar
    economy.ts      tostões, contas, preço de revenda e regras de onde um objeto cabe
    services.ts     bloco 2: despensa, cartas de conta, penhora, jornal, pedidos e campainha
    rooms.ts        bloco 3: cômodos, nota de ambiente, luz do dia e das luminárias, nome do cômodo
    furnish.ts      bloco 4: faixas, depreciação, objeto querido, lugar à mesa, atividades a dois
    marriage.ts     bloco 10: noivado, casamento, sobrenome, economias e mudança
    kids.ts         bloco 11: idade, bebê, herança, cuidados, escola e boletim
    build.ts        modo construção: planos de obra, custo, validação, desfazer
  data/       conteúdo como dados: objetos (com preço e categoria), pisos,
              revestimentos e preço de parede, porta e janela (build.ts), traços,
              necessidades, habilidades, carreiras, conversas (socials.ts),
              lembranças (memories.ts), vizinhos (neighbors.ts) e casa inicial
  game/       cena 3D (Three.js): só lê o estado e manda comandos
    GameView.ts     câmera, luz, entrada do mouse e laço de quadros
    controller.ts   ponte entre a tela, a HUD e a Sim
    viewMode.ts     plano 2: os quatro modos de vista e quando o telhado some sozinho
    art/            modelos e texturas, tudo gerado por código
      textures.ts     texturas pintadas em canvas, com granulado
      build.ts        ajudantes de malha e material
      house.ts        pisos, paredes (com corte), portas, janelas e telhado
      furniture.ts    um modelo por objeto, com as âncoras de sentar e deitar
      folk.ts         folk de proporção adulta: juntas, mãos, rosto em peças
      anims/          plano 2: animações como dados (andar, conversa, gestos,
                      atividades) e o tocador com mistura de poses
      scenery.ts      jardim, cerca, rua e vizinhança
      palette.ts      cores
  ui/         HUD em HTML/CSS por cima do canvas
  i18n/       textos da interface (pt-BR.ts)
  platform/   IndexedDB
tests/        testes do núcleo
```

Decisões principais do núcleo:

- **Tick fixo**: 1 tick = 1 minuto de jogo. A velocidade só muda quantos ticks
  rodam por segundo real (1, 3, 10 ou 60 no pular; a tela avança por
  acumulador e interpola o passo entre ticks). A simulação nunca vê tempo real.
- **Sem autonomia na família** (plano 2): `pickAutonomous` só roda para visitas;
  morador parado chama `reflex` (fogo perto, susto com gatuno). Ordem nova
  passa por `enqueuePlayer`, que larga a fila com `abandon` (saída limpa) a
  menos que o comando venha com `append: true`. `sim/pace.ts` diz quando dá
  para pular (`canSkip`, `skipBlocker`) e qual gesto de espera mostrar
  (`idleGesture`).
- **Motor de atividades** (plano 2, bloco 4): `sim/activity.ts` é puro
  (`spotsOf`, `spotPlaces`, `viewArea`, `bestSeat`, `keepsPosture`,
  `stagesOf`); o Sim guarda `Folk.posture` (sentado, com `rising` na saída),
  `Folk.carry` (prato no colo) e, na ação, `seatAt`, `slot` (lugar), `stage`
  e `stageLeft`. `stepPosture` roda antes de `processAction`: levanta quando a
  ação da vez não se faz sentado ali, e senão aplica o que a TV, o som e o
  fogo rendem a quem está sentado em frente. `windDown` faz a ordem nova e o
  cancelar passarem pela etapa de saída. As interações de assistir, os canais
  e "Sentar" entram nos objetos por `data/activities.ts`.
- **Etapas das tarefas** (plano 2, bloco 6): `data/chores.ts` acrescenta aos
  objetos as interações por prato e as etapas escondidas (`step`: fetch, prep,
  stir, plateUp), as fases do chuveiro (`phases`), as etapas da privada e o
  `after: 'washHands'`. No Sim, a ação de cozinhar leva um `CookJob` e muda de
  objeto (`retarget`) sem mexer na fila; a travessa é uma `Mess` do tipo
  `meal` com `MealInfo`, e servir transforma a ação em `eatServed` com o
  `ServedPlate` na mão. Regras puras em `sim/kitchen.ts`.
- **Lazer a fundo** (plano 2, bloco 7): `data/hobbies.ts` traz o computador,
  o violão, o tapete de ioga e a caixa de blocos, e acrescenta aos objetos
  antigos as interações com `book`, `project`, `canvas`, `screen` e `jog`.
  O progresso dos livros fica em `Folk.books`, os trabalhos em andamento em
  `Folk.projects` (prontos contam em `Folk.works`) e o quadro em
  `WorldObject.canvas`. Livro largado é uma `Mess` do tipo `book`, que a
  arrumação devolve à estante (`returnBook`). Regras puras em `sim/hobbies.ts`.
- **Peças e estilo** (plano 2, bloco 8): `sim/parts.ts` tem os tipos de kit e
  as peças (`assemble` valida encaixe, tamanho e preço), `sim/style.ts` os
  materiais, cores e padrões, e `sim/modular.ts` superfícies, empurrão,
  giro em 8 e altura na parede. `data/modular.ts` liga os kits aos móveis e
  traz os objetos novos; o desenho dos kits está em `game/art/parts.ts`, as
  texturas de acabamento em `game/art/finish.ts` e o editor em
  `ui/styleEditor.ts`. `WorldObject` guarda `parts`, `style`, `nudge`,
  `turn8` e `lift`.
- **Roupas** (plano 2, bloco 9): `sim/clothes.ts` tem as peças (`GARMENTS`),
  ocasiões, conjuntos (`Ensemble`), o guarda-roupa (`Folk.closet`, criado da
  aparência antiga por `legacyCloset`), `ensembleOf` (o que veste agora) e
  `fitEnsemble` (acerta para a idade). Peças compradas ficam em
  `Household.garments`. Pintura em `game/art/garb.ts` (texturas
  `garb:peça:parte:áreas`), modelo em `game/art/folk.ts`, painel em
  `ui/wardrobe.ts` (reusa `zonePicker` do editor de estilo).
- **Jogador de teste** (`tests/helpers/player.ts`): as semanas inteiras dos
  testes rodam com um roteiro que manda como um jogador atento (atende porta
  e telefone, apaga fogo, cuida do bebê, manda dormir às 23h e comer com fome
  pela metade, e no resto escolhe pela conta de utilidade de `ai.ts`). Tudo
  por `dispatch`, só para quem está parado.
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
  móveis da casa. Desde o bloco 2 chegam como carta (`household.bills`,
  detalhada em luz, água e móveis) e só saem do caixa quando alguém paga.
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
- **Casa viva (bloco 1)** mora em `sim/upkeep.ts`: `WorldObject.state`
  (sujeira, desgaste, quebrado, remendado, progresso do conserto, lixo da
  lixeira) e `world.mess` (pratos, poças, lixo). Interações de cuidado têm
  `care` (`clean`, `repair`, `service`, `empty`, `dishes`, `dump`) e só abrem
  quando há o que fazer; `hidden` marca as que só vêm encadeadas (lavar a
  louça, jogar o saco no latão). A `Sim` chama `wearTick` a cada minuto de
  uso, `afterUse` no fim (quebra, prato, poça, lixo) e encadeia o passo
  seguinte na frente da fila. Bagunça é recolhida pela ação `tidy`. A IA soma
  as opções de cuidado com nota própria vezes `careDrive` (traços `tidy` e
  humor); o ambiente soma o estado dos objetos e a bagunça vezes `messSense`.
- **Cômodos e luz (bloco 3)** moram em `sim/rooms.ts`: `roomsOf` (cache pela
  assinatura do grid), `roomScore` (peça por peça), `roomLight`, `isDark`,
  `roomKind`. `ObjectDef` ganhou `layer` ('wall' | 'floor' | 'ceiling', não
  ocupa o chão, veja `blocksFloor` e `wallBehind` em `sim/grid.ts`), `light`
  e `room`; `WorldObject.lit`; `InteractionDef.light` ('on' | 'off');
  `FloorDef.ambience/cover`, `CoveringDef.ambience`; `TraitDef.roomTaste` e
  `saver`; `household.lightMinutes`. `nightAmount`/`daylightAt` em
  `sim/clock.ts` servem à simulação e à tela.
- **Temperamento, mês e família (bloco 5)** moram em `sim/temper.ts` (eixos,
  efeitos em decaimento, peso da IA, treino, gosto social, arrumação; hábito
  e virada a cada `HABIT_PERIOD_DAYS`; `fullLook`) e `sim/family.ts`
  (`FamilyDraft`, `familyProblem`, `wearOf`); o mundo da família criada sai de
  `data/family.ts` e os meses de `data/months.ts`. `Folk` ganhou `temper`,
  `month`, `outfit` e `habits`; `Look` ganhou `style`, `face`, `body`,
  `formal`, `sleepwear` e `swimwear`; `TraitDef.temper` diz para onde o
  traço puxa; `InteractionDef` ganhou `dress`, `wear` e `hold`. Save v10.
  A tela fica em `ui/creator.ts` e o retrato em `GameView.portrait`.
- **Vontade, balões e desejos (bloco 6)** moram em `sim/will.ts` (`isEffort`,
  `refusal`, `setThought`/`thoughtOf`/`think`, `sleepPressure`, `wakeTime`,
  `ALARM_LEAD`, ânimo e `inspire`; `hashFloat` tira sorte de um hash sem
  andar o RNG do mundo) e `sim/wishes.ts` (`rollWishes`, ganchos
  `wishOnUse/Talk/Tidy/Buy/Host`, puxões da IA). Os desejos ficam em
  `data/wishes.ts`. `Folk` ganhou `thought`, `wishes`, `wishDay`, `spark`,
  `inspired` e `alarm`; comandos `inspire` e `setAlarm`; problemas
  `refused` (motivo em `Sim.lastRefusal`) e `noSpark`. `isSleep` saiu de
  `sim.ts` para `will.ts`. Na tela: balão 3D `th:<tipo>:<ícone>` em
  `art/textures.ts` (desenho dos ícones em `ui/icons.ts`, `ICON_PATHS`),
  gestos `refuse`/`cheer` e cara `tired` em `art/folk.ts`, cartões de aviso
  por `noticeIcon` em `game/controller.ts`. Save v11.
- **Carreiras e amigos (bloco 8)**: carreiras em `data/careers.ts`
  (gerador com exigências, `friends`, `vehicles` e `uniforms` por faixa);
  `sim/career.ts` ganhou `familyFriends`, `missingFriends`, `FRIEND_AT`,
  `tierOfLevel`, `vehicleOf`, `uniformOf`, `rideFor`/`ridesWaiting`
  (`RIDE_GRACE`, `HONK_AGAIN`) e `adsOfDay`. `coolRelations` em
  `sim/relations.ts` usa `coolFactor(Afeto)`. `sim/work.ts`: eventos com
  `chained` e resultado com `chain` (fica em `Job.chain`), `staffShuffle` e
  `promoteNewBoss`. Recompensas em `data/rewards.ts` (`ObjectDef.reward`,
  `household.unlocked`, problema `locked`) com arte em `game/art/rewards.ts`;
  caronas em `game/art/vehicles.ts` (tela em `GameView.updateRides`);
  uniforme em `FolkModel(look, wear, uniform)` com texturas `uni:...`.
  `Outfit` ganhou 'work'. Save v12 (cargo antigo x2, chefes novos).
- **Festas e grupo (bloco 9)**: assuntos em `data/topics.ts` e gostos em
  `sim/topics.ts` (`seedInterests`, `reactionTo`, `pickTopic`, `catchTopic`);
  rodas em `sim/circles.ts` (`Circle`, `CIRCLE_MAX`, lugares N/L/S/O);
  panelinhas em `sim/cliques.ts` (`findCliques`, `rivalPairs`,
  `partyFriction`). Em `sim.ts`: `stepCircles`, `stepPhone`, `stepParty`,
  `endParty`, `partyGrade`, desvio local em `giveWay`/`spreadOut`. Comandos
  `startCircle`, `joinCircle`, `phoneFriend`, `throwParty`, `answerPhone`.
  Mesa `buffet` em `art/furniture4.ts`; balão `topic` em `art/textures.ts`
  (ícones `TOPIC_PATHS` em `ui/icons.ts`). Save v13.
- **Som, música e saves (bloco 7)**: a parte pura do som de casa fica em
  `sim/music.ts` (`STATIONS`, `favoriteStation`, `danceBonus`, `pressTune`,
  `stereosIn`, `playing`); `WorldObject.tune` é opcional (sem save novo) e
  `InteractionDef.tune` é o botão ('on' | 'next' | 'off', helpers `tuning()`
  em `data/interactions.ts`). O áudio mora em `src/audio/`: `compose.ts`
  (estilos e compassos, puro), `folkes.ts` (voz, sílabas e entonação, puro),
  `sounds.ts` (som de cada ação, linha do log e comando, puro), `prefs.ts`
  (volumes no localStorage), `engine.ts` (WebAudio: canais, instrumentos,
  efeitos, sons contínuos e fala), `player.ts` (toca um estilo com
  antecedência) e `director.ts` (olha o mundo a cada quadro e decide o que
  soa; `GameView.hearing` dá volume e lado pela câmera). A interface só avisa
  por `audio/cues.ts`. As vagas ficam em `platform/slots.ts` (atrás de
  `SaveBackend`; o IndexedDB é `idbBackend` em `saveStore.ts`), com
  exportar/importar; os cartões Jogos e Som estão em `ui/system.ts`.
- **Andares (bloco 12)**: o `Grid` continua com `h` = fundura do lote; o
  andar n ocupa as linhas `[n * (h + LEVEL_GAP), ... + h)` do mesmo `floor`,
  e as duas linhas do vão entre andares ficam fora do terreno (`inBounds`
  devolve false). Assim posições de folks e objetos seguem sendo (x, y) e
  todo o resto (cômodos, compra, IA) funciona em qualquer andar; o andar sai
  de `levelOfRow`. Piso `void` é o vão (ninguém pisa). Escadas em
  `grid.stairs` (`stairPlan`: pé, três degraus, patamar e vão em cima) viram
  `nav.links`; o A* (`findPath`), `reachable` e `canStep` andam por elas, e do
  degrau só se sai pela escada. `grid.columns` e `grid.roof`; o telhado sai de
  `sim/roof.ts` (`roofMask`, `roofHeights`). Na tela, cada andar é um grupo em
  `House` (subido `LEVEL_H` e trazido de volta para cima do térreo) e
  `sceneZ` converte linha do grid em posição de cena.
- **Quintal (bloco 13)**: pisos com `yard` (só no térreo) e `water` (a
  piscina, que `buildNav` bloqueia); `ObjectDef.pool` ('in' na água, 'edge' na
  borda) e `sim/yard.ts` (`poolProblem`, `poolOf`, `poolHasLadder`). Cercas são
  `EdgeKind` 'fence' | 'lowwall' | 'gate': `splitsRoom` ignora cerca e meia
  parede, `isDoorway` deixa passar o portão; o comando `buildFences` traça a
  linha. Jardim em `sim/garden.ts`: `WorldObject.plant` (água, crescimento,
  saúde, frutos), `gardenHour` a cada hora, `World.rain` sorteado por
  `rollWeather` às 4h, `harvest` usa a despensa; o jardineiro é um prestador
  como a faxineira (`household.gardener`, `services.ts`). Na tela,
  `game/art/yard.ts` desenha a planta pelo estado e `updateRain` faz os riscos
  de chuva (fora do `worldRoot`, que é limpo a cada novo jogo).
- **Perigos (bloco 14)** moram em `sim/peril.ts` (regras puras: `addFire`,
  `fireMinute` que esquenta, espalha e queima, `douseFire`, `fireSideTiles`,
  `smokeSeen`, `lootTarget`, `burglarNight`, `throwFingers`/`bargainWon`,
  `spiritStep`) e no bloco "perigos" de `Sim` (`stepPerils`, equipes
  `firefighter`, `police`, `burglar` e `reaper` como prestadores sem
  campainha, `fall`, `bargain`, `die`, `mourn`, `stepSpirits`). `World`
  ganhou `fires`, `help`, `passings`, `departed`, `spirits`, `rules.death` e
  `lastBurglary`; `Folk`, `down`, `adrift`, `starving`, `mourning`,
  `frightened`; `WorldObject`, `blaze` e `memorial`. Objetos em
  `data/peril.ts`, arte em `game/art/peril.ts` (`flames` serve à lareira e ao
  fogo solto); `GameView.updatePerils` desenha fogo, fumaça, jato e fantasma.
  `Sim.objectStamp` avisa a tela quando a simulação tira ou põe objeto.
- **Bairro (bloco 15)** mora em `sim/town.ts`. O `World` continua sendo o
  lote em jogo; `World.town` guarda os lotes (`Lot.home` com grid, objetos e
  saída dos lotes fora de jogo), as famílias (`Family`, com `stash` da família
  guardada) e o mural. Quem é de uma família fora de jogo é vizinho com
  `Neighbor.home`. Comandos `playFamily`, `moveHouse` e `foundFamily`;
  `townDay` faz a vida resumida às 3h; `streetDoor` escolhe a ponta da
  calçada das visitas. Planta do bairro e das casas em `data/town.ts`; o
  painel em `ui/town.ts`.
- **Cidade aberta (plano 2, bloco 12)** mora em `sim/city.ts` (regras puras:
  onde cai cada lote, `lotPlace`/`toCity`/`toLocal`, as ruas, `streetRoute`
  pela rua, tempo e preço de cada jeito de ir, `travelProblem`, `tripState`
  e os níveis de simulação `lotLevel`/`personLevel`/`centroLevel`). A planta
  da cidade (bairros novos, famílias e casas) em `data/city.ts` (`CITY`);
  `growCity` em `sim/town.ts` põe os bairros que faltam. Quem anda pela
  cidade fica com `Folk.away.trip` e `World.trip` (comandos `goDowntown` e
  `goHome` com `mode`, `visitLot`, `buyVehicle`, `sellVehicle`; `Sim.stepTrip`).
  Sem `Town.city` (o bairro sozinho dos testes antigos) o táxi leva na hora,
  como no bloco 16. A arte em `game/city.ts` (`CityLayer`: a cidade posta em
  volta do lote mostrado, malhas juntadas por material e em pedaços de 64
  tiles, casa detalhada só perto da câmera, etiquetas e ícones) e a escolha
  do jeito de ir em `ui/travel.ts`.
- **Lugares (plano 2, bloco 13)**: regras puras em `sim/places.ts`
  (`placeOpen`, `crowdOf`, `placeProblem`, `insideOf`, `styledShift`,
  `styledGrade`, `deliverGarments`); a planta de cada lugar (`PlaceDef`, com
  `rect` na cidade, horário, lotação, preço, planos e recados) e as plantas
  dos lotes em `data/places.ts`; objetos novos com arte em
  `game/art/places.ts`. `goDowntown` leva `place` e `plan`; comandos
  `runErrand` e `setStyle`. Os prédios e o cartão do lugar em `game/city.ts`
  e `ui/town.ts`.
- **Cidade viva (plano 2, bloco 14)**: três módulos puros. `sim/cityEvents.ts`
  é o calendário (ciclo de 4 semanas, `liveEvents`, `upcomingEvents`,
  `eventReady`, pontos dos concursos sem gastar o sorteio do mundo).
  `sim/routine.ts` calcula onde cada morador está a cada minuto (`dayPlan`
  por pessoa e dia, `whereIs`, `peopleAt`, `freeToMeet`) por hash, sem
  guardar nada no save e sem gastar o sorteio do mundo; a arte usa isso para
  desenhar os bonecos nas ruas (`updateCrowd` em `game/city.ts`) e o
  passeio usa para escolher quem aparece no lugar. `sim/story.ts` roda uma
  vez por dia depois de `townDay` (`storyDay`: namoro, casamento, filhos,
  empregos, mudanças, reformas, chegadas) e escreve no feed; `census` e
  `cityProblems` servem ao jornal e ao teste de 30 dias. Estado em
  `town.story` e `rules.story` (save v34). O encontro pelo celular é
  `goDowntown` com `meetId`; o concurso é a interação `special: 'contest'`
  ligada a um `event`. Telas em `ui/town.ts` (abas Celular e Jornal).
- **Quadros por segundo (plano 2, bloco 12)**: medidos no Chromium sem placa
  de vídeo (SwiftShader, desenho todo no processador, 1280x800), que só serve
  para comparar: antes da cidade, 3,3 quadros por segundo na vista da casa;
  com a cidade, 2,8 na vista da casa, 2,4 na vista intermediária e 4,1 no
  mapa inteiro. Numa placa de vídeo comum o jogo fica no teto da tela.
- **Acabamento (plano 2, bloco 15)**: `mergeByMaterial(g, true)` em
  `game/city.ts` junta cada lote vizinho detalhado numa malha por material
  (caixas de várias cores viram um pedaço por face; o que a casa escondeu
  fica de fora). Chamadas de desenho por quadro, mesma medição: casa 2.742 →
  1.949, bairro (altura 60) 6.873 → 2.278. `GameView.applyQuality` desliga a
  sombra do sol acima da altura 44 (volta abaixo de 36), aplica a imagem
  leve (`CityLayer.lite`: raio de detalhe 24 em vez de 48) e mede os quadros
  para a qualidade automática; preferências `quality` e `fps` em `UiPrefs`.
  Equilíbrio: `carryable` em `sim/peril.ts` (o gatuno só leva o que cabe nos
  braços), `needsAid`/`sendAid` em `sim/services.ts` (cesta grátis, no
  máximo a cada dois dias, `household.aidAt` opcional, sem save novo),
  `BILL_BASE` 20, `BILL_RATE` 0,008 e `LIGHT_RATE` 0,006; teste de quatro
  semanas em `tests/balance.test.ts`. Primeiros passos em `ui/tour.ts`
  (passos puros em `stepOfCommand`/`nextTourStep`, estado em
  `localStorage` `thefolk.tour`).
- **Centro (bloco 16)** mora em `sim/downtown.ts` (regras puras: horário,
  quem pode ir, chance de topar sair, nota e efeito do encontro) e nos
  métodos `goDowntown`, `goHome`, `stepOuting`, `stepWaiter`, `dineWait`,
  `endDate` e `stepHomeFolks` do `Sim`. `World.outing` guarda a casa
  (`OutingHome`, com quem ficou), o encontro (`DateState`), os pedidos do
  restaurante e as encomendas; `World.lastDate` a última nota. A planta do
  centro, o cardápio, os presentes, os objetos e a gente do centro estão em
  `data/downtown.ts` (`Catalog.venues`, `dishes`, `gifts`); a arte em
  `game/art/downtown.ts` e os sobrados em volta em `buildScenery(..., downtown)`.
  `Sim.lotStamp` avisa a tela quando a própria simulação traz todo mundo de
  volta.
- **Gerações (bloco 17)** moram em `sim/life.ts` (regras puras: dias de cada
  fase por ritmo, `scheduleAge`, pensão, pecúlio e herdeiros, álbum, árvore,
  `ageNeighbor` para o bairro). O `Sim` chama em `stepLife`, `ageUp`,
  `payPensions` e `inherit` (de dentro de `die`). `Age` ganhou `teen` e
  `elder` (adulto continua sem campo; `isAdult` conta o idoso); `Folk` e
  `Neighbor` ganharam `parents`, `nextAge` (-1 = já viveu tudo, sem morte),
  `pension` e `retired`; `Job.partTime` muda o turno em `levelOfJob`;
  `Away.school` separa escola de trabalho para o jovem; `Household.album`
  guarda o álbum (vai junto na troca de família); `World.rules.life` é o
  relógio. A foto vem de `GameView.photo()` (JPEG pequeno) pelo comando
  `takePhoto`.
- **Bebês e crianças (bloco 11)** moram em `sim/kids.ts` (regras puras:
  necessidades do bebê, herança, horário da escola, nota). `Folk` ganhou
  `age` ('baby' | 'child'; adulto não tem) e `kid` (nascimento, quando cresce,
  pais, nota, lição, cuidados por cuidador, descaso e aviso); `Household`,
  `expecting`; `WorldObject`, `baby` (o bebê no berço); `Neighbor`, `away`
  ('boarding' | 'fostered') e `age`. `Sim.residents()` não conta bebês;
  `household()` conta todos e `adults()` só adultos. Interações com `baby`
  (cuidado no berço), `kids` ('only' | 'no') e `homework`; conversas
  `tryBaby` e `helpHomework`; serviço `social` (visitadora). A ida à escola é
  um `away` com ação `school`, e a carona é o ônibus `SCHOOL_BUS`.
- **Vida a dois (bloco 10)** mora em `sim/marriage.ts` (estágio do casal,
  sobrenome, economias, móveis da mudança, lugar livre perto). `Relation`
  ganhou `bond` ('engaged' | 'married', com `dating` ainda true) e `ex`;
  `Neighbor` ganhou `funds` e `bornName`; `Folk`, `bornName`; `Visit`,
  `moving`; `Party`, `wedding` (par, sobrenome, estágio da cerimônia e roupas
  de antes). Conversas especiais `engage`, `wed` (votos, `hidden`), `divorce` e
  `moveOut`; `SocialRequires.bond` filtra pelo estágio. Comando `planWedding`
  usa o telefone como a festa; `stepWedding` põe os votos na fila. Objetos
  com `ring` (estojo) e `arch` (arco); a mala é o objeto `suitcase` com
  `special: 'unpack'`. `InteractionDef.couple` chama o par e `DuoDef.romance`
  dá romance por minuto a quem namora. Save v14.
- **Catálogo e atividades a dois (bloco 4)** moram em `sim/furnish.ts`.
  `ObjectDef` ganhou `tier` (0, 1, 2), `line` (a função que agrupa as faixas;
  frilas e negócios aceitam qualquer objeto da mesma `line`), `colors` e
  `dining` ('table' | 'seat' | 'both'). `InteractionDef` ganhou `duo` (efeitos
  e amizade por minuto com parceiro na mesma interação), `atTable` e `night`.
  `WorldObject` ganhou `color`, `bought`, `used`, `uses` e `beloved`;
  `Action.eatAt` é o lugar à mesa (-1 = come onde está). Valor de hoje em
  `currentValue`/`resaleValue` (`sellValue` e a conta usam). Comandos
  `undoBuy` e `closeBuy`. Modelos novos em `game/art/furniture4.ts`; cada
  `build(seed, paint)` recebe a cor da compra (`PAINT` em `palette.ts`).
- **Despensa, correio e serviços (bloco 2)** moram em `sim/services.ts`.
  `household` ganhou `pantry`, `takeout`, `bills`, `orders`, `maid`,
  `paperDay` e `readDay`. Interações novas: `portions` e `takeout` (consomem
  da casa ao começar) e `special` `services`, `payBills` e `fair`;
  `interactionReady`/`canUse` dizem se a casa tem o que precisa. Prestadores
  são `Neighbor` com `service` e entram no lote como visita com
  `visit.service`; toda visita nasce com `admitted: false`, anda até
  `frontDoor`, toca (`rang`) e espera a ação `door` de um morador. A
  faxineira e o técnico escolhem tarefas com `serviceTask` e usam as mesmas
  interações de cuidado e a ação `tidy` do bloco 1; o oficial anda até o
  objeto (`seizeTarget`) e a `Sim` remove. O jornal é bagunça do tipo
  `paper`, recolhida pela ação `tidy`.
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
- **Brinquedo novo**: `src/data/kids.ts` (`kids: 'only'` deixa só para
  criança) e o modelo em `src/game/art/kids.ts`.
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
- **Objeto que suja ou quebra**: `upkeep` no objeto (`dirt` e `wear` por
  minuto de uso, `breaks`, `bin` para lixeira) e as interações de cuidado
  prontas no topo de `objects.ts` (`clean()`, `repair()`, `service()`,
  `dishes()`). `leaves` numa interação deixa prato ou poça; `trash` manda lixo
  para a lixeira.
- **Serviço novo**: um vizinho com `service` em `neighbors.ts`; o pedido em
  `ServiceOrder` e `placeOrder`/`servicePrice` em `sim/services.ts`.
- **Comida que gasta estoque**: `portions` (despensa) ou `takeout: true`
  (comida pedida) na interação; `pantry` no objeto diz quantas porções cabem.
- **Desejo do dia**: uma entrada em `src/data/wishes.ts` (tipo, peso, puxão
  por eixo e por traço, interações ou categoria, quantidade), o texto
  `wish.<id>` em i18n e, se o ícone for novo, o desenho em `ui/icons.ts`.
- **Fato que vira cartão de aviso**: a chave do log e o ícone em `NOTICES`
  (`game/controller.ts`).
- **Som de uma ação nova**: o caso em `actionSound` (`src/audio/sounds.ts`);
  efeito novo é um `case` em `AudioEngine.sfx` (ou `loop`) em
  `src/audio/engine.ts`. Linha do log com som: `logSound` no mesmo arquivo.
- **Estação de rádio ou estilo de música**: uma entrada em `STATIONS`
  (`sim/music.ts`, com o gosto por eixo) e o estilo de mesmo id em `STYLES`
  (`audio/compose.ts`), mais o texto `station.<id>` e a cor da nota em
  `art/textures.ts`.
- **Conversa de casal**: em `socials.ts`, `requires.bond` com os estágios
  ('none', 'dating', 'engaged', 'married'); `hidden: true` tira do menu.
- **Móvel que vem na mudança**: a habilidade e o objeto em `BELONGINGS`
  (`sim/marriage.ts`).
- **Mudou o formato do `World`?** Aumente `SAVE_VERSION` em `src/sim/save.ts` e
  registre a migração no mesmo arquivo.

## Roteiro

1. **Fatia 1 (feita)**: um folk, casa pronta, necessidades, IA, fila, A*, relógio, save/load.
2. **Fatia 2 (feita)**: emprego, dinheiro, habilidades e modo compra.
3. **Fatia 3 (feita)**: outros folks, interações sociais e sistema de relações.
4. **Fatia 4 (feita)**: modo construção.
5. **Fatia 5 (feita)**: carreiras e relações aprofundadas.

O próximo passo está em [docs/plano-evolucao.md](docs/plano-evolucao.md): 17 blocos
que aproximam o jogo das mecânicas clássicas do gênero e vão além delas.

- **Bloco 1 (feito)**: casa viva: sujeira, desgaste, conserto, Jeito e Capricho (save v6).
- **Bloco 2 (feito)**: despensa, correio com contas e penhora, telefone com
  serviços, jornal com classificados, campainha e feira de sábado (save v7).
- **Bloco 3 (feito)**: ambiente por cômodo, dia e noite, luminárias que a IA
  acende e apaga, quadros, tapetes e luz de teto de compra (save v8).
- **Bloco 4 (feito)**: catálogo de 70 objetos em faixas barato, médio e caro,
  cores, depreciação, desfazer no modo compra, mesa e cadeiras separadas,
  atividades a dois e objeto querido (save v9).
- **Bloco 5 (feito)**: criar família de 1 a 8, temperamento em cinco eixos
  que muda com o hábito, mês de nascimento com afinidade, corpos, rostos,
  cortes, roupas por ocasião, guarda-roupa e objetos na mão (save v10).
- **Bloco 6 (feito)**: recusa de esforço com motivo e gesto, balões de
  vontade, conversa, bagunça e saudade, cara de cansaço, sono planejado com
  despertador, desejos do dia, ânimo e dia inspirado, cartões de aviso (save v11).
- **Bloco 7 (feito)**: som sintetizado em todas as ações, música procedural
  por modo, fala inventada com voz e entonação, rádio com três estações que
  tocam de verdade, volume e mudo, três vagas de save com miniatura,
  exportar e importar (sem save novo).
- **Bloco 8 (feito)**: dez carreiras de dez cargos, amigos da família exigidos
  na promoção, amizade que esfria (pelo Afeto), carona com buzina e uniforme
  por faixa de cargo, recompensas de carreira, eventos em cadeia e equipe que
  sobe e é demitida (save v12).
- **Bloco 9 (feito)**: dez assuntos com gostos por pessoa, roda de conversa
  de até quatro, telefone social, festa com convites, buffet, nota, fama ou
  fofoca e reclamação de barulho, panelinhas e rivais que brigam, conversas
  novas, cumprimento na porta e desvio local (save v13).
- **Bloco 10 (feito)**: pedido de casamento com aliança, casamento em casa
  com cerimônia e sobrenome, morar junto com economias, mala e móveis,
  mudar alguém para fora, divórcio com divisão do dinheiro, cama de casal
  com deitar abraçadinho e conversas de casal (save v14).
- **Bloco 11 (feito)**: bebê por tentativa do casal ou adoção, berço com
  mamadeira, fralda, colo e ninar, choro que acorda, visitadora social,
  criança menor com escola, ônibus, lição, boletim e colégio interno,
  brinquedos e temperamento herdado e aprendido (save v15).
- **Bloco 12 (feito)**: térreo e dois andares, escada com caminho entre
  andares, piso e paredes de cima com apoio, telhado automático de duas ou
  quatro águas com cor, meia parede, coluna, porta de vidro, porta dupla,
  arco, janela alta e basculante, botões de andar e clique que não atravessa
  parede (save v16).
- **Bloco 13 (feito)**: piscina cavada com escadinha e trampolim, nadar e
  mergulhar com roupa de banho, cerca, mureta e portão que bloqueiam o
  caminho, caminho de pedra e deck, jardim vivo que cresce, floresce, murcha
  e dá frutos para a despensa, chuva, jardineiro, churrasqueira, mesa de
  jardim e rede (save v17).
- **Bloco 14 (feito)**: fogo que começa, espalha e é apagado (extintor ou
  bombeiros), detector de fumaça, choque que pega fogo, gatuno com alarme e
  polícia, afogamento, fome e fogo que matam, Seu Sereno e a barganha no par
  ou ímpar, lápide e urna, fantasma, luto, lareira e a opção "sem morte"
  (save v18).
- **Bloco 15 (feito)**: bairro com dez lotes e vista de cima, seis famílias
  de vizinhos em casas de verdade, trocar de família e voltar, mudança com
  venda da casa, família nova em lote vago ou casa à venda, vida resumida das
  outras casas e visitas que vêm da casa delas (save v19).
- **Bloco 16 (feito)**: centro da cidade de táxi com praça, cantina (garçom
  e cardápio), café e bazar; encontros com nota de 1 a 5 que muda a relação;
  presentes, roupas e encomendas que chegam em casa; figurantes para
  conhecer; quem fica em casa segue a vida (save v20).
- **Bloco 17 (feito)**: relógio da vida opcional (criança, jovem, adulto,
  idoso e despedida), meio período do jovem, aposentadoria com pensão,
  herança de pecúlio e objetos queridos, árvore da família, álbum com fotos
  e marcos, bairro envelhecendo junto (save v21). Com ele o plano de
  evolução (`docs/plano-evolucao.md`) está completo.

O segundo plano está em [docs/plano-evolucao-2.md](docs/plano-evolucao-2.md):
15 blocos que mantêm o visual e trazem a jogabilidade para perto dos jogos
mais novos do gênero (jogador comanda tudo, tempo mais lento, HUD nova,
atividades em etapas com animação, folks e objetos modulares, criador com
traços e cidade aberta com o bairro dentro dela).

- **Bloco 1 (feito)**: fim do jogo sozinho na família (gestos de espera e
  reflexos), ordem nova substitui a atual com saída limpa e `Shift` põe na
  fila, tempo em 1, 3 e 10 minutos por segundo mais o pular, sem aumento de
  objetos sob o mouse e jogador de teste nas semanas dos testes (save v22).
- **Bloco 2 (feito)**: HUD nova. Painel do folk no canto com retrato de
  expressão ao vivo, humor num medidor e oito abas (necessidades, sensações,
  habilidades, carreira e escola, relações, temperamento e traços, desejos,
  inventário); retratos da família em coluna (clique duplo leva a câmera);
  fila em ícones com o progresso da ação de agora, clique cancela e arrastar
  muda a ordem; barra do relógio embaixo com as velocidades 0 a 4 e o
  dinheiro (abre contas e salários); modos viver, comprar, construir,
  família, cidade e opções; menu de interações em anel, agrupado quando passa
  de seis opções e com o indisponível em cinza e o motivo; avisos que levam a
  câmera ao lugar, com histórico; letra pequena, média ou grande e tabela de
  atalhos (H). O save não subiu (preferências ficam no navegador).
- **Bloco 3 (feito)**: telhado em toda casa. Cobre toda a área construída
  (cômodos, varanda coberta e garagem, também nas casas do bairro), com
  quatro águas, duas águas ou uma água, três inclinações, seis cores e laje
  plana com platibanda por trecho. Quatro modos de vista num controle só
  (telhado à vista, paredes inteiras, recortadas e baixas; Home e End trocam,
  P fixa); o telhado some sozinho na obra e de perto e volta ao afastar.
  Fachada com testeira, calha e condutor, cumeeira e oitão na textura da
  parede (save v23).
- **Bloco 4 (feito)**: motor de atividades. Lugares em todo assento, sentar
  e levantar como etapas, postura sentada entre uma ação e outra, TV com
  canais assistida do melhor assento, conversa e prato no colo sentado (save v24).
- **Bloco 5 (feito)**: corpo e rosto novos. Esqueleto com quadril que
  balança, tronco em duas partes, pescoço, ombros, pulsos, mãos que abrem,
  fecham, seguram e apontam, e tornozelos; biblioteca de animações como dados
  com mistura entre uma e outra; cinco jeitos de andar (normal, com pressa,
  cansado, triste, alegre); variações de laço sentado, vendo TV, lendo,
  falando e ouvindo. Rosto em camadas (cabeça, olhos, cor dos olhos, cílios,
  sobrancelhas, nariz, boca, orelhas, barba, marcas e rugas com a idade) na
  textura com o dobro da resolução, onze expressões, piscar, olhar para quem
  fala e boca mexendo com a fala; peças do rosto no criador e herdadas dos
  pais (save v25).
- **Bloco 7 (feito)**: atividades a fundo II. Computador com telas, livros de
  habilidade com progresso salvo, romance, programa e música que rendem
  prontos, quadro que aparece no cavalete, instrumentos, exercícios, gestos
  de conversa por tipo, sentar junto para conversar, acompanhar até a porta,
  fala com sílabas na boca, olhar puxado pela TV e janela (save v27).
- **Bloco 10 (feito)**: criar família refeito. Sete passos, 40 traços com
  pares proibidos e efeitos, eixos convertidos em traços, sonho de vida,
  pontos e benefícios, gostos, voz, aparência com controles e herança,
  laços da família (cônjuges, pais, irmãos) e cabelo no espelho (save v30).
- **Bloco 11 (feito)**: família na cidade. Gaveta de famílias, mandar uma
  família para a gaveta, dividir e juntar famílias, chamar alguém para morar,
  casa com ou sem móveis, inventário da família, fundos e bens, criador
  aberto num folk em jogo e o benefício "Página virada" (save v31).
- **Bloco 12 (feito)**: cidade aberta de Arribada, três bairros, zoom
  contínuo, viagens a pé, de bicicleta, de carro e de táxi (save v32).
- **Bloco 13 (feito)**: lugares da cidade com horário, lotação e preço,
  mercado, pesca, cinema, bar, academia, prédios fechados com jeito no
  trabalho e na escola, recados na prefeitura, hospital e delegacia, roupas
  pela loja (save v33).
- **Bloco 14 (feito)**: cidade viva. Rotina dos outros nas ruas e nos
  lugares, famílias não jogadas que namoram, casam, têm filhos, trocam de
  emprego, mudam e reformam, famílias novas, jornal, cidade parada, feira na
  praça, festa junina, concurso de culinária, xadrez no parque e celular
  (save v34).

- **Bloco 15 (feito)**: acabamento. Lotes vizinhos detalhados juntados por
  material (bem menos chamadas de desenho), sombras só de perto, imagem
  automática, bonita ou leve, contador de quadros; gatuno que não leva
  geladeira, fogão, cama nem vaso, contas mais leves e cesta da prefeitura
  para a casa sem comida e sem dinheiro; primeiros passos em seis dicas;
  revisão de originalidade e este "Como jogar" novo (sem save novo). Com ele
  o segundo plano está completo.

## Limitações conhecidas do bloco 15 (plano 2)

- O desempenho foi medido em navegador sem placa de vídeo (desenho por
  software): o número de chamadas de desenho caiu, mas a meta de 30 quadros
  no mapa e 60 em casa não foi conferida num notebook de verdade. A
  qualidade automática cobre o caso de máquina fraca.
- A casa jogada continua desenhada peça por peça (precisa disso para
  animar e reagir), e é ela que pesa mais na vista de perto.
- As dicas de primeiros passos ficam no navegador, não no save: valem para
  todos os jogos daquele navegador.
- O jogador de teste não treina habilidades de propósito, então o equilíbrio
  das promoções foi conferido só no primeiro e segundo cargo.

## Limitações conhecidas do bloco 14 (plano 2)

- Os moradores na rua são bonecos simples (sem rosto nem animação de
  passos) e só aparecem com a câmera perto; os cachorros são só de enfeite.
- O celular só marca encontro em lugar aberto (não em casa de ninguém).
- A festa junina não tem fogueira nem roupa própria; os concursos não têm
  plateia ou jurados que se vejam.
- As reformas dos outros são um objeto de decoração por vez.
- Persistente: o lago do parque aparece só com o contorno na vista de longe.

## Limitações conhecidas do bloco 7 (plano 2)

- Videogame a dois no sofá usa o videogame que já existia (duo), sem a tela
  dividida na TV.
- Conversar pela rede não acha gente nova no bairro; só sobe o social.
- A corrida vai e volta pela calçada da casa; não passa pela cidade.
- Os quadros vendidos não viram objeto de parede (enfeites chegam no bloco 8).

## Limitações conhecidas do bloco 5 (plano 2)

- Os controles do rosto no criador são provisórios (uma linha de botões por
  peça); o criador novo com sliders chega no bloco 10.
- A boca abre e fecha num ritmo inventado; a fala inventada com sílabas e
  som é do bloco 7.
- O olhar segue quem conversa com o folk; a TV e os objetos ainda não puxam o
  olhar (o folk já fica de frente para eles).
- Barba não cresce em quem nasce no jogo (bebês nascem sem e continuam sem).

## Limitações conhecidas do bloco 1 (plano 2)

- A caminhada continua a um tile por minuto de jogo (um segundo por tile no
  normal, com o passo interpolado); o plano falava em 0,8 s.
- A carona do trabalho e o ônibus da escola ainda põem o folk a caminho
  sozinhos (como nos jogos do gênero); o jogador pode cancelar.
- Ninguém atende porta ou telefone sem ordem: quem toca vai embora e a
  ligação cai.

## Limitações conhecidas do bloco 3 (plano 2)

- Uma água sempre cai para a frente (sul) ou para o leste; o jogador não
  escolhe o lado.
- Com o telhado à vista, folks e objetos do andar de cima só aparecem se o
  andar visto for o de cima.
- Laje do andar de cima não vira terraço de pisar; terraço é piso aberto
  sem telhado.
- Não há água-furtada nem chaminé; a varanda coberta só existe no térreo.

## Limitações conhecidas do bloco 2 (plano 2)

- Os menus de lista (convidar, festa, serviços, assuntos, centro) seguem como
  cartão perto do clique; só o primeiro nível (objeto, pessoa, bagunça) é em
  anel.
- O botão Cidade abre o bairro e o táxi para o centro; o mapa da cidade vem
  no bloco 12.
- As sensações juntam estados que já existiam (necessidade baixa, inspirado,
  luto, susto, cômodo, festa); efeitos de humor novos com prazo próprio
  ficam para os blocos de atividades.
- Arrastar na fila não põe uma ação no lugar da de agora: para isso, cancele
  a atual.

## Limitações conhecidas do bloco 17

- O relógio da vida só se escolhe no jogo novo; saves antigos abrem com ele
  desligado.
- Fora de jogo, quem morre de velhice não deixa lápide no lote da família;
  os prestadores, chefes e gente do centro não envelhecem.
- O jovem não namora adulto nem noiva; jovem não cuida de bebê no berço.
- As fotos do álbum são pequenas (para caber no save) e ficam no máximo 16;
  o álbum guarda 60 páginas.
- Não tem envelhecer por "bolo de aniversário": a fase muda sozinha quando o
  relógio manda.

## Limitações conhecidas do bloco 16

- O centro é um lote só, montado de novo a cada passeio (o que se larga lá
  não fica); não dá para construir nem comprar móveis nele.
- Quem fica em casa durante o passeio não anda pela casa: só trabalho e
  escola seguem; na volta as necessidades ficam "nem bem nem mal".
- O garçom não aparece segurando a bandeja; quem vai trabalhar saindo do
  centro volta do turno para o centro.
- Festa, telefone, entregas e gatuno ficam parados enquanto a família está
  fora.

## Limitações conhecidas do bloco 15

- O bairro tem uma rua só e dez lotes fixos; não dá para criar lote novo.
- Crianças e bebês de família fora de jogo não crescem até ela voltar a jogo.
- Em volta do lote em jogo, as casas de enfeite ainda são as de antes (as de
  verdade aparecem na vista do bairro).
- Quem se muda para fora pelo divórcio vai morar fora do bairro.

## Limitações conhecidas do bloco 14

- Fumaça não passa de cômodo para cômodo; o detector vê pela distância.
- Fantasma não atravessa parede nem vai a outro andar; não há possessão de
  objetos.
- O gatuno escolhe o objeto pelo valor de revenda e não leva dinheiro.

## Limitações conhecidas do bloco 12

- Paredes só retas (sem parede diagonal) e escada só reta, de três tiles.
- O telhado é um só estilo, cor e inclinação para a casa inteira (a laje é
  por trecho), sem mansarda.
- Derrubar parede de baixo não confere se tem parede em cima apoiada nela.
- Ninguém cai do andar de cima: o vão não tem perigo, só não se pisa nele.
- Com o telhado à vista, os balões de quem está dentro aparecem por cima.
- Sem porão e sem terreno com desnível.

## Limitações conhecidas do bloco 11

- O criador de família não cria crianças; elas só chegam por bebê ou adoção.
- Criança não envelhece até o bloco 17, e bebê vira criança sempre em três
  dias.
- A escola é fora da tela (como o trabalho); não há amigos de escola nem
  visitas de colegas.
- Quem vai para o colégio interno ou é levado pela visitadora vira vizinho
  ausente e não volta.
- O bebê no colo é preso ao braço por posição fixa; de alguns ângulos fica
  um pouco à frente do corpo.

## Limitações conhecidas do bloco 10

- O estojo de aliança é um objeto no chão (um expositor); não há loja nem
  anel no inventário. A aliança na mão é pequena e quase não se vê de longe.
- A cerimônia é a conversa "Trocar os votos" dos dois noivos; convidados não
  se sentam nem se viram para o altar. Sem arco de flores, casam onde estiverem.
  Se os noivos demoram a chegar ao arco (alguém no caminho), casam onde estão.
- Quem sai de casa só leva a mala e o emprego (e metade do caixa no
  divórcio); os móveis ficam. Quem chega traz sempre dois móveis fixos pelo
  gosto, sem escolha.
- Casado com alguém de fora numa casa cheia continua morando fora; não há
  como "chamar o cônjuge" depois sem abrir vaga e convidar para morar.
- Deitar abraçadinho só chama o par que mora na casa e está livre; visita
  não deita na cama.
- Saves antigos ganham economias para os vizinhos pelo cargo; namoros
  continuam namoros (ninguém vira noivo sozinho).

## Limitações conhecidas do bloco 9

- A roda de conversa fica sempre em quatro lugares fixos (norte, sul, leste e
  oeste) em volta de um ponto livre; numa sala muito cheia ela pode não caber.
- Uma ligação de cada vez na casa; o telefone não toca enquanto alguém fala.
- Convidado de festa vem e vai a pé pela calçada; não há carro de festa.
- O desvio local é simples: duas pessoas num corredor de um tile esperam e
  contornam, mas em objetos de dois lugares ainda podem se sobrepor um pouco.

## Limitações conhecidas do bloco 8

- A carona é só cenário: não desvia de nada e várias caronas no mesmo
  horário param no mesmo lugar, uma em cima da outra.
- Colegas e chefes sobem e caem só aos domingos de madrugada, por sorteio;
  o turno deles não é simulado.
- Os cargos dos saves antigos dobram (cargo 3 de 5 vira 5 de 10, por
  exemplo); quem estava no topo fica no nono cargo.

## Limitações conhecidas do bloco 7

- O navegador só libera o som depois do primeiro clique ou tecla; até lá o
  jogo fica mudo.
- Só se ouve um aparelho de som por vez (o mais perto da câmera); dois
  rádios ligados não se misturam.
- O volume pela distância é pela câmera (o que está na tela), não por
  paredes: som na cozinha se ouve igual com a parede no meio.
- Com o jogo pausado ou nos modos de compra e construção, os sons das ações
  e as falas param; a música do modo continua.
- Importar só abre numa vaga livre; com as três ocupadas é preciso apagar
  uma antes. Jogo novo sem vaga livre ocupa a vaga em uso.
- A miniatura é tirada da vista de agora na hora de salvar (com cartões
  abertos por cima, não aparecem; o que conta é a cena 3D).

## Limitações conhecidas do bloco 6

- A recusa vale só para ordens de esforço (treinar, estudar, frila, negócio);
  ir ao trabalho e cuidar da casa nunca são recusados.
- O gesto de recusa e a comemoração duram uns dois segundos de tempo real e
  só andam com o jogo rodando (com o jogo pausado, tocam ao despausar).
- O desejo de compra se cumpre ao comprar, mesmo que a compra seja desfeita
  depois. O de receber visita conta quando o convidado aceita.
- Saudade é só balão (sem aviso no log); o balão não mostra o rosto de quem
  faz falta, só o nome na dica.
- O despertador só toca antes de turno de emprego (frila e negócio não têm
  horário). Sem emprego, há só um pouco de sono de madrugada.

## Limitações conhecidas do bloco 5

- A família criada sempre muda para a casa pronta, com duas camas; para mais
  gente é preciso comprar camas. Ainda não há escolha de lote nem de casa.
- Saves antigos não ganham guarda-roupa (dá para comprar por 380 ⟡).
- O traje de banho só aparece na banheira de hidromassagem até chegar a
  piscina (bloco 13). Roupa de festa ainda não muda nada no trabalho.
- O prato fica na frente do corpo e o pano na mão direita, sem animação de
  pegar e largar. Na cama o cobertor esconde quase todo o pijama.
- A virada de temperamento é de um ponto por período e por folk; visitas não
  mudam de temperamento.

## Limitações conhecidas do bloco 4

- Só sofás, poltronas, cadeiras e camas têm cores; quadros, tapetes e o
  resto saem na cor de fábrica. A miniatura do catálogo mostra a cor padrão.
- Atividade a dois só conta com os dois na mesma interação do mesmo objeto;
  ninguém convida o outro para jogar (quem está à toa entra sozinho, pela
  vontade da IA).
- Comer à mesa só vale para cadeira virada de frente para uma mesa (ou a
  mesa com cadeiras antiga). O folk não carrega o prato na mão no caminho.
- A cama de casal estofada dá lugar para dois e sobe a amizade de quem
  dorme junto, mas ainda não existe casamento nem "dormir de conchinha".
- O apego conta minutos de uso por objeto, não por modelo: vender e comprar
  outro igual começa do zero. A tristeza de perder o objeto querido é um
  golpe só na diversão e no conforto, sem lembrança duradoura.
- Saves antigos ficam com tudo o que tinham, sem data de compra (valem como
  usados) e com as cores padrão.

## Limitações conhecidas do bloco 3

- A luz é por cômodo inteiro: uma sala enorme com um abajur num canto fica
  igualmente "meia-luz" em toda parte. A tela acende uma luz pontual por
  luminária, sem sombra própria.
- Não há interruptor na parede: acender e apagar é na própria luminária, e o
  folk apaga ao sair sem dar a volta.
- Ninguém rouba nem estraga quadro.
- Cercado de paredes sem piso conta como cômodo; o quintal (o que encosta na
  divisa do lote) segue com o raio em volta do folk.
- Saves antigos ganham os quadros e o relógio nos lugares onde a tela os
  pendurava, o tapete da frente do sofá e uma luz de teto em cada cômodo sem
  luminária, tudo de graça.

## Limitações conhecidas do bloco 2

- Ninguém carrega sacola, prato de comida pronta ou jornal na mão: as porções
  aparecem na geladeira quando a entrega é recebida, e o jornal some ao ser lido.
- O jardineiro ficou para o bloco 13 (jardim vivo): hoje as plantas não secam.
- A feira não tem barraca na rua: é uma interação da caixa de correio, só no
  sábado de manhã. O latão da calçada continua sem caminhão de lixo.
- Visitas comem a comida pedida, mas não a da despensa. Saves antigos ganham a
  caixa de correio na calçada só se houver lugar perto da saída.
- Pedidos feitos de madrugada ficam para a manhã seguinte; comida pronta não
  atende fora do horário.

## Limitações conhecidas do bloco 1

- Sujeira só nasce do uso: a casa parada não acumula poeira. Pisos e paredes
  não sujam.
- O folk não carrega o prato nem o saco na mão: ele só anda até a pia ou o
  latão. O latão da calçada nunca enche.
- Saves antigos não ganham lixeira, pia da cozinha nem latão: sem lixeira o
  lixo some, sem latão o saco é levado até a rua. Dá para comprar os três.
- Choque é só um susto (conforto, energia e higiene); o perigo de verdade
  vem com o fogo, no bloco 14. Visitas sujam, mas não limpam.

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
- (Resolvido nos blocos 9 e 10: conversa em grupo, noivado, casamento e
  divórcio. Filhos chegam no bloco 11.)
- A reputação é um número só (não separa fama no trabalho e fama no
  bairro) e volta devagar para o meio todo dia.
- Os três chefes e a colega nova usam os mesmos rostos e corpos dos outros
  vizinhos, com cores diferentes.
- Os pesos dos eventos, chances e efeitos foram calibrados por testes e
  simulação, não por muitas horas de jogo; alguns podem estar fortes ou
  fracos demais.

### Ainda valem da fatia 4

- (bloco 12 trouxe andares, telhado e escada) Sem porão, cercas, piscina ou terreno com
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
- Não dá para criar folks novos fora do criar família: os moradores novos só
  vêm da vizinhança fixa. (Mudar alguém para fora chegou no bloco 10.)
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
- (Resolvido no bloco 2: as contas vêm detalhadas e conta atrasada traz o
  oficial de penhora.)
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
