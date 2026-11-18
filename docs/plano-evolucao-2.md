# Plano de evolução 2: jogar de perto, viver na cidade

Pedido do Cortez (18/11/2026), depois do fim do primeiro plano
(`docs/plano-evolucao.md`, blocos 1 a 17, save v21). Resumo dele: **o visual
continua perto do primeiro simulador de vida clássico, mas a jogabilidade
passa a ser um misto inspirado no terceiro e no quarto jogos da série.**

O que ele pediu, item por item, e onde cada pedido entra:

| Pedido | Bloco |
|--------|-------|
| Remover o jogo sozinho (auto play): o jogador comanda cada ação | 1 |
| A ação comandada vira a ação atual; só entra na fila com Shift | 1 |
| Tempo passando mais devagar, perto do terceiro jogo | 1 |
| Remover o aumento de móveis e itens ao passar o mouse | 1 |
| HUD mais condizente com o gênero e mais agradável | 2 |
| Toda casa com telhado; esconder o telhado ou subir as paredes até ele | 3 |
| Aprofundar como cada atividade é executada, perto do quarto jogo | 4, 6, 7 |
| Sentar no sofá ou na cadeira perto da TV e assistir | 4 |
| Folks com mais detalhe no rosto e no corpo | 5 |
| Folks executando tarefas com ações e animações de verdade | 5, 6, 7 |
| Objetos modulares | 8 |
| Roupas modulares | 9 |
| Criar família como no terceiro jogo | 10 |
| Gestão de família como no terceiro jogo | 11 |
| Cidade muito maior, no estilo do terceiro jogo | 12, 13, 14 |
| O bairro faz parte da cidade | 12 |

## Regras que valem para todos os blocos

Continuam valendo todas as regras do primeiro plano, com três mudanças.

- **Originalidade rígida.** Copiamos o *tipo* de mecânica (fila de ações com
  Shift, menu de interações ao redor do objeto, mundo aberto, traços de
  personalidade, criador com controles deslizantes), nunca a *expressão*:
  nada de nomes, textos, ícones, sons, interface, listas de traços, sonhos de
  vida ou carreiras copiados. Tudo tem nome e cara nossos; na dúvida, inventar.
- **Visual travado** pela direção de arte já registrada (3D low-poly gerado
  por código, câmera 2:1, pixels nítidos, 16 bits, sem PBR nem
  pós-processamento moderno). Mais detalhe quer dizer mais geometria e
  textura no mesmo estilo, nunca outro estilo.
- **Arquitetura**: `World` JSON puro, mudanças só por `Sim.dispatch`, lógica
  em módulos puros de `src/sim/`, conteúdo em `src/data/`, textos em
  `src/i18n/pt-BR.ts`, determinismo pelo RNG do mundo. O `sim.ts` já tem quase
  6.000 linhas: código novo vai para módulos próprios, e um bloco que mexer
  fundo numa parte antiga deve tirá-la do `sim.ts`.
- **Save**: cada bloco que muda o `World` sobe `SAVE_VERSION` em um e registra
  a migração; um save v21 tem que abrir no fim do plano. As versões previstas
  estão na tabela; bloco sem mudança no `World` não sobe e os seguintes descem.
- **Mudança 1, equilíbrio sem IA.** Sem jogo sozinho, a simulação de 7 dias
  passa a usar um **jogador de teste** (`tests/helpers/player.ts`, criado no
  bloco 1): um roteiro que dá ordens como um jogador atento (come quando a
  fome passa de metade, dorme às 23h, vai ao trabalho). Pronto quer dizer que
  a casa não entra em colapso com esse jogador e que, sem nenhuma ordem, os
  folks sofrem as consequências (fome, sujeira, acidente) sem travar o jogo.
- **Mudança 2, captura em movimento.** Como o centro deste plano é animação,
  cada bloco de atividade ou corpo grava, além das capturas `blocoNN-*.png`,
  uma sequência curta de quadros (`blocoNN-*-anim.png`, uma tira com 6 a 8
  quadros) mostrando a ação acontecendo.
