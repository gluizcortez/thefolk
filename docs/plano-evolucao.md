# Plano de evolução: rumo às mecânicas clássicas do gênero

Pedido do Cortez (17/11/2026): chegar o mais perto possível das mecânicas do
primeiro grande simulador de vida para PC e, ao mesmo tempo, aprofundá-las
com ideias próprias. As fatias 1 a 5 (necessidades, IA, emprego, habilidades,
compra, construção, relações, carreiras, fofoca) já estão na `main` com save
v5. Este documento divide o que falta em **17 blocos sequenciais**; cada bloco
é uma thread de implementação, executada na ordem, sem aprovação entre eles.

## Regras que valem para todos os blocos

- **Originalidade rígida.** Copiamos o *gênero* (o tipo de mecânica), nunca a
  *expressão*: nada de nomes, marcas, textos, ícones, sons, personagens,
  interface ou arte do jogo de referência. Moeda continua tostões (⟡), pessoas
  continuam folks, a fala inventada é nossa, os figurantes têm nomes e visual
  próprios. Na dúvida, inventar.
- **Visual travado** pela direção de arte já registrada: 3D low-poly gerado
  por código, câmera 2:1, pixels nítidos, 16 bits. Nada de 2D, PBR ou
  pós-processamento moderno. Todo objeto novo ganha `FurnitureSpec` próprio.
- **Arquitetura**: `World` JSON puro, mudanças só por `Sim.dispatch`, lógica
  nova em módulos puros de `src/sim/`, conteúdo em `src/data/`, textos em
  `src/i18n/pt-BR.ts`. Determinismo pelo RNG do mundo.
- **Save**: todo bloco que muda o formato do `World` sobe `SAVE_VERSION` em
  um e registra a migração (um save v5 tem que abrir no fim do plano). A
  versão prevista de cada bloco está indicada; se um bloco não mexer no
  `World`, ele não sobe e os seguintes descem um número.
- **Pronto quer dizer**: testes Vitest novos para a lógica do bloco e todos
  os antigos passando, `tsc` limpo, build da Vite ok, uma captura do bloco em
  `/mnt/project-files/thefolk/blocoNN-*.png`, README atualizado (como jogar,
  arquitetura, adicionando conteúdo, limitações conhecidas e roteiro),
  arquivo de memória `thefolk-blocoNN.md`, commit e push direto na `main`.
- **Equilíbrio**: cada bloco roda uma simulação headless de pelo menos 7 dias
  de jogo com a IA ligada para conferir que a casa não entra em colapso
  (fome, falência, sujeira infinita) sem o jogador.

## Visão geral

| # | Bloco | Save |
|---|-------|------|
| 1 | Casa viva: sujeira, desgaste e conserto | v6 |
| 2 | Despensa, correio e prestadores de serviço | v7 |
| 3 | Ambiente por cômodo, dia e noite | v8 |
| 4 | Catálogo em faixas de preço e atividades a dois | v9 |
| 5 | Criar família: temperamento, corpo e roupa | v10 |
| 6 | Humor que manda: vontade própria, balões e desejos | v11 |
| 7 | Som, música, fala inventada e saves | — (config) |
| 8 | Carreiras completas e amigos da família | v12 |
| 9 | Vida social ampliada: festas, grupo e assuntos | v13 |
| 10 | Vida a dois: noivado, casamento, morar junto | v14 |
| 11 | Bebês, crianças e escola | v15 |
| 12 | Andares, escadas e telhado | v16 |
| 13 | Quintal: piscina, cercas e jardim vivo | v17 |
| 14 | Perigos e morte: fogo, gatuno, fantasmas | v18 |
| 15 | Bairro: vários lotes e famílias | v19 |
| 16 | Centro da cidade: passeios e encontros | v20 |
| 17 | Gerações (aprofundamento): envelhecer e herdar | v21 |

A ordem segue dependências: a casa precisa sujar e quebrar antes de existirem
faxineira e técnico (1 → 2); o ambiente por cômodo precisa existir antes do
catálogo com faixas de qualidade (3 → 4); temperamento antes de vontade
própria (5 → 6); amigos da família antes de festas (8 → 9); casamento antes
de bebês (10 → 11); piscina antes de afogamento (13 → 14); bairro antes do
centro (15 → 16).

---

## Bloco 1 — Casa viva: sujeira, desgaste e conserto (save v6) — feito em 17/11/2026

**Lacuna**: hoje objeto não tem estado. No gênero, a casa se degrada sozinha e
manter a ordem é metade do jogo.

