# Feature Specification: x1 de cruzada (duelo 1x1 por link ou código)

**Feature Branch**: `feat/058-x1-duelo-1x1`

**Created**: 2026-11-02

**Status**: Implemented

**Input**: User description: https://github.com/BrunoYTanaka/cruzadinha/issues/117 — "Duelo 1x1 ('x1') assíncrono por link ou código. Quem cria escolhe uma cruzada já salva e as regras, e envia o link a outra pessoa. Cada um joga quando quiser, uma única tentativa, e vence o menor tempo medido pelo servidor." (entrega 1 de 2; a entrega 2, com duelos antigos, filtro por oponente e placar acumulado, é outra issue)

## Clarifications

### Session 2026-11-02

- Q: O teste com relógio falso pode quebrar os testes? → A: Não, se todo instante de regra vier do relógio injetado e o e2e (relógio real) não afirmar tempo exato; prazo vencido, tempo esgotado e W.O. ficam nos testes unitários e de integração com relógio falso (research R12).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar um duelo e convidar alguém (Priority: P1)

Uma pessoa (com conta ou como visitante) quer desafiar um amigo. Ela abre o calendário em modo de seleção, escolhe uma cruzada já salva, define as regras (ajudas, tempo máximo da partida, prazo para o oponente começar) e recebe um link e um código curto para enviar. Visitante informa um apelido.

**Why this priority**: Sem criar o duelo nada mais existe.

**Independent Test**: Como visitante, criar um duelo com uma cruzada salva e regras escolhidas, e conferir que aparecem o link e o código de 8 caracteres e que o duelo está aberto (`open`).

**Acceptance Scenarios**:

1. **Given** o calendário em modo de seleção, **When** a pessoa olha os dias, **Then** só dias com cruzada já salva podem ser escolhidos; dias sem cruzada, não salvos ou futuros não são selecionáveis.
2. **Given** um dia que a pessoa já concluiu, **When** ele aparece no modo de seleção, **Then** mostra o tempo feito e o aviso "você já fez esta".
3. **Given** a cruzada escolhida, **When** a pessoa define ajudas (livres, proibidas ou +N segundos por ajuda), tempo máximo (sem limite ou N min) e prazo para o oponente começar, **Then** o duelo é criado e ela recebe o link e o código.
4. **Given** qualquer pessoa criando (visitante ou logada), **When** não informa apelido, **Then** o site pede o apelido antes de criar.
5. **Given** um criador que já está no teto de duelos abertos, **When** tenta criar outro, **Then** recebe uma mensagem clara e nada é criado.
6. **Given** muitas criações seguidas do mesmo endereço, **When** passa do limite, **Then** o site pede para tentar mais tarde.

---

### User Story 2 - Aceitar o desafio, jogar e ver o resultado (Priority: P1)

O oponente recebe o link (ou digita o código), vê as regras na página do convite e decide: "Começar" ou "Recusar" (a feature 062 trocou a janela pela página e tirou "Agora não": quem não quer decidir agora sai pelo cabeçalho). Ao começar, o relógio do servidor dispara e a pessoa joga a cruzada uma única vez. Ao terminar, quem acabou primeiro vê "Aguardando o oponente", sem o tempo do outro; quando os dois terminam, o resultado mostra vencedor, diferença, tempos, penalidades e ajudas.

**Why this priority**: É o núcleo da competição.

**Independent Test**: Com dois contextos separados e relógio falso, criar, abrir o link no segundo, começar nos dois, terminar com tempos diferentes e conferir o vencedor e a diferença.

**Acceptance Scenarios**:

