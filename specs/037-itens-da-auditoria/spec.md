# Feature Specification: Itens da auditoria do repositório

**Feature Branch**: `chore/itens-da-auditoria-do-reposit-rio` (a pasta da especificação é `037-itens-da-auditoria`)

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/91" ([Chore]: itens da auditoria do repositório)

## Contexto

Uma nova auditoria do repositório não achou bug grave nem brecha aberta e deixou nove itens. Esta especificação trata os quatro marcados "Corrigir" (itens 1 a 4 da issue), em histórias independentes. Os cinco marcados "Opcional" (5 a 9) ficam fora do escopo, como a issue os classifica (ver Suposições). A auditoria não leu o site, os conversores das fontes, `auth.routes.ts`, `settings`, `library` nem `progress`; isso continua sem verificação e também fica fora.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O limite de buscas nas fontes vale mesmo com pedidos simultâneos (Priority: P1)

O autor do projeto precisa que o limite de 30 buscas por hora por endereço proteja as fontes externas. Hoje o limite é conferido e só depois a busca é gravada; uma rajada de pedidos simultâneos do mesmo endereço vê, toda ela, "zero buscas" e todos vão à fonte, furando o limite. As fontes são sites de terceiros e a coleta já depende da boa vontade deles.

**Why this priority**: É a única falha de segurança/abuso da lista e repete o defeito que o login já teve (feature 034).

**Independent Test**: Disparar mais pedidos simultâneos de dias ainda não salvos, do mesmo endereço, do que o limite permite, e contar quantos chegam à fonte e quantos são recusados por excesso de pedidos.

**Acceptance Scenarios**:

1. **Given** um limite de 30 buscas por hora por endereço, **When** 40 pedidos simultâneos de dias não salvos chegam do mesmo endereço, **Then** no máximo 30 chegam à fonte e os demais recebem a recusa por excesso de pedidos.
2. **Given** um endereço abaixo do limite, **When** ele pede um dia não salvo, **Then** a busca acontece e o dia é salvo, como hoje.
3. **Given** um dia já salvo, **When** ele é pedido, **Then** a resposta vem do que está salvo e não consome o limite, como hoje.
4. **Given** um endereço que atingiu o limite, **When** ele pede um dia não salvo, **Then** a resposta traz o tempo de espera, como hoje.
5. **Given** os limites por endereço do cadastro e das configurações, **When** pedidos simultâneos chegam, **Then** nenhum deles passa do seu limite.

---

### User Story 2 - Dependências sem avisos conhecidos (Priority: P2)

O autor do projeto precisa que as dependências de produção não tragam avisos de segurança conhecidos. A auditoria de dependências aponta duas (uma moderada, uma baixa), no servidor web da API e numa biblioteca de endereços. O impacto provável é pequeno, porque a API troca o validador do servidor por um que só repassa os dados, mas o aviso pode ser limpo com uma atualização.

**Why this priority**: Barato e sem mudança de comportamento, mas só vale se nada quebrar.

**Independent Test**: Rodar a auditoria de dependências de produção e a suíte de testes antes e depois da atualização.

**Acceptance Scenarios**:

1. **Given** as dependências atualizadas, **When** a auditoria de dependências de produção roda, **Then** não aponta nenhuma das duas vulnerabilidades.
2. **Given** as dependências atualizadas, **When** a suíte de testes (unitários e de integração) roda, **Then** todos passam.
3. **Given** que a correção exigiria uma mudança incompatível, **When** isso é descoberto, **Then** a mudança fica de fora e o motivo é registrado, em vez de forçar a atualização.

---

### User Story 3 - Falha de coleta deixa o motivo no log (Priority: P2)

O autor do projeto precisa saber por que uma coleta falhou. Hoje, quando um adaptador de fonte lança um erro inesperado, a coleta registra só "fonte fora do ar" e descarta o erro; quem investiga não tem nada além de um workflow vermelho.

**Why this priority**: Sem o motivo, cada falha exige reproduzir a coleta à mão. A correção é pequena e vale também para a História 4.

**Independent Test**: Fazer um adaptador lançar um erro e conferir que a saída da coleta traz a fonte, a data e o tipo do erro, sem dados sensíveis.

**Acceptance Scenarios**:

1. **Given** um adaptador que lança um erro inesperado durante a coleta, **When** a coleta segue para a próxima fonte, **Then** o log registra a fonte, a data e a descrição do erro.
2. **Given** o mesmo erro, **When** a coleta termina, **Then** o relatório continua trazendo a falha com o motivo "source-down" e a outra fonte é coletada normalmente.
3. **Given** um erro que carrega parâmetros de consulta (e-mail, hash), **When** ele é registrado, **Then** o log traz só nomes e códigos, como o restante da API faz.

---

### User Story 4 - O autor é avisado quando uma fonte quebra (Priority: P2)

O autor do projeto precisa ser avisado quando uma das fontes (lidas por scraping) deixa de funcionar, por exemplo porque o formato mudou. Hoje a coleta agendada só fica vermelha e ninguém olha.

**Why this priority**: Fecha o ciclo da História 3: com o motivo no log, o aviso leva o autor direto ao problema. Sem ele, uma fonte pode ficar quebrada por dias.

