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

- **Clique em um objeto** para abrir o menu de interações; a escolha vira a
  ação atual do folk (ele larga o que fazia com uma saída limpa: levanta,
  deixa o prato onde está, encerra a conversa). Com **`Shift`** apertado, a
  escolha vai para o fim da fila (até 8 ações).
- **Clique no chão** para mandar o folk até ali (o `Shift` vale igual).
- A **fila** fica embaixo, no centro. O ✕ cancela qualquer item, inclusive o atual.
  Itens tracejados são reflexos (ouvir quem puxou conversa, acender a luz,
  correr do fogo).
- **Ninguém da família age sozinho** (plano 2, bloco 1). Sem ordem, o folk fica
  no lugar com gestos de espera: olha em volta, se espreguiça, cruza os braços,
  coça a cabeça, põe a mão na barriga com fome, boceja com sono, se remexe
  apertado. Os balões avisam o que ele quer. Visitas, prestadores, figurantes,
  bebês e as outras famílias do bairro continuam com vida própria; a carona do
  trabalho e o ônibus da escola ainda chamam sozinhos.
- **Relógio** no topo: pausa, normal (1 minuto de jogo por segundo), rápido (3),
  muito rápido (10) e **pular** (60), que só acende com todos da casa dormindo,
  fora ou no meio de algo longo e volta ao normal sozinho quando alguém fica
  livre. Atalhos: `Espaço` ou `0` (pausa), `1`, `2`, `3`, `4`.
- **Arraste** para mover a câmera, **role** para aproximar. `Esc` fecha o menu.
- **Gire a câmera** em passos de 90° com `Q` e `E` ou com os botões ⟲ ⟳ no canto
  superior esquerdo.
- O botão **Paredes** alterna entre em corte (some só o que fica na frente da
  câmera), baixas e inteiras.
- Passar o mouse num objeto só desenha um contorno no chão (nada cresce).
- **Dinheiro**: o saldo fica no relógio, ao lado do dia da semana. Passe o mouse
  para ver as contas na caixa de correio e quando chega a próxima; um selinho
  ✉ no saldo avisa que tem conta esperando. Lanche e ligações custam alguns
  tostões.
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
- **Casa viva (bloco 1)**: chuveiro, privada, pia e fogão sujam com o uso;
  TV, som, fogão, chuveiro, privada, gravador e bicicleta gastam e quebram
  (fumacinha e faísca). Quem come deixa prato na mesa, banho e acidente deixam
  poça, e a lixeira da cozinha enche: cheia, fede e o lixo vai para o chão.
  Clique no objeto para **Limpar**, **Consertar** ou **Fazer revisão** (só
  aparece quando há o que fazer) e na bagunça para recolher. O prato vai para
  a pia; o saco de lixo vai para o latão da calçada. Objeto quebrado não deixa
  usar o resto. A IA limpa e conserta sozinha, com mais vontade se o traço
  pede (caseiro, caprichoso) e menos se não (agitado, desleixado), e nada de
  faxina de mau humor.
- **Jeito e Capricho**: habilidades novas. Jeito sobe consertando, fazendo
  revisão, lendo o manual de consertos na estante ou mexendo na bancada de
  ferramentas; com Jeito abaixo de 3 o conserto sai **na gambiarra**
  (remendado com fita: quebra de novo mais cedo) e às vezes dá choque leve.
  Capricho sobe limpando e recolhendo: limpa mais rápido e suja menos.
- **Manias de casa**: bagunça e sujeira derrubam o Ambiente de quem está por
  perto, muito mais para quem é caprichoso ou caseiro. Quem se incomoda e
  recolhe o prato de outro morador reclama e guarda a lembrança "deixou
  bagunça para eu limpar".
- **Cômodos (bloco 3)**: o Ambiente agora sai do cômodo inteiro onde o folk
  está (a região fechada por paredes, portas e janelas): enfeites e móveis,
  sujeira e bagunça, tamanho (apertado pesa), janelas, luz, piso e
  revestimento e cantos vazios. O mesmo sofá vale muito mais numa sala bonita
  do que num corredor. O quadro de necessidades mostra o nome do cômodo,
  sugerido pelo uso ("Cozinha e sala", "Quarto", "Ateliê"), a nota e a luz;
  passe o mouse para ver a conta. Cada traço tem um gosto: o caseiro ama
  cômodo cheio, o reservado prefere quarto pequeno, o agitado e o tagarela
  gostam de espaço, o romântico gosta da meia-luz de abajur à noite.