1. **Given** um link ou código de duelo `open`, **When** o oponente o abre ou consulta, **Then** vê as regras e nada muda no duelo (nem por pré-visualização de mensageiro).
2. **Given** a página do convite, **When** a pessoa sai dela sem escolher, **Then** o duelo continua `open` e nada é gravado (feature 062: substitui a janela que não fechava e o "Agora não").
3. **Given** a página do convite, **When** a pessoa só lê as regras, **Then** nada muda no duelo; só "Começar" ou "Recusar" agem.
4. **Given** a página do convite, **When** a pessoa escolhe "Recusar", **Then** o duelo é encerrado e o criador vê que foi recusado.
5. **Given** dois "Começar" simultâneos de pessoas diferentes, **When** o servidor os processa, **Then** só uma ocupa a vaga de oponente; a outra vê que o duelo já foi aceito.
6. **Given** um jogador no meio da partida, **When** recarrega a página ou abre o diálogo de configurações, **Then** o relógio não reinicia nem pausa: o tempo decorrido é o do servidor desde o "Começar".
7. **Given** um jogador que termina dentro do tempo máximo, **When** o outro ainda não terminou, **Then** ele vê "Aguardando o oponente" e nenhum tempo do outro.
8. **Given** os dois terminaram, **When** o resultado aparece, **Then** vence o menor tempo de jogo somado às penalidades de ajuda; tempos iguais são empate; vê-se vencedor, diferença, tempos, penalidades e ajudas.
9. **Given** um jogador cujo tempo ao terminar passa do tempo máximo, **When** envia a conclusão, **Then** o resultado é "tempo esgotado" e ele perde.
10. **Given** o criador, **When** ele também quer jogar, **Then** joga a mesma cruzada com as mesmas regras e uma única tentativa.

---

### User Story 3 - Voltar ao duelo e acompanhar em "Meus x1" (Priority: P1)

Cada pessoa precisa voltar a um duelo depois de fechar a aba. Quem tem conta volta pela sessão, em qualquer aparelho. O visitante volta pelo token do aparelho ou por um link de retorno. "Meus x1" lista os duelos ativos, com contador no menu, e atualiza por consulta periódica.

**Why this priority**: Duelo assíncrono só funciona se a pessoa consegue voltar a ele.

**Independent Test**: Criar como visitante, fechar e reabrir o site, abrir "Meus x1" e voltar ao duelo; repetir com conta em outro aparelho.

**Acceptance Scenarios**:

1. **Given** um logado com duelos ativos, **When** abre "Meus x1" em qualquer aparelho, **Then** vê todos os seus duelos ativos.
2. **Given** um visitante com duelos criados ou aceitos neste aparelho, **When** abre "Meus x1", **Then** vê esses duelos com um aviso de que a lista vale só para este aparelho.
3. **Given** um visitante sem o token (outro aparelho), **When** abre o link de retorno, **Then** reassume a participação sem precisar do aparelho original.
4. **Given** uma pessoa logada que também tem token de visitante, **When** o servidor identifica quem é, **Then** a sessão vale mais que o token.
5. **Given** "Meus x1" aberto, **When** o oponente aceita ou termina, **Then** a lista muda por consulta periódica, sem push nem e-mail.
6. **Given** uma sessão que expira no meio da partida, **When** o jogo está em andamento, **Then** o jogo não é interrompido.
7. **Given** vários duelos ao mesmo tempo, **When** a pessoa joga um, **Then** o progresso, o estado e o relógio de cada duelo ficam separados, do jogo normal e do "Jogar de novo" da mesma cruzada.

---

### User Story 4 - Entrar por código (Priority: P2)

A pessoa digita o código de 8 caracteres num campo em "Meus x1" e no menu; o campo também aceita o link colado. Só duelos `open` são encontrados; inexistente e não aberto dão a mesma resposta.

**Why this priority**: Atalho para quem recebe o código por voz ou mensagem sem link.

**Independent Test**: Digitar um código válido e ver as regras; digitar um código inexistente e um de duelo já aceito e conferir a mesma mensagem.

**Acceptance Scenarios**:

1. **Given** um código de duelo `open` (ou o link colado), **When** a pessoa o envia, **Then** vê a janela de regras.
2. **Given** um código inexistente ou de duelo que não está `open`, **When** envia, **Then** recebe a mesma resposta "não encontrado".
3. **Given** muitas tentativas do mesmo endereço, **When** passa do limite, **Then** pede para tentar mais tarde.
4. **Given** o código, **When** é composto, **Then** usa 8 caracteres sem ambiguidade visual (sem 0/O, 1/I/L e similares) e não revela o token do link.

---

### User Story 5 - Desistir, cancelar e prazos (Priority: P2)

Quem está jogando pode desistir e perde na hora; o criador pode cancelar enquanto ninguém aceitou. Se o prazo para começar vence sem o oponente aceitar, o duelo expira; se vence com só um terminado, quem terminou vence por W.O.