**Escopo**
- `WorldObject.state`: `dirt` (0..100) e `wear` (0..100) com `broken`.
- Uso suja e gasta: chuveiro e privada sujam, fogão gasta, TV e som quebram
  por desgaste com chance que cresce com o uso.
- Sujeira solta no chão como entidades novas (`world.mess`): prato sujo
  deixado onde comeu, poça perto do chuveiro e da privada, lixo da cozinha
  enchendo. Bexiga no zero vira poça (hoje é só humor).
- Lixeira de cozinha que enche; lixo cheio fede (raio de ambiente negativo)
  e precisa ir para a lixeira da calçada.
- Duas habilidades novas: **Jeito** (consertar, mexer em aparelho) e
  **Capricho** (limpar mais rápido e sujar menos). Livro de consertos na
  estante e bancada de ferramentas treinam Jeito.
- Interações novas: limpar, consertar, esvaziar lixo, lavar louça na pia.
  Objeto quebrado não oferece as interações normais.
- A IA limpa e conserta por conta própria, com peso ligado ao traço
  (preguiçosos deixam acumular).
- Visual: manchas e moscas no objeto sujo, fumacinha e faísca no quebrado,
  prato no chão/mesa, poça brilhante.

**Aprofundamento próprio**
- **Gambiarra**: consertar com Jeito baixo deixa o objeto "remendado" (quebra
  de novo mais cedo) e às vezes dá choque leve (sem morte ainda; o bloco 14
  liga o perigo de verdade).
- **Manias de casa**: cada morador tem um limiar de bagunça; quem é caprichoso
  perde humor e reclama de quem suja (memória nova "deixou a louça").

**Pronto quando**: em 7 dias sem jogador, a casa com 2 moradores suja, alguém
limpa e algo quebra e é consertado; objeto quebrado bloqueia uso; testes de
sujeira, desgaste, conserto e migração v5→v6.

## Bloco 2 — Despensa, correio e prestadores de serviço (save v7) — feito em 17/11/2026

**Lacuna**: comida brota da geladeira, contas são descontadas sozinhas e
ninguém de fora trabalha na casa.

**Escopo**
- **Despensa**: geladeira com estoque de porções. Refeição gasta porções;
  sem estoque só sobra lanche ou pedir comida.
- **Telefone com serviços**: fazer compras de mercado (entregador chega pela
  calçada), pedir comida pronta (entrega com prazo e gorjeta), contratar
  faxineira (diária), jardineiro, técnico de consertos. Cada um é um figurante
  com visual e nome próprios que anda até a casa e trabalha usando as mesmas
  ações do bloco 1.
- **Caixa de correio** no lote: contas chegam como cartas (valor detalhado
  em luz, água e móveis). Pagar é uma interação na caixa. Conta vencida há
  mais de 3 dias manda o **oficial de penhora**, que leva móveis até cobrir
  o valor.
- **Jornal** diário na calçada: buscar o jornal, ler as vagas (os
  classificados saem do painel e passam pelo jornal) e as notícias do bairro
  (ligado à fofoca da fatia 5).
- **Campainha**: visitas e figurantes tocam e esperam; alguém da casa atende
  e cumprimenta, convida a entrar ou dispensa.

**Aprofundamento próprio**
- Figurantes são vizinhos de verdade (`Neighbor` com profissão de serviço):
  dá para fazer amizade com a faxineira, ela fofoca o que viu na casa.
- Feira de bairro no sábado de manhã: mantimentos mais baratos para quem vai
  a pé até a calçada antes das 10h.

**Pronto quando**: sem compras, a casa fica sem refeição e a IA pede comida
ou compra; conta não paga leva à penhora; faxineira limpa sozinha; testes de
estoque, contas, penhora e serviços.

**Como ficou**: módulo `sim/services.ts`. Entraram despensa (24 porções por
geladeira), comida pronta, mercado, faxineira diária, técnico, contas em
carta detalhadas com penhora após 3 dias de atraso, jornal das 6h com
notícias do bairro e classificados (as vagas só aparecem depois de ler),
campainha para todo visitante e feira de sábado na caixa de correio. Os
prestadores são vizinhos (Zeca, Marta, Ivo, Plácido); Marta espalha a notícia
"a casa vive uma bagunça". O **jardineiro ficou para o bloco 13**, junto com
as plantas que secam.

## Bloco 3 — Ambiente por cômodo, dia e noite (save v8) — feito em 17/11/2026

**Lacuna**: "ambiente" é raio em volta de objetos e não existe noite de
verdade dentro de casa.

**Escopo**
- Detecção de cômodos fechados por paredes e portas (`sim/rooms.ts`,
  recalculado quando a obra muda). Fatia 4 já marca dentro e fora pelo piso;
  agora o cômodo é a região fechada.
