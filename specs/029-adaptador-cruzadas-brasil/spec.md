# Feature Specification: Adaptador da fonte Cruzadas Brasil

**Feature Branch**: `feat/029-adaptador-cruzadas-brasil`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/65" ("[Feature]: adicionar Cruzadas Brasil como fonte de cruzadinhas")

## Observações da fonte (2026-10-22)

Feitas pelo autor na análise da issue #65, antes da spec; servem de base para as suposições abaixo e não substituem a verificação sob demanda (FR-016).

- Uma página por dia, endereçada pela data (`https://cruzadasbrasil.com.br/palavras-cruzadas/AAAAMMDD`), pública, sem login. Não há API.
- A grade vista (22/10/2026) tem 13 x 8 (78 células brancas); `#` marca as células pretas. É o modelo clássico, com o número no canto da célula e as dicas em lista, separadas em horizontais e verticais.
- O HTML inicial traz os dados do jogo: identificador, título, nível ("Diário"), dimensões (linhas e colunas), dicas (com número e texto, em horizontais e verticais), a posição da célula de cada número e o gabarito (matriz de letras, `#` nos blocos). A página renderizada também traz a grade e as dicas. Os dados do jogo não trazem o tamanho nem a direção das palavras: saem da grade e dos números, e a posição dos números serve de conferência.
- `robots.txt` permite tudo, exceto `/data/*.pdf`. O `sitemap.xml` lista cerca de 103 páginas de palavras cruzadas. 21/10/2026 responde 200, mas 01/01/2026 e 01/01/2025 respondem 404: o histórico parece curto.
- O site vive de anúncios e vende uma coletânea em PDF; não há permissão por escrito registrada.

## User Scenarios & Testing *(mandatory)*

Os atores são o jogador (visitante ou com conta), que passa a ter uma terceira cruzadinha por dia, e o autor do projeto, que mantém a coleta e confere a fonte. A feature 003 definiu o formato interno e a interface comum de fonte; a 014 acrescentou a segunda fonte e deixou o site pronto para 1 a 3 fontes. Esta feature acrescenta a Cruzadas Brasil sem mudar esse formato.

### User Story 1 - Obter um puzzle da Cruzadas Brasil por data (Priority: P1)

Dada uma data, o sistema busca a página do dia, lê os dados do jogo, reconstrói as palavras a partir da grade e dos números, confere tudo contra o gabarito e devolve o puzzle no formato interno (parte pública e solução). Quando não consegue, devolve um dos motivos que a interface de fonte já conhece, sem que o resto do sistema saiba como a fonte entrega os dados.

**Why this priority**: É o núcleo da feature. Sem a conversão confiável, nenhuma outra parte pode oferecer o puzzle.

**Independent Test**: Com páginas gravadas (fixtures 5 x 5 de conteúdo inventado) no lugar da rede, pedir o puzzle de uma data e conferir dimensões, blocos, números, posição e direção das palavras, dicas e letras; repetir com 404, página sem os dados do jogo, dados com estrutura alterada e gabarito incoerente com a grade, conferindo o motivo devolvido.

**Acceptance Scenarios**:

1. **Given** uma página válida de uma data, **When** o puzzle dessa data é pedido, **Then** o resultado é um puzzle no formato interno com as mesmas dimensões, blocos, números, dicas e letras da página, fonte `cruzadasbrasil`, nível `daily`, a data pedida e atribuição "Cruzadas Brasil".
2. **Given** uma grade em que células brancas consecutivas na horizontal ou na vertical formam palavras de duas ou mais letras, **When** o puzzle é convertido, **Then** cada palavra recebe início e direção calculados a partir da grade e dos números, e a dica de mesmo número e direção.
3. **Given** a fonte responde 404 para a data, **When** o puzzle é pedido, **Then** o motivo é `unavailable`.
4. **Given** a data pedida é posterior ao dia de hoje em Brasília, **When** o puzzle é pedido, **Then** o motivo é `unavailable` sem nenhum pedido à fonte.
5. **Given** uma página sem os dados do jogo, com estrutura diferente da esperada, ou cujo gabarito não bate com a grade (letra em bloco, bloco com letra, dimensões divergentes), **When** o puzzle é convertido, **Then** o motivo é `unexpected-format` e nenhum puzzle parcial é devolvido.
6. **Given** uma dica sem palavra correspondente, uma palavra sem dica, ou um número de dica diferente do número calculado para a célula inicial, **When** o puzzle é convertido, **Then** o motivo é `unexpected-format`.
7. **Given** dicas e gabarito com acentos e cedilha (por exemplo "AÇÃO"), **When** o puzzle é convertido, **Then** os caracteres saem corretos, sem texto corrompido, em qualquer página lida.

