# Feature Specification: Viabilidade da fonte de puzzles

**Feature Branch**: `feat/001-viabilidade-fonte`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "001-viabilidade-fonte" (primeira tarefa do documento de design `2026-10-12-cruzadas-design.md`, seção 2 "Risco principal" e seção 10, item 1)

## Clarifications

### Session 2026-10-12

- Q: A verificação pode usar as credenciais de visitante que a página pública do jogo entrega a qualquer leitor sem login, ou só pedidos totalmente sem credencial? → A: Pode usar credenciais de visitante obtidas da página pública, sem login nem conta de ninguém.
- Q: A verificação deve buscar um puzzle completo de cada nível ou só de um? → A: Apenas o nível diário; os outros níveis não são consultados nesta feature.
- Q: Se a fonte entregar o puzzle sem a solução (ou sem as dicas), qual deve ser o veredito? → A: A API do O Globo sempre entrega a solução junto do puzzle (informação do autor, a ser confirmada pela verificação). Puzzle sem solução ou sem dicas é tratado como mudança de formato: "inconclusivo (formato inesperado)".
- Q: A verificação pode gerar ela mesma o token anônimo de visitante, em vez de usar o que a página entrega? → A: Sim. O token do widget tem o formato `ANONYMOUS-<32 hexadecimais>-ANONYMOUS`, aparentemente criado no navegador para qualquer visitante; a verificação gera um nesse formato. A chave de cliente (`x-key`) continua vindo da página pública, pelo ambiente. Se a fonte recusar o token gerado sem `x-key` disponível, o resultado é "inconclusivo", não "não viável".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Confirmar que um puzzle real pode ser obtido sem login (Priority: P1)

O autor do projeto precisa saber, antes de investir no restante do site, se é possível obter automaticamente um puzzle de palavras cruzadas real do O Globo sem usar uma conta pessoal de leitor. Ele executa uma verificação curta, sob demanda, e recebe um veredito claro: viável, não viável ou inconclusivo.

**Why this priority**: Todo o produto depende de ter puzzles de uma fonte externa. Se esse acesso exigir login pessoal, o projeto precisa voltar ao design e escolher outra fonte. É o maior risco do projeto e bloqueia todas as outras features.

**Independent Test**: Executar a verificação uma vez e conferir que ela termina com o veredito "viável", "não viável" ou "inconclusivo", com o motivo, e que, no caso viável, mostra um resumo de um puzzle real do nível diário (data, tamanho da grade, quantidade de dicas).

**Acceptance Scenarios**:

1. **Given** que a fonte está no ar e permite acesso sem conta pessoal, **When** o autor executa a verificação, **Then** ela busca o puzzle do nível diário de uma data disponível e informa o veredito "viável" com um resumo do puzzle.
2. **Given** que a fonte exige uma conta pessoal para entregar puzzles, mesmo após tentar o acesso de visitante da página pública, **When** o autor executa a verificação, **Then** ela informa o veredito "não viável" e explica que o acesso exige login.
3. **Given** que a fonte está fora do ar ou sem conexão, **When** o autor executa a verificação, **Then** ela informa que o resultado é inconclusivo por indisponibilidade, e não o confunde com "não viável".

---

### User Story 2 - Descobrir quais datas existem no nível diário (Priority: P2)

Além de um puzzle isolado, o autor precisa saber se a fonte permite listar as datas com puzzle do nível diário, para confirmar que navegar pelo histórico no site (escolher uma data) é possível. Os demais níveis ficam fora desta verificação.

**Why this priority**: A navegação por data é parte central do objetivo do produto, mas só importa se o acesso básico (história 1) for viável.

**Independent Test**: Executar a verificação e conferir que o resumo lista o intervalo de datas disponíveis do nível diário, ou informa claramente que a fonte não fornece essa listagem.

**Acceptance Scenarios**:

1. **Given** um acesso viável, **When** o autor executa a verificação, **Then** o resumo lista as datas de puzzles existentes do nível diário.
2. **Given** uma data sem puzzle no nível diário, **When** a verificação a consulta, **Then** ela informa "indisponível" para esse caso, sem tratar como falha geral da fonte.

---

### User Story 3 - Guardar uma amostra para os testes futuros (Priority: P3)

O autor quer que o resultado da verificação deixe uma amostra de resposta real, sem dados sensíveis, para servir de base aos testes de contrato da integração com a fonte.

**Why this priority**: Evita repetir a busca na fonte e permite testes sem internet, mas depende de a história 1 ser viável.

**Independent Test**: Após uma verificação viável, existe uma amostra salva de um puzzle real, sem credenciais, tokens ou dados pessoais, que pode ser lida sem acessar a fonte.

**Acceptance Scenarios**:

1. **Given** uma verificação viável, **When** o autor escolhe salvar a amostra, **Then** é gravada uma cópia sanitizada de um puzzle real.
2. **Given** uma resposta que contém credenciais ou dados pessoais, **When** a amostra é salva, **Then** esses valores são removidos antes de gravar.

---

### Edge Cases