- **Mudança 3, nomes das capturas.** Para não misturar com o primeiro plano,
  as capturas deste plano usam o prefixo `p2-blocoNN-` em
  `/mnt/project-files/thefolk/`, e as memórias se chamam `thefolk-p2-blocoNN.md`.
- **Pronto quer dizer** (igual ao primeiro plano): testes Vitest novos e
  antigos passando, `tsc` limpo, build ok, capturas, README atualizado
  (como jogar, arquitetura, adicionando conteúdo, limitações e roteiro),
  memória, commit e push direto na `main`.

## Visão geral

| # | Bloco | Save |
|---|-------|------|
| 1 | Comando do jogador e ritmo do tempo | v22 |
| 2 | HUD nova | v23 |
| 3 | Telhado em toda casa e modos de vista | v24 |
| 4 | Motor de atividades: etapas, lugares e multitarefa | v25 |
| 5 | Corpo e rosto novos dos folks | v26 |
| 6 | Atividades a fundo I: cozinha, mesa, banheiro e cama | v27 |
| 7 | Atividades a fundo II: lazer, estudo, trabalho em casa e convívio | v28 |
| 8 | Objetos modulares | v29 |
| 9 | Roupas modulares | v30 |
| 10 | Criar família: traços, sonho de vida, gostos e aparência | v31 |
| 11 | Gestão de família na cidade | v32 |
| 12 | Cidade aberta: o bairro dentro da cidade | v33 |
| 13 | Lugares da cidade: aonde ir e o que fazer | v34 |
| 14 | Cidade viva: rotina dos outros e história que anda sozinha | v35 |
| 15 | Acabamento: desempenho, equilíbrio e primeiros passos | v36 |

Por que essa ordem:

- **1 e 2 primeiro** porque mudam como se joga cada minuto: sem eles, todo o
  resto seria testado com folks que fazem as coisas sozinhos e uma HUD que vai
  ser trocada.
- **3 cedo** porque é pequeno, independente e muda a vista de todos os blocos
  seguintes (e das capturas).
- **4 antes de 5, 6 e 7**: o motor de etapas e lugares define o que uma
  animação precisa saber (onde parar, para onde olhar, o que segurar). O
  corpo novo (5) vem antes das atividades a fundo (6 e 7) para que elas já
  sejam animadas no corpo definitivo, e não refeitas depois.
- **8 e 9 depois das atividades**: os objetos modulares precisam dos lugares
  (assento, superfície, ponto de uso) do bloco 4, e as roupas modulares
  precisam do corpo novo do bloco 5.
- **10 e 11 antes da cidade**: o criador novo e a gestão de família são a
  porta de entrada para colocar famílias na cidade do bloco 12.
- **12, 13 e 14 em sequência**: primeiro o mapa contínuo (onde as coisas
  ficam), depois os lugares (o que fazer lá) e por fim a vida dos outros
  (quem está lá).
- **15 por último**: só dá para medir desempenho e equilíbrio com tudo junto.

---

## Bloco 1 — Comando do jogador e ritmo do tempo (save v22)

O jogador passa a mandar em tudo, e o tempo passa num ritmo em que dá para
acompanhar cada gesto.

- **Fim do jogo sozinho.** Folks da família em jogo não escolhem mais ações
  por conta própria: `Folk.autonomy`, `pickAutonomous`, `IDLE_BEFORE_AUTO` e o
  botão de autonomia saem; a migração tira o campo. Parado, o folk fica no
  lugar com gestos de espera (olhar em volta, se espreguiçar, cruzar os
  braços, coçar a cabeça) que mudam com o humor e com a necessidade mais baixa
  (mão na barriga com fome, bocejo com sono). Os balões de vontade do bloco 6
  ficam, agora como **aviso ao jogador** e não como intenção do folk.
  Continuam com IA própria: visitas, prestadores, figurantes, bebês (choro e
  colo dependem dos adultos comandados) e famílias fora de jogo.
- **Reflexos que continuam automáticos** (só o mínimo que um jogador não
  conseguiria comandar a tempo): sair do caminho de outro folk, apagar o
  susto (correr do fogo), atender quem fala com ele quando está parado,
  acordar com despertador. Recusas por humor do bloco 6 continuam valendo.
