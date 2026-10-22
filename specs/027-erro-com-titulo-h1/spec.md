# Feature Specification: Telas de erro com título de nível 1

**Feature Branch**: `fix/tela-de-erro-do-dia-sem-titulo-h1`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Issue #46 (https://github.com/BrunoYTanaka/cruzadinha/issues/46) — Tela de erro do dia sem título de nível 1 (h1). A tela de erro do dia (`/dia/:date?fonte=...` quando a fonte está fora do ar) não tem nenhum título de nível 1: o componente de erro usa `h2` e, nessa rota, ele é o conteúdo inteiro da página. O verificador automático de acessibilidade acusa `page-has-heading-one`. Conferir os outros usos de tela cheia do componente de erro e corrigir os que também ficarem sem `h1`. Critérios: sem a violação em nenhuma tela de erro nos dois temas; remover a desativação da regra no e2e de botões; telas em que o erro aparece dentro de uma página que já tem `h1` continuam com um único `h1`."

## Contexto

O site mostra mensagens de erro em vários lugares por meio de um componente único (`ErrorState`), cujo título é um título de nível 2. Em algumas telas esse componente é o conteúdo inteiro da página (por exemplo, o dia que não pôde ser buscado na fonte, a cruzada que não abriu, a falha ao carregar a rota). Nessas telas a página fica sem título de nível 1, e quem navega com leitor de tela pelos títulos não encontra o título principal. O verificador automático de acessibilidade acusa a violação `page-has-heading-one` (impacto moderado).