- Nota do cômodo: valor dos objetos e enfeites, sujeira (bloco 1), tamanho,
  janelas, luz, piso e revestimento (hoje sem efeito), cantos vazios.
- Ciclo de luz: sol e céu mudam com a hora; janelas iluminam de dia;
  abajures e luminárias de teto acendem à noite (ligar e desligar). Cômodo
  escuro derruba o ambiente e a IA acende a luz.
- Quadros, tapetes e plantas de enfeite viram objetos de compra de verdade
  (saem do cenário automático).
- Contas de luz (bloco 2) passam a considerar lâmpadas acesas.

**Aprofundamento próprio**
- **Cômodo com alma**: cada cômodo ganha um nome sugerido pelo uso
  ("cozinha", "ateliê") e um gosto por traço (o caseiro ama sala cheia, o
  reservado prefere quarto pequeno).

**Pronto quando**: o mesmo sofá dá ambiente diferente em sala bonita e em
corredor vazio; à noite a casa escurece e a IA acende luzes; testes de
detecção de cômodo, nota e migração.

**Como ficou**: módulo `sim/rooms.ts`. Cômodo = região fechada por parede,
porta ou janela (o que encosta na divisa é quintal). A nota soma objetos
(com teto suave), janelas, piso e revestimento, tamanho, cantos vazios,
sujeira e bagunça, luz (escuro tira até 22) e o gosto do traço (`roomTaste`:
pequeno, grande, cheio, vazio, aconchego, claro). Luminárias (`light`) com
acender e apagar; a IA acende antes de usar algo no escuro, apaga ao deitar
e ao sair de cômodo vazio conforme `saver`. Quadrinho, tela grande, relógio,
tapete, tapete grande e luminária de teto viraram objetos com `layer`
('wall', 'floor', 'ceiling'), fora do chão. Conta de luz cobra minutos de
lâmpada acesa. Nome do cômodo pelo uso (`ObjectDef.room`), mostrado no quadro
de necessidades. Migração v8 recoloca quadros, tapete e luz de teto nos
saves antigos.

## Bloco 4 — Catálogo em faixas de preço e atividades a dois (save v9) — feito em 17/11/2026

**Lacuna**: 21 objetos, um modelo por função. No gênero cada função tem
versões barata, média e cara com efeitos muito diferentes.

**Escopo**
- Três faixas para cada função de necessidade (cama, sofá, chuveiro, privada,
  geladeira, fogão, TV, som, poltrona, mesa e cadeiras separadas): taxas por
  minuto, conforto, ambiente e desgaste diferentes. Meta: ~45 objetos novos.
- Variações de cor por objeto (paleta escolhida no modo compra).
- Depreciação: objeto perde valor no primeiro dia e com o uso; vender devolve
  o valor atual. Desfazer no modo compra (mesmo modelo do modo construção).
- Objetos de diversão novos com **atividade a dois de verdade**: tabuleiro de
  estratégia (raciocínio), videogame, mesa de cartas, banheira de
  hidromassagem, piano/teclado (criatividade), telescópio, saco de pancada.
- Mesa e cadeiras viram objetos separados; comer à mesa dá bônus.
- Objetos colam na parede (quadros, prateleiras, espelhos de treinar fala).

**Aprofundamento próprio**
- **Objetos com história**: objeto usado por muito tempo vira "querido" de
  quem mais usou (bônus de humor; vender gera memória triste).

**Pronto quando**: catálogo com ~65 itens em categorias e faixas; IA prefere
o objeto melhor quando dá; dois folks jogam juntos ganhando relação; testes de
faixas, depreciação e atividade a dois.

**Como ficou**: módulo `sim/furnish.ts`. 37 objetos novos (70 no total, 10
categorias com a nova "Jogos"): barato e caro para cama, sofá, poltrona,
chuveiro, privada, geladeira, fogão, TV, som, abajur e estante; cadeiras e
mesas separadas em três faixas; xadrez, carteado, videogame, ofurô, teclado,
piano, luneta (só de noite) e saco de pancada; prateleira e espelho de
parede. `ObjectDef.tier/line/colors/dining`; a IA multiplica a nota pela
faixa (0,85 / 1 / 1,2). Cores escolhidas no catálogo para sofás, poltronas,
cadeiras e camas. Depreciação: valor cheio no dia da compra sem uso, -15% na
virada e mais com o uso, piso de 30%; venda devolve o valor de hoje.
Desfazer compra/venda/mover no modo compra. Comida com `atTable`: depois de
servir, o folk leva o prato até o lugar à mesa livre mais perto (até 14
passos) e come sentado com conforto, e social e amizade se houver alguém
comendo junto. `InteractionDef.duo` dá efeitos e amizade a quem faz a mesma
atividade no mesmo objeto, guarda a lembrança `playedTogether`, e a IA ganha
vontade de entrar no jogo de alguém. Objeto querido depois de 1200 minutos de
uso de quem mais usou; vender ou perder na penhora dói. Save v9 dá contagem
de uso aos objetos antigos.