- **Dia e noite (bloco 3)**: o sol nasce entre 5h e 7h e se põe entre 17h30
  e 21h. De dia a luz entra pelas janelas (cômodo sem janela fica na
  penumbra); à noite a casa escurece, e cômodo escuro derruba o Ambiente.
  Abajur e **luminária de teto** têm **Acender a luz** e **Apagar a luz**;
  com a IA ligada, quem vai usar algo num cômodo escuro acende a luz antes,
  quem vai dormir apaga a do quarto e quem sai de um cômodo vazio apaga ou
  não conforme o traço (o caprichoso quase sempre, o desleixado quase
  nunca). Lâmpada acesa entra na conta de luz.
- **Quadros, tapetes e luz de teto (bloco 3)** são objetos de compra: quadro
  e relógio penduram na parede atrás do tile (o fantasma gira sozinho para a
  parede), tapete vai rente ao chão e não fecha passagem, luminária de teto
  só dentro de cômodo. Parede com quadro pendurado não pode ser derrubada.
- **Catálogo em faixas (bloco 4)**: cada função (cama, sofá, poltrona,
  cadeira, mesa, chuveiro, privada, geladeira, fogão, TV, som, abajur,
  estante) tem versão **barata**, **média** e **cara** (⟡, ⟡⟡, ⟡⟡⟡ no
  catálogo, com filtro por faixa). A cara enche mais rápido, dá conforto
  junto, melhora o cômodo e gasta menos; a barata quebra mais e enfeia. A IA
  prefere a melhor quando pode escolher. São 70 objetos em 10 categorias.
- **Criar família (bloco 5)**: jogo novo (ou o primeiro, sem save) abre a
  tela de criar família: sobrenome da casa e de 1 a 8 moradores com nome,
  pele, cor e corte de cabelo, rosto (liso, sardas, óculos), corpo (magro,
  médio, forte), roupa do dia, de festa, pijama e traje de banho, até 2
  traços e o **mês de nascimento**. O atalho **Família pronta** traz Tomé e
  Lia de sempre. Quem mora junto já começa amigo.
- **Temperamento em cinco eixos (bloco 5)**: **Ordem**, **Expansão**,
  **Pique**, **Graça** e **Afeto**, de 0 a 10, com 25 pontos para distribuir.
  Ordem arruma e sente a bagunça; Expansão perde Social mais rápido e puxa
  conversa; Pique liga menos para conforto e treina Forma e Jeito mais
  rápido; Graça enjoa mais rápido e cria, e quem tem pouca Graça é sério e
  aprende Lógica; Afeto alto é gentil e Afeto baixo provoca e briga. O eixo
  alto também puxa a IA para o que combina (malhar, pintar, ler). Tudo em 5 é
  neutro. A cada duas semanas de jogo, o hábito mexe um ponto: quem limpa
  muito ganha Ordem, quem conversa muito ganha Expansão. O painel de
  habilidades mostra o temperamento e o mês.
- **Mês de nascimento (bloco 5)**: doze meses com nome de coisa de casa
  (Chaleira, Pião, Lampião, Pipa, Novelo, Bússola, Sino, Martelo, Concha,
  Balão, Ninho, Faísca). Cada um sugere um temperamento e combina ou dá
  atrito com alguns outros, o que soma na afinidade como um traço a mais.
- **Roupas e mãos (bloco 5)**: o **guarda-roupa** troca a roupa de sempre
  (dia, festa, pijama, banho); na cama o folk está de pijama, no chuveiro de
  roupão, na banheira de hidromassagem de traje de banho, e ninguém vai
  trabalhar de pijama. Prato, livro, telefone e pano de limpeza aparecem na
  mão de quem come, lê, liga e limpa.
- **Humor que manda (bloco 6)**: de mau humor, ou com fome, sono, banheiro,
  banho ou conforto no fim, o folk **recusa** ordens de esforço (estudar,
  treinar, frila, negócio): cruza os braços, balança a cabeça e o balão
  mostra o motivo; o menu já marca "sem vontade". Comer, dormir e limpar ele
  sempre topa. Pique alto aguenta mais antes de recusar. A IA também não pega
  no pesado de mau humor.