---

### User Story 2 - Jogar o puzzle da Cruzadas Brasil no site (Priority: P2)

O jogador escolhe a Cruzadas Brasil como fonte no calendário e nos cartões de "Hoje", como já faz com as demais, e joga como joga as outras: progresso, relógio, ajudas, conclusão e recorde valem por puzzle, sem misturar as fontes, com a atribuição à Cruzadas Brasil na tela do jogo.

**Why this priority**: É o que dá valor ao jogador, mas depende da história 1. A parte da API (rotas que aceitam a fonte) pode ser entregue e testada antes do site.

**Independent Test**: Com puzzles das três fontes salvos para a mesma data, abrir a biblioteca, conferir três abas e três cartões de "Hoje", alternar a fonte e jogar o da Cruzadas Brasil; conferir que o progresso de um não aparece nos outros.

**Acceptance Scenarios**:

1. **Given** puzzles das três fontes salvos para o mesmo dia, **When** a biblioteca abre, **Then** aparecem três abas de fonte e três cartões em "Hoje", cada um com o estado do puzzle da sua fonte, e a Cruzadas Brasil aparece depois das duas existentes.
2. **Given** a aba Cruzadas Brasil escolhida, **When** o calendário aparece, **Then** mostra os dias e os estados dessa fonte, com a contagem de concluídos do mês.
3. **Given** um dia passado sem o puzzle da Cruzadas Brasil salvo, **When** o jogador abre esse dia com a fonte escolhida, **Then** o puzzle é buscado na hora, com as mesmas mensagens de indisponível, falha da fonte e limite de pedidos que já existem para as outras fontes.
4. **Given** o jogador está num puzzle da Cruzadas Brasil, **When** a tela do jogo aparece, **Then** a atribuição mostra "Cruzadas Brasil" e a tela não repete nome igual na linha de atribuição.
5. **Given** a conclusão de um puzzle, **When** o diálogo de conclusão abre, **Then** oferece o puzzle de outra fonte do mesmo dia que exista e não esteja concluído, sem lista fixa de duas fontes.
6. **Given** um site da versão anterior, que não conhece a nova fonte, **When** ele pede puzzle ou biblioteca sem fonte, ou com `oglobo` ou `cruzadaonline`, **Then** recebe exatamente o que recebia antes.
7. **Given** a fonte padrão nas configurações do jogador, **When** ele escolhe `cruzadasbrasil`, **Then** o calendário abre nessa fonte; uma configuração antiga continua válida.

---

### User Story 3 - Coleta e verificação sob demanda (Priority: P3)

O autor tem a coleta agendada salvando também o puzzle da Cruzadas Brasil de hoje e os dias que faltam e que a fonte realmente tem, e uma verificação sob demanda contra a fonte real que diz se a busca e a conversão funcionaram para uma data.

**Why this priority**: A verificação mantém as fixtures fiéis à fonte real; a coleta deixa o histórico pronto sem depender de busca na hora. Nenhuma das duas bloqueia a história 1.

**Independent Test**: Rodar a verificação para uma data recente e conferir um único pedido e uma linha de resultado sem o conteúdo da página; rodar a coleta com fontes falsas e conferir que cada fonte é coletada e que a falha de uma não impede as outras.