## Bloco 5 — Criar família: temperamento, corpo e roupa (save v10) — feito em 17/11/2026

**Lacuna**: o jogo começa sempre com Tomé e Lia; não existe criar pessoas,
temperamento numérico nem corpo e roupas diferentes.

**Escopo**
- Tela de **criar família** antes do jogo novo: 1 a 8 moradores, nome,
  sobrenome da casa, aparência (pele, rosto, cabelo, corpo magro/médio/forte),
  roupa do dia e até 2 traços (os traços atuais continuam).
- **Temperamento** em cinco eixos de 0 a 10 com orçamento fixo de pontos
  (nomes nossos: Ordem, Expansão, Pique, Graça, Afeto). Eixos mexem no ritmo
  das necessidades (expansivo perde social mais rápido), no treino de
  habilidades e na escolha da IA.
- **Mês de nascimento** com um temperamento sugerido e compatibilidade entre
  meses (equivalente original à astrologia do gênero, com nomes próprios).
- Família inicial pronta continua disponível como atalho.
- **Roupas** por ocasião: dia, dormir, banho de piscina (bloco 13), formal;
  o folk troca no guarda-roupa e ao tomar banho/dormir (resolve a limitação
  "toma banho vestido"). Guarda-roupa vira objeto.
- Folk segura objetos na mão (prato, livro, fone, pano de limpeza).

**Aprofundamento próprio**
- **Temperamento que muda devagar**: anos de hábito (meses de jogo) puxam o
  eixo em um ponto (quem limpa muito ganha Ordem).

**Pronto quando**: dá para criar uma família de 3 do zero e jogar; dois folks
com eixos opostos se comportam de forma visivelmente diferente na simulação
headless; testes de eixos, criação e migração (Tomé e Lia ganham eixos
coerentes com os traços).

**Como ficou**: tela própria de criar família (1 a 8, sobrenome, aparência
com corte de cabelo, rosto e corpo, quatro roupas, até 2 traços que não se
anulam, mês e temperamento com 25 pontos) e atalho da família pronta. Os
eixos multiplicam decaimento, peso da IA, treino de habilidade, vontade de
arrumar e gosto por tipo de conversa; 5 em tudo é neutro. Hábito acumulado
vira um ponto a cada 14 dias (900 minutos no período). Meses com pares de
afinidade e atrito escritos à mão. Guarda-roupa, pijama na cama, roupão no
chuveiro, traje na hidromassagem, prato, livro, fone e pano na mão. Papo
autônomo agora larga a conversa quando a campainha toca sem ninguém ir.

## Bloco 6 — Humor que manda: vontade própria, balões e desejos (save v11) — feito em 17/11/2026

**Lacuna**: humor só muda desempenho e treino; o folk aceita qualquer ordem,
não mostra o que pensa e não planeja o sono.

**Escopo**
- **Recusa**: com humor ruim ou necessidade crítica o folk recusa treinar,
  ler ou trabalhar em frila e diz por quê (gesto e balão).
- **Balões** com ícones próprios: o que o folk quer (necessidade baixa), o
  que acha da conversa (ícone de assunto e de aprovação), reclamação de
  sujeira, saudade de alguém.
- **Expressões faciais** simples (sorriso, carranca, cansaço) e postura
  (ombros caídos com humor ruim).
- **Sono com horário**: a IA planeja dormir antes do turno do dia seguinte;
  despertador na cama.
- **Desejos do dia**: cada folk sorteia até 3 desejos pequenos pelo
  temperamento e traços (conversar com X, cozinhar algo, comprar um objeto);
  cumprir dá humor e um ponto de "ânimo" guardado.
- Notificações em cartões para fatos importantes (algo quebrou, conta
  chegou, alguém está à porta).

**Aprofundamento próprio**
- **Ânimo** acumulado pode ser gasto pelo jogador num "dia inspirado" do folk
  (treino em dobro por algumas horas) — recompensa por cuidar bem.

**Pronto quando**: ordens são recusadas em humor ruim; ninguém chega ao
trabalho sem dormir na simulação de 7 dias; desejos aparecem e se cumprem;
testes de recusa, plano de sono e desejos.

