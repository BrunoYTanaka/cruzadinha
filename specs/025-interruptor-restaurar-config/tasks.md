---

description: "Task list for feature 025: interruptor e botão Restaurar padrões corretos nas configurações"
---

# Tasks: Interruptor e botão "Restaurar padrões" corretos nas configurações

**Input**: Design documents from `/specs/025-interruptor-restaurar-config/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (sem `contracts/`: nenhuma interface muda)

**Tests**: obrigatórios. A constituição exige um teste de regressão que falha primeiro, no mesmo commit ou PR da correção. O jsdom não faz layout: as medidas vão em Playwright (Chromium) e uma guarda barata do CSS em Vitest (roda no pré-push).

**Organization**: uma fase por história da spec.

- US1 (interruptor com o desenho certo) é P1.
- US2 ("Restaurar padrões" alinhado pela caixa visível) é P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1 ou US2.
- Caminhos relativos à raiz do repositório. Só `apps/web` muda, mais `CLAUDE.md` e `specs/024-ajustes-seletor-tema/spec.md`. API, banco, `packages/shared` e `game-logic/` não mudam.

## Regras que valem para todas as tarefas

- Cores só por tokens (`var(--...)`), sem cor fixa. Nenhuma dependência nova. Não mexer em `apps/web/src/themes/global.css`, `components/Button.module.css` nem `components/Dialog.module.css`: a regra global de 44 px dos botões continua valendo para os demais.
- Tolerância de medição: 0,5 px para trilho e bolinha (comparação própria, não `expectNear`, que aceita 1 px); `expectNear` (1 px) para o alinhamento da esquerda do botão.
- Os testes das features 021, 023 e 024 (`e2e/botoes.spec.ts`, `e2e/ajustes-configuracoes.spec.ts`, `components/button-states.test.ts`, `tokens-contrast.test.ts`) continuam passando.
- Prettier: `semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`. Commits `fix(web): ...` em inglês, sem linha de coautoria de IA.

## Phase 1: Setup (medir o defeito atual)

**Purpose**: confirmar no navegador as duas causas antes de mexer no CSS.

- [X] T001 Com a API e o Postgres locais (veja `quickstart.md`), abrir as configurações em 320, 360 e 1280 px, nos dois temas, e medir: altura, largura e posição da bolinha dos dois interruptores (ligado e desligado) e a esquerda da caixa de "Restaurar padrões" contra a esquerda do conteúdo do diálogo (`[class*="body"]`). Anotar o resultado numa seção "Medição inicial" ao fim de `specs/025-interruptor-restaurar-config/research.md`, uma linha por item (elemento, largura, valor atual, valor esperado). Se a causa do botão não for a margem de −19 px, ajustar o plano da T010 antes de seguir.

---

## Phase 2: User Story 1 - Interruptor com o desenho certo (Priority: P1) 🎯 MVP

**Goal**: trilho de 30 × 52 px com a bolinha centralizada, mantendo faixa de acionamento de 44 px de altura.

**Independent Test**: abrir as configurações em 320, 360 e 1280 px nos dois temas; o trilho mede 30 × 52 px, ligado e desligado, a bolinha está no centro vertical, e um clique a 20 px do centro alterna o interruptor.

### Tests for User Story 1 (escrever primeiro; devem FALHAR no código atual)

- [X] T002 [US1] Em `apps/web/e2e/ajustes-configuracoes.spec.ts`, adicionar um bloco "F025-US1: interruptor com o desenho certo", nos dois temas e em 320, 360 e 1280 px, usando `openSettings` e `box`. Para cada um dos dois interruptores (`getByRole('switch')`), ligado e desligado: (a) altura 30 e largura 52 (diferença de até 0,5 px); (b) o centro vertical da bolinha (`[class*="knob"]` dentro do interruptor) igual ao do trilho (até 0,5 px) e a mesma posição vertical nos dois estados; (c) `document.elementFromPoint` a ±21 px do centro vertical e no centro horizontal devolve o interruptor ou um filho, e a ±24 px não devolve; (d) um `page.mouse.click` a 20 px abaixo do centro alterna `aria-checked`; (e) em 320 px, o centro de cada outro controle do diálogo (passos − e +, "Sem limite", botões do seletor, botão de tema, "Restaurar padrões") não é coberto por um interruptor (`elementFromPoint` no centro devolve o próprio controle ou um filho dele). Conferir que falha (altura 44).
- [X] T003 [P] [US1] Criar `apps/web/src/features/settings/settings-css.test.ts` no estilo de `apps/web/src/components/button-states.test.ts` (lê `SettingsDialog.module.css` com `node:fs`): a regra `.switch` declara `min-height: 0`, e existe uma regra `.switch::before` com `position: absolute` e `inset` com valor vertical negativo. Conferir que falha.

### Implementation for User Story 1

- [X] T004 [US1] Em `apps/web/src/features/settings/SettingsDialog.module.css`, na regra `.switch`, acrescentar `min-height: 0` com um comentário curto (a regra global `button { min-height: var(--tap) }` está em `@layer reset` e vencia o `height: 30px`; o `::before` devolve a área de toque). Manter `width: 52px`, `height: 30px`, a borda transparente e o resto.
- [X] T005 [US1] No mesmo arquivo, depois da regra `.switch`, adicionar `.switch::before { content: ''; position: absolute; inset: -8px -1px; }` (o `inset` conta da caixa de preenchimento de 28 px: 28 + 16 = 44 px de faixa de toque, transparente, fora da caixa medida), com comentário curto. Não alterar `.knob`.
- [X] T006 [US1] Rodar T002 e T003 e ver passarem (a checagem (e) da T002 confirma que a faixa de 44 px não cobre outro controle); rodar `npm run test:e2e -w @cruzadinha/web -- ajustes-configuracoes botoes` (veja `quickstart.md` para o ambiente) para garantir que o resto do diálogo e os estados de botão não mudaram. Se a faixa de 7 px invadir um alvo vizinho em 320 px (T002 pode mostrar), reduzir o `inset` só até onde houver espaço e registrar na `research.md`.

**Checkpoint**: a US1 funciona e é testável sozinha; o MVP já corrige o defeito mais visível.

---

## Phase 3: User Story 2 - "Restaurar padrões" alinhado pela caixa visível (Priority: P2)

**Goal**: a borda esquerda da caixa visível do botão na margem esquerda do conteúdo, com pelo menos 44 px de altura.

**Independent Test**: medir, em 320 a 1920 px, a esquerda da caixa de "Restaurar padrões" e a esquerda do conteúdo do diálogo: diferença de até 1 px e nunca antes.

### Tests for User Story 2 (escrever primeiro; devem FALHAR no código atual)

- [X] T007 [US2] Em `apps/web/e2e/ajustes-configuracoes.spec.ts` (sem bloco "F025-US2": a checagem fica nos testes da história 3 da feature 024), no teste "US3: modal alinhada em qualquer tela" (feature 024; os blocos novos desta feature se chamam "F025-US1" e "F025-US2") (por volta das linhas 148 a 154), substituir a checagem do texto de "Restaurar padrões" na margem (a que usa `Range` e `textLeft`) por: `box(restore).x` a no máximo 1 px da esquerda do conteúdo (`expectNear`) e nunca menor que ela menos 0,5 px, mais `box(restore).height >= 44`. Ajustar o comentário do teste para citar a feature 025 (spec 025, SC-004). No teste de zoom de 200 % logo abaixo, acrescentar a mesma checagem de caixa. Conferir que falha (caixa 19 px antes da margem).
- [X] T008 [US2] Em `apps/web/src/features/settings/settings-css.test.ts` (criado na T003; se a T003 ainda não foi feita, criar o arquivo), acrescentar: `SettingsDialog.module.css` não tem regra `.restore` com `margin-inline-start` negativo (a regra some ou não declara margem). Conferir que falha.

### Implementation for User Story 2

- [X] T009 [US2] Em `apps/web/src/features/settings/SettingsDialog.module.css`, remover a regra `.restore` e o comentário dela (margem de −19 px da feature 024).
- [X] T010 [US2] Em `apps/web/src/features/settings/SettingsDialog.tsx` (por volta da linha 295), tirar `className={styles.restore}` do `<Button variant="quiet" ...>` de "Restaurar padrões". Conferir com `grep -rn "styles.restore" apps/web/src` que nada mais usa a classe.
- [X] T011 [US2] Rodar T007 e T008 e ver passarem; conferir que o rodapé (`.footer`, com `flex-wrap`) não ganha rolagem lateral em 320 px e com zoom de 200 % (o teste de overflow existente cobre).

**Checkpoint**: US1 e US2 funcionam; as regras da feature 024 sobre o botão estão substituídas.

---

## Phase 4: Polish & Cross-Cutting

- [X] T012 [P] Atualizar `CLAUDE.md`: na linha da feature 024, trocar a frase "'Restaurar padrões' has a −19 px start margin (18 px padding + 1 px border of the quiet type) so its text sits on the margin" por uma que diga que a margem foi removida pela feature 025 e a caixa visível ocupa a margem; acrescentar a linha "Feature 025 (settings switch and restore button, issue #51) changed only `apps/web`" resumindo: `.switch` com `min-height: 0` e `::before` de `inset: -7px 0` (30 px visíveis, 44 px de toque), `.restore` removido, e o e2e em `e2e/ajustes-configuracoes.spec.ts`.
- [X] T013 [P] Em `specs/024-ajustes-seletor-tema/spec.md`, acrescentar nota curta (em português, uma linha cada) no cenário 2 da história 3, no FR-006a (parte do botão) e no SC-008 (parte do texto): "Substituído pela feature 025: a caixa visível do botão fica na margem."
- [X] T014 Rodar a validação completa do `quickstart.md` (a olhada manual cobre o anel de foco, o hover, as cores forçadas e o movimento reduzido do interruptor, FR-005): `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e o e2e `ajustes-configuracoes` e `botoes`; olhar manualmente em 360 px e zoom de 200 %, claro e escuro. Se algo falhar, dizer o que falhou em vez de dar por concluído.
- [ ] T015 Commit(s) `fix(web): ...` (teste e correção juntos, mensagem em inglês, sem coautoria de IA) na branch `fix/025-interruptor-restaurar-config` e PR para `main` com título no formato Conventional Commits, resumo e plano de teste.

---

## Dependencies & Execution Order

- Phase 1 (T001) antes de tudo; ela pode mudar a T010.
- US1 e US2 são independentes e tocam os mesmos dois arquivos (`SettingsDialog.module.css` e `ajustes-configuracoes.spec.ts`), então rodam em sequência (US1 primeiro, é o MVP).
- Dentro de cada história: testes (T002/T003, T007/T008) antes da implementação (T004–T006, T009–T011) e vistos falhar.
- Polish (T012–T015) depois das duas histórias; T012 e T013 são paralelas.

## Parallel Example

- Com a T001 feita: T002 (e2e) e T003 (CSS unitário) em paralelo, arquivos diferentes.
- T012 e T013 em paralelo no fim.
- T003 e T008 mexem no mesmo arquivo e rodam em sequência.

## Implementation Strategy

- **MVP**: Phase 1 + US1 (T001–T006). Já corrige o desenho do interruptor e pode ser entregue sozinha.
- **Incremento**: US2 (T007–T011), depois Polish.
- Tudo no mesmo PR, com os testes de regressão no mesmo commit da correção.
