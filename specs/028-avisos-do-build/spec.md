# Feature Specification: Build do site e e2e sem avisos

**Feature Branch**: `chore/eliminar-avisos-do-vite-e-do-git-no-build`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Issue #61 (https://github.com/BrunoYTanaka/cruzadinha/issues/61) — [Chore]: eliminar avisos do Vite e do git no build do site e no e2e. Corrigir a causa de três avisos que aparecem na saída do build e do `vite preview` (job `e2e` do CI e também localmente), em vez de escondê-los: (1) import sem extensão na configuração do Vite, que não funciona com o carregador nativo de configuração planejado para virar o padrão; (2) `fatal: detected dubious ownership in repository` do git no container do job `e2e`; (3) chunks maiores que 500 kB após a minificação."

## Contexto

A saída do build do site e do servidor de pré-visualização usado pelo e2e mostra três avisos. Nenhum quebra o build hoje, mas cada um esconde um problema real e polui o log, de modo que um aviso novo e importante passaria despercebido.

- **Configuração do Vite com import sem extensão.** O Vite avisa que o arquivo de configuração usa um recurso que o carregador nativo não suporta. Esse carregador deve virar o padrão numa próxima versão maior; nela, a configuração deixaria de carregar e o build do site pararia.
- **Git recusa o diretório no container do e2e.** O job `e2e` roda num container, com o repositório montado por outro usuário. O git recusa ler o repositório (`dubious ownership`). Com isso, o commit que o build grava no `version.json` cai no valor "desconhecido" em silêncio quando `GITHUB_SHA` falta, e o erro do git aparece no log do build.
- **Chunks acima de 500 kB.** O build avisa que há pacotes de código maiores que 500 kB depois de minificados. Chunk grande atrasa o primeiro carregamento, que já espera a API gratuita acordar (feature 012).

Nenhum comportamento muda para quem usa o site; o que muda é a saída dos comandos e, possivelmente, o tamanho do que o navegador baixa na primeira visita.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configuração do Vite pronta para o carregador nativo (Priority: P1)

Quem mantém o projeto roda o build e o servidor de pré-visualização e não vê o aviso do carregador nativo da configuração do Vite. A configuração continua carregando se o carregador nativo virar o padrão.

**Why this priority**: É o único aviso que vira falha real (build parado) numa atualização futura do Vite, e a correção é pequena e isolada.

**Independent Test**: Rodar `npm run build -w @cruzadinha/web` e `vite preview` e procurar o aviso na saída; rodar o build com o carregador nativo ligado explicitamente e ver terminar com sucesso.

**Acceptance Scenarios**:

1. **Given** o repositório limpo, **When** o build do site roda, **Then** a saída não contém o aviso sobre `configLoader: 'native'` nem sobre import sem extensão.
2. **Given** a configuração do Vite, **When** o build roda com o carregador nativo escolhido explicitamente, **Then** termina com sucesso e gera os mesmos arquivos de antes.
3. **Given** a correção, **When** `typecheck`, `lint` e `test` rodam, **Then** passam sem desativar regra nem silenciar o aviso por variável de ambiente.

---

### User Story 2 - Build no container do e2e sem erro do git (Priority: P1)

Quem lê o log do job `e2e` do CI não vê `fatal: detected dubious ownership`, e o `version.json` gerado nesse job traz o commit correto.

**Why this priority**: O erro polui o log de cada fatia do e2e (três por execução) e esconde a perda do commit na versão publicada.

**Independent Test**: Rodar o build dentro do mesmo tipo de container, com o diretório de trabalho de outro dono, e conferir a saída e o `version.json`.

**Acceptance Scenarios**:

1. **Given** o job `e2e` no container, **When** o build do site roda, **Then** a saída não contém `dubious ownership`.
2. **Given** o mesmo job, **When** o build termina, **Then** o `version.json` traz o commit do job, não "desconhecido".
3. **Given** um ambiente sem git ou sem repositório (por exemplo, o build dentro da imagem ou de um pacote sem `.git`), **When** o build roda, **Then** ele termina com sucesso, sem mensagem de erro do git, e o commit cai em "desconhecido" como hoje.
4. **Given** o build local numa árvore normal, **When** roda, **Then** o `version.json` traz o HEAD do git como hoje.

---

### User Story 3 - Site sem chunks acima do limite (Priority: P2)

Quem abre o site pela primeira vez baixa pacotes menores no carregamento inicial, e o build não avisa sobre chunks acima de 500 kB.

**Why this priority**: Melhora o carregamento e limpa o log, mas depende de descobrir o que pesa e de não quebrar o carregamento das rotas; por isso vem depois das duas correções simples.

**Independent Test**: Rodar o build, ler a lista de chunks e tamanhos, e abrir as telas principais (calendário, jogo, ajustes) conferindo que carregam.

**Acceptance Scenarios**:

1. **Given** o build do site, **When** termina, **Then** a saída não contém o aviso de chunks maiores que 500 kB.
2. **Given** o resultado, **When** o tamanho do código baixado numa primeira visita ao calendário é comparado ao de antes da mudança, **Then** não é maior, e a causa do peso (o que ficou no chunk grande) está registrada na pesquisa da feature.
3. **Given** o site já aberto numa aba antiga durante um deploy, **When** um chunk dividido não é encontrado, **Then** a recarga única de `reload-after-deploy` continua funcionando.
4. **Given** as telas calendário, jogo, ajustes e erro de rota, **When** são abertas com a nova divisão, **Then** carregam e funcionam como antes (testes unitários e e2e passam).
5. **Given** que parte do peso não puder ser dividida de forma útil, **When** o limite do aviso for elevado, **Then** o novo valor e o motivo ficam registrados na configuração e na pesquisa; elevar o limite sem essa justificativa não é aceito.