**Como ficou**: recusa de esforço (treino, estudo, frila, negócio) abaixo de
um humor que depende do Pique, ou com necessidade do corpo abaixo de 15; o
motivo vai para o balão e para o aviso, com braços cruzados; o menu marca
"sem vontade" e a IA também evita. Balões 3D em cartão de papel para
vontade, conversa (aprovação de quem ouve), bagunça, saudade, desejo e
despertador; rosto cansado. Sono planejado pela hora do turno (pressão que
sobe 1h30 antes da hora de deitar, larga a diversão), despertador duas horas
antes, ninguém dorme apertado. 14 desejos em `data/wishes.ts`, até 3 por dia
às 6h, sorteados por hash (não mexem no RNG do mundo); cumprir dá diversão,
conforto e ânimo; com 3 de ânimo, quatro horas de treino em dobro. Cartões
de aviso para fatos importantes. Simulação de 7 dias com emprego: todo mundo
sai descansado, sem desmaio nem falta.

## Bloco 7 — Som, música, fala inventada e saves (sem save novo) — feito em 17/11/2026

**Lacuna**: o jogo é mudo e só tem um slot de save.

**Escopo**
- Efeitos sonoros sintetizados por código (WebAudio): passos por piso,
  descarga, chuveiro, fogão, porta, campainha, telefone, caixa registradora,
  interface (clique, abrir cartão).
- Música procedural própria por modo (viver, comprar, construir), tranquila e
  com cara de fim dos anos 90, sem imitar nenhuma trilha existente.
- **Fala inventada** (o "folquês"): sílabas sintetizadas com timbre por folk,
  entonação pelo tipo de conversa (feliz, discussão, romântica).
- Rádio/caixa de som com três estações de estilos diferentes que tocam de
  verdade quando ligadas (e afetam o objeto de dança).
- Volume e mudo no menu; preferências fora do `World`.
- **Saves**: vários slots com nome e miniatura, exportar e importar arquivo.

**Pronto quando**: o jogo tem som em todas as ações principais e música nos
três modos; três slots funcionam; exportar e importar devolvem o mesmo mundo;
testes de slots e exportação.

**Como ficou**: tudo sintetizado em WebAudio, sem arquivo de som, com saída
de "placa antiga" (agudos aparados, degrau leve de amplitude). Três canais
(música, efeitos, vozes) com volume no cartão **Som** e mudo na tecla M,
guardados no navegador (fora do `World`). Passos por piso (tapete, madeira,
piso frio, grama), som para cada ação do catálogo (descarga no fim do uso
do vaso, água do chuveiro, chiado do fogão, porta da geladeira, TV,
videogame, teclado, pano, serrote e martelo do conserto, discagem do
telefone), campainha, telefone do trabalho, carta, caixa registradora na
compra, moedas na venda, martelo e pincel na obra, zumbido no erro, abrir e
fechar cartão. Piano, teclado e flauta tocam notas de verdade, com nota
errada para quem tem pouca Criatividade. Trilha procedural por modo (sala
com piano elétrico, vitrine com marimba, oficina com suingue), composta
compasso a compasso por acordes empilhados na escala. **Folquês**: sílabas
inventadas com voz própria de cada folk (altura pelo nome, mais grave no
corpo forte, mais rápida com Pique, mais ar com Afeto) e entonação pelo tipo
de conversa (alegre sobe, briga acelera e desce, romântica devagar e baixa,
recusada triste); quem ouve responde às vezes; recusa vira resmungo.
**Som de casa**: rádio, caixa de som e jukebox ganharam ligar, trocar de
estação e desligar; três estações (Brisa, Chiclete, Trovão) com andamento e
estilo próprios tocam de verdade, com timbre do aparelho e volume pela
distância, e a trilha abaixa perto delas. Cada folk tem a estação preferida
pelo temperamento: dançar com ela diverte mais, com a que não gosta, menos;
dançar com o som desligado liga na preferida; a dança segue o andamento.
Som ligado gasta luz, atrapalha o sono no mesmo cômodo e quem vai dormir ou
sai por último desliga (como a luz). Campo opcional `WorldObject.tune`, sem
migração. **Saves**: três vagas com nome editável, dia, dinheiro, moradores
e miniatura da casa; o save antigo vira a vaga 1; jogo novo vai para uma
vaga livre; exportar baixa um `.folk.json` e importar abre numa vaga livre,
passando pelas migrações.

## Bloco 8 — Carreiras completas e amigos da família (save v12) — feito em 17/11/2026