- **Ordem nova substitui a atual.** Clicar numa interação cancela a ação em
  andamento com uma saída limpa (levanta da cadeira, larga o prato na
  bancada, fecha a torneira) e começa a nova. Com **Shift** apertado, a ação
  vai para o fim da fila. Limite de 8 ações na fila; clicar no ícone de uma
  ação na fila a cancela; arrastar reordena (o arrastar pode ficar para o
  bloco 2, junto com a fila nova).
- **Tempo mais devagar.** Hoje a velocidade 1 roda 2 minutos de jogo por
  segundo. Novo ritmo (`TICKS_PER_SECOND` passa a ser fracionário e a sim
  avança por acumulador): **normal 1 minuto por segundo**, **rápido 3**,
  **muito rápido 10**. Uma quarta velocidade, **pular**, só fica disponível
  quando todos da casa estão dormindo, fora de casa ou ocupados com algo
  longo (dorme 60 minutos por segundo e volta ao normal sozinha quando
  alguém acorda, chega em casa ou algo acontece). O relógio mostra os minutos
  andando de verdade e o movimento dos folks é interpolado entre ticks, para
  ninguém andar "aos pulos" no normal. A velocidade de caminhada é revista
  para parecer natural nesse ritmo (cerca de 1 tile a cada 0,8 s no normal).
- **Sem aumento no mouse.** Passar o mouse sobre móveis e itens não muda mais
  o tamanho de nada. O destaque passa a ser só um contorno de cor no chão
  (o `hoverPad` atual, mais discreto) e o cursor de mão.
- **Jogador de teste** (`tests/helpers/player.ts`) e a nova regra de
  equilíbrio descrita acima. O teste de 7 dias antigo passa a usá-lo.

Pronto: testes de fila (substituir, Shift, cancelar, limite), de ritmo
(minutos por segundo em cada velocidade, pular só com todos ocupados) e de
ausência de autonomia (folk sem ordem não sai do lugar por 24 h de jogo).

## Bloco 2 — HUD nova (save v23)

Uma interface com a organização que o gênero consagrou, mais limpa e mais
gostosa de usar, mas com desenho nosso (continua o papel com sombra sólida e
os medidores segmentados como identidade).

- **Painel do folk** no canto inferior esquerdo: retrato grande com
  expressão ao vivo, nome, humor geral num medidor só e, ao lado, abas:
  necessidades, sensações (os efeitos de humor que já existem, agora como
  cartões com ícone, tempo restante e motivo), habilidades, carreira e
  escola, relações, temperamento/traços, desejos e inventário.
- **Retratos da família** numa coluna à esquerda; clicar troca o folk, clicar
  duas vezes centraliza a câmera. Quem está fora de casa aparece com o
  lugar em que está.
- **Fila de ações** em cima do painel: ícones grandes da ação atual e das
  seguintes, com a atual mostrando o progresso; clicar cancela, arrastar
  reordena.
- **Barra central** embaixo: relógio com dia da semana e hora, as quatro
  velocidades com atalhos 0 a 4, dinheiro da família; ao clicar no dinheiro
  abre o resumo de contas e salários.
- **Modos** no canto inferior direito: viver, comprar, construir, família,
  cidade (no bloco 12 o botão vira mapa), opções.
- **Menu de interações em volta do objeto**: ao clicar num objeto ou folk,
  as opções abrem num anel ao redor do ponto clicado, agrupadas em
  categorias quando passam de 6 (por exemplo "Conversar", "Amigável",
  "Romântico"). Mostra o que está indisponível em cinza com o motivo ao
  passar o mouse, em vez de esconder.
- **Avisos** num canto, empilhados, com ícone, fechar, e clique que leva a
  câmera até o que aconteceu; os avisos antigos ficam num histórico.
- **Leitura**: tamanho de fonte escalável nas opções (pequeno, médio,
  grande), dicas de teclado, contraste conferido.
- Save sobe só para guardar as preferências de interface por jogo (abas
  abertas, folk selecionado); se der para guardar fora do `World`, não sobe.

Pronto: capturas de cada aba, do menu em anel e da fila; teste das regras
puras (agrupamento de categorias, motivo de indisponível).