**Why this priority**: Fecha todos os finais possíveis do duelo; sem eles um duelo poderia ficar preso.

**Independent Test**: Para cada saída (desistir, cancelar, recusar, prazo vencido, tempo estourado), levar um duelo até o fim com relógio falso e conferir o estado final.

**Acceptance Scenarios**:

1. **Given** um jogador em partida, **When** escolhe desistir e confirma, **Then** perde na hora, sem desfazer, e o outro vence.
2. **Given** um duelo `open`, **When** o criador cancela e confirma, **Then** vira `cancelled`, sem desfazer.
3. **Given** um duelo `running` ou `finished`, **When** o criador tenta cancelar, **Then** não é possível.
4. **Given** o prazo vencido e nenhum oponente começou, **When** alguém lê o duelo, **Then** ele aparece como expirado sem ninguém ter agido.
5. **Given** o prazo vencido com só um jogador terminado, **When** o outro ainda não terminou, **Then** quem terminou vence (W.O.).
6. **Given** o prazo vencido e o cron ainda não rodou, **When** alguém lê o duelo, **Then** a leitura já mostra o estado correto; o cron só limpa o que expirou há tempo.

---

### Edge Cases

- Visitante que depois cria ou entra numa conta: os duelos de visitante deste aparelho deixam de aparecer em "Meus x1" enquanto a sessão estiver ativa (a sessão vence o token) e voltam ao sair; reivindicá-los na conta está fora do escopo.
- Mensageiros que pré-visualizam o link não podem aceitar, recusar ou iniciar nada (só o clique em "Começar" muda estado).
- O oponente é o próprio criador (mesma sessão ou mesmo token): não pode ocupar a vaga do oponente.
- Duas pessoas logadas na mesma conta em aparelhos diferentes jogam o mesmo duelo: um só relógio e uma só tentativa.
- Token de visitante perdido e sem o link de retorno: o duelo é perdido para essa pessoa (dívida aceita).
- A cruzada escolhida some ou muda depois da criação: o duelo guarda a referência à cruzada salva; cruzadas salvas não são apagadas.
- Tempo igual ao centésimo: empate, ninguém vence.
- Prazo e tempo máximo são dois relógios distintos: o prazo conta da criação; o tempo máximo conta do "Começar" de cada jogador.
- A conta do participante é apagada: o duelo permanece, com o apelido gravado na linha do participante.
- Falha de rede ao enviar a conclusão: o site tenta de novo, o jogador não perde o que digitou e o tempo continua sendo o do servidor.
- Vários duelos da mesma cruzada, e a mesma cruzada no jogo normal: progressos separados.

## Requirements *(mandatory)*

### Functional Requirements

**Criação e escolha da cruzada**

- **FR-001**: O sistema MUST permitir que visitante e logado criem um duelo escolhendo uma cruzada pelo calendário em modo de seleção.
- **FR-002**: No modo de seleção, o sistema MUST permitir escolher só dias com cruzada já salva, e MUST impedir dias sem cruzada, não salvos ou futuros.
- **FR-003**: No modo de seleção, dias já concluídos pela pessoa MUST mostrar o tempo e o aviso "você já fez esta"; o calendário e seus testes de CSS e acessibilidade continuam valendo fora do modo de seleção.
- **FR-004**: O criador MUST definir as ajudas (livres, proibidas ou +N segundos por ajuda), o tempo máximo da partida (sem limite ou N minutos) e o prazo para o oponente começar.
- **FR-005**: O sistema MUST gerar três identificadores distintos e que não se misturam: token do link (longo), código curto de 8 caracteres sem ambiguidade visual e token do participante.
- **FR-006**: O sistema MUST entregar ao criador o link e o código ao criar o duelo.
- **FR-007**: Toda pessoa (visitante ou logada) MUST informar um apelido de 1 a 24 caracteres ao criar ou aceitar um duelo, pois a conta não tem nome público e o e-mail nunca é exibido; o site lembra o último apelido neste aparelho e o apelido fica gravado na linha do participante.
- **FR-008**: O sistema MUST limitar a criação por endereço e MUST impor um teto de duelos abertos por criador, com mensagens claras.

**Entrar, aceitar e recusar**