A falha existe desde a feature 010 e foi encontrada ao testar a feature 023 (#41), onde a regra foi desativada só na tela de erro do dia, com um comentário no teste de ponta a ponta dos botões.

Usos do componente de erro (conferidos no código; ver `research.md`, seção 1):

- Tela do dia (`/dia/:date?fonte=`): fonte fora do ar, sem cruzada no dia, limite de pedidos, etc. É a página inteira.
- Tela da cruzada (`/jogo/:id`): cruzada não encontrada e falha ao abrir. É a página inteira.
- Erro das rotas: falha ao falar com o servidor, sem conexão, algo deu errado. É a página inteira.
- Biblioteca: o pedido de login com a API antiga (página inteira) e a falha ao carregar o calendário (dentro de uma página com outros conteúdos).
- Tela "Acordando o servidor" (título de nível 2 próprio, mesma classe de defeito) e "Página não encontrada" (já tem `h1`).

Só a aparência semântica muda: textos, botões, cores e comportamento das telas de erro continuam como hoje.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Título principal na tela de erro do dia (Priority: P1)

Quem abre um dia passado sem cruzada salva, com a fonte fora do ar, e navega por leitor de tela pelos títulos encontra o título do erro como título principal da página.

**Why this priority**: É o caso da issue, com falha reproduzível, e é a tela de erro mais comum em uso real (fonte instável).

**Independent Test**: Abrir `/dia/<data passada sem cruzada salva>?fonte=oglobo` com o pedido da cruzada respondendo 502, rodar o verificador de acessibilidade nos dois temas e listar os títulos da página.

**Acceptance Scenarios**:

1. **Given** a tela de erro do dia, **When** a página é inspecionada, **Then** existe exatamente um título de nível 1, e seu texto é o título do erro mostrado.
2. **Given** a mesma tela, **When** o verificador de acessibilidade roda nos temas claro e escuro, **Then** não acusa `page-has-heading-one` nem outra violação.
3. **Given** a mesma tela, **When** a pessoa olha para ela, **Then** o título tem a mesma aparência de antes (tamanho, peso, cor e espaçamento), e os botões "Tentar de novo" e de voltar seguem iguais.

---

### User Story 2 - Todas as outras telas de erro de página inteira (Priority: P1)

Em qualquer tela em que o erro ocupa a página inteira (cruzada não encontrada ou que falhou ao abrir, erro de rota, pedido de login da biblioteca, "Acordando o servidor"), há exatamente um título de nível 1 com o título do erro.

**Why this priority**: A issue pede conferir esses usos; a mesma causa afeta todos, e corrigir só um deixaria a falha nos demais.

**Independent Test**: Provocar cada tela de erro (pedido com 404, 502, sem conexão, limite de pedidos, erro de rota, API demorando para acordar) e verificar títulos e verificador de acessibilidade em cada uma, nos dois temas.

**Acceptance Scenarios**:

1. **Given** cada tela de erro de página inteira listada no contexto, **When** ela aparece, **Then** a página tem um único `h1`, com o texto do título do erro.
2. **Given** essas telas, **When** o verificador roda nos dois temas, **Then** não há `page-has-heading-one`.
3. **Given** o erro que aparece com o foco movido para o título (como "Acordando o servidor"), **When** a tela abre, **Then** o foco e o anúncio do leitor de tela continuam como hoje.

---

### User Story 3 - Erro dentro de uma página que já tem título (Priority: P1)

Onde o erro aparece dentro de uma página que já tem `h1` (por exemplo, a falha ao carregar o calendário da biblioteca), a página continua com um único `h1`, e o erro fica como subtítulo da página.

**Why this priority**: Corrigir o título nas telas inteiras não pode criar dois `h1` nas demais; é critério de aceitação da issue.

**Independent Test**: Provocar a falha de carregamento da biblioteca e contar os títulos de nível 1 e a ordem dos níveis.

**Acceptance Scenarios**:

1. **Given** o erro dentro da área do calendário, **When** a página é inspecionada, **Then** há um único `h1` na página e o título do erro não é um segundo `h1`.
2. **Given** essa tela, **When** o verificador roda nos dois temas, **Then** não há violação de títulos (nem de nível pulado).

---

### User Story 4 - Verificação automática sem exceção (Priority: P2)

Quem mantém o projeto roda a verificação automática de acessibilidade em todas as telas, inclusive as de erro, sem nenhuma regra desativada para elas.

**Why this priority**: Sem remover a exceção, a falha poderia voltar sem ninguém ver.

**Independent Test**: Rodar o teste de ponta a ponta de botões ("axe sem violações nas telas") sem a desativação de `page-has-heading-one` e ver passar nos dois temas; reintroduzir a falha e ver o teste falhar.

**Acceptance Scenarios**:

1. **Given** o teste de ponta a ponta de botões, **When** ele é lido, **Then** a desativação de `page-has-heading-one` e o comentário que a explica não existem mais.
2. **Given** esse teste, **When** roda nos temas claro e escuro, **Then** passa, incluindo a tela de erro do dia.
3. **Given** a verificação cobrir também as outras telas de erro de página inteira (história 2) e o erro dentro da biblioteca (história 3), **When** uma delas perder o `h1`, **Then** um teste falha.

---

### Edge Cases

- Erro que muda enquanto a tela está aberta (por exemplo, de "Sem conexão" para "Não foi possível abrir a cruzada" ao tentar de novo): o `h1` acompanha o título atual, sem ficar dois ao mesmo tempo.
- Erro que aparece dentro da tela do jogo já aberta (falha de salvamento, sessão expirada): são avisos não bloqueantes (feature 010) e não viram `h1` nem título algum; continuam como estão.
- Tela de erro que aparece por cima de um carregamento que tem seu próprio título: nunca dois `h1` ao mesmo tempo.
- Título do erro mudando de nível sem mudar a aparência: o tamanho, o peso e o espaçamento vêm do estilo atual, não do nível do título; zoom a 200 % e tema escuro continuam iguais.
- Leitor de tela que anuncia o alerta: o papel de alerta do bloco de erro continua e o título aparece uma única vez na árvore de acessibilidade (um só título com esse texto).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Toda tela em que o bloco de erro é o conteúdo da página inteira MUST ter exatamente um título de nível 1, cujo texto é o título do erro.
- **FR-002**: Isso MUST valer ao menos para: tela do dia, tela da cruzada (não encontrada e falha ao abrir), erro de rota (sem conexão, algo deu errado, servidor sem resposta), pedido de login da biblioteca (API antiga) e a tela "Acordando o servidor".
- **FR-003**: Onde o bloco de erro aparece dentro de uma página que já tem título de nível 1, a página MUST continuar com um único título de nível 1, e o título do erro MUST seguir a hierarquia dos títulos da página (sem pular nível).
- **FR-004**: O nível do título do erro MUST ser definido por quem usa o bloco, conforme o lugar em que ele aparece (página inteira ou parte da página); nenhum uso pode ficar sem decisão explícita sobre o nível.
- **FR-005**: A aparência do título do erro (tamanho, peso, cor, espaçamento) MUST NOT mudar com o nível do título, em nenhum tema nem largura de janela.
- **FR-006**: O texto dos títulos, mensagens, botões, o papel de alerta, o anúncio para leitor de tela e o foco movido para o título (onde existe hoje) MUST continuar como hoje.
- **FR-007**: O verificador automático de acessibilidade MUST NOT acusar `page-has-heading-one` (nem violação de ordem de títulos) em nenhuma tela de erro, nos temas claro e escuro.
- **FR-008**: A desativação de `page-has-heading-one` e o comentário que a justifica no teste de ponta a ponta dos botões MUST ser removidos, sem trocá-los por outra desativação.
- **FR-009**: Testes MUST cobrir cada tela de erro de página inteira e o erro dentro de uma página com título, falhando se faltar o `h1` ou se houver mais de um.
- **FR-010**: A mudança MUST ser compatível com a API e com a versão anterior do site: nenhuma mudança de API, dados salvos ou contrato.

### Key Entities

Nenhuma. A feature não cria nem altera dados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100 % das telas de erro de página inteira listadas (pelo menos 7 situações: dia com fonte fora do ar, dia sem cruzada, dia com limite de pedidos, cruzada não encontrada, cruzada com falha, erro de rota, pedido de login da biblioteca), a contagem de títulos de nível 1 é exatamente 1.
- **SC-002**: O verificador de acessibilidade tem zero violações de `page-has-heading-one` nessas telas, nos temas claro e escuro, sem nenhuma regra desativada nos testes.
- **SC-003**: Na falha de carregamento da biblioteca, a página continua com exatamente 1 título de nível 1 e sem nível de título pulado.
- **SC-004**: O tamanho, o peso, a cor e a posição do título do erro medidos antes e depois da mudança diferem em no máximo 1 px nas telas de erro, nos dois temas.
- **SC-005**: Nenhum teste existente de acessibilidade, contraste ou botões (features 010, 017 a 024) deixa de passar.

## Assumptions

- A correção é só de semântica e de testes em `apps/web`; a API, o banco e o pacote `shared` ficam como estão.
- O título do erro da página inteira passa a ser o `h1` da página (em vez de se criar um `h1` visualmente oculto ou repetido), porque essas telas já mostram esse título em destaque.
- A tela "Acordando o servidor" entra no escopo porque tem a mesma falha (título de nível 2 como conteúdo da página inteira); a conferência do código confirmou que a página não tem outro `h1`.
- A tela "Página não encontrada" já tem `h1` e só é conferida.
- O e2e da biblioteca e do dia usa pedidos simulados com falha (502, 404, sem conexão, 429) como os testes atuais; nenhuma dependência nova.
- Por ser um defeito de acessibilidade (rótulos `bug` e `accessibility`), o fluxo é de correção com teste de regressão primeiro; esta especificação existe porque a mudança de nível do título atravessa vários usos do componente e documenta a regra (um único `h1` por página) para as próximas telas.