- **Balões (bloco 6)**: cartõezinhos sobre a cabeça mostram o que o folk quer
  (necessidade baixa), se está gostando da conversa (verde ou vermelho),
  reclamação de bagunça por perto (mais em quem tem Ordem), saudade de alguém
  querido que não aparece há dois dias, desejo cumprido e despertador. Passe
  o mouse no folk para ler o balão em palavras. Cansado, o rosto fica de
  pálpebra caída e a cabeça pesa.
- **Sono com horário (bloco 6)**: quem trabalha calcula a hora de deitar
  para acordar descansado e larga a diversão quando passa da hora; o
  **despertador** (no painel de trabalho, ligado por padrão) toca duas horas
  antes do turno. Ninguém pega no sono apertado para o banheiro ou com fome.
- **Desejos do dia e ânimo (bloco 6)**: às 6h cada morador sorteia até três
  desejos pequenos pelo temperamento e pelos traços (papo ou carinho com
  alguém, cozinhar, ler, jogar, suar a camisa, aprender uma habilidade, banho
  demorado, telefonar, receber visita, arrumar a casa, comprar algo novo).
  Aparecem no cartão do folk; a IA procura cumpri-los. Cumprir dá diversão,
  conforto e um ponto de **ânimo** (losangos, até 9; os três do dia dão um a
  mais). Com 3 de ânimo, **Inspirar** dá quatro horas de treino em dobro sem
  recusa.
- **Cartões de aviso (bloco 6)**: algo quebrou, conta chegou, campainha,
  promoção, demissão, desmaio e falta ao trabalho viram cartões no canto
  direito, que ficam até fechar (ou uns 25 segundos).
- **Cores**: sofás, poltronas, cadeiras e camas têm cores para escolher no
  rodapé do catálogo antes de pôr no chão.
- **Depreciação e desfazer**: no dia da compra o objeto vale o que custou (e
  vender devolve tudo); na virada do dia perde 15% e depois vai perdendo com
  o uso, até 30% do preço. O menu do objeto mostra quanto vale hoje. O botão
  **Desfazer** (ou Ctrl+Z) no modo compra desfaz compras (devolve tudo),
  vendas e mudanças de lugar até você sair do modo.
- **Mesa e cadeiras separadas**: cadeira virada para uma mesa vira lugar à
  mesa. Quem pega refeição, lanche ou comida pronta leva o prato até o lugar
  livre mais perto e come sentado, com conforto a mais; comendo junto com
  alguém, ganha social e amizade. Sem mesa, come de pé como antes.
- **Atividades a dois**: mesa de xadrez, mesa de carteado, videogame, ofurô,
  piano (a quatro mãos), luneta (só de noite), saco de pancada, vitrola e
  TV de projeção. Sozinho dá para usar; com outro folk na mesma atividade,
  os dois ganham diversão e social a mais, a amizade sobe e fica a lembrança
  "nos divertimos juntos". Quem está à toa tem vontade de entrar no jogo que
  alguém começou.
- **Objeto querido**: depois de umas 20 horas de uso, o objeto vira o
  querido de quem mais usou: usar dá um pouco mais de diversão e conforto, e
  vender (ou perder para a penhora) deixa a pessoa triste.
- **Na parede**: prateleira com enfeites e espelho de corpo inteiro (ensaiar
  discurso treina Lábia).
- **Despensa (bloco 2)**: a geladeira guarda porções (até 24 por geladeira;
  o menu mostra quantas sobram). Refeição e cozinhar no fogão gastam uma
  porção; sem estoque só sobra o lanche ou pedir comida. A casa começa com 16.
- **Telefone → Pedir um serviço**: **mercado** (12 porções, pago na hora,
  chega em uma ou duas horas, entre 8h e 21h), **comida pronta** (3 porções,
  das 10h às 23h, prometida para uma hora: se atrasa, sai pela metade; paga na
  porta, com gorjeta), **faxineira** (vem todo dia às 9h, cobra a diária ao
  terminar; o mesmo item dispensa) e **técnico** (conserta tudo o que quebrou
  sem gambiarra e revisa o que está gasto; cobra visita mais hora). Com a
  geladeira vazia e fome, a IA pede sozinha.
- **Campainha**: visitas, entregador, faxineira e técnico tocam e esperam do
  lado de fora da porta da frente. Clique em quem está na porta para
  **convidar para entrar**, **dispensar** ou **receber a entrega**; com a IA
  ligada alguém da casa larga o que faz e atende. Ninguém atendeu: a visita
  vai embora chateada ("me deixou plantado na porta"), o mercado e a comida
  ficam na porta, faxineira e técnico entram com a chave.