- **FR-009**: Abrir o link ou consultar o código MUST NOT alterar o duelo; só o clique em "Começar", "Recusar desafio" ou as ações do jogo mudam estado.
- **FR-010**: Antes de começar, o site MUST mostrar a janela de regras, que MUST NOT fechar por clique fora nem por `Esc`, com "Começar", "Agora não" e "Recusar desafio".
- **FR-011**: "Começar" MUST ocupar a vaga de oponente de forma atômica e gravar o instante de início no servidor; dois "Começar" simultâneos MUST resultar em um oponente só.
- **FR-012**: "Recusar desafio" MUST encerrar o duelo e informar o criador.
- **FR-013**: O campo de código, em "Meus x1" e no menu, MUST aceitar o código ou o link colado e MUST encontrar só duelos `open`, com limite de taxa por endereço e resposta idêntica para inexistente e não aberto.
- **FR-014**: O criador MUST NOT ocupar a vaga de oponente do próprio duelo.

**Partida e tempo**

- **FR-015**: O relógio de cada jogador MUST ser do servidor, contado do "Começar" daquele jogador, sem pausa (nem com o diálogo de configurações) e sem reiniciar ao recarregar. O criador também começa pelo botão e pode jogar enquanto o duelo ainda está `open`.
- **FR-016**: Cada participante MUST ter uma única tentativa por duelo; o progresso de cada duelo MUST ficar separado do jogo normal, do "Jogar de novo" e dos outros duelos.
- **FR-017**: O site MUST aplicar as regras de ajuda do duelo (proibidas = botões desabilitados; livres; ou penalidade em segundos por ajuda) e o servidor MUST somar a penalidade ao tempo a partir das ajudas declaradas na conclusão. O servidor grava as ajudas declaradas e as mostra no resultado, sem validá-las (dívida aceita).
- **FR-018**: Ao concluir, se o tempo passar do tempo máximo, o resultado MUST ser "tempo esgotado" e o jogador perde.
- **FR-019**: Depois que a partida começou, nada MUST interromper o jogador: falha de rede, erro ao salvar e sessão expirada viram avisos que não bloqueiam.

**Estados e resultado**

- **FR-020**: O duelo MUST ter os estados `open`, `running`, `finished` e `cancelled`.
- **FR-021**: O vencedor MUST ser o menor tempo de jogo com penalidades; tempos iguais MUST ser empate.
- **FR-022**: Desistir MUST valer na hora, sem desfazer, com confirmação, e o desistente perde. O criador MUST poder cancelar só em `open`, com confirmação e sem desfazer.
- **FR-023**: O prazo vencido MUST ser calculado na leitura, com relógio injetável nos testes; com só um terminado, ele vence (W.O.); sem oponente, o duelo expira. O cron MUST só limpar duelos expirados.
- **FR-024**: Quem termina primeiro MUST ver "Aguardando o oponente" e MUST NOT ver o tempo do outro até o resultado final; o resultado MUST mostrar vencedor, diferença, tempos, penalidades e ajudas.
- **FR-025**: O sistema MUST NOT enviar push nem e-mail.

**Identidade, "Meus x1" e privacidade**

- **FR-026**: Visitante MUST voltar ao duelo pelo token guardado no aparelho (uma chave por duelo) ou por um link de retorno com o token no fragmento da URL; logado MUST voltar pela sessão, e a sessão MUST valer mais que o token.
- **FR-027**: O token do participante MUST ser guardado no servidor só como hash e MUST NOT aparecer em URL de consulta, log ou resposta a quem não o apresentou.
- **FR-028**: "Meus x1" MUST listar os duelos ativos (`open`, `running` e `finished` nas últimas 24 horas, para dar tempo de ver o resultado): para logado, os de sua conta em qualquer aparelho; para visitante, os dos tokens deste aparelho, com aviso, consultados em lote com limite de tokens por requisição e enviados fora da URL.
- **FR-029**: "Meus x1" MUST atualizar por consulta periódica e o menu MUST mostrar um contador que soma os duelos `running` em que a pessoa ainda não terminou e os `finished` nas últimas 24 horas.
- **FR-030**: A rota do duelo MUST sair com `noindex` e `Referrer-Policy: no-referrer`; token do participante, token do link e código MUST NOT ir em query string nem em rota da API; o endereço do convite no site (`/x1/<token do link>`) é o único lugar em que o token do link aparece no caminho, e o do participante só no fragmento.
- **FR-031**: Os dados de duelo MUST ficar ligados ao usuário de forma que apagar a conta preserve o duelo e o apelido (usuário anulável), preparando a entrega 2.
- **FR-032**: Site e API novos MUST funcionar com a versão anterior da outra parte.

