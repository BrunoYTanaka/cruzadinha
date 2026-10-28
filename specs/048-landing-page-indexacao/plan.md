# Implementation Plan: Landing page pública e indexação no Google

**Branch**: `feat/048-landing-page-indexacao` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/048-landing-page-indexacao/spec.md` (issue #122)

## Summary

O endereço raiz `/` passa a mostrar uma landing pública; o calendário vai para `/calendario`. O texto da landing chega no HTML entregue porque o build **pré-renderiza** a landing, com a casca do site (link de pular, cabeçalho com a marca e o link "Calendário", `<main>`), dentro do `index.html`: um plugin roda um build SSR no `buildStart` e injeta o HTML no `#root` por `transformIndexHtml`, antes de o plugin do PWA calcular o hash do arquivo. Um `<script>` curto logo depois do `#root` esvazia o `#root` quando o endereço não é `/` ou quando "Ir direto ao jogo" está ligado, então as outras telas não piscam a landing. O React monta com `createRoot` (sem hidratar). A landing não depende da API nem do carregador que espera o servidor acordar. A indexação sai de `/` por `! X-Robots-Tag` no `_headers` (o `/*` com `noindex` fica), o `robots.txt` deixa de bloquear o rastreio (o `noindex` só vale se o buscador puder ler a página) e um plugin de build gera `sitemap.xml` a partir de `SITE_URL`. A mini cruzada 5x5 usa o reducer de `domain/game` e uma grade própria. Só site; sem API, banco ou contrato. A emenda da constituição (FR-018) entra no mesmo PR, antes do código.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19.3, Vite 8.3

**Primary Dependencies**: já instaladas (React Router 7, `vite-plugin-pwa`, `vitest-axe`); nova: `@fontsource-variable/fraunces` (título; fonte servida pelo próprio site). `react-dom/server` já vem com `react-dom`.

**Storage**: N/A (a mini cruzada não grava nada; lê só `cruzadinha:settings` para "Ir direto ao jogo")

**Testing**: Vitest 5 + jsdom + Testing Library + `vitest-axe`; teste de build que lê `dist/index.html`; Playwright em `apps/web/e2e/`

**Target Platform**: navegadores modernos e buscadores; Cloudflare Pages

**Project Type**: web app (só `apps/web`, mais `.github/workflows/deploy.yml` e docs)

**Performance Goals**: LCP da landing igual ou melhor que o do calendário hoje (HTML já pintável, sem esperar JS nem API)

**Constraints**: sem salto de layout (animação só com `transform`/`opacity`; tamanho do título reservado); `prefers-reduced-motion` sem animação; 360 px sem rolagem horizontal; nada de terceiros (fontes locais)

**Scale/Scope**: 1 rota nova (`/`), 1 rota movida (`/calendario`), 1 redirecionamento (`/jogar`), 1 feature nova (`landing`), 1 plugin de build

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. TypeScript estrito | OK: `Record<PuzzleSourceId, string>` para as descrições faz o `typecheck` falhar sem descrição (FR-010); sem `any`; amostra validada por `puzzleSchema`. |
| II. Qualidade automatizada | OK: testes unitários, axe nos dois temas, teste do HTML gerado, e2e; lint, `check:deps` e typecheck no hook. |
| III. Camadas no back | N/A (sem API). |
| IV. Adaptadores externos | N/A. |
| V. Lógica de jogo pura | OK: a mini cruzada usa o reducer de `domain/game` sem mudá-lo. |
| VI. Segurança e privacidade | OK: a landing não usa rede nem grava dados; a mini cruzada não toca o progresso de visitante. |
| VII. Testes determinísticos | OK: sem internet; o teste do build usa o `dist` local. |
| VIII. Conteúdo de terceiros | **Emendado em 5.0.0** (T002): o princípio manda não indexar em nenhuma página. **Justificado**: emenda 5.0.0 (MAJOR, redefine a regra) permite indexar só a landing, que contém texto próprio e nenhum conteúdo de fonte (FR-011); o resto segue `noindex`. Vai no mesmo PR, em commit anterior ao que muda `_headers`. Ver Complexity Tracking. |
| IX. Migrações | N/A. |
| Fluxo: Context7 | OK: confirmado na Context7 (research R2, R3): `! Header` do `_headers` do Cloudflare Pages, `build.ssr` do Vite e `StaticRouter` do React Router 7. |