- A fonte muda o formato da resposta e o puzzle deixa de ser interpretável: a verificação informa "formato inesperado", em vez de falhar sem explicação.
- O puzzle do dia ainda não foi publicado: a verificação tenta até 2 datas anteriores e registra isso no resumo; se nenhuma tiver puzzle, o resultado é "inconclusivo" com esse motivo.
- O acesso é negado depois de alguns pedidos seguidos (limite de uso da fonte) ou o limite de 6 pedidos da própria verificação é atingido: a verificação para e informa qual limite ocorreu, sem insistir.
- A fonte devolve o puzzle, mas sem a solução ou sem as dicas: como a solução deve sempre vir, o veredito é "inconclusivo (formato inesperado)" e o motivo cita o que faltou.
- Credenciais necessárias ao acesso, se existirem, ficam fora do repositório e dos relatórios.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir ao autor executar, sob demanda e fora da rotina automática de testes, uma verificação de acesso à fonte de puzzles.
- **FR-002**: A verificação MUST tentar obter um puzzle real do O Globo sem usar a conta pessoal do autor nem credenciais de terceiros. Ela PODE usar credenciais de visitante que a página pública do jogo entrega a qualquer leitor sem login, e PODE gerar o token anônimo de visitante no mesmo formato que o widget cria; MUST NOT usar login, conta de ninguém nem credenciais obtidas por outro meio.
- **FR-003**: A verificação MUST terminar com um dos vereditos: "viável", "não viável (exige login)" ou "inconclusivo (fonte indisponível, formato inesperado ou limite de uso atingido)", sempre com o motivo.
- **FR-004**: Em caso viável, a verificação MUST apresentar um resumo de um puzzle completo do nível diário: data, dimensões da grade, quantidade de palavras e de dicas, e confirmar que a solução veio incluída. Puzzle sem solução ou sem dicas MUST resultar em "inconclusivo (formato inesperado)", nunca em "viável".
- **FR-005**: A verificação MUST informar as datas com puzzle do nível diário, ou declarar que a fonte não fornece essa listagem. Os demais níveis MUST NOT ser consultados nesta feature.
- **FR-006**: A verificação MUST tratar data sem puzzle como "indisponível", distinto de falha da fonte.
- **FR-007**: A verificação MUST limitar a quantidade de pedidos à fonte, para não sobrecarregá-la nem provocar bloqueio: no máximo 6 pedidos por execução, com pausa entre eles, e no máximo 2 datas anteriores tentadas quando o puzzle do dia ainda não estiver publicado. Se o limite de pedidos for atingido, ou a fonte sinalizar limite de uso, a verificação MUST parar e terminar como "inconclusivo (limite de uso atingido)", dizendo qual dos dois ocorreu.
- **FR-008**: O sistema MUST permitir salvar uma amostra de um puzzle real, sanitizada, para uso em testes de contrato futuros.
- **FR-009**: A amostra e os relatórios MUST NOT conter credenciais, tokens, cookies ou dados pessoais, em conformidade com a constitution do projeto.
- **FR-010**: Quaisquer credenciais exigidas pela verificação MUST ser fornecidas fora do repositório e MUST NOT ser gravadas em arquivos versionados.
- **FR-011**: O resultado da verificação MUST registrar o que foi decidido (seguir com a fonte ou voltar ao design), para orientar a próxima etapa do projeto.

### Key Entities

- **Veredito de viabilidade**: resultado da verificação (viável, não viável ou inconclusivo), com motivo e data de execução.
- **Resumo do puzzle**: data (nível diário), dimensões da grade, número de palavras e dicas, presença da solução.
- **Amostra de puzzle**: cópia sanitizada de uma resposta real da fonte, usada como base de testes de contrato.
- **Catálogo da fonte**: datas com puzzle do nível diário, quando a fonte permite listar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O autor obtém o veredito de viabilidade em uma única execução, em menos de 2 minutos.
- **SC-002**: Em 100% das execuções o resultado é um dos três vereditos definidos, com motivo legível; nunca termina sem explicação.
- **SC-003**: Em caso viável, o resumo mostra pelo menos um puzzle real completo (grade, dicas e solução presentes).
- **SC-004**: A amostra salva não contém nenhum valor sensível, verificado por revisão antes de entrar no repositório.
- **SC-005**: Com o veredito em mãos, o autor decide em uma sessão se segue com a fonte ou volta ao design.

## Assumptions

- A verificação é usada só pelo autor, sob demanda, e não faz parte do site nem da suíte automática de testes.
- O uso é privado e de portfólio; o acesso à fonte respeita seus termos de uso e é feito em baixa frequência (princípio VIII da constitution).
- A fonte é o jogo de palavras cruzadas do O Globo, conforme o documento de design; outras fontes só entram se o veredito for "não viável".
- Segundo o autor, a resposta da fonte sempre inclui a solução do puzzle; a verificação confirma isso em vez de presumir.
- A forma de listar datas descrita no documento de design é uma hipótese a confirmar, não uma garantia.
- Os demais níveis (mini, express, expert, temático) e seus formatos de grade só serão verificados na feature de puzzles e biblioteca (`004`); um veredito "viável" aqui vale apenas para o nível diário.
- Esta feature não entrega nenhuma interface de jogo, conta de usuário ou banco de dados.
- Se o veredito for "não viável", a decisão sobre fonte alternativa (por exemplo outra fonte ou puzzles cadastrados manualmente) será tratada em nova rodada de design, fora desta feature.