**Lacuna**: 3 carreiras de 5 cargos; promoção não pede amigos; amizades não
esfriam com o tempo.

**Escopo**
- 10 carreiras de 10 cargos (as 3 atuais crescem, mais 7 novas com nomes e
  temas próprios), cada cargo com horário, dias, salário e requisitos de
  habilidades **e de amigos da família**.
- **Amigos da família**: quantidade de relações com amizade alta somada da
  casa; aparece no painel. Amizade e romance **esfriam por dia** sem contato
  (mais rápido para quem tem pouco Afeto).
- **Carona**: veículo próprio de cada carreira (muda com o cargo) chega na
  calçada, buzina e espera até a hora; perder a carona é perder o turno.
- Uniforme por carreira e cargo (usa o sistema de roupas do bloco 5).
- Recompensas de carreira: objetos que só são liberados num cargo.
- Eventos do expediente (fatia 5) ganham conteúdo para as novas carreiras e
  **eventos em cadeia** (consequência dias depois).
- Colegas e chefe sobem e são demitidos (limitação da fatia 5).

**Pronto quando**: 10 carreiras jogáveis; promoção barrada por falta de
amigos; amizade cai sem contato; carona chega e vai embora; testes.

**Como ficou**: dez carreiras (Repartição, Cozinha, Ateliê, Posto de saúde,
Oficina, Trupe da Lona, Observatório, Câmara do bairro, Clube de várzea e
Brigada de socorro) com dez cargos gerados a partir de curvas de salário,
três habilidades e amigos (mais para as carreiras de muita gente); sete
chefes e três colegas novos na vizinhança. Amigos da família = pessoas de
fora com amizade 50+ de algum morador, contadas uma vez; amizade cai 2 por
dia sem contato (x1,5 com Afeto 0, metade com Afeto 10, metade para melhores
amigos) até zero, romance também esfria; relações só entre vizinhos não
esfriam. Carona: chega uma hora antes, buzina (som próprio), buzina de novo
15 min antes de partir e espera até 10 min depois da hora; o folk veste o
uniforme ao ser chamado e tira depois do banho ou do sono. Dez tipos de
veículo (carrinho a caminhão da brigada com escada) e uniformes em sete
modelos com chapéu, por faixa de cargo (1-4, 5-7, 8-10). Recompensa de
carreira no sexto cargo (dez objetos novos, trancados no catálogo até lá).
Vinte e quatro eventos novos, sete deles consequências marcadas dias depois.
Equipe muda aos domingos (promoção, demissão, novo chefe, recontratação).
O jornal mostra quatro vagas por dia. Save v12.

## Bloco 9 — Vida social ampliada: festas, grupo e assuntos (save v13) — feito em 18/11/2026

**Lacuna**: conversas são sempre a dois, não há festa nem assunto.

**Escopo**
- **Assuntos**: cada folk tem gostos em ~10 assuntos (nomes nossos); a
  conversa "papear" escolhe um assunto que aparece no balão; gostar do mesmo
  assunto rende mais.
- **Conversa em grupo**: até 4 pessoas num círculo, com rodadas de fala.
- **Telefone social**: ligar para convidar alguém ou um grupo, receber
  ligações, papo por telefone conta como contato (bloco 8).
- **Festa**: convidar vários pelo telefone, buffet, música; nota da festa pela
  diversão média dos convidados; festa boa dá fama (reputação da fatia 5),
  festa ruim vira fofoca. Vizinho barulhento pode reclamar.
- Mais conversas por nível de relação (melhor amigo, inimigo), mandar
  embora, cumprimentar na porta.
- Folks param de se atravessar (desvio local).

**Aprofundamento próprio**
- **Panelinhas**: o jogo detecta grupos de amigos e rivais no bairro; convidar
  rivais para a mesma festa vira briga e notícia.

**Pronto quando**: festa com 6 convidados roda e recebe nota; conversa em
grupo funciona; assuntos aparecem; testes.

**Feito**: dez assuntos com gostos de -5 a 5 por pessoa (sementes por id),
reação no balão e gosto que pega. Roda de até quatro com turnos de cinco
minutos, formada pelo jogador ou sozinha. Telefone: ligar, receber, atender,
chamada perdida; ligação conta como contato. Festa pelo telefone com até oito
convidados, mesa de buffet (16 porções), quatro horas, nota de 1 a 5 pela
animação média, notícia de festa boa (fama) ou ruim (fofoca), reclamação de
barulho depois das 22h. Panelinhas e rivais (briga vira notícia). Conversas
relembrar, aperto de mão, esnobar, mandar embora; cumprimento na porta pela
relação; desvio local. Save v13.