## Bloco 3 — Telhado em toda casa e modos de vista (save v24)

- **Todo prédio tem telhado.** Hoje o telhado só cobre cômodo fechado; passa
  a cobrir toda a área construída (cômodos, varandas cobertas, garagem),
  incluindo as casas de enfeite e as do bairro. Casa sem telhado deixa de
  existir; a migração gera telhado para os saves antigos. O jogador ainda
  escolhe forma (duas águas, quatro águas, e uma nova de uma água), cor e
  inclinação, e pode marcar trechos como laje.
- **Modos de vista** num controle só, com atalhos: **telhado à vista** (casa
  inteira, como da rua), **sem telhado com paredes inteiras** (paredes sobem
  até o forro), **paredes recortadas** (o corte atual, o padrão para jogar),
  **paredes baixas** (meia altura). O telhado some sozinho ao entrar em modo
  construção de andar ou ao dar zoom num cômodo, e volta ao afastar, a não
  ser que o jogador fixe um modo.
- Fachada: beirais, calhas, cumeeiras e oitões com a textura das paredes,
  para a casa parecer inteira de fora.

Pronto: teste da máscara de telhado para formas em L, U e com pátio; captura
de cada modo de vista.

## Bloco 4 — Motor de atividades: etapas, lugares e multitarefa (save v25)

O núcleo deste plano. Hoje uma interação é "andar até o objeto e ficar lá
N minutos". Passa a ser um pequeno roteiro.

- **Lugares no objeto** (`ObjectDef.spots`): cada objeto declara seus pontos
  de uso, cada um com posição, direção, tipo (sentar, deitar, ficar de pé,
  apoiar, olhar) e quem pode usar. Sofá de 3 lugares tem 3 assentos; mesa tem
  lugar por cadeira encostada; fogão tem o ponto da frente; TV tem uma
  **área de visão** (um leque de tiles na frente dela).
- **Etapas** (`InteractionDef.stages`): cada interação vira uma sequência
  como `chegar → entrar → laço → sair`, cada etapa com sua animação, seu
  objeto na mão, seu som e o que acontece com as necessidades. Cancelar no
  meio sempre passa pela etapa de saída. A etapa de laço pode ter variações
  sorteadas para não ficar repetitivo.
- **Postura e multitarefa.** O folk ganha uma postura (de pé, sentado,
  deitado) que fica entre ações: quem está sentado no sofá não levanta para
  começar outra ação que também se faz sentado. Ações combinam quando a
  postura deixa: **sentado no sofá + assistir TV + conversar com quem está
  ao lado + comer o prato que trouxe**. A conversa em grupo do bloco 9 passa
  a funcionar sentada.
- **Assistir TV de verdade.** "Assistir" na TV leva o folk ao melhor assento
  livre dentro da área de visão (sofá, poltrona ou cadeira virada para ela);
  se não houver, assiste de pé. Quem senta perto pode ser convidado para
  assistir junto. A TV ganha canais (novela, esporte, culinária que dá
  habilidade, desenho para crianças) e o folk reage ao que vê (ri, torce,
  se emociona). Mesma lógica para o rádio, a lareira e a janela.
- **Sentar em qualquer assento.** Clicar num assento dá "Sentar"; sentado, o
  menu do folk oferece o que dá para fazer sentado (ler, ligar no telefone,
  conversar, comer).
- Migração: todo objeto antigo ganha `spots` gerados pelo tamanho e tipo,
  e os objetos que importam (sofás, cadeiras, mesas, camas, TV, fogão,
  banheira) ganham lugares feitos à mão.

Pronto: testes de escolha de lugar (melhor assento na área de visão,
assento ocupado, sem assento), de cancelamento passando pela saída e de
combinação de ações por postura. Tira animada de "sentar no sofá e assistir".

## Bloco 5 — Corpo e rosto novos dos folks (save v26)

- **Esqueleto mais rico** (continua por juntas, sem esqueleto pesado):
  ombro, cotovelo, pulso, quadril, joelho, tornozelo, pescoço, cabeça e
  tronco em duas partes, com mãos que abrem, fecham, seguram e apontam.
  Peso no andar, transição suave entre poses (mistura das poses-alvo em vez
  de troca seca).
