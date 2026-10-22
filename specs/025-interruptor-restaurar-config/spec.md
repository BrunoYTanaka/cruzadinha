# Feature Specification: Interruptor e botão "Restaurar padrões" corretos nas configurações

**Feature Branch**: `fix/025-interruptor-restaurar-config`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Issue #51 (https://github.com/BrunoYTanaka/cruzadinha/issues/51) — fix(web): o interruptor das configurações tem 44 px de altura e a bolinha cola no topo. No diálogo de configurações, o interruptor (ex.: "Riscar a dica só quando acerta") aparece com o trilho quase redondo (52 × 44 px) e a bolinha colada no canto superior, em vez de centralizada num trilho de 30 px. Esperado: trilho de 30 px com a bolinha centralizada, mantendo área de toque de pelo menos 44 px. Também no diálogo: o botão "Restaurar padrões" aparece desalinhado; a margem negativa pensada para o texto ficar na margem faz a caixa visível (que tem borda) sair para fora da margem do diálogo. Esperado: o botão alinhado com o conteúdo, sem a borda saindo da margem, mantendo área de toque de pelo menos 44 px."

## Contexto

O diálogo de configurações (feature 021) tem dois interruptores ("Riscar a dica só quando acerta" e "Ir direto ao jogo") e, no rodapé, o botão "Restaurar padrões". A feature 024 alinhou esses itens, mas por uma regra que a issue mostra estar errada para o botão: ela pôs o **texto** de "Restaurar padrões" na margem, o que empurra a caixa visível, com contorno, para fora da margem do diálogo (spec 024: cenário 2 da história 3, FR-006a e SC-008). Esta feature substitui essa regra pela de alinhar a **caixa visível**. Como altera uma regra documentada, ela passa pelo ciclo do Spec Kit (constituição, Fluxo de Desenvolvimento) em vez de ser só uma correção.

Dois defeitos visíveis, ambos só na aparência:

1. O interruptor cresce até a altura mínima de toque dos botões (44 px) em vez de manter o trilho de 30 px; o trilho fica quase redondo (52 × 44 px) e a bolinha fica colada no topo.
2. A caixa visível de "Restaurar padrões" (com contorno) sai para a esquerda da margem do conteúdo do diálogo; só o texto fica alinhado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Interruptor com o desenho certo (Priority: P1)

Quem abre as configurações vê cada interruptor como um trilho baixo (30 px de altura), com a bolinha centralizada na vertical, tanto ligado quanto desligado, e continua conseguindo acioná-lo com o dedo ou o mouse numa área de pelo menos 44 px de altura.

**Why this priority**: É o defeito mais visível: o desenho do controle está deformado em todo uso do diálogo.

**Independent Test**: Abrir as configurações no desktop e no celular, nos dois temas, e medir o trilho e a bolinha dos dois interruptores, ligados e desligados; tocar na faixa acima e abaixo do trilho e conferir que o interruptor alterna.

**Acceptance Scenarios**:

1. **Given** o diálogo de configurações aberto, **When** a pessoa olha qualquer interruptor, **Then** o trilho tem 30 px de altura (largura inalterada, 52 px) e a bolinha fica centralizada na vertical no trilho.
2. **Given** um interruptor desligado e outro ligado, **When** a pessoa compara os dois, **Then** a bolinha tem a mesma posição vertical nos dois e só muda de lado.
3. **Given** um interruptor, **When** a pessoa toca ou clica na faixa de até 44 px de altura centrada no trilho, fora do desenho dele, **Then** o interruptor alterna.
4. **Given** um interruptor, **When** a pessoa o foca pelo teclado, **Then** o anel de foco envolve o trilho e a pessoa alterna com Espaço, como hoje.
5. **Given** os dois interruptores, **When** a pessoa os compara, **Then** têm o mesmo tamanho e a borda direita de ambos coincide com a borda direita do conteúdo do diálogo (regra da feature 024 mantida).

---

### User Story 2 - "Restaurar padrões" alinhado pela caixa visível (Priority: P2)

Quem abre as configurações vê o botão "Restaurar padrões" com a borda esquerda da caixa visível na mesma margem esquerda do conteúdo do diálogo, sem nada saindo para fora, e continua com uma área de toque de pelo menos 44 px de altura.

**Why this priority**: É um desalinhamento visual menor que a deformação do interruptor, mas o botão fica fora da margem em todo uso do diálogo.

**Independent Test**: Medir no navegador, em larguras de 320 px a 1920 px, a esquerda da caixa visível de "Restaurar padrões" e a esquerda do conteúdo do diálogo.

**Acceptance Scenarios**:

1. **Given** o diálogo de configurações em qualquer largura, **When** a pessoa olha "Restaurar padrões", **Then** a borda esquerda da caixa visível do botão (contorno incluído) fica na margem esquerda do conteúdo do diálogo, nunca antes dela.
2. **Given** o mesmo diálogo, **When** a pessoa o olha em celular estreito (360 px) e com zoom de 200 %, **Then** o botão continua inteiro dentro do diálogo, sem rolagem lateral.
3. **Given** o botão, **When** a pessoa o aciona por mouse, toque ou teclado, **Then** restaura os padrões exatamente como hoje, e o botão tem pelo menos 44 px de altura.

---

### Edge Cases

