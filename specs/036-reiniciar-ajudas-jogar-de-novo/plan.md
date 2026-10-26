# Implementation Plan: Ajudas zeradas ao jogar de novo

**Branch**: `fix/reset-helps-on-play-again` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/036-reiniciar-ajudas-jogar-de-novo/spec.md`

## Summary

Issue #86 diz que "Jogar de novo" limpa o tabuleiro mas mantém as ajudas gastas. A leitura do código mostra que os dois caminhos de reinício já zeram as ajudas (reducer `reset`, `clearHelp` da conta, `decideGuestReset` com `help: null`), e testes novos de componente (visitante e conta, na mesma sessão e depois de reabrir a cruzada) **passam**: o defeito não reproduz em jsdom. O plano, então, é: (1) reproduzir no navegador real, que é o que o jsdom não cobre (cronômetro real, IndexedDB real, várias abas, build de produção); (2) corrigir na causa que aparecer; (3) deixar os testes de regressão cobrindo FR-001 a FR-006. Sem mudança de API, banco ou formato dos ajustes.

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24

**Primary Dependencies**: React 19, TanStack Query, `idb` (visitante), Zod

**Storage**: `localStorage` por conta e cruzada (`cruzadinha:help:<userId>:<puzzleId>`) e IndexedDB `cruzadinha-visitante` (campo `help` do registro). Sem mudança de esquema.

**Testing**: Vitest + Testing Library (`apps/web/src/features/game/`), Playwright em `apps/web/e2e/`

**Target Platform**: navegadores (site em Cloudflare Pages)

**Project Type**: web application (monorepo; só `apps/web`)

**Performance Goals**: N/A

**Constraints**: continuar compatível com a API atual (nada muda no servidor); testes sem rede nem relógio real, exceto o e2e

**Scale/Scope**: uma tela (`GamePage`/`useGame`)

## Constitution Check

*GATE: passa antes da pesquisa e depois do desenho.*

- I. TypeScript estrito: sem `any`; sem mudança de tipos esperada. OK.
- II. Qualidade automatizada: formatação, lint, typecheck e testes rodam no pre-push e no CI. OK.
- III e IV. Camadas e adaptadores: nada no back-end. OK.
- V. Lógica de jogo pura e testada: se a causa estiver em regra de jogo, a correção fica em `game-logic/` com teste puro. OK.
- VI. Segurança e privacidade: as ajudas guardam só contadores, marcas e células travadas, nunca a solução; isso não muda. OK.
- Fluxo de Desenvolvimento, Context7: Playwright e Vitest são consultados via Context7 MCP antes de escrever o novo spec e os testes (tarefa T003). OK.
- Fluxo de Desenvolvimento, correção: o ciclo completo foi pedido pela pessoa; a regra de começar por teste que falha vale quando o defeito reproduz (T004 a T008); se não reproduzir, os testes ficam como proteção e a questão volta à pessoa que relatou. OK.
- VII. Testes determinísticos: os testes de componente usam relógio falso e `fake-indexeddb`; o e2e usa o ambiente local de sempre. OK.
- IX. Migração de schema: não há alteração de tabela, então DDE/ERD não mudam. OK.

Sem violações; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/036-reiniciar-ajudas-jogar-de-novo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks (não criado aqui)
```

`contracts/` não existe: nenhuma interface externa muda.

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── features/game/
│   │   ├── useGame.ts              # playAgain, efeitos de ajuda e de salvamento
│   │   ├── help-storage.ts         # ajudas da conta no aparelho
│   │   ├── GamePage.tsx            # onPlayAgain, ReadModeBanner
│   │   └── PlayAgainHelps.test.tsx # testes de regressão (novos, hoje verdes)
│   ├── features/guest/guest-store.ts
│   └── game-logic/{reducer.ts,guest-progress.ts}
└── e2e/                            # novo spec de "Jogar de novo" com ajudas, navegador real
```

**Structure Decision**: só `apps/web`; nenhum arquivo novo fora de testes, a menos que a reprodução aponte outra causa.

## Fluxo da correção

1. **Reproduzir** (T1): spec Playwright que usa ajudas, conclui, joga de novo e confere os contadores, como visitante e com conta, antes e depois de recarregar. Se falhar, esse é o teste de regressão que falha.
2. **Se não reproduzir** no Chromium: tentar as variantes de `research.md` (duas abas, ajuda esgotada, limite alterado, "sem limite"). Se ainda assim nada falhar, parar e pedir à pessoa que relatou a versão do site (`/version.json`), o tipo de jogador e os passos exatos, antes de mudar código.
3. **Corrigir** só na causa encontrada, com o teste vermelho commitado junto da correção (regra de bug do projeto).
   Sem reprodução, não há correção: ficam os testes de proteção, o registro em `research.md` e a consulta à pessoa que relatou (comentar ou fechar a issue só com a confirmação da pessoa responsável pelo repositório).
4. **Manter** os testes de componente de `PlayAgainHelps.test.tsx` como proteção de FR-001 a FR-006.