## Bloco 10 — Vida a dois: noivado, casamento, morar junto (save v14) — feito em 18/11/2026

**Escopo**
- Pedido de noivado (aceito pelo nível de romance e humor), anel como objeto,
  casamento em casa como evento com convidados (usa as festas do bloco 9).
- Morar junto: chamar alguém para a casa (o que já existe, agora com mala,
  dinheiro do outro somado e móveis próprios) e **mudar alguém para fora**
  (limitação da fatia 3).
- Cama de casal com dormir juntos e interações românticas novas.
- Separação e divórcio com divisão do dinheiro; ex-parceiro ganha memória e
  vira notícia.
- Sobrenome escolhido no casamento.

**Pronto quando**: casal noiva, casa e divide a cama; dá para mandar alguém
embora; divórcio funciona; testes.

## Bloco 11 — Bebês, crianças e escola (save v15) — feito em 18/11/2026

**Escopo**
- Bebê vem de casal que mora junto (tentar ter bebê) ou de adoção pelo
  telefone. Berço obrigatório.
- Bebê: necessidades próprias, choro, colo, mamadeira; vira criança depois de
  alguns dias (sem envelhecer além disso até o bloco 17).
- Criança: corpo menor, escola nos dias úteis (ônibus escolar na calçada),
  lição de casa, **boletim** que sobe e desce; nota muito ruim por muito tempo
  manda para um **colégio interno** (sai de casa).
- Descaso grave (bebê com fome ou sujo) traz a **visitadora social**, que
  leva o bebê embora.
- Brinquedos (casinha, pião, cavalinho) e habilidades da criança.

**Aprofundamento próprio**
- A criança herda tendências de temperamento dos pais e aprende hábitos de
  quem mais cuida dela (ganha eixo do cuidador).

**Pronto quando**: bebê nasce, é cuidado, vira criança, vai à escola com
boletim; descaso leva a visitadora; testes.

## Bloco 12 — Andares, escadas e telhado (save v16) — feito em 18/11/2026

**Escopo**
- Grade por andar (`grid.floors[n]`), até 2 andares acima do térreo.
- Escada como peça de obra que liga andares; A* entre andares.
- Telhado automático (duas águas e quatro águas) com cor escolhida; telhado
  some ao olhar dentro, como as paredes.
- Peças novas: porta dupla, arco, portas com estilos, janela alta e
  basculante, meia parede, coluna, parede diagonal se couber.
- Botões de subir e descer andar; corte de paredes por andar.
- Corrige: clique atravessando paredes.

**Pronto quando**: dá para construir um sobrado com escada e telhado e o folk
sobe para dormir; testes de navegação entre andares e de obra.

**Como ficou**: em vez de `grid.floors[n]`, os andares moram nas linhas do
mesmo `floor` (andar n a partir de `n * (h + 2)`), para que posições, cômodos,
compra e IA sigam em (x, y) sem mudança. Parede diagonal ficou de fora.

## Bloco 13 — Quintal: piscina, cercas e jardim vivo (save v17) — feito em 18/11/2026

**Escopo**
- Piscina como obra (cavar), escadinha, trampolim; nadar treina Pique e dá
  diversão; roupa de banho.
- Cercas, portões e muretas; caminhos de pedra.
- Árvores, arbustos e flores de compra; **jardim vivo**: plantas crescem,
  precisam de água, murcham, dão flores ou frutos (frutos vão para a despensa
  do bloco 2). Jardineiro (adiado do bloco 2) cuida delas, como prestador de
  serviço do mesmo jeito que a faxineira.
- Churrasqueira, mesa de jardim, rede.
- Terreno com desnível simples (subir e baixar o chão em degraus), se couber.

**Pronto quando**: piscina com escada funciona, horta dá comida, cercas
bloqueiam caminho; testes.

**Como ficou**: módulos `sim/yard.ts` e `sim/garden.ts`. A piscina é um piso
de água cavado só no térreo; a escadinha fica dentro dela e é por onde se
nada (diversão e Fôlego, roupa de banho), o trampolim fica na borda e
mergulhar sem escadinha assusta (o afogamento de verdade é do bloco 14).
Cerca, mureta e portão são tipos de aresta que bloqueiam o passo sem fechar
cômodo; o portão vai num trecho de cerca ou num vão deixado nela. Dez objetos
de quintal; as plantas (e o vaso antigo) têm água, crescimento, saúde e
frutos, com chuva sorteada de madrugada e o jardineiro como prestador. Ficou
de fora o desnível de terreno.

## Bloco 14 — Perigos e morte: fogo, gatuno, fantasmas (save v18) — feito em 18/11/2026