---

### User Story 4 - CI verde com log limpo (Priority: P2)

Quem abre a execução do CI numa mudança vê o job `e2e` (as três fatias) e o job de build sem nenhum dos três avisos, e o resultado verde.

**Why this priority**: É a confirmação do que a issue pede; sem ela a correção local poderia não valer no container.

**Independent Test**: Executar o CI na branch e procurar os três avisos nos logs de build e de `[WebServer]` de cada fatia.

**Acceptance Scenarios**:

1. **Given** a execução do CI na branch, **When** os logs do job `e2e` são lidos, **Then** nenhum dos três avisos aparece em nenhuma das três fatias.
2. **Given** a mesma execução, **When** todos os jobs terminam, **Then** estão verdes.

---

### Edge Cases

- Avisos novos, de outra origem, que aparecerem depois desta feature continuam visíveis; nada aqui silencia a saída de forma geral.
- O build em máquina de quem desenvolve, com git normal, continua gravando o commit do HEAD.
- O build em que `GITHUB_SHA` existe e o git falha: o commit vem de `GITHUB_SHA`, sem tentar o git e sem erro.
- Divisão de código que cria muitos chunks pequenos: o carregamento de uma rota não pode passar a depender de mais pedidos em série do que antes a ponto de piorar a primeira visita.
- Teste de ponta a ponta que mede layout depende de fontes e CSS carregados: a divisão de código não pode mudar a ordem do CSS (feature 023, camadas) nem causar salto de layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O build e o `vite preview` do site MUST NOT emitir o aviso sobre o carregador nativo de configuração, e a configuração MUST carregar também com esse carregador escolhido explicitamente.
- **FR-002**: A correção do FR-001 MUST NOT usar a variável que silencia o aviso nem desativar regra de lint ou de tipos.
- **FR-003**: O build do site MUST NOT imprimir erro do git (incluindo `dubious ownership`) no container do job `e2e`, nem em ambiente sem git ou sem repositório.
- **FR-004**: O `version.json` MUST trazer o commit do job no CI (`GITHUB_SHA`), o HEAD do git em máquina local e "desconhecido" só quando nenhuma das duas fontes existir.
- **FR-005**: O build do site MUST NOT emitir o aviso de chunks maiores que 500 kB, e a causa do peso MUST ser identificada e registrada na pesquisa da feature.
- **FR-006**: Se algum chunk não puder ser dividido de forma útil, o limite do aviso MAY ser elevado, mas só com o novo valor e o motivo registrados.
- **FR-007**: A divisão de código MUST preservar a recarga única após deploy (`reload-after-deploy`), a ordem do CSS e o comportamento das rotas.
- **FR-008**: O carregamento inicial de uma primeira visita ao calendário MUST NOT baixar mais código do que antes da mudança.
- **FR-009**: A mudança MUST ficar em `apps/web` (o workflow de CI só muda se a pesquisa mostrar que é preciso; o plano atual não o altera); nenhuma mudança de API, de `shared`, de dados salvos ou de comportamento visível, e compatível com a versão anterior da API.
- **FR-010**: Os testes existentes (unitários, de integração e e2e) MUST continuar passando, e o teste do `version-plugin` MUST cobrir a falta de git sem erro no log.

### Key Entities

Nenhuma. A feature não cria nem altera dados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O log do build local do site tem 0 ocorrências dos três avisos (carregador nativo, `dubious ownership`, chunks acima de 500 kB).
- **SC-002**: Em cada uma das 3 fatias do job `e2e`, o log tem 0 ocorrências dos três avisos, e o CI termina verde.
- **SC-003**: O `version.json` do build no container continua trazendo o commit do job em 100 % das fatias (já era correto com `GITHUB_SHA`; a mudança só tira o ruído do log).
- **SC-004**: O código baixado numa primeira visita ao calendário não aumenta em relação ao de antes (tamanho comprimido medido do mesmo modo nos dois casos), e nenhum chunk passa de 500 kB, ou o limite elevado tem justificativa registrada.
- **SC-005**: Os testes unitários e os e2e existentes passam sem edição de expectativas por causa da divisão de código.

## Assumptions

- Esta é uma tarefa de manutenção (rótulo `chore`); a especificação existe a pedido de quem mantém o projeto, apesar de o fluxo padrão para `chore` ser direto, e serve para registrar o que pesa no pacote e a decisão sobre o limite.
- O aviso do carregador nativo se refere só ao arquivo de configuração do Vite; outros arquivos importados por ele (como o plugin de versão) podem exigir a mesma correção.
- Há mais de uma forma de resolver o aviso do git (liberar o diretório no workflow ou fazer o plugin tolerar a falta de acesso ao git); a escolha fica para o plano, desde que cumpra FR-003 e FR-004 nos dois casos.
- O tamanho de 500 kB é o do limite padrão do aviso, medido depois da minificação e sem compressão.
- Rodar o CI na branch é parte da validação; o resultado do container só se confirma lá.
- Sem mudança de comportamento, a alteração sai como `chore` ou `build` e não gera versão nova por si só.