- **Caixa de correio** na calçada: as contas chegam como cartas (luz, água e
  móveis, com vencimento em três dias) e são pagas ali. Conta vencida há mais
  de três dias traz o **oficial de penhora** às 10h: ele entra sem tocar,
  carimba e leva os móveis de mais valor até cobrir a dívida (e o bairro fica
  sabendo). A IA paga as contas sozinha quando tem dinheiro.
- **Jornal**: chega às 6h na calçada. Quem pega lê uma notícia do bairro (a
  fofoca também sai no jornal) e abre os **classificados do dia**: as vagas de
  emprego só aparecem no painel de trabalho depois disso. Jornal não
  recolhido vira papel velho acumulando (até 4).
- **Feira de sábado**: de 6h às 10h, a caixa de correio oferece "Comprar na
  feira da rua": 12 porções mais baratas que o mercado, para quem vai a pé.
- **Prestadores são vizinhos**: Zeca (entregador), Marta (faxineira), Ivo
  (técnico) e Plácido (oficial de penhora) têm traços, relações e lembranças
  como qualquer um. Marta é fofoqueira: se a casa estava uma bagunça, conta
  por aí sobre quem mais sujou.
- **Som (bloco 7)**: tudo é sintetizado na hora, sem arquivo de som. Passos
  mudam com o piso; cada ação tem o seu som (descarga, chuveiro, fogão,
  geladeira, TV, videogame, teclado, pano, conserto, telefone); campainha,
  carta, caixa registradora na compra, moedas na venda, martelo e pincel na
  obra. Piano, teclado e flauta tocam notas de verdade (e erram com pouca
  Criatividade). Cada modo tem a sua música, composta enquanto você joga.
- **Folquês (bloco 7)**: os folks falam uma língua inventada, cada um com a
  sua voz (o Pique acelera, o corpo forte engrossa). Conversa alegre sobe no
  fim, briga acelera e desce, carinho sai devagar e baixinho; quem ouve
  responde de vez em quando, e a recusa vira resmungo.
- **Rádio de verdade (bloco 7)**: rádio, caixa de som e jukebox têm Ligar o
  som, Trocar de estação e Desligar. As estações **Brisa** (calma),
  **Chiclete** (pop alegre) e **Trovão** (batida forte) tocam de verdade, com
  notinhas da cor da estação subindo do aparelho. Cada folk tem a sua
  preferida (o menu do som diz qual): dançar com ela diverte mais, com a que
  não gosta, menos; dançar com o som desligado liga na preferida. Som ligado
  gasta luz e atrapalha quem dorme no mesmo cômodo; quem vai dormir desliga.
- **Volume (bloco 7)**: o botão ♪ abre volumes de geral, música, efeitos e
  vozes, e silenciar; a tecla M silencia. Fica guardado no navegador.
- **Jogos salvos (bloco 7)**: **Salvar** grava na vaga em uso; **Jogos** abre
  as três vagas com nome (clique para mudar), dia, dinheiro, quem mora e uma
  miniatura da casa, para salvar em outra vaga, abrir ou apagar. **Exportar
  arquivo** baixa o jogo num `.folk.json` e **Importar arquivo** abre um
  arquivo exportado numa vaga livre (saves de versões antigas são
  convertidos). O jogo salva sozinho a cada 30 segundos na vaga em uso e
  continua de onde parou ao reabrir; o save de antes do bloco 7 vira a vaga 1.

- **Dez carreiras (bloco 8)**: Repartição, Cozinha de restaurante, Ateliê
  gráfico, Posto de saúde, Oficina de reparos, Trupe da Lona, Observatório do
  morro, Câmara do bairro, Clube de várzea e Brigada de socorro, cada uma com
  dez cargos, horário, dias, salário e exigências de três habilidades **e de
  amigos da família**. O jornal traz quatro vagas por dia.
- **Amigos da família (bloco 8)**: gente de fora de quem alguém da casa gosta
  de verdade (amizade 50 ou mais), contada uma vez só. Aparece no cartão de
  relações (com ★ em quem conta) e nas exigências do próximo cargo. Amizade e
  romance **esfriam** a cada dia sem contato, mais depressa para quem tem pouco
  Afeto; quem está esfriando ganha a marca "esfriando".
