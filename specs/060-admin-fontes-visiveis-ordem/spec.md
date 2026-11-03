# Feature Specification: Painel de admin para esconder e reordenar fontes

**Feature Branch**: `feat/060-admin-fontes-visiveis-ordem`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "Quero poder esconder algumas cruzadas por alguma flag e também reordenar as abas do calendário. A princípio pode ser uma página que apenas contas de admin podem acessar, eles fazem login igual, mas podem acessar essa página, para poder fazer essa configuração."

## Clarifications

### Session 2026-11-03

- Q: Onde o registro de alterações da configuração das fontes fica guardado? → A: Numa tabela do banco (quem, antes e depois, quando); o autor da alteração é anulável se a conta for apagada.
- Q: O que acontece quando quem não é admin abre a página ou chama as operações de administração? → A: Responde como uma rota inexistente: a página mostra a tela de "página não encontrada" e a API devolve `404` (nunca `401` nem `403`), para visitante, conta comum e sessão expirada; nada muda.
- Q: Como o dono cria um admin ou dá acesso de admin a uma conta existente? → A: Pela CLI do autor: `users set-admin --email <email>` promove, `users set-admin --email <email> --remove` retira e `users create --email <email> --admin` cria já como admin; e-mail sem conta falha com mensagem clara (exit 1) e o papel vale no próximo pedido, sem reiniciar.
- Q: Por onde o admin chega à página de administração depois do login? → A: Pelo endereço `/admin`, com um link "Administração" na página da conta (`/conta`) mostrado só a quem é admin; sem link no cabeçalho. O site só informa à própria conta se ela é admin.
- Q: Se o convite de um x1 foi enviado e a fonte é escondida antes de o convidado abrir o link ou código, ele ainda pode entrar e jogar? → A: Sim. O duelo continua inteiro (regras, começar e jogar, resultado), tenha ou não sido iniciado; só novos duelos deixam de oferecer a fonte escondida.
- Q: Se alguém abrir o endereço `/jogo/<id da cruzada>` de uma cruzada cuja fonte foi escondida, ela abre normalmente? → A: Sim, para qualquer pessoa que tenha o link: a fonte escondida só some das listas e das buscas por fonte e data. O endereço `/dia/<data>?fonte=<id>` de fonte escondida mostra "Esta fonte não está disponível agora".
- Q: Quando a fonte padrão guardada nas configurações da pessoa está escondida, o que acontece com "Ir direto ao jogo" e com o calendário? → A: Abrem a primeira fonte visível, sem aviso. A escolha guardada não é apagada e volta a valer se a fonte reaparecer; "Cruzada padrão" nas configurações lista só as fontes visíveis, com a primeira visível selecionada.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin esconde uma fonte (Priority: P1)

Uma conta de admin entra no site como qualquer outra, abre a página de administração e marca uma fonte de cruzadas (por exemplo, uma que quebrou ou que não quer mostrar) como escondida. Para o público, a fonte some do site inteiro; para o admin, ela continua na página de administração para ser reativada.

**Why this priority**: É o controle de que o dono precisa hoje: tirar uma fonte do ar sem mexer em código nem fazer deploy.

**Independent Test**: Entrar como admin, esconder uma fonte e abrir o site como visitante: a fonte não aparece em lugar nenhum. Reativar e vê-la voltar.

**Acceptance Scenarios**:

1. **Given** uma conta de admin logada, **When** abre a página de administração, **Then** vê todas as fontes com o estado de cada uma (visível ou escondida) e um controle para alterar.
2. **Given** uma fonte marcada como escondida, **When** qualquer pessoa (visitante ou conta) abre o calendário, **Then** a aba da fonte, o cartão dela em "Hoje" não aparecem.
3. **Given** uma fonte escondida, **When** alguém pede à API uma cruzada dessa fonte por fonte e data, ou a biblioteca dela, **Then** a resposta é a mesma de uma fonte que não existe (sem revelar que ela está só escondida).
4. **Given** uma fonte escondida, **When** o admin a marca como visível de novo, **Then** ela volta a aparecer para todos, com o histórico de cruzadas que já estava salvo.
5. **Given** que só resta uma fonte visível, **When** o admin tenta esconder essa última, **Then** a alteração é recusada com uma explicação clara (o site precisa de ao menos uma fonte).

