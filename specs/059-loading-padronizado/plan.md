# Implementation Plan: Carregamento padronizado e amigável

**Branch**: `feat/059-loading-padronizado` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/059-loading-padronizado/spec.md`

## Summary

Uma tela de espera única (`LoadingState`, com as casas de cruzada em onda, título amigável por tela e,
após 2 s, a mensagem da soneca, a barra e o contador no espaço já reservado) absorve o `ServerWake`.
`Button` ganha `pending` e um `SlowNotice` explica a demora nos formulários de conta. A landing ganha
`PlayLink`, que reage ao clique na hora e avisa após 2 s. Só o site muda: nenhuma rota, schema, API ou
contrato; `server-wake.ts`, o limite de 2 s e o tempo limite de 90 s ficam como estão.

## Technical Context

**Language/Version**: TypeScript 6 estrito, React 19, Vite 8, React Router (data router)

**Primary Dependencies**: nenhuma nova (CSS Modules, tokens do site, Fraunces já self-hosted)

**Storage**: N/A

**Testing**: Vitest + Testing Library + `vitest-axe`; Playwright em `e2e/sem-saltos.spec.ts`

**Target Platform**: navegador (desktop e celular), landing também pré-renderizada em SSR (`renderToString` + `StaticRouter`)

**Project Type**: web (`apps/web`)

**Performance Goals**: reação visível a um clique em menos de 0,2 s; animação só com `transform`/`opacity`

**Constraints**: nada desloca o layout quando o aviso entra (`sem-saltos`); `prefers-reduced-motion` sem animação; a landing não importa outras features; sem `useNavigation` na landing (o `StaticRouter` do prerender não é data router)

**Scale/Scope**: cinco telas de espera, quatro botões da landing, os formulários de `features/account`

## Constitution Check

Gate contra `.specify/memory/constitution.md` (6.0.0):

- I. TypeScript estrito: sem `any`; textos em `Record` tipado. **OK**
- II/VII. Testes automatizados, determinísticos e sem rede (timers falsos). **OK**
- III/IV/IX. Back, adaptadores e schema: não tocados. **OK**
- V. Lógica pura e testada: a lista de textos e a regra "aviso após N ms" são puras e testadas. **OK**
- VI. Segurança e privacidade: nada novo guardado, nenhum pedido novo. **OK**
- VIII. Conteúdo de terceiros: sem texto de fonte nas telas de espera. **OK**
- Fluxo: consultar a documentação atual via Context7 MCP antes de escrever código que dependa de biblioteca (React Router `Link` e `StaticRouter`, Vitest timers falsos, Testing Library, Playwright); tarefa T001 registra o resultado. **OK**
- Fronteiras do `check:deps`: `shared` não importa `features/`; `features/landing` importa só `shared`. **OK**
- Compatível com a versão anterior da API (web only). **OK**

Sem violações; Complexity Tracking vazio. Reavaliado após o desenho: sem mudança.

## Project Structure

### Documentation (this feature)

```text
specs/059-loading-padronizado/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ui-loading.md
└── tasks.md          # /speckit-tasks
```

### Source Code

```text
apps/web/src/
├── shared/
│   ├── components/
│   │   ├── ErrorState/ErrorState.tsx          # LoadingState sai daqui (ErrorState fica)
│   │   ├── LoadingState/                      # novo: LoadingState, CrosswordCells, textos por tela
│   │   ├── SlowNotice/                        # novo: a mensagem da soneca (espaço reservado)
│   │   └── Button/Button.tsx                  # prop `pending` (spinner, aria-busy, largura fixa)
│   └── hooks/useSlowAfter/                    # novo: `true` depois de N ms desde a montagem/ativação
├── features/
│   ├── status/components/ServerWake/          # removido (absorvido pelo LoadingState)
│   ├── account/components/*Form/              # botões com `pending` + SlowNotice
│   └── landing/components/PlayLink/           # novo: Link com estado local e aviso
├── app/router.tsx, app/RouteError.tsx         # ServerWake → LoadingState
└── pages/{landing,library,day,game,stats}/    # rótulos amigáveis
```

**Structure Decision**: cada unidade nova em sua pasta com `.module.css` e testes (regra da 037);
`LoadingState`, `SlowNotice` e `useSlowAfter` em `shared`, porque as usam `app`, `pages` e várias
features; `PlayLink` em `features/landing`, sem importar outra feature.

## Complexity Tracking

Sem violações a justificar.