- **Rosto em camadas**: formato da cabeça, olhos (formato, cor, cílios),
  sobrancelhas, nariz, boca, orelhas, barba e marcas (sardas, pintas, rugas
  com a idade) como peças de geometria e textura separadas, ainda pequenas e
  nítidas no estilo travado. Mais pixels por rosto no zoom perto (a textura
  do rosto pode ter o dobro da resolução das outras, sem quebrar o estilo).
- **Expressões**: alegre, triste, bravo, enjoado, cansado, apaixonado,
  assustado, concentrado, rindo, chorando; piscar, olhar para quem fala,
  boca mexendo com a fala inventada do bloco 7.
- **Biblioteca de animações** (`src/game/art/anims/`): andar normal, com
  pressa, cansado, triste; gestos de conversa; os gestos de espera do bloco 1.
  Cada animação é dado (quadros-chave por junta), não código espalhado.
- Os parâmetros do rosto entram no `Folk` (por isso o save sobe) e o criador
  atual ganha controles provisórios até o bloco 10.

Pronto: capturas de perto de vários rostos e expressões; tira animada de
andar e conversar; teste de mistura de poses (função pura).

## Bloco 6 — Atividades a fundo I: cozinha, mesa, banheiro e cama (save v27)

Cada atividade de casa ganha etapas, objetos na mão e animação no corpo
novo, perto do detalhe do quarto jogo.

- **Cozinhar**: escolher o prato (lista por habilidade e despensa), pegar
  ingredientes na geladeira, picar na bancada, levar ao fogão (panela,
  fumaça, mexer), servir em pratos, chamar a família para a mesa. Prato fica
  como objeto no mundo, com porções, esfria e estraga. Pode dar errado
  (queimar, fogo do bloco 14) conforme a habilidade.
- **Comer**: pegar o prato, procurar lugar à mesa (ou sofá, ou de pé), comer
  com garfo, conversar à mesa, levar o prato sujo à pia. Lavar louça na pia
  ou na lava-louças.
- **Banheiro**: privada com tampa e descarga; lavar as mãos; banho de
  chuveiro (tirar a roupa atrás do vapor, ensaboar, enxaguar, secar com
  toalha); banho de banheira; escovar os dentes no espelho; se arrumar no
  espelho.
- **Cama**: deitar-se de um lado, cobrir-se, virar durante o sono, dormir a
  dois de verdade, acordar e arrumar a cama (ou não, e a bagunça conta),
  cochilar no sofá.
- **Limpeza**: varrer, passar pano, esfregar com balde, tirar o lixo até a
  lixeira da rua, lavar roupa se houver máquina.
- **Bebês e crianças** do bloco 11 entram nas mesmas etapas: colo, mamadeira,
  trocar fralda no trocador, dar banho.

Pronto: tiras animadas de cozinhar, comer à mesa, banho e dormir a dois;
testes das etapas (porções, prato esfriando, louça indo para a pia).

## Bloco 7 — Atividades a fundo II: lazer, estudo, trabalho em casa e convívio (save v28)

- **Computador**: sentar, ligar, digitar com as duas mãos, jogos, procurar
  emprego, escrever, programar (renda e habilidade), conversar à distância.
- **Livros**: pegar na estante, ler sentado ou deitado, devolver (ou deixar
  largado), livros de habilidade com progresso salvo, escrever livros.
- **Música e arte**: instrumentos com postura e dedilhado, cavalete com tela
  que mostra o quadro avançando, vender o quadro.
- **Exercício**: aparelhos, alongar, correr na rua, ioga no tapete.
- **Jogos de mesa e a dois**: xadrez com peças mexendo, cartas, videogame no
  sofá a dois.
- **Conversa com corpo**: gestos por tipo de interação (abraço, aperto de
  mão, beijo, briga com dedo em riste, piada com tapa nas costas), sentar
  juntos para conversar, conversas que andam (acompanhar até a porta).
- **Trabalho em casa** do bloco 8 (frilas) com as atividades acima.
- **Crianças**: dever de casa à mesa, brincar no chão com brinquedos.

