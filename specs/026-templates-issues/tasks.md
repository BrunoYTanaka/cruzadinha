---

description: "Task list for issue templates"
---

# Tasks: Templates de issues para feature, bug, documentação e manutenção

**Input**: Design documents from `/specs/026-templates-issues/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/issue-forms.md, quickstart.md

**Tests**: não solicitados. Não há teste automatizado; a validação é `format:check`, parse do YAML e a conferência manual do [quickstart.md](quickstart.md).

**Organization**: uma história por arquivo de formulário. Todos os textos em português do Brasil; campos, ids, rótulos, títulos e etiquetas exatamente como em [contracts/issue-forms.md](contracts/issue-forms.md). Cada `attributes.description` tem uma ou duas frases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: história da spec a que a tarefa pertence

## Phase 1: Setup

- [X] T001 Criar o diretório `.github/ISSUE_TEMPLATE/` (hoje só existe `.github/workflows/`)

---

## Phase 2: User Story 1 - Bug com o necessário para reproduzir (Priority: P1) 🎯 MVP

**Goal**: formulário de bug com campos obrigatórios que permitam escrever o teste de regressão.

**Independent Test**: YAML válido; no formulário, descrição, passos, esperado e atual são obrigatórios; ambiente e evidências opcionais; título `[Bug]: `; etiqueta `bug`.

- [X] T002 [P] [US1] Criar `.github/ISSUE_TEMPLATE/bug.yml` com `name: Bug`, `description: Algo não funciona como deveria.`, `title: "[Bug]: "`, `labels: [bug]` e o corpo do contrato: bloco `markdown` de aviso (sem senhas, cookies, `.env`, dados pessoais nem puzzles inteiros da fonte), `descricao`, `passos` (valor inicial `1.`, `2.`, `3.`), `esperado`, `atual` (os quatro com `validations.required: true`), `ambiente` (`input` opcional; dica: versão do site em `/version.json` e da API em `/api/health`, navegador e sistema, visitante ou logado; aceita outra área, como CI ou deploy) e `evidencias` (`textarea` opcional **sem** `render`; instrução para colocar logs entre blocos de código e anexar prints)

---

## Phase 3: User Story 2 - Feature com objetivo e critérios de aceitação (Priority: P1)

**Goal**: formulário de feature pronto para virar entrada do `/speckit-specify`.

**Independent Test**: contexto, objetivo e critérios obrigatórios; impactos opcional; critérios começam com `- [ ] `; título `[Feature]: `; etiqueta `enhancement`.

- [X] T003 [P] [US2] Criar `.github/ISSUE_TEMPLATE/feature.yml` com `name: Feature / melhoria`, `description: Propor uma funcionalidade nova ou uma melhoria.`, `title: "[Feature]: "`, `labels: [enhancement]` e os campos `contexto`, `objetivo`, `criterios` (`value: "- [ ] "`, instrução (`description`) pedindo um item por linha, no formato `- [ ] critério verificável`, com um exemplo; sem `placeholder`, que não aparece quando há `value`), todos `required: true`, e `impactos` (opcional)

---

## Phase 4: User Story 3 - Atualização de documentação (Priority: P2)

**Goal**: formulário de documentação.

**Independent Test**: documento/área e objetivo obrigatórios; público-alvo e validação opcionais; título `[Docs]: `; etiqueta `documentation`.

- [X] T004 [P] [US3] Criar `.github/ISSUE_TEMPLATE/docs.yml` com `name: Documentação`, `description: Criar, corrigir ou atualizar documentação.`, `title: "[Docs]: "`, `labels: [documentation]` e os campos `area` (`input`, obrigatório), `objetivo` (`textarea`, obrigatório), `publico` (`input`, opcional) e `validacao` (`textarea`, opcional)

---

## Phase 5: User Story 4 - Tarefa de manutenção (Priority: P3)

**Goal**: formulário de chore.

**Independent Test**: só o objetivo é obrigatório; título `[Chore]: `; nenhuma etiqueta (não existe `chore` no repositório).

- [X] T005 [P] [US4] Criar `.github/ISSUE_TEMPLATE/chore.yml` com `name: Manutenção / chore`, `description: Dependências, CI, ferramentas ou limpeza que não mudam o comportamento.`, `title: "[Chore]: "`, **sem** chave `labels`, e os campos `objetivo` (obrigatório), `impacto` e `riscos` (opcionais; `riscos` com rótulo "Riscos e validação")

---

## Phase 6: User Story 5 - Escolher o tipo certo sem ruído (Priority: P3)

**Goal**: seletor de tipos com os quatro formulários e a opção de issue em branco.

**Independent Test**: `/issues/new/choose` lista os quatro tipos com descrição; nenhum campo de um tipo aparece em outro.

- [X] T006 [P] [US5] Criar `.github/ISSUE_TEMPLATE/config.yml` com `blank_issues_enabled: true` e sem `contact_links`

---

## Phase 7: Polish & Cross-Cutting

- [X] T007 [P] Adicionar um bullet em "Conventions" de `CLAUDE.md` (FR-014): os templates de `.github/ISSUE_TEMPLATE/` (bug, feature, docs, chore) e a ligação com o fluxo por tipo (bug → `fix/<slug>` com teste de regressão primeiro; feature → ciclo completo do Spec Kit em `feat/NNN-slug`; docs e chore → direto, sem spec), com os prefixos de título `[Bug]: `, `[Feature]: `, `[Docs]: `, `[Chore]: ` (o número da issue é o identificador)
- [X] T008 Rodar `npx prettier --write .github/ISSUE_TEMPLATE` e depois `npm run format:check`, `npm run lint` e o parse dos cinco YAML (comando do quickstart); corrigir o que falhar
- [X] T009 Conferir os arquivos contra `contracts/issue-forms.md` e `spec.md` (obrigatórios da tabela do FR-006, no máximo 4 obrigatórios por tipo, `name` único, só as etiquetas `bug`, `enhancement`, `documentation`)
- [ ] T010 Commitar em inglês, sem atribuição Claude/AI (regra do CLAUDE.md, que prevalece sobre o rodapé padrão), por exemplo `chore: add github issue templates for bug, feature, docs and chore`; abrir o PR seguindo `.claude/rules/git-conventions.md` (não usar a skill open-mr), título no formato Conventional Commits
- [ ] T011 Depois do merge em `main`, executar a conferência manual do [quickstart.md](quickstart.md) (SC-005) e fechar as issues de teste

---

## Dependencies & Execution Order

- T001 antes de T002–T006.
- T002–T006 são independentes (arquivos diferentes) e podem rodar juntas; T007 também é independente.
- T008 e T009 dependem de T002–T007.
- T010 depois de T008–T009; T011 depois do merge.

## Parallel Example

```text
T002 bug.yml | T003 feature.yml | T004 docs.yml | T005 chore.yml | T006 config.yml | T007 CLAUDE.md
```

## Implementation Strategy

- **MVP**: T001 + T002 (bug), a história P1 de maior valor. Como o seletor só vale depois do merge, na prática entregam-se todos juntos num único PR.
- Ordem sugerida: T001 → T002–T007 em paralelo → T008–T009 → T010 → T011.