### Key Entities *(include if feature involves data)*

- **Duelo (x1)**: desafio entre duas pessoas sobre uma cruzada salva. Guarda a cruzada, o criador, as regras (ajudas, tempo máximo, prazo), o estado, os identificadores do link e do código, o instante de criação e o desfecho (vencedor, empate, motivo).
- **Participante**: uma das duas vagas do duelo (criador e oponente). Guarda o apelido, o usuário (opcional, anulável), o hash do token de visitante, o instante de início e de fim, as ajudas usadas, a penalidade, o tempo e o motivo do fim (concluiu, desistiu, tempo esgotado, W.O.).
- **Regras do duelo**: política de ajudas, tempo máximo e prazo para começar; fixadas na criação.
- **Cruzada salva**: a cruzada já existente no acervo do site; o duelo só a referencia.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa cria um duelo em no máximo 6 interações (cliques, toques ou campos preenchidos) a partir do calendário em modo de seleção, verificado no teste ponta a ponta, e recebe o link e o código na mesma tela.
- **SC-002**: Em 100% dos testes com dois contextos e relógio falso, o vencedor, o empate, a desistência, o W.O. e o "tempo esgotado" resultam no desfecho descrito nas regras.
- **SC-003**: Em 100% dos testes de concorrência com dois "Começar" simultâneos, exatamente um oponente ocupa a vaga.
- **SC-004**: Abrir o link ou consultar o código mil vezes, ou por pré-visualização, deixa o duelo exatamente como estava.
- **SC-005**: Recarregar a página ou abrir configurações durante a partida nunca altera o tempo decorrido medido (variação zero além do relógio real).
- **SC-006**: Quem termina primeiro nunca vê o tempo do oponente antes do resultado final (zero ocorrências nos testes).
- **SC-007**: Uma pessoa volta a um duelo ativo em no máximo 3 toques/cliques a partir do menu (verificado no teste ponta a ponta), como logada em outro aparelho ou como visitante neste aparelho.
- **SC-008**: O calendário fora do modo de seleção mantém comportamento e acessibilidade, sem regressões nos testes existentes.

## Assumptions

- Dívida aceita para jogo entre amigos: a solução continua exposta ao navegador, as ajudas e a conclusão são declaradas pelo cliente, token perdido sem link de retorno é duelo perdido, e quem já conhece a cruzada leva vantagem. Não há validação da solução no servidor.
- Fora do escopo: tempo real, mais de 2 jogadores, ranking, chat, aposta, revanche, reivindicar duelos de visitante ao criar conta, "Surpreenda-me", e tudo da entrega 2 (finalizados antigos, filtro por oponente, placar acumulado).
- Valores padrão a definir no plano: teto de duelos abertos por criador, limites de taxa (criação, código, lote de tokens), opções de prazo e tempo máximo, valores permitidos de penalidade por ajuda e intervalo da consulta periódica.
- **Dependência de governança**: a constituição (v6.0.0) diz que o progresso de visitante não vai ao servidor e que não há placar competitivo. O duelo grava no servidor o apelido, o token (hash) e os tempos de visitante, e cria um placar entre duas pessoas. O princípio VI também exige que respostas a quem não tem sessão não tenham dados de usuário; as respostas do duelo (apelido do criador, tempos) vão a quem apresenta o link, o código ou o token. O plano MUST tratar isso na Constitution Check, com uma emenda que limite a exceção aos dados do duelo e mantenha o resto do progresso de visitante só no aparelho.
- Pontos a verificar no plano: se o calendário e a célula do dia aceitam o modo de seleção sem grande mudança nos testes, e o que a listagem de acervo devolve por item para visitante.
- Depende dos módulos existentes de sessão opcional, acervo (biblioteca), regras do jogo e limite de taxa; a ordem de features do site precisa incluir a nova feature depois de `library` e `game` quando for preciso importar apenas pelos `index.ts`.