- **Carona (bloco 8)**: uma hora antes do turno a carona da carreira encosta na
  calçada e buzina; o folk veste o uniforme e vai. Ela buzina de novo quinze
  minutos antes de partir e vai embora dez minutos depois da hora: quem não
  embarcou perde o turno. Na volta, a carona deixa o folk na calçada. Carona e
  uniforme (com chapéu, capacete, touca de chef...) mudam nos cargos 5 e 8.
  Depois do banho ou do sono o uniforme vai para o cabide.
- **Recompensas de carreira (bloco 8)**: no sexto cargo cada carreira libera um
  objeto no catálogo (ábaco, carrinho de temperos, prensa de gravura,
  esqueleto, torno, monociclo, planetário de mesa, púlpito, barra fixa, painel
  de nós) que treina uma habilidade da área mais depressa. Antes disso aparece
  trancado, dizendo onde se libera.
- **Expediente mais vivo (bloco 8)**: eventos próprios das carreiras novas e
  **eventos em cadeia** (um empréstimo cobrado dias depois, um atalho que cai
  numa conferência, um cometa a confirmar, uma promessa de campanha cobrada).
  Toda semana colegas sobem de cargo, alguém é demitido e arruma outro
  emprego, e chefe demitido é substituído pelo colega mais graduado.
- **Assuntos (bloco 9)**: dez assuntos (tempo, bichos, receitas, esporte,
  dinheiro, estrelas, música, fofoca, engenhocas e romance). Cada pessoa gosta
  de uns e detesta outros; o "papear" escolhe um assunto que aparece no balão,
  com selo verde ou vermelho pela reação de quem ouve. Assunto em comum rende
  mais amizade e diversão, e o gosto pega um pouco de quem fala. "Puxar
  assunto ›" no menu social deixa escolher.
- **Roda de conversa (bloco 9)**: até quatro pessoas em círculo, com turnos de
  fala: quem fala escolhe o assunto pela Lábia e cada ouvinte reage. Dá para
  chamar alguém para uma roda ou entrar numa que já existe; os folks também
  formam rodas sozinhos, mais ainda numa festa.
- **Telefone social (bloco 9)**: ligar para alguém (a ligação conta como
  contato e evita que a amizade esfrie), receber ligações (o telefone toca e
  balança; quem não atende perde a chamada) com fofoca, convite ou só papo.
- **Festa (bloco 9)**: no telefone, "Dar uma festa" convida até oito pessoas
  (com aviso de rivais e atalho para chamar a turma). A mesa de buffet serve
  petiscos, a música anima, e a festa dura quatro horas. A nota (1 a 5) sai da
  animação média dos convidados: festa boa dá fama, festa ruim vira fofoca.
  Depois das 22h o vizinho reclama do barulho, e duas reclamações encerram a
  festa.
- **Panelinhas (bloco 9)**: o jogo acha turmas de amigos e pares de rivais no
  bairro (painel de relações). Rivais na mesma festa brigam e viram notícia.
- **Mais conversas (bloco 9)**: relembrar (amizade 70+), aperto de mão,
  esnobar (para quem não se gosta) e mandar embora uma visita; na porta, o
  cumprimento varia com a relação (beijo, abraço, aperto de mão ou aceno).
  Folks param de se atravessar: esperam, contornam e se afastam de quem está
  parado no mesmo lugar.
- **Pedido de casamento (bloco 10)**: compre um estojo de aliança (decoração,
  450 ⟡) e, namorando com romance 70 ou mais, use "Pedir em casamento". A
  chance sobe com o romance, a amizade e o humor de quem ouve. O sim leva o
  estojo (a aliança aparece na mão dos dois) e vira notícia; o não dói, deixa
  lembrança e também corre de boca em boca. Noivado pode ser desfeito com
  "Terminar".
- **Casamento em casa (bloco 10)**: com noivos, o menu de conversa mostra
  "Marcar o casamento ›": escolha os convidados (a festa do bloco 9) e o
  sobrenome (o de um, o do outro, os dois juntos ou cada um o seu). Uns 40
  minutos depois de a festa começar, os noivos se vestem de gala, vão para a
  frente do arco de flores (se houver) e trocam os votos. Convidados guardam a
  lembrança, a notícia corre e a festa ganha pontos (mais ainda com arco).
  Casou com alguém de fora: a pessoa se muda junto.