Pronto: tiras animadas de computador, leitura, instrumento e abraço; testes
de progresso salvo em livro e quadro.

## Bloco 8 — Objetos modulares (save v29)

- **Objeto como peças**: cada `FurnitureSpec` passa a ser montado de partes
  com encaixe (estrutura, assento, encosto, braços, pés, tampo, puxadores),
  cada parte com variações. Um sofá é "estrutura reta + 3 almofadas +
  braço curvo + pé palito". Novos objetos saem combinando peças em vez de
  código de desenho próprio.
- **Estilo por parte**: o jogador escolhe cor e padrão de cada parte numa
  paleta (tecidos, madeiras, metais, plásticos) e pode salvar o estilo para
  usar de novo. As cores do bloco 4 viram esse sistema.
- **Superfícies e enfeites**: mesas, bancadas, estantes e criados-mudos têm
  lugares para pôr enfeites, abajures, livros e pratos (usando os `spots` do
  bloco 4). Enfeite pode ser colocado livremente na superfície e girado.
- **Objetos que mudam de estado**: portas de armário abrem, gavetas, TV com
  imagem de cada canal, panelas que esquentam, cama desfeita ou arrumada.
- **Colocação mais livre**: girar em 8 direções para enfeites, encostar na
  parede automaticamente, objetos de parede (prateleiras, quadros) em
  qualquer altura com grade.
- Catálogo revisto para usar peças; os 70+ objetos atuais migram com a
  aparência mais próxima.

Pronto: teste de montagem (peças compatíveis, tamanho final), de lugares de
superfície e de migração; capturas do editor de estilo.

## Bloco 9 — Roupas modulares (save v30)

- **Roupa como camadas e peças**: parte de cima, parte de baixo (ou peça
  inteira), sapatos, meias, acessórios (chapéu, óculos, brincos, relógio,
  bolsa), cabelo e penteado. Cada peça tem formato e uma ou mais áreas de cor
  e padrão (o mesmo editor de estilo do bloco 8).
- **Ocasiões**: dia a dia, social, dormir, nadar, exercício, frio e calor,
  cada uma com até 3 conjuntos salvos; o folk troca sozinho de roupa ao
  começar a ação que pede (nadar, dormir, ir à festa), como parte da etapa
  de entrada.
- **Guarda-roupa e espelho**: trocar o conjunto, montar novo, comprar peças
  novas (catálogo de roupas por faixa de preço, entregues em casa ou na loja
  do bloco 13). Crianças, jovens e idosos têm peças próprias.
- Roupa sobre o corpo novo do bloco 5: mangas e barras acompanham as juntas.

Pronto: testes de ocasião (qual conjunto vestir em cada ação), de
compatibilidade de peças por idade; capturas do guarda-roupa e de 6 folks
vestidos de formas diferentes.

## Bloco 10 — Criar família: traços, sonho de vida, gostos e aparência (save v31)

Criador refeito para ficar perto do criador do terceiro jogo, com o nosso
conteúdo.

- **Traços em vez de eixos.** Cada adulto escolhe 5 traços de uma lista
  própria de cerca de 40 (por exemplo Caseiro, Pé de Valsa, Mão de Vaca,
  Avoado, Esquentado, Ranzinza, Bom de Garfo, Madrugador, Coruja,
  Galhofeiro, Prosa Boa, Pé no Chão, Capricho Fino, Deixa-Pra-Lá...), com
  efeitos concretos em humor, interações exclusivas, velocidade de
  habilidade e reações. Crianças têm menos traços e ganham os outros ao
  crescer, de acordo com como foram criadas. A migração converte os 5 eixos
  de temperamento do bloco 5 em traços equivalentes.
- **Sonho de vida**: um objetivo longo escolhido entre os que combinam com
  os traços (chegar ao topo de uma carreira, criar 5 filhos, ter 20 amigos,
  dominar 3 habilidades...), com recompensa de pontos de satisfação.
- **Desejos e pontos**: os desejos do dia do bloco 6 passam a dar pontos de
  satisfação que compram **benefícios** (dormir menos, cozinhar melhor, nunca
  se perder, sorte em encontros), num catálogo próprio.
