# Implementation Plan: Design system aplicado ao site

**Branch**: `feat/062-design-system` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md), [brief.md](brief.md), contrato visual [design-system.html](../../docs/mockups/design-system.html)

## Summary

Alinhar `apps/web` ao artefato em seis fatias, cada uma um PR: tokens, componentes de base, cabeçalho, calendário, demais telas, ordenação por arraste na Administração. Só CSS, componentes React e testes; nenhuma mudança em `apps/api`, `packages/shared`, rotas ou contratos. Arraste com `@dnd-kit` (aprovado; pesquisa em [research.md](research.md)).

## Technical Context

**Language/Version**: TypeScript 6 estrito, React 19, Vite 8, CSS Modules com variáveis (Node 24)

**Primary Dependencies**: as atuais mais `@dnd-kit/react`, `@dnd-kit/dom` e `@dnd-kit/helpers` (versões fixas, só em `apps/web`)

**Storage**: N/A (a ordem das fontes continua em `PUT /api/admin/sources`, feature 060)

**Testing**: Vitest + Testing Library + `vitest-axe` (unit), Playwright (`e2e/`, inclui `sem-saltos.spec.ts`), `readCss` para testes de CSS

**Target Platform**: navegadores modernos, celular e computador, temas claro e escuro, PWA offline (feature 041)

**Project Type**: web (só `apps/web`)

**Performance Goals**: sem regressão de carga; sublinhado do `Link` e arraste só com `transform`/`background-size`, sem reflow

**Constraints**: botões chapados (sem sombra nem movimento), estado nunca só por cor, `--tap: 44px`, sem animação de movimento com `prefers-reduced-motion`, landing e tabuleiro intocados, `check:deps` verde

**Scale/Scope**: ~10 componentes compartilhados, `AppLayout`, calendário, 8 grupos de telas, 1 lista ordenável

## Constitution Check

| Princípio | Resultado |
|---|---|
| I TypeScript estrito, sem `any` | Passa: só código web tipado. |
| II Qualidade automatizada | Passa: `lint`, `check:deps`, `typecheck`, testes por fatia. |
| V Lógica pura e testada | Passa: a reordenação é do `move` do `@dnd-kit/helpers`; o que é nosso (anúncios, textos, ordem enviada ao `PUT`) fica em função pura testada. |
| VI Segurança e privacidade | Passa: sem dado novo, rede nova ou armazenamento novo. |
| VII Testes determinísticos | Passa: teclado e anúncios em jsdom, ponteiro e toque em Playwright local; sem rede. |
| Restrições técnicas | Passa: componentes leem tokens; sem biblioteca de UI. `--edge` e `--focus` vêm de tokens, nunca cor fixa. |
| Fluxo | Passa: ciclo completo na branch numerada; API do `@dnd-kit` confirmada no Context7 (D1). |

Reavaliado após o desenho: sem violação, sem exceção a justificar.

## Divergências entre o brief e o código (achadas na leitura)

- `--focus` **já existe** em `light.css` e `dark.css` (iguais ao artefato). O novo é só `--edge` (`var(--ink)` no claro, `#868d99` no escuro, no artefato). A fatia 1 confere o `--focus` e acrescenta `--edge`.
- `--ok` e `--ok-tint` já existem; a variante `ok` do `Notice` não precisa de cor nova.
- O texto de `SourcesAdmin.tsx:96` ainda cita os cartões de "Hoje" (FR-014).
- O artefato lista pontos de quebra 480, 560 e 860 px; o código usa 599 px nas abas e 861 px no calendário. A fatia 4 decide, com registro, qual lado ajusta.

## Fatias (planejadas como um PR cada; entregues juntas no PR #159)

Branches: a fatia 1 usa `feat/062-design-system` (leva também `specs/062-design-system/`); as fatias 2 a 6 saem de `main` já com a anterior mesclada, em `feat/062-<slug>` (`feat/062-base-components`, `feat/062-header`, `feat/062-calendar`, `feat/062-screens`, `feat/062-sortable-sources`), como pede `check:branch`.

1. **Tokens**: `--edge` em `light.css`/`dark.css` e no comentário de `tokens.css`; conferir `--focus`, overlays, raios, `--tap`; teste de contraste dos tokens nos dois temas.
2. **Base**: `Button` (conferir contra o artefato), novo `shared/components/Link/Link` (sublinhado por `background-size` 280 ms, `@media (hover: hover)`, `prefers-reduced-motion`), `Tooltip`, `Notice` (+ `ok`, com símbolo), `Dialog` (botão ícone de fechar), `Menu`. O `Link` é adotado nas telas nas fatias 3 e 5, não nesta.
3. **Cabeçalho**: `AppLayout` (círculo de iniciais 38 px, Sair em "Sua conta", configurações 44 px, menu em folha até 560 px). Helper puro `initials(email)`.
4. **Calendário**: `SourceTabs` (linha rolável sem barra, botão de data fixo), `Calendar` (símbolos "✓" e "◐" com menos de 480 px de largura do calendário, via container query, `aria-label` intacto), legenda.
5. **Demais telas**: `features/account`, `features/stats`, `features/duel`, `features/admin`, `features/settings` (diálogo), `features/import` (`ImportOffer`), avisos de `features/offline`, `pages/status`, `pages/confirm-email`, `ErrorState`/`RouteError`, `LoadingState`, `NotFoundPage`, `RequiresConnection`; `Link` nos textos de link; texto da Administração.
6. **Arraste**: `@dnd-kit/react` em `features/admin` para o ponteiro (`DragDropProvider` + `useSortable` com `handleRef`), alça de 44 px (`touch-action: none`); teclado (Espaço, setas, Esc), anúncios e instruções em português são código próprio (ver research.md, D1), `aria-describedby` apontando ao texto fixo. O `PUT` e as regras da 060 não mudam. Depende da 5 por usar `SourcesAdmin`.

## Project Structure

### Documentation (this feature)

```text
specs/062-design-system/
├── brief.md
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ui-contract.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/
├── shared/themes/            # light.css, dark.css, tokens.css (--edge)
├── shared/components/        # Button, Link (novo), Tooltip, Notice, Dialog, Menu
├── app/                      # AppLayout (cabeçalho), HeaderStart
├── features/library/         # SourceTabs, Calendar (símbolos)
├── features/{account,stats,duel,admin}/components/
├── features/admin/components/ # SourcesAdmin (DragDropProvider), SortableRow/ e DragHandle/ (novos)
├── features/admin/helpers/   # sortable-announcements (novo, puro: textos e posição em português)
└── e2e/                      # telas conferidas nos dois temas
```

**Structure Decision**: usa as pastas atuais da feature 037; cada componente novo em pasta própria com `.module.css` e testes. `Link` fica em `shared/components` porque várias features o usam (regra `check:deps`: feature não importa outra feature).