- **Morar junto (bloco 10)**: quem se muda traz as economias (somadas ao caixa),
  o emprego e uma mala que fica no chão até ser desfeita; ao desfazer, saem os
  móveis dela (um pelo gosto, como cavalete ou tabuleiro, e uma planta). O que
  não couber é vendido.
- **Mudar alguém para fora (bloco 10)**: "Pedir para se mudar" manda um
  morador embora (menos o último): ele vira vizinho, leva o emprego, sai pela
  calçada com a mala e pode voltar de visita.
- **Divórcio (bloco 10)**: casado não "termina", pede o divórcio. Quem foi
  deixado sai de casa levando metade do caixa e volta ao nome de solteiro; os
  dois guardam lembrança amarga, a fofoca corre e o painel passa a mostrar
  "ex-cônjuge". Casamento não acaba sozinho quando o romance esfria.
- **Cama de casal (bloco 10)**: a "Dois Travesseiros" (640 ⟡) e a estofada
  têm "Deitar abraçadinho", que chama o par para junto e sobe o romance.
  Dormir na mesma cama também aproxima o casal e deixa a lembrança da primeira
  noite. Conversas novas de casal: aconchego, falar manso, massagem nos
  ombros e dançar coladinho.
- **Bebês (bloco 11)**: compre um berço (260 ⟡, categoria camas). Um casal
  que mora junto e namora com romance 45+ pode "Tentar ter um bebê"; se der
  certo, o painel mostra "bebê a caminho" e ele chega umas 20 horas depois,
  direto no berço. Pelo telefone dá para adotar (250 ⟡, a assistente traz o
  bebê às 10h do dia seguinte). O bebê não anda nem recebe ordens: chora
  quando tem fome, está sujo ou quer companhia, e no berço aparecem "Dar
  mamadeira", "Trocar fralda", "Pegar no colo" e "Ninar". Adultos com vontade
  própria cuidam sozinhos, e o choro acorda alguém de noite. Depois de três
  dias ele vira criança.
- **Descaso (bloco 11)**: bebê ou criança com fome ou sujeira no fundo por
  muito tempo chama a visitadora social. Na primeira visita ela avisa; na
  segunda, leva a criança embora.
- **Crianças e escola (bloco 11)**: criança é menor, não cozinha, não
  trabalha, não namora. Nos dias úteis o ônibus escolar amarelo para na
  calçada das 7h às 7h40; quem perde o ônibus falta e a nota cai. Na volta,
  às 15h, há lição de casa (mesa com estante de livros ou escrivaninha) que
  um adulto pode "Ajudar na lição". O boletim (0 a 10) sobe com lição feita e
  humor bom e desce com lição esquecida e falta; sai toda sexta. Nota 8,5+
  dá quadro de honra; nota abaixo de 2,5 por cinco dias manda a criança para
  o colégio interno.
- **Brinquedos (bloco 11)**: casinha de bonecas (criatividade, qualquer um
  brinca), pião (jeito) e cavalinho de balanço (preparo), os dois últimos só
  de criança.
- **Herança e convivência (bloco 11)**: o bebê nasce com o temperamento
  médio dos pais mais um empurrão aleatório, e traços e aparência de um ou
  do outro. Aos domingos, quem mais cuidou da criança na semana (colo,
  mamadeira, conversa, lição) passa para ela um ponto do eixo em que mais
  diferem.
- **Andares e escada (bloco 12)**: todo lote tem térreo e mais dois andares.
  Os botões ▾ e ▴ ao lado de "Paredes" (ou PageUp e PageDown) trocam o andar
  que se vê; os de cima somem e os de baixo ficam com as paredes inteiras. A
  vista acompanha o morador selecionado quando ele sobe ou desce. Piso de
  cima só vai em cima de cômodo de baixo; parede de cima precisa de piso de
  um dos lados ou de parede embaixo. A escada (650 ⟡, aba Paredes, R gira)
  ocupa três tiles, abre o vão no andar de cima e precisa de piso livre no
  patamar; clicar numa escada com a ferramenta a tira. No andar de cima,
  "Sem piso" no lugar da grama tira o piso.
- **Telhado (bloco 12, refeito no plano 2, bloco 3)**: toda casa tem telhado.
  Ele se monta sozinho sobre toda a área construída: cômodo fechado com piso
  de dentro e, no térreo, a varanda coberta (piso de dentro sem paredes,
  grudado num cômodo); o que tem piso no andar de cima não ganha telhado, e o
  pátio cercado de grama fica a céu aberto. Aba Telhado: quatro águas, duas
  águas (oitões nas pontas) ou uma água (alta atrás, baixa na frente), três
  inclinações e seis cores (2 ⟡ por tile coberto); **Laje** (6 ⟡ o tile)
  troca a telha por laje plana com platibanda num retângulo arrastado, e
  **Tirar laje** volta a telha.