**Escopo**
- **Fogo**: fogão com Culinária baixa, lareira, objetos que pegam fogo
  perto; detector de fumaça chama os bombeiros (figurantes); extintor.
- **Choque** ao consertar aparelho com Jeito baixo (o bloco 1 já prepara).
- **Gatuno** à noite rouba objeto caro; alarme chama a polícia; perseguição
  curta; recompensa para a casa.
- **Afogamento** em piscina sem escada, **fome** extrema e fogo podem matar.
- Figura própria que busca quem morre (nome e visual nossos, nada de capa e
  foice) e uma chance de barganha (minijogo de sorte, à nossa maneira).
- Lápide ou urna fica no lote; o **fantasma** aparece à noite, assusta e
  derruba humor, some com o tempo ou com uma homenagem.
- Luto: memória forte em quem conhecia o falecido.

**Pronto quando**: fogo começa, espalha e é apagado; gatuno é pego com
alarme; morte gera lápide e fantasma; opção "sem morte" no jogo novo; testes.

## Bloco 15 — Bairro: vários lotes e famílias (save v19) — feito em 18/11/2026

**Lacuna**: uma casa só; vizinhos não têm casa de verdade.

**Escopo**
- **Tela do bairro** (vista de cima do bairro em 3D no mesmo estilo) com 8 a
  10 lotes: casas prontas com famílias, lotes vazios e casas à venda.
- O `World` passa a guardar vários lotes e famílias; jogar uma família por
  vez, as outras vivem em modo resumido (necessidades e relações andam de
  forma abstrata, empregos e promoções acontecem).
- Os vizinhos atuais passam a morar em lotes de verdade.
- **Mudança**: comprar lote vazio ou casa, vender a casa (valor do lote +
  obra + móveis), mudar a família com o dinheiro dela; família nova no bairro.
- Visitas vêm da casa delas e voltam para lá.

**Pronto quando**: dá para trocar de família e voltar, mudar de casa e criar
família nova em lote vazio; o save antigo vira um bairro com a casa atual;
testes de troca de família, mudança e simulação resumida.

## Bloco 16 — Centro da cidade: passeios e encontros (save v20) — feito em 18/11/2026

**Escopo**
- **Lotes comunitários** no bairro: praça, restaurante, loja, café.
- Ir ao centro de táxi com quem quiser; tempo corre lá também; a família fica
  em casa em modo resumido.
- **Encontros**: convidar para sair, nota do encontro, presentes da loja.
- Restaurante com garçom e cardápio; loja vende roupas e presentes.
- Figurantes aleatórios no centro (gente que se pode conhecer).

**Pronto quando**: casal sai para jantar, o encontro recebe nota e muda a
relação; compras do centro chegam em casa; testes.

## Bloco 17 — Gerações: envelhecer e herdar (save v21) — feito em 18/11/2026

Vai além do jogo de referência (que não envelhecia ninguém).

**Escopo**
- **Relógio da vida** opcional no jogo novo: criança → jovem → adulto →
  idoso, com duração configurável; desligado mantém o comportamento clássico.
- Fase jovem (escola e primeiro emprego de meio período), idosos com
  aposentadoria (pensão pela carreira).
- **Herança**: dinheiro e objetos queridos (bloco 4) passam para a família;
  a árvore genealógica aparece num painel.
- **Legado da casa**: álbum com fotos tiradas pelo jogador (câmera) e marcos
  automáticos (casamento, nascimento, promoção máxima).

**Pronto quando**: com o relógio ligado uma criança cresce até idosa em uma
simulação acelerada; herança é distribuída; com ele desligado nada envelhece;
testes.

Como ficou: `sim/life.ts` com os ritmos curto, médio e longo; jovem na escola
com meio período das 17h às 20h; idoso aposentado com pensão do último cargo;
morte de velhice sem barganha; pecúlio repartido entre cônjuge e filhos (mesmo
os de outras casas do bairro) e objetos queridos passados ao herdeiro; botão
"Família" com árvore e álbum (fotos da câmera e marcos automáticos); o
criador faz jovens e idosos e o bairro fora de jogo envelhece junto.

---

## Como as threads seguem

Uma thread por bloco, na ordem acima. Cada uma lê este documento, as memórias
`thefolk-*` e o README, implementa, testa, atualiza o README e a memória,
envia na `main` e avisa a próxima. Se um bloco ficar grande demais, a thread
pode dividir em dois commits, mas entrega o bloco inteiro antes de passar
adiante. O que ficar de fora vai para as limitações do README e, se for
importante, para o bloco seguinte que fizer sentido.