---

### User Story 2 - Admin reordena as abas do calendário (Priority: P1)

O admin define a ordem em que as fontes aparecem nas abas do calendário e nos cartões de "Hoje". A primeira da lista passa a ser a aba aberta por padrão.

**Why this priority**: Pedido explícito; define qual fonte o público vê primeiro.

**Independent Test**: Mudar a ordem na página de administração e recarregar o calendário como visitante: as abas seguem a nova ordem e a primeira abre por padrão.

**Acceptance Scenarios**:

1. **Given** a página de administração, **When** o admin move uma fonte para cima ou para baixo e salva, **Then** a nova ordem é guardada e mostrada na página.
2. **Given** uma nova ordem salva, **When** qualquer pessoa abre o calendário, **Then** as abas e os cartões de "Hoje" seguem essa ordem.
3. **Given** uma nova ordem salva, **When** uma pessoa abre o calendário sem ter escolhido uma fonte antes, **Then** abre na primeira fonte visível da ordem.
4. **Given** que a ordem ou a visibilidade nunca foi configurada, **When** alguém abre o calendário, **Then** o comportamento é o de hoje (todas as fontes, na ordem padrão).

---

### User Story 3 - Só admin acessa a página (Priority: P1)

A página de administração e as operações dela existem apenas para contas de admin. Qualquer outra pessoa (visitante, conta comum, sessão expirada) não consegue ver nem usar.

**Why this priority**: Sem isso, qualquer um poderia esconder fontes do site inteiro.

**Independent Test**: Tentar abrir a página e chamar as operações como visitante e como conta comum: ambos são recusados e nada muda.

**Acceptance Scenarios**:

1. **Given** uma conta de admin, **When** faz login, **Then** o fluxo é o mesmo de qualquer conta e ela passa a ver, na página da conta, um link "Administração" para o endereço `/admin` (sem link no cabeçalho).
2. **Given** uma conta comum ou um visitante, **When** abre o endereço da página de administração, **Then** vê a tela de "página não encontrada" de um endereço inexistente e nenhum link para ela aparece no site.
3. **Given** uma conta comum ou um visitante, **When** tenta enviar uma alteração de visibilidade ou de ordem, **Then** a API responde `404`, como a uma rota inexistente, e nada é alterado.
4. **Given** que uma conta deixa de ser admin, **When** ela tenta abrir a página ou alterar algo, **Then** recebe o mesmo `404` na hora, mesmo com a sessão ainda aberta.

---

### User Story 4 - Designar quem é admin (Priority: P2)

O dono do projeto marca uma conta existente como admin (e a desmarca) por um meio fora do site, sem que exista uma tela pública para isso.

**Why this priority**: Sem uma forma de criar o primeiro admin, o painel é inalcançável; mas é uma operação rara do dono.

**Independent Test**: Marcar uma conta como admin pelo meio do dono e ver que ela passa a acessar a página; desmarcar e ver que perde o acesso.

**Acceptance Scenarios**:

1. **Given** uma conta existente, **When** o dono a marca como admin pela CLI, **Then** no pedido seguinte ela abre a página de administração, sem novo login nem reinício.
2. **Given** um e-mail sem conta, **When** o dono tenta marcá-lo como admin pela CLI, **Then** a operação falha (exit 1) com uma mensagem clara e nada é criado.
3. **Given** que cadastro, convite ou configurações da conta existem no site, **When** qualquer pessoa os usa, **Then** não há como se tornar admin por eles.

---

### Edge Cases