- **Modos de vista (plano 2, bloco 3)**: no canto de cima, quatro botões:
  telhado à vista (a casa inteira, todos os andares), paredes inteiras (sem
  telhado), paredes recortadas (o padrão) e paredes baixas. Home sobe e End
  desce. Com o telhado à vista, ele some sozinho ao abrir a obra ou ao
  aproximar a câmera de um cômodo, e volta ao afastar; o alfinete (P) fixa o
  modo. A ferramenta de telhado e a de laje sempre mostram o telhado. O modo
  escolhido fica guardado no navegador.
- **Sentar e assistir (plano 2, bloco 4)**: todo assento tem lugares; o
  folk escolhe um livre, senta (1 min) e fica sentado depois que a ação
  acaba, até a próxima ordem que não se faça dali (aí levanta, 1 min). "Assistir"
  leva ao melhor assento livre virado para a TV dentro da área de visão (de pé
  na frente, se não houver). A TV tem canais (novela, esporte, culinária, que
  ensina a cozinhar, e desenho), fica ligada até alguém desligar e quem está
  sentado em frente segue vendo enquanto conversa com quem está ao lado ou
  come o prato que trouxe. "Chamar para ver junto" no menu de outra pessoa.
  Clicar no próprio folk sentado: Levantar, Ler um livro aqui, Ligar daqui.
  Som ("Ouvir música") e lareira ("Olhar o fogo") seguem a mesma lógica.
- **Peças novas (bloco 12)**: meia parede (fecha o passo sem dividir o
  cômodo), coluna nos cantos, porta de vidro, porta dupla, arco (passagem sem
  folha), janela alta (+6 de ambiente) e basculante (+2).
- **Quintal (bloco 13)**: aba Quintal no modo construção, só no térreo. A
  piscina se cava tile a tile (35 ⟡ o tile; "Grama (aterrar)" desfaz); dentro
  dela só vão a escadinha (220 ⟡, onde se entra e sai para nadar) e, na borda,
  o trampolim (380 ⟡). Nadar diverte e treina Fôlego, com roupa de banho;
  mergulhar numa piscina sem escadinha assusta e cansa. Caminho de pedra e
  deck de madeira enfeitam o chão de fora. Cerca de ripas, mureta e portão:
  arraste de um canto a outro; ninguém passa pela cerca, só pelo portão
  (num trecho de cerca ou num vão deixado nela), e cerca não fecha cômodo.
- **Jardim vivo (bloco 13)**: canteiro de flores, roseira, cerca viva,
  horta, laranjeira e ipê (categoria Ao ar livre) nascem mudas, crescem,
  florescem, pedem água, murcham e morrem sem rega; o vaso de dentro de casa
  também. Regar, cheirar flor, colher (horta e laranjeira enchem a despensa)
  e replantar a planta morta. De madrugada sai a previsão: em 30% dos dias
  chove por algumas horas, molhando o que está ao ar livre (o vaso de dentro,
  não). Plantas bonitas somam ao ambiente do cômodo. O jardineiro Tião
  Mangueira (telefone, serviços, 30 ⟡ por visita) passa às 8h, rega e colhe.
  Churrasqueira, mesa de jardim para três e rede completam o quintal.
- **Perigos (bloco 14)**: cozinhar no fogão com pouca Culinária, a lareira
  acesa colada em móvel de madeira ou tecido e o choque de quem conserta sem
  Jeito podem começar um fogo. O fogo esquenta, pula para o vizinho que
  queima (parede segura), vira cinza e assusta quem está perto. Extintor de
  parede (120 ⟡): o morador corre, pega e apaga. Detector de fumaça (60 ⟡)
  chama Bia Hidrante e Juca Mangote, que chegam com a mangueira; sem ele,
  alguém liga do telefone. De madrugada, Lalau Ferrolho pode entrar para
  levar o objeto mais caro: o alarme (250 ⟡) chama Dorival Guarita na hora,
  que corre atrás, devolve o que foi levado e deixa 250 ⟡ de recompensa;
  sem alarme, só se alguém acordar e ligar. Lareira (900 ⟡) aquece e junta a
  família em volta.