**Acceptance Scenarios**:

1. **Given** a fonte no ar, **When** o autor roda a verificação para uma data, **Then** uma linha informa sucesso (dimensões e contagem de palavras) ou o motivo da falha.
2. **Given** a coleta agendada, **When** ela roda, **Then** salva o puzzle de hoje e os dias passados que faltam na janela configurada, com pausa entre pedidos e sem repetir datas já salvas.
3. **Given** a Cruzadas Brasil só tem cerca de 103 dias de histórico, **When** a coleta pede uma data antiga e a fonte responde 404, **Then** a data é tratada como indisponível sem erro da execução, e as datas disponíveis são salvas.
4. **Given** uma fonte falha ou sinaliza limite durante a coleta, **When** a coleta continua, **Then** as outras fontes não são afetadas e a falha aparece no resultado, com o nome da fonte.
5. **Given** a suíte automática, **When** ela roda, **Then** a verificação contra a fonte real não é executada.

---

### Edge Cases

- Resposta 200 que não é a página esperada (página de erro do site, redirecionamento para a home, página de outra data): `unexpected-format`, nunca puzzle. O `id` dos dados do jogo MUST coincidir com a data pedida.
- Os dados do jogo aparecem no HTML dentro de um bloco de script; se o bloco faltar, não for JSON válido ou tiver outro formato, `unexpected-format`. O texto da página nunca é interpretado como instrução nem executado.
- Dimensões declaradas diferentes da matriz do gabarito: `unexpected-format`. Célula do gabarito com mais de uma letra, com caractere que não é letra nem `#`: `unexpected-format`.
- Palavra de uma única célula (sequência de uma letra entre blocos): não é palavra, não recebe número nem dica; se houver número ou dica para ela, `unexpected-format`.
- Célula que começa palavra horizontal e vertical ao mesmo tempo: recebe um só número, usado nas duas dicas.
- Dica com número repetido na mesma direção: `unexpected-format`. A ordem das dicas na lista não importa. Dica vazia depois da limpeza: `unexpected-format`.
- Texto de dica com marcação ou entidades HTML: vale o conteúdo textual, com entidades decodificadas, espaços repetidos reduzidos e pontas aparadas.
- Acento: a página pode vir em UTF-8 sem declaração clara; a leitura é sempre em UTF-8, e uma fixture com acentos e cedilha cobre isso.
- Letras da solução em minúscula: guardadas em maiúscula, acentos mantidos. O jogo já compara pela letra simples.
- Tempo limite de 10 segundos ou erro de rede: `source-down`. Status 5xx ou 403 (bloqueio da fonte): `source-down`. Status 429: `rate-limited`, sem nova tentativa. Corpo acima do limite de tamanho: `unexpected-format`, sem interpretar.
- Nível diferente de "Diário" na página: `unsupported` (só o nível `daily` é aceito).
- Fuso: a data é a pedida; "futuro" é decidido pelo dia em Brasília (regra já existente).
- Nenhuma fonte tem puzzle no dia: os cartões de "Hoje" tratam cada fonte sozinha, como já fazem.

## Requirements *(mandatory)*

### Functional Requirements

**Adaptador Cruzadas Brasil**

