# Implementation Plan: Verificação automática opcional

**Branch**: `feat/047-verificacao-automatica` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/047-verificacao-automatica/spec.md`

## Summary

Nova opção `verifyOnType` (booleano, padrão `false`) em `settingsSchema`, nos ajustes e num interruptor do jogo. Com ela ligada, a letra errada aparece marcada na hora. A marca é **derivada na hora de desenhar** (célula preenchida, não travada, diferente da solução sem acento), nunca gravada em `marks`. Assim ligar marca tudo na hora, desligar apaga sem rastro, e progresso, ajudas salvas e conclusão não mudam. A faixa de ferramentas troca `Verificar` e os três controles do rascunho por um botão "Ajudas" com menu (novo componente `Menu` em `shared/components`, reaproveitado por `HelpsMenu` em `features/game`). Sem API, tabela ou migração: só schema compartilhado, site e DDE-004.

## Technical Context

**Language/Version**: TypeScript 6 strict, Node 24

**Primary Dependencies**: React 19, Vite 8, Zod (schemas em `packages/shared`); nenhuma dependência nova (o menu é próprio, sem biblioteca de UI, como manda a constituição)

**Storage**: configurações já existentes (`cruzadinha:settings` no aparelho; `user_settings.settings` `jsonb` na conta). Sem coluna, sem migração

**Testing**: Vitest + Testing Library + `vitest-axe` (web e shared), Playwright (`e2e/sem-saltos.spec.ts` e specs de ajuda/rascunho); integração da API só para confirmar a compatibilidade (`settings.int.test.ts`)

**Target Platform**: site estático (desktop e celular, claro e escuro)

**Project Type**: web (monorepo; muda `packages/shared` e `apps/web`)

**Performance Goals**: marca imediata (mesmo render da digitação); varredura da grade em `useMemo` por `state.cells`/`locked`/opção

**Constraints**: faixa sem mudar de tamanho ao digitar ou abrir o menu; 3 controles em uma linha com teclado na tela; itens do painel com 48 px; a API aceita o site anterior e o site novo aceita a API anterior

**Scale/Scope**: 1 chave de configuração, 1 componente genérico novo, 1 componente de jogo novo, 1 função pura de domínio

## Constitution Check

| Princípio | Resultado |
|-----------|-----------|
| I. TypeScript estrito, Zod em `shared` | Passa. Chave nova em `settingsSchema`; sem `any` |
| II. Qualidade automatizada | Passa. Lint, `check:deps`, typecheck e testes cobrem os arquivos novos |
| III. Camadas da API | N/A. A API não muda de código |
| IV. Adaptadores de fonte | N/A |
| V. Lógica de jogo pura e testada | Passa. A regra da marca é função pura em `domain/game` com teste; React só compõe |
| VI. Segurança e privacidade | Passa. A solução já está no navegador (emendas 3.0.0 e 4.0.0); nada novo é enviado, a opção é só uma preferência |
| VII. Testes determinísticos | Passa. Sem rede; o e2e usa o Playwright já existente |
| VIII. Conteúdo de terceiros | N/A |
| IX. Migração por schema | Passa. O banco guarda `jsonb`; não há mudança de schema |
| Context7 | Sem biblioteca nova no código; o menu usa só React e o padrão WAI-ARIA (research R3). T001 consulta o Context7 para as APIs de teste (Testing Library, `vitest-axe`, Playwright) e registra em research.md |
| `check:deps` (feature 037) | `shared/components/Menu` não importa `features/`; `HelpsMenu` fica em `features/game` e lê `useSettings` de `shared`, como `useCopyClue` |

Reavaliado depois do desenho: sem violações; Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/047-verificacao-automatica/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── settings-contract.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/shared/src/settings/
├── schema.ts            # + verifyOnType em fields/defaultSettings; request com verifyOnType opcional
└── schema.test.ts

apps/api/src/modules/settings/settings.schemas.ts   # só o exemplo da documentação OpenAPI
apps/api/src/test/settings.int.test.ts              # pedido sem a chave continua aceito

apps/web/src/
├── domain/game/
│   ├── wrong-cells.ts           # novo: withAutoMarks(state, solution) pura
│   └── wrong-cells.test.ts
├── shared/components/Menu/      # novo: botão + painel (menu, menuitem, menuitemcheckbox, setas, Esc, fora)
│   ├── Menu.tsx
│   ├── Menu.module.css          # popover ancorado; `sheet` preso à borda de baixo, itens de 48 px
│   └── Menu.test.tsx
├── features/game/components/controls/
│   ├── HelpsMenu/               # novo: Verificar, Verificar ao digitar, Lápis, Confirmar, Descartar, ponto
│   ├── HelpButtons/             # fica só com Letra e Palavra (+ região viva dos resultados)
│   ├── DraftControls/           # removido; a região viva dos anúncios do rascunho vai para HelpsMenu
│   └── Toolbar/                 # sem mudança de contrato
├── features/game/components/GameScreen/GameScreen.tsx  # compõe; passa estado com marcas derivadas ao Board
├── features/settings/components/SettingsDialog/SettingsDialog.tsx  # + Switch "Verificar ao digitar"
└── e2e/                          # ajuste de ajudas-e-retomada, rascunho, botoes, sem-saltos

docs/data-definitions/DDE-004-configuracoes-usuario.md   # conteúdo e padrão da chave
docs/entity-relationship-diagrams/ERD-004-*.md           # só se citar o conteúdo de `settings`
CLAUDE.md                                                # nota curta da feature 047
```

**Structure Decision**: web + shared, sem API. `Menu` é genérico em `shared/components` (regra de pasta por componente, com CSS e teste); a composição específica das ajudas fica em `features/game`. Nenhuma regra nova de fronteira.

## Complexity Tracking

Sem violações a justificar.