- **Gostos**: comida, música e cor favoritas, com efeito no humor.
- **Aparência com controles deslizantes**: altura, corpo (magro a forte,
  musculatura), cada parte do rosto do bloco 5, tom de pele em escala
  contínua, cor do cabelo e dos olhos; botão de sortear e de herdar dos pais
  (bebês nascem misturando os pais).
- **Voz e signo**: tom de voz para a fala inventada e mês de nascimento
  (já existe) no mesmo painel.
- **Relações dentro da família**: ao criar, definir quem é cônjuge, irmão,
  pai, mãe, filho ou colega de casa; isso gera a árvore e as relações
  iniciais.
- Passos do criador: membros → aparência → roupas (bloco 9) → traços → sonho
  → relações → revisão.

Pronto: testes de compatibilidade de traços (pares proibidos, como Capricho Fino
com Deixa-Pra-Lá), conversão dos eixos, herança de aparência; capturas de cada
passo do criador.

## Bloco 11 — Gestão de família na cidade (save v32)

- **Gaveta de famílias**: famílias criadas e sem casa ficam guardadas; dá
  para mudar uma família da gaveta para uma casa à venda ou para um lote
  vazio, ou mandar uma família de volta para a gaveta.
- **Editar a família**: abrir o criador num folk já em jogo (no espelho ou no
  modo família) para mudar aparência e roupa; traços só com benefício
  próprio.
- **Dividir e juntar**: tirar membros para formar outra família (com parte do
  dinheiro), convidar alguém de fora para morar junto, casar e escolher em
  qual casa morar (já existe no bloco 10, passa a usar esta tela).
- **Fundos e bens**: dinheiro da família, valor da casa, contas, inventário
  da família (objetos guardados que não estão na casa), herança.
- **Trocar de família jogada** pelo mapa da cidade (bloco 12) ou pela lista;
  as famílias não jogadas seguem a vida (bloco 14).
- **Casas prontas e lotes**: comprar casa mobiliada, casa vazia ou lote
  vazio, com preço pelo terreno e pela construção.

Pronto: testes de dividir/juntar (dinheiro, relações, quem fica na casa) e
de mudança da gaveta; capturas da tela de família.

## Bloco 12 — Cidade aberta: o bairro dentro da cidade (save v33)

A maior mudança de estrutura do plano. Hoje o `World` é o lote em jogo e o
bairro (bloco 15) e o centro (bloco 16) são lugares à parte, com troca de
tela. Passa a existir **uma cidade contínua**.

- **Mapa da cidade**: terreno grande com relevo leve, rio ou lago, ruas com
  calçadas e cruzamentos, praças e mato; a Vila Taramela vira **um bairro
  dentro da cidade**, e o centro do bloco 16 vira o **centro da cidade**,
  ambos no mesmo mapa, ligados por ruas. A cidade nasce com 3 bairros
  residenciais (uns 30 lotes no total), o centro e uma área de lugares
  públicos (preenchida no bloco 13).
- **Sem tela de carga**: o folk sai pela porta, anda pela rua até a casa do
  vizinho ou até o centro, e a câmera acompanha. Distâncias longas: a pé,
  de bicicleta, de carro próprio (se a família tiver) ou de táxi, com o
  veículo andando pelas ruas.
- **Lote ativo e o resto**: a sim continua detalhada perto da câmera e no
  lote da família; lotes longe são simulados em nível leve (o que já existe
  na vida resumida do bloco 15). Folks da família em jogo são sempre
  detalhados onde estiverem.
- **Câmera e mapa**: afastar o zoom passa de forma contínua da vista de casa
  para a vista da cidade inteira, com casas em versão simples (menos
  geometria), etiquetas de lugares, ícones de onde está cada folk da família
  e clique para ir até lá. É essa vista que substitui o botão de bairro.
- **Carregar aos pedaços**: a arte de cada lote é montada quando a câmera se
  aproxima e desmontada quando se afasta, para caber no navegador.
- **Migração**: um save v32 vira uma cidade com a família na casa que tinha,
  os vizinhos nos lotes que tinham e o centro no lugar.