- **FR-001**: O sistema MUST acessar a Cruzadas Brasil apenas por um adaptador que implementa a interface comum de fonte de puzzles; nenhuma outra parte MUST conhecer o endereço, o HTML ou os nomes dos campos da fonte.
- **FR-002**: O conjunto de fontes aceitas MUST passar a incluir `cruzadasbrasil`, com nome de atribuição "Cruzadas Brasil"; o único nível aceito continua sendo `daily`.
- **FR-003**: O adaptador MUST buscar a página da data pedida, extrair os dados do jogo, validá-los como dado desconhecido e convertê-los para o formato interno da feature 003 (parte pública e solução separadas), sem mudar esse formato.
- **FR-004**: A conversão MUST ser uma função pura que calcula, a partir da grade, o início, a direção e o tamanho de cada palavra, numera as células iniciais, confere a numeração e a posição dos números informadas pela fonte, associa cada dica à palavra de mesmo número e direção, e confere o resultado contra o gabarito e contra as regras de puzzle e de par puzzle/solução já existentes antes de devolvê-lo.
- **FR-005**: O texto de dicas e de letras MUST sair com acentos e cedilha corretos: o corpo da resposta é sempre lido como UTF-8, e uma fixture com acentos e cedilha cobre isso.
- **FR-006**: O texto da dica MUST ser o conteúdo textual, sem marcação, com entidades decodificadas, espaços repetidos reduzidos e pontas aparadas; um texto vazio depois da limpeza MUST levar a `unexpected-format`. Nada do HTML da página além dos dados do jogo MUST entrar no puzzle salvo.
- **FR-007**: O adaptador MUST devolver os motivos da interface: `unavailable` (404 da fonte, ou data posterior a hoje em Brasília, esta sem pedido), `rate-limited` (429, sem nova tentativa), `source-down` (5xx, 403 ou bloqueio da fonte, rede ou tempo limite de 10 segundos), `unexpected-format` (corpo fora do esperado ou inconsistente) e `unsupported` (nível diferente de diário).
- **FR-008**: O adaptador MUST fazer no máximo um pedido por chamada, sem nova tentativa, com limite de tamanho do corpo, e MUST NOT registrar em logs, mensagens ou resultados o corpo bruto das respostas.
- **FR-009**: Como a fonte não informa uma lista de datas, o adaptador MUST devolver a lista de datas disponíveis vazia.

**Uso no sistema**

- **FR-010**: As rotas de puzzle por data e de biblioteca MUST aceitar `source=cruzadasbrasil`; sem fonte informada MUST valer `oglobo`; uma fonte desconhecida MUST ser recusada como pedido inválido. Cada puzzle e cada item da biblioteca já informam a fonte.
- **FR-011**: A Cruzadas Brasil MUST seguir as mesmas regras das outras fontes para guardar, buscar sob demanda um dia passado que falta (com o mesmo limite de pedidos por endereço) e recusar datas futuras. Progresso, relógio, ajudas, conclusão e recorde MUST ficar separados por puzzle, para conta e para visitante. O limite de 366 itens da biblioteca MUST valer por fonte.
- **FR-012**: A coleta e o comando `puzzles collect` MUST incluir a nova fonte, uma linha de resultado por fonte, e uma falha ou sinal de limite de uma fonte MUST NOT impedir a coleta das outras. Uma data que a fonte não tem (404) MUST ser tratada como indisponível, e a coleta MUST salvar as datas que existem, respeitando a janela de histórico configurada.
- **FR-013**: O site MUST mostrar a fonte como terceira aba do calendário, como terceiro cartão de "Hoje" e na linha de atribuição da tela do jogo, abrir o dia dessa fonte (inclusive pelo endereço direto do dia) e oferecê-la na configuração de fonte padrão. Os avisos de fonte fora do ar e de dia sem puzzle MUST ser por fonte, com o nome "Cruzadas Brasil".
- **FR-014**: Mudanças de contrato MUST ser compatíveis com a versão anterior do site e da API: o site anterior sem a nova fonte continua funcionando contra a nova API, e uma configuração salva com fonte padrão desconhecida continua sendo lida como a primeira fonte.
- **FR-015**: A alteração do conjunto de fontes aceitas no banco MUST ser uma migração versionada que apenas alarga a restrição existente, sem alterar dados.

**Testes, fixtures e documentação**