- **Morte (bloco 14)**: fogo, fome extrema e cair na piscina sem escadinha
  derrubam o folk. Seu Sereno (terno cor de anoitecer, cartola, lanterna e
  livro de registro) vem buscar; o jogo pausa e quem está na casa pode
  desafiá-lo no par ou ímpar: ganhando, ele fecha o livro e o folk se
  levanta. Quem se vai deixa lápide no quintal (ou urna dentro de casa), luto
  de três dias em quem gostava dele e, à noite, um vulto azulado que vaga e
  assusta. Homenagear na lápide acalma até ele descansar. A opção "Perigos
  podem matar" no criador desliga a morte (quem cairia escapa por um triz);
  casa vazia mostra o fim e oferece família nova ou carregar.
- **Bairro (bloco 15)**: o botão "Bairro" mostra a Vila Taramela de cima,
  com as casas de verdade dos dez lotes da Rua das Taramelas. Clicando num
  lote: jogar com a família que mora lá (a de agora fica guardada do jeito
  que estava), mudar a família para um terreno vago ou casa à venda (a casa
  de agora é vendida pelo terreno, obra e móveis) ou trazer uma família nova
  (chega com ⟡ 6.000 e paga o lote). As famílias fora de jogo recebem
  salário nos dias de turno, pagam as contas e se visitam; o mural "Pelo
  bairro" conta o que aconteceu. Visitas do bairro chegam a pé pela calçada,
  do lado da casa delas, e voltam para lá.
- **Centro e encontros (bloco 16)**: o botão "Centro" chama um táxi (⟡ 25 a
  ida, ⟡ 25 a volta) para o Centro de Taramela: o Largo do Coreto (chafariz
  dos desejos, bancos, ipês e lampiões), a Cantina Forno Velho (mesas de
  toalha xadrez, cardápio com quatro pratos e o garçom Tadeu Travessa, que
  anota a mesa inteira, espera a cozinha e traz os pratos), o Café Xícara
  Torta (cafezinho e bolo) e o Bazar Fita Métrica (roupa nova e de gala,
  presentes e encomendas que chegam em casa na volta: aquário, globo, vaso
  de flores). Escolhe-se quem vai e, se quiser, com quem sair: alguém da
  casa ou um conhecido (que pode recusar). O encontro ganha nota de 1 a 5
  estrelas pelo humor dos dois, as conversas, o jantar a dois, presentes
  ("Dar presente") e moedas no chafariz, e a nota muda romance e amizade.
  O tempo corre lá também; quem fica em casa segue trabalhando e estudando.
  O centro fecha às 2h (todo mundo volta de táxi) e quem cai de sono volta
  antes. Figurantes do centro passeiam pelo largo e, depois de conhecidos,
  viram vizinhos como os outros.
- **Gerações (bloco 17)**: no jogo novo dá para ligar o "Relógio da vida"
  (vida curta, média ou longa; desligado, ninguém envelhece, como no
  clássico). Ligado, o bebê vira criança, a criança vira jovem, o jovem vira
  adulto e o adulto vira idoso; no fim da velhice, com a morte ligada, o Seu
  Sereno vem buscar com calma (sem par ou ímpar). O jovem continua na
  escola e pode pegar um meio período depois da aula (17h às 20h, menos da
  metade do salário, sem promoção); ao virar adulto, se forma (a nota vai
  para o álbum) e fica efetivado. Quem vira idoso se aposenta com pensão
  por dia tirada do último cargo. Quem morre deixa um pecúlio que cresce com
  o cargo: vai para o cônjuge e os filhos, mesmo os que moram em outra casa
  do bairro, e os objetos queridos passam para o herdeiro da casa. O botão
  "Família" mostra a árvore (avós em cima, casais lado a lado, quem se foi em
  sépia) e o álbum: "Tirar foto" cola a vista de agora com legenda, e os
  grandes momentos entram sozinhos (nascimento, casamento, cargo mais alto,
  formatura, aposentadoria, herança, despedida). O criador de família já
  faz jovens e idosos, e as famílias do bairro fora de jogo também
  envelhecem.

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
  calçada das visitas. Planta do bairro e das casas em `data/town.ts`; a vista
  em `game/town.ts` (`TownView`, desenhada na mesma imagem interna) e o painel
  em `ui/town.ts`.
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