- Partida em andamento de uma fonte que acaba de ser escondida: quem já abriu a cruzada pode terminá-la, o progresso salvo não é apagado e o endereço direto dela (`/jogo/<id>`) continua abrindo; a fonte só some das listas e das buscas por fonte e data.
- Progresso salvo (conta ou visitante) de uma fonte escondida: preservado; volta a aparecer quando a fonte for reativada. Estatísticas e importação do progresso não se quebram por causa disso.
- Duelo x1 já criado com cruzada de uma fonte que depois foi escondida, inclusive o convite enviado e ainda não aberto pelo convidado (link ou código): o duelo continua inteiro, com regras, começar, jogar e resultado, para criador e convidado; só novos duelos não oferecem a fonte escondida.
- Cruzada já aberta offline (cópia no aparelho) de uma fonte escondida: continua abrindo pela cópia local.
- Dois admins alterando ao mesmo tempo: vale a última alteração salva, sem erro; a página mostra o estado atual ao recarregar.
- Site mais antigo com API mais nova: o site antigo não conhece a configuração e ainda lista a fonte escondida; o pedido dela é recusado como fonte inexistente e o calendário mostra o aviso "Esta fonte não está disponível agora", sem erro nas demais fontes (a fonte só some de verdade quando o site é atualizado). Site mais novo com API mais antiga: mostra todas as fontes na ordem padrão, sem erro.
- Fonte padrão guardada nas configurações da pessoa (inclusive com "Ir direto ao jogo" ligado) e depois escondida: vale a primeira fonte visível, sem aviso; a escolha guardada permanece e volta a valer quando a fonte reaparecer.
- Coleta automática de cruzadas (`puzzles collect`): continua coletando também as fontes escondidas, para o histórico estar completo quando voltarem.
- Fonte nova adicionada ao código depois de uma ordem salva: aparece visível, no fim da ordem.
- Falha de rede ao salvar: a página mostra o erro e mantém o estado anterior; nada fica pela metade.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir marcar cada fonte de cruzadas como visível ou escondida, e a escolha MUST valer para todas as pessoas, não só para o admin.
- **FR-002**: Uma fonte escondida MUST sumir de todas as telas públicas que a listam: abas do calendário, cartões de "Hoje", filtros e seleção de dia para x1 e estatísticas por fonte. A landing é estática e continua descrevendo as quatro fontes.
- **FR-003**: Pedidos à API por fonte e data, ou à biblioteca, de uma fonte escondida MUST receber a mesma resposta de uma fonte inexistente. A abertura de uma cruzada já conhecida pelo seu identificador (partida em andamento, duelo, cópia offline) MUST continuar funcionando.
- **FR-004**: O sistema MUST recusar esconder a última fonte visível.
- **FR-005**: O sistema MUST permitir definir a ordem das fontes, e essa ordem MUST ser a das abas do calendário e dos cartões de "Hoje".
- **FR-006**: A primeira fonte visível da ordem MUST ser a fonte aberta por padrão no calendário e a usada pelos atalhos "jogar hoje" e "ir direto ao jogo".
- **FR-007**: Sem configuração salva, o sistema MUST se comportar como hoje: todas visíveis, ordem padrão.
- **FR-008**: O sistema MUST ter o conceito de conta de admin e MUST limitar a página de administração e suas operações a essas contas, verificando o papel a cada pedido (não só ao entrar).
- **FR-009**: Visitantes, contas comuns e sessões encerradas MUST receber, ao abrir a página, a mesma tela de "página não encontrada" de qualquer endereço inexistente e, ao chamar as operações da API, um `404` idêntico ao de uma rota que não existe (nunca `401` nem `403`, para não revelar a página nem encerrar a sessão de uma conta comum no site); nada MUST mudar, nenhum dado de usuário MUST ser devolvido e a página MUST ficar sem link no site para quem não é admin.
- **FR-010**: O login de um admin MUST ser o mesmo de qualquer conta, sem etapa extra. O site MUST informar à própria conta, e só a ela, se é admin, para mostrar o link "Administração" na página da conta; a página fica em `/admin`.
- **FR-011**: A designação de admin MUST ser feita só pela CLI do autor (fora do site): promover uma conta existente, retirar o acesso e criar uma conta já como admin; e-mail sem conta MUST falhar com mensagem clara, sem criar nada, e a mudança MUST valer no pedido seguinte, sem reiniciar. Nenhuma tela, cadastro ou rota pública MUST permitir tornar-se admin.
- **FR-012**: A página de administração MUST mostrar todas as fontes (inclusive as escondidas), permitir alternar a visibilidade, reordenar e confirmar o resultado salvo.
- **FR-013**: Esconder ou reordenar MUST NOT apagar cruzadas salvas, progresso, recordes nem duelos; reativar MUST restaurar tudo.
- **FR-014**: A coleta automática de cruzadas MUST continuar incluindo as fontes escondidas.
- **FR-015**: A alteração MUST aparecer para o público em até 1 minuto, sem novo deploy, e MUST ser guardada de forma persistente.
- **FR-016**: Cada alteração feita pelo admin MUST ser registrada numa tabela persistente com quem fez, o estado antes e depois e quando; o registro MUST sobreviver à exclusão da conta do autor (autor passa a vazio) e MUST NOT ser exposto a contas comuns nem a visitantes.
- **FR-017**: A página de administração MUST seguir as regras do site: não indexável, acessível por teclado e leitor de tela, e sem deslocar o layout ao salvar.