- **FR-016**: O sistema MUST oferecer uma verificação sob demanda contra a Cruzadas Brasil real, fora da suíte automática, com um pedido por data (até 10 datas, pausa de 2 s entre pedidos) e uma linha de resultado, sem imprimir o conteúdo da página.
- **FR-017**: O adaptador MUST ter testes de contrato sem rede, com `fetch` injetado e fixtures 5 x 5 de conteúdo inventado derivadas da estrutura das páginas reais (nunca um puzzle completo da fonte), cobrindo no mínimo: página válida com acentos e cedilha, 404, página sem os dados do jogo, estrutura alterada, gabarito incoerente com a grade, dica sem palavra, palavra sem dica e nível não suportado.
- **FR-018**: Os achados da fonte real (formato dos dados, histórico disponível, níveis, comportamento de erro, limites) MUST ficar em `findings.md` da feature, e a atribuição e a permissão da fonte MUST ficar registradas ali como pendência de decisão do autor.
- **FR-019**: A coleta MUST ser conferida uma vez no ambiente publicado da API antes de a fonte ser considerada pronta, porque a fonte pode tratar o endereço do servidor de forma diferente do de uma máquina local. Um bloqueio (403, desafio) MUST aparecer como falha da fonte (`source-down`), não como mudança de formato.

### Key Entities

- **Fonte Cruzadas Brasil**: nova fonte de puzzles, identificada por `cruzadasbrasil`, com um puzzle por dia no nível `daily` e atribuição "Cruzadas Brasil".
- **Página do dia**: o HTML publicado para uma data, que contém os dados do jogo (identificador, título, nível, dimensões, dicas numeradas por direção e gabarito) e a grade renderizada.
- **Puzzle e Solução**: os mesmos da feature 003, agora com `cruzadasbrasil` como valor possível de fonte.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das fixtures válidas viram puzzles que passam na validação e reproduzem exatamente dimensões, blocos, números, posição e direção das palavras, dicas e letras da página.
- **SC-002**: Cada fixture de falha produz o motivo esperado em 100% dos casos, sem puzzle parcial.
- **SC-003**: A verificação sob demanda converte sem erro as páginas reais de pelo menos 5 datas diferentes que a fonte tenha disponíveis.
- **SC-004**: Uma mudança na estrutura dos dados (campo renomeado, removido ou com outro tipo) faz pelo menos um teste de contrato falhar.
- **SC-005**: A suíte automática continua passando sem internet.
- **SC-006**: Nenhum arquivo versionado contém um puzzle completo da Cruzadas Brasil.
- **SC-007**: Um site da versão anterior continua funcionando sem mudança contra a nova API, verificado por teste.
- **SC-008**: A pessoa abre a biblioteca e chega ao puzzle do dia da Cruzadas Brasil em no máximo 2 interações (escolher o cartão de "Hoje"), como nas demais fontes.
- **SC-009**: Com as três fontes, a biblioteca e a tela do jogo não têm rolagem lateral nem quebra de layout em 360 px e em desktop.

## Assumptions

- A página do dia continua trazendo os dados do jogo no HTML inicial. A estrutura é interna da fonte e pode mudar sem aviso; por isso a conversão é validada com rigor e as fixtures quebram quando o formato muda.
- O histórico da fonte é curto (cerca de 103 dias, desde 2026-07-13, em 2026-10-23). A coleta e a busca sob demanda tratam 404 como `unavailable`, e a janela de histórico configurada é só um teto.
- Só existe o nível diário; outros níveis, se surgirem, ficam fora desta feature.
- O gabarito traz letras maiúsculas ou minúsculas com acentos; a regra do jogo de comparar pela letra simples vale como nas outras fontes.
- O projeto é de uso privado e não divulgado (constituição VIII, que dispensa a leitura dos termos como condição de feature). Contato com a Cruzadas Brasil para pedir um endpoint JSON estável, permissão por escrito e combinar a atribuição fica a cargo do autor e registrado em `findings.md`; não bloqueia a implementação.
- A atribuição por puzzle (nome da fonte) segue a regra existente; não há link para o site da fonte nesta feature.
- Depende das features 003 (formato), 006 (coleta), 014 (segunda fonte, `source` nas rotas), 015 (abas e cartões) e 021 (fonte padrão).