Pronto: testes de caminho na cidade (casa até centro, por rua), de troca de
nível de simulação e de migração; captura da vista de casa, da vista
intermediária e do mapa; medida de quadros por segundo registrada no README.

## Bloco 13 — Lugares da cidade: aonde ir e o que fazer (save v34)

- **Lugares públicos visitáveis**, cada um um lote com prédio, móveis e
  gente: praça com coreto e churrasqueiras, biblioteca, academia com piscina
  pública, mercado (comprar mantimentos em vez de só pedir), loja de roupas e
  móveis, cantina e café (os do bloco 16), cinema, bar com música, parque com
  lago para pescar.
- **Prédios fechados** para o que não precisa de lote aberto: o trabalho, a
  escola, a prefeitura, o hospital, a delegacia. O folk entra, o prédio mostra
  quem está dentro e quanto falta, e dá para escolher como ele se porta lá
  (no trabalho: puxar o saco do chefe, trabalhar duro, ir com calma; na
  escola: estudar, fazer amigos).
- **Ir até lá**: clicar no prédio dá as opções de ir (a pé, de carro, de
  táxi) e o que fazer quando chegar; o folk leva o tempo de ir pela rua.
- **Horários**: cada lugar tem horário de funcionamento, lotação e preço.
- Os encontros do bloco 16 passam a poder acontecer em qualquer lugar.

Pronto: testes de horários, de comportamento no trabalho mudando
desempenho e de compras no mercado; capturas de 4 lugares.

## Bloco 14 — Cidade viva: rotina dos outros e história que anda sozinha (save v35)

- **Rotina dos outros**: vizinhos e figurantes da cidade saem para trabalhar,
  vão à escola, à praça, à academia, à cantina, passeiam com o cachorro, e
  isso se vê nas ruas e nos lugares quando a câmera está perto.
- **História andando**: as famílias não jogadas namoram, casam, têm filhos,
  mudam de casa, envelhecem (se o relógio da vida estiver ligado), trocam de
  emprego, sobem na carreira e reformam a casa; um jornal da cidade conta o
  que aconteceu. Uma opção desliga isso para quem quiser a cidade parada.
- **Famílias novas chegam** quando há casas vazias, para a cidade não
  esvaziar; os nomes e rostos são sorteados.
- **Eventos da cidade**: feira de sábado na praça (já existe em casa, passa
  para lá), festa junina, concurso de culinária, campeonato de xadrez no
  parque.
- **Celular**: chamar alguém para encontrar em algum lugar, ver quem está
  onde.

Pronto: simulação headless de 30 dias de cidade sem a família jogada fazer
nada de especial, conferindo população estável, casamentos e nascimentos em
número razoável e nenhum lote em estado impossível.

## Bloco 15 — Acabamento: desempenho, equilíbrio e primeiros passos (sem save novo, ou v36)

- **Desempenho**: meta de 30 quadros por segundo no mapa e 60 dentro de
  casa num notebook comum; perfil da sim com a cidade cheia; corte de
  geometria e texturas onde for preciso.
- **Equilíbrio**: revisão de dinheiro, carreiras, necessidades e humor com o
  tempo mais lento e sem jogo sozinho, usando o jogador de teste.
- **Primeiros passos**: um tutorial curto e opcional (selecionar folk,
  comandar, Shift para fila, mudar velocidade, comprar um objeto, sair de
  casa) com dicas que somem depois de feitas.
- **Revisão de originalidade**: passar por todos os textos, ícones e telas
  novos conferindo que nada lembra nomes ou desenhos dos jogos de referência.
- **README**: "Como jogar" reescrito do zero para o jogo novo.

## Como as threads seguem

Como no primeiro plano: uma thread por bloco, na ordem acima, sem pedir
aprovação entre blocos. Cada thread lê este documento, as memórias
`thefolk-*` e o README, implementa, testa, atualiza o README e a memória,
envia na `main`, marca o bloco como feito aqui e pede a abertura do próximo.
Bloco grande demais (os candidatos são 4, 6, 8 e 12) pode ser entregue em
dois commits, mas a thread entrega o bloco inteiro antes de passar adiante.
O que ficar de fora vai para as limitações do README e, se importar, para o
bloco seguinte que fizer sentido.