Fronteiras de `check:deps`: a nova feature `landing` importa só `shared` e `domain` (como `account` e `status`, que importam no máximo `session`); entra na regra dessas e fora da ordem `session < … < game`. `pages/landing` compõe `features/landing`. O plugin de build e o ponto de entrada SSR ficam fora de `src/` ou em arquivo próprio sem importar `pages/`. Sem ciclo.

**Resultado**: passa com um desvio justificado (VIII). Recheck após a Fase 1: o design não acrescentou camada nem dependência além da fonte; passa.

## Project Structure

### Documentation (this feature)

```text
specs/048-landing-page-indexacao/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── delivery.md
├── checklists/
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.specify/memory/constitution.md            # emenda 5.0.0 (VIII)

apps/web/
├── index.html                             # <title>, description, marcador do pré-render, script que esvazia o #root
├── prerender-plugin.ts                    # NOVO: build SSR no buildStart, injeta por transformIndexHtml, emite sitemap.xml e robots.txt
├── scripts/check-build-output.mjs         # NOVO: confere dist/ depois do build (roda na CI, fora do npm test)
├── vite.config.ts                         # registra o plugin
├── public/
│   ├── _headers                           # `/` sem noindex (`! X-Robots-Tag`), `/sitemap.xml` e `/robots.txt` idem
│   └── robots.txt                         # REMOVIDO (gerado pelo plugin); ver research R4
├── src/
│   ├── landing-entry.tsx                  # NOVO: `renderLanding()` (SSR), importado só pelo plugin
│   ├── app/LandingShell.tsx               # NOVO: casca estática (pular, cabeçalho, main) só para o pré-render
│   ├── app/router.tsx                     # `/` landing fora do grupo que espera a API; `/calendario`; `/jogar`
│   ├── app/AppLayout.tsx                  # link "Calendário" no cabeçalho
│   ├── pages/landing/LandingPage.tsx      # NOVO: composição + LandingFallback (tela de espera com `directToGame`)
│   ├── pages/library/direct-play.ts       # `stay` leva a /calendario com o aviso (módulo)
│   ├── pages/play-today/                  # NOVO: loader de `/jogar` → `/dia/<hoje>?fonte=<padrão>`
│   ├── features/landing/
│   │   ├── index.ts                       # LandingContent
│   │   ├── components/{Hero,FeatureCards,SourcesSection,MiniCrossword,FinalBand}/
│   │   ├── helpers/source-descriptions.ts # Record<PuzzleSourceId, string>
│   │   └── helpers/sample.ts              # amostra 5x5 (palavras e dicas inventadas)
│   └── shared/themes/fonts.css            # + Fraunces
└── e2e/landing.spec.ts                    # NOVO; os demais specs passam de goto('/') a goto('/calendario')

.github/workflows/deploy.yml               # "Verificar": noindex em /calendario, indexável em /
docs/deploy.md                             # SITE_URL no build, indexação
.dependency-cruiser.cjs                    # `landing` na regra de account/status
CLAUDE.md                                  # nota da feature 048
```

**Structure Decision**: só `apps/web` (mais configuração de entrega), seguindo a organização da feature 037: `pages/landing` compõe `features/landing`, cada componente na própria pasta com `.module.css` e teste.

## Complexity Tracking

| Desvio | Por que é necessário | Alternativa mais simples rejeitada porque |
|---|---|---|
| Emenda MAJOR do princípio VIII | A landing só serve se for indexada; o texto atual proíbe | Manter `noindex` em tudo anula a feature |
| Build SSR extra + plugin | O texto precisa estar no HTML entregue sem JS (FR-003) | Escrever o texto à mão em `index.html` duplica o JSX e perde a lista de fontes derivada de `puzzleSourceNames` |