**Independent Test**: Simular uma falha de coleta de uma fonte e conferir que existe uma issue aberta para ela; repetir a falha e conferir que não surge uma segunda.

**Acceptance Scenarios**:

1. **Given** a coleta agendada falha por causa de uma fonte, **When** a execução termina, **Then** existe uma issue aberta no repositório para aquela fonte, com o nome da fonte, o motivo e o link da execução.
2. **Given** duas fontes quebradas na mesma execução, **When** a execução termina, **Then** há uma issue por fonte.
3. **Given** uma issue já aberta para a fonte, **When** a falha se repete na execução seguinte, **Then** nenhuma issue nova é criada (o aviso não se repete duas vezes por dia).
4. **Given** uma coleta que passa, **When** a execução termina, **Then** nenhuma issue é criada.
5. **Given** a coleta que falha por outro motivo (banco fora do ar, segredo ausente), **When** a execução termina, **Then** o aviso não acusa uma fonte.

---

### Edge Cases

- Erro do adaptador com mensagem enorme ou com dados de pessoas: o log descreve o erro por nomes e códigos, não despeja a mensagem inteira.
- Limite de buscas atingido no meio da coleta agendada: a coleta já para pelo sinal de limite da fonte; isso não é falha de fonte e não abre issue.
- Atualização de dependências que muda a versão do servidor web: a suíte inteira, inclusive a de integração, precisa passar antes de entregar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST contar e gravar a busca de um endereço na fonte em um só passo, de modo que pedidos simultâneos do mesmo endereço não passem do limite por hora.
- **FR-002**: Um dia já salvo MUST continuar sendo servido sem consumir o limite e sem chegar à fonte.
- **FR-003**: Os limites por endereço do cadastro e das configurações, que hoje conferem e gravam em dois passos, MUST passar a contar e gravar em um só. O teto diário de e-mails (item 7 da issue) fica fora.
- **FR-004**: A resposta de um pedido recusado por excesso de buscas MUST continuar trazendo o tempo de espera, no mesmo formato de hoje.
- **FR-005**: As dependências de produção MUST ficar sem as duas vulnerabilidades apontadas, sem mudança incompatível de versão e sem mudança de comportamento observável.
- **FR-006**: Quando um adaptador lança um erro inesperado na coleta, o sistema MUST registrar no log a fonte, a data e a descrição do erro (nomes e códigos, sem parâmetros de consulta), e MUST seguir como hoje: a falha entra no relatório e as outras fontes continuam.
- **FR-007**: Quando a coleta agendada falha por causa de uma fonte, o repositório MUST receber uma issue aberta por fonte afetada, com a fonte, o motivo e o link da execução.
- **FR-008**: O aviso MUST NOT criar uma segunda issue enquanto houver uma aberta para a mesma fonte.
- **FR-009**: Uma coleta bem-sucedida, uma parada por limite da fonte e uma falha que não vem de fonte MUST NOT abrir issue de fonte.
- **FR-010**: O aviso MUST NOT expor segredos nem dados de pessoas no texto da issue.

### Key Entities

- **Contagem de pedidos por endereço**: registro persistido das ações limitadas, por ação, tipo de chave e valor; a ação de busca nas fontes e as demais por endereço passam a ser gravadas no mesmo passo em que são conferidas.
- **Relatório de coleta**: resultado por fonte, com datas salvas, ignoradas, indisponíveis, falhas (com motivo) e pendentes; é de onde o aviso tira a fonte afetada.
- **Issue de aviso de fonte**: item aberto no repositório, um por fonte quebrada, que some do fluxo quando o autor a fecha.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com 40 pedidos simultâneos de dias não salvos do mesmo endereço e limite de 30, no máximo 30 chegam à fonte em 100% das repetições do teste.
- **SC-002**: A auditoria de dependências de produção aponta 0 vulnerabilidades dessas duas e 100% dos testes seguem passando.
- **SC-003**: Toda falha de adaptador na coleta deixa uma linha de log com fonte, data e tipo do erro, em 100% dos casos de teste.
- **SC-004**: Uma fonte quebrada vira uma única issue aberta em até uma execução da coleta, e uma segunda execução com a mesma falha não cria outra issue para ela.

## Assumptions

- Escopo: só os itens 1 a 4 ("Corrigir"). Os itens 5 a 9 ("Opcional": trava de login por e-mail, e-mail perdido ao reiniciar, teto diário de e-mails, ações fixadas por SHA, tempo limite no repasse do Cloudflare) ficam para outra feature; a issue os descreve como troca conhecida, raros ou sem urgência.
- A coleta continua terminando com erro quando uma fonte falha; o aviso por issue se soma a isso, não o substitui.
- A issue de aviso usa o token do próprio fluxo, sem segredo novo, e o título identifica a fonte para a detecção de duplicata.
- Nenhuma mudança no formato dos dados, no banco ou nas respostas da API é esperada; as mudanças são compatíveis com a versão anterior do site (docs/versionamento.md).
- A feature entrega em uma só versão da API, sem etapa dupla.
