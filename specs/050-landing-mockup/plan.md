# Implementation Plan: Landing page alinhada ao mockup

**Branch**: `feat/050-landing-mockup` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/050-landing-mockup/spec.md`

## Summary

Reescrever o visual e a estrutura dos componentes de `apps/web/src/features/landing/` para seguir o mockup aprovado, sem mudar rota, API, schema nem o mecanismo de pré-render da 048. Os achados que fecham o escopo (pesquisa em `research.md`):

- As cores do mockup (`--bg`, `--surface`, `--ink`, `--mute`, `--line`, `--accent`, `--word`, `--sel`, `--ok`, `--ok-tint`, `--block`) já são os tokens do site em `shared/themes/{light,dark}.css`; só faltam três valores da landing (grade do topo, faixa final), derivados dos tokens no CSS da própria landing (`color-mix()` e `light-dark()` sobre `--ink` e `--surface`), sem nenhuma cor fixa.
- Fraunces (variável), Roboto (400/500/700) e Roboto Mono (500) já são servidas pelo próprio site (`shared/themes/fonts.css`); **nenhuma dependência nova** e nenhuma requisição a terceiros.
- Os botões da landing viram uma classe própria (`landingButtonClass`) ao lado dos componentes da landing, sem tocar em `shared/components/Button`.
- A mini cruzada continua usando o reducer de `domain/game` (constituição V). Mudam a amostra, a grade inicial (três letras preenchidas), a UI (caixa com sombra, duas listas de dicas, contagem, vitória, Limpar) e a derivação das palavras resolvidas.
- A faixa final de largura total sai do `max-width` do `LandingContent`: cada seção ganha o próprio miolo centralizado e a faixa fica fora dele (o `main` do site não limita largura).

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19.3, Vite 8.3

**Primary Dependencies**: só as já instaladas (`@fontsource-variable/fraunces`, `@fontsource/roboto`, `@fontsource/roboto-mono`, `vitest-axe`, React Router 7); nenhuma nova

**Storage**: N/A (a mini cruzada não grava nada; continua sem tocar em `localStorage`/IndexedDB)

**Testing**: Vitest 5 + jsdom + Testing Library + `vitest-axe` (testes por componente, já existentes e atualizados); `scripts/check-build-output.mjs` (texto no HTML pré-gerado); Playwright (`e2e/landing.spec.ts`, `e2e/sem-saltos.spec.ts`)

**Target Platform**: navegadores modernos; Cloudflare Pages

**Project Type**: web app, só `apps/web` (front end; CSS Modules)

**Performance Goals**: LCP da landing igual ou melhor que na 048. A landing é importada de forma estática pelo `router.tsx` (precisa estar no primeiro HTML), então o CSS dela vai no bundle principal; o tamanho do CSS é medido antes e depois (T001, T017) e o aumento é só relatado, não é um limite (ver research R7)

**Constraints**: animação só com `transform`, `opacity` e `background-color` (nada que reflua); `prefers-reduced-motion: reduce` sem animação nem transição; 360 px sem rolagem horizontal; nenhum terceiro

**Scale/Scope**: 1 feature (`landing`) reescrita: `Hero`, `FeatureCards`, `MiniCrossword`, `SourcesSection`, `FinalBand`, `LandingContent` e um componente novo `LandingButton`; 0 rotas novas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. TypeScript estrito | OK: sem `any`; as listas de fontes e a contagem continuam derivadas de `puzzleSourceIdSchema`; as descrições seguem `Record<PuzzleSourceId, string>`. |
| II. Qualidade automatizada | OK: testes por componente, axe nos dois temas, teste do HTML gerado, e2e; lint, `check:deps`, typecheck e testes no pre-push. |
| III. Camadas no back | N/A (sem API). |
| IV. Adaptadores externos | N/A. |
| V. Lógica de jogo pura | OK: a mini cruzada usa `domain/game` sem mudá-lo; a derivação das palavras resolvidas usa `plainLetter`. |
| VI. Segurança e privacidade | OK: sem rede, sem armazenamento, sem terceiros (letras locais). |
| VII. Testes determinísticos | OK: sem internet nos testes. |
| VIII. Conteúdo de terceiros | OK: a landing segue só com texto próprio; a amostra é inventada e as descrições das fontes não mudam. Sem emenda. |
| IX. Migrações | N/A. |
| Fluxo: Context7 | OK: a pesquisa dependente de biblioteca (`light-dark()`, `animation-timeline`, container query units) é CSS de plataforma, não biblioteca; sem consulta necessária. |

Fronteiras de `check:deps`: `features/landing` continua importando só `shared` e `domain` e fora da ordem das features; `LandingButton` fica dentro da própria feature. Sem ciclo, sem import novo entre features.

**Resultado**: passa sem desvios. Recheck após a Fase 1: o design não acrescentou camada, dependência nem rota; passa.

## Project Structure

### Documentation (this feature)

```text
specs/050-landing-mockup/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-contract.md
├── checklists/
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/features/landing/
├── index.ts                                  # igual
├── components/
│   ├── LandingButton/                        # NOVO: landingButtonClass({ variant: 'primary' | 'quiet', size? })
│   ├── Hero/                                 # título em 10 casas numeradas, h1 com a frase, grade, letras soltas
│   ├── FeatureCards/                         # kicker + título + 3 cartões com ícone + pílulas (renomeia o conteúdo)
│   ├── MiniCrossword/                        # caixa com sombra, dicas em duas listas, contagem, vitória, Limpar
│   ├── SourcesSection/                       # kicker, título com contagem, linhas com realce, nota de atribuição
│   ├── FinalBand/                            # faixa escura de largura total
│   └── LandingContent/                       # tokens da landing, miolo por seção, faixa fora do miolo
└── helpers/
    ├── sample.ts                             # amostra do mockup (COSTA/MUNDO/OCASO × CAMPO/SONDA/ATOMO)
    ├── mini-state.ts                         # NOVO: estado inicial (3 letras) e palavras resolvidas, puros
    └── count-words.ts                        # igual (contagem por extenso)

apps/web/e2e/landing.spec.ts                  # textos novos; sem-saltos cobre o topo animado
apps/web/scripts/check-build-output.mjs       # confere os novos rótulos/títulos no HTML pré-gerado
CLAUDE.md                                     # nota da feature 050
```

`app/LandingShell.tsx`, `pages/landing/`, `prerender-plugin.ts`, rotas, `_headers`, `shared/components/Button` e `shared/themes/*` **não mudam**.

**Structure Decision**: tudo dentro de `features/landing` (organização da 037: uma pasta por componente com `.module.css` e teste). O estilo novo fica só em módulos CSS da landing, então não alcança outras páginas (FR-014).

## Complexity Tracking

Sem desvios da constituição. Escolhas que poderiam parecer desnecessárias e por que ficam:

| Escolha | Por que é necessária | Alternativa mais simples rejeitada porque |
|---|---|---|
| `LandingButton` próprio em vez de um `variant` novo no `Button` | O botão amarelo com sombra é só da landing (FR-005, FR-014) | Mudar `shared/components/Button` arrisca todas as outras páginas e as regras de botão do projeto |
| Três valores derivados dos tokens (`color-mix()` e `light-dark()`) | Evita repetir os seletores de tema (`data-theme` + `prefers-color-scheme`) e cores fixas | Duplicar os blocos de dark mode do site na landing |