- Interruptor com o foco do teclado e com o mouse em cima (estados de passar o mouse e de pressionado da feature 023): o desenho de 30 px não muda de tamanho nem de posição nesses estados.
- Texto do rótulo do interruptor que quebra em duas ou mais linhas (celular estreito, zoom de 200 %): o trilho continua com 30 px e a bolinha centralizada, alinhado como hoje à linha do rótulo; a área de toque não invade nenhum outro controle: um clique no centro de qualquer outro controle do diálogo nunca alterna um interruptor.
- Modo de cores forçadas: o trilho e a bolinha continuam visíveis e distintos, ligado e desligado.
- Movimento reduzido: a bolinha continua sem animar, como hoje.
- Outros botões do site que usam a altura mínima de toque (ex.: os passos − e +, o botão de tema) não mudam.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O trilho de todo interruptor das configurações MUST ter 30 px de altura e 52 px de largura, ligado ou desligado, em qualquer largura de tela e nos dois temas.
- **FR-002**: A bolinha MUST ficar centralizada na vertical no trilho, com a mesma posição vertical ligada e desligada, e só mudar de lado ao alternar.
- **FR-003**: Todo interruptor MUST manter uma área de acionamento de pelo menos 44 px de altura, centrada no trilho, sem deformar nem mover o desenho visível.
- **FR-004**: O rótulo, o nome acessível, o papel de interruptor, o estado marcado/desmarcado e o funcionamento por teclado MUST continuar como hoje; só a aparência muda.
- **FR-005**: O anel de foco, os estados de passar o mouse e de pressionado (feature 023), o contraste e o funcionamento em cores forçadas e com movimento reduzido MUST continuar valendo para o interruptor, sem violações do verificador automático de acessibilidade nos dois temas.
- **FR-006**: A caixa visível do botão "Restaurar padrões", contorno incluído, MUST ter a borda esquerda na margem esquerda do conteúdo do diálogo, nunca antes dela, em todas as larguras de 320 px em diante. Isto substitui a regra da feature 024 de alinhar o texto do botão à margem.
- **FR-007**: O botão "Restaurar padrões" MUST manter pelo menos 44 px de altura, o mesmo tipo visual (contorno discreto) e o mesmo comportamento de restaurar os padrões de hoje.
- **FR-008**: O diálogo MUST NOT ganhar rolagem lateral, em nenhuma largura nem com zoom de 200 %, por causa dos dois itens alterados.
- **FR-009**: Nenhuma outra parte do diálogo (seletor da cruzada padrão, linhas de ajuda, botão de tema) nem de outras telas MUST mudar de tamanho ou posição por esta feature.
- **FR-010**: A correção MUST NOT alterar dados: as configurações gravadas, lidas e sincronizadas ficam exatamente como hoje.

### Key Entities

Nenhuma. A feature não cria nem altera dados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100 % das larguras testadas (320 px a 1920 px) e nos dois temas, o trilho dos dois interruptores mede 30 px de altura e 52 px de largura, ligados e desligados (diferença de até 0,5 px, margem de medição).
- **SC-002**: O centro vertical da bolinha coincide com o centro vertical do trilho (diferença de até 0,5 px), ligada e desligada.
- **SC-003**: Um toque ou clique em qualquer ponto de uma faixa de 44 px de altura centrada no trilho alterna o interruptor, e a área de acionamento nunca tem menos de 44 px de altura.
- **SC-004**: A esquerda da caixa visível de "Restaurar padrões" fica a no máximo 1 px da esquerda do conteúdo do diálogo e nunca antes dela, em 100 % das larguras testadas; o botão tem pelo menos 44 px de altura.
- **SC-005**: A borda direita dos dois interruptores continua a no máximo 1 px da borda direita do conteúdo do diálogo (SC-008 da feature 024, mantido).
- **SC-006**: Nenhum teste existente de acessibilidade, contraste, botões (feature 023) ou configurações (features 021 e 024) deixa de passar, e as telas alteradas não têm violações do verificador automático nos dois temas.

## Assumptions

- Causa, conforme a issue: a altura mínima de toque global dos botões (44 px) vence a altura de 30 px do interruptor. A correção MUST manter essa regra global para os demais botões; os detalhes de como serão tratadas a altura e a área de toque ficam para o plano.
- A causa do desalinhamento de "Restaurar padrões" (margem negativa pensada para o botão sem contorno, mas o tipo discreto tem contorno visível) ainda não foi confirmada por medição; a primeira etapa do plano é medir no navegador, e a regra desta spec (caixa visível na margem) vale seja qual for a causa exata.
- O desenho do interruptor (52 × 30 px, cores de ligado e desligado, borda) é o definido nas features 021 e 024; nenhum redesenho.
- Esta correção é só visual e só em `apps/web`; a API, o banco e o pacote `shared` ficam como estão. Por ser compatível com a versão anterior da API, não exige versão nova de outra parte.
- Segundo o fluxo do projeto, a implementação começa por testes de regressão que falham (medir o trilho em 30 px e a caixa do botão dentro da margem, no e2e de `ajustes-configuracoes`) e os inclui no mesmo commit ou PR da correção. A spec 024 deve ser anotada com a regra substituída.
- O defeito do interruptor deve existir desde a feature 021 (a issue não testou commits antigos); isso não altera o escopo.