### Key Entities *(include if feature involves data)*

- **Conta de admin**: conta comum com um indicador de papel de administração; só o dono altera esse indicador.
- **Configuração das fontes**: para cada fonte, se está visível e em que posição da ordem; é única para o site inteiro.
- **Registro de alterações**: uma linha por alteração salva, com o autor (anulável se a conta for apagada), a configuração antes e depois e o instante; só é lido pelo dono, nunca devolvido ao público.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um admin esconde ou reativa uma fonte em menos de 30 segundos a partir do login, sem deploy.
- **SC-002**: Em 100% das listas do site (abas, "Hoje", x1, estatísticas, configurações) e das buscas da API por fonte e data ou por biblioteca, uma fonte escondida não aparece nem é atendida; o endereço direto de uma cruzada já conhecida (`/jogo/<id>`) continua abrindo.
- **SC-003**: Em 100% das tentativas de visitantes e contas comuns de abrir a página ou alterar a configuração, a operação é recusada e nada muda.
- **SC-004**: Após salvar uma nova ordem, 100% dos novos acessos ao calendário em até 1 minuto mostram as abas na ordem nova.
- **SC-005**: Nenhuma cruzada salva, progresso ou recorde é perdido ao esconder e reativar uma fonte (verificado por comparação antes e depois).
- **SC-006**: Sem configuração salva, o site se comporta exatamente como antes da feature (nenhuma regressão visível para o público).

## Assumptions

- "Cruzadas" no pedido significa as **fontes** (O Globo, Cruzada Online, Cruzadas Brasil, Clube): esconder é por fonte, não por cruzada individual. Esconder cruzadas individuais fica fora desta feature.
- "Abas do calendário" são as abas de fonte do calendário; a mesma ordem vale também para os cartões de "Hoje" e para a fonte padrão.
- "Alguma flag" é a visibilidade por fonte, guardada e alterada pela página, não uma variável de ambiente que exija novo deploy.
- Admin é um papel de conta existente; não há tela para promover alguém, só o meio do dono (ferramenta de linha de comando do autor, como a que já cria contas).
- Existe um pequeno número de admins (o dono e talvez uma ou duas pessoas); não há papéis intermediários nem permissões finas.
- A mudança vale para todo o público, é global, e não por pessoa. A ordem fica no servidor, não no aparelho; cada pessoa escolher a própria ordem das abas fica fora desta feature.
- Duelos, progresso e cópias offline já existentes não são revogados ao esconder uma fonte.
- A constitution (v7.0.0) não proíbe esta feature: não envolve solução, conteúdo de fontes nem dados de visitantes; um campo novo de papel na conta e a tabela de configuração exigem migração e atualização de DDE e ERD.
- Compatibilidade com a versão anterior da outra parte (site/API) é mantida: respostas novas são tolerantes e a ausência de configuração equivale ao comportamento atual.
