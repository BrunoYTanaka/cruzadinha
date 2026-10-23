# Implementation Plan: Calendário volta na fonte do jogo

**Branch**: `fix/031-calendario-fonte-ao-voltar` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/031-calendario-fonte-ao-voltar/spec.md`

## Summary

Ao voltar de um jogo, o calendário abre na aba da fonte desse jogo; ao abrir o site, na cruzada padrão. A abordagem é uma memória só da visita (variável de módulo em `features/library/source-choice.ts`): o jogo anota a fonte da cruzada carregada, o calendário a usa como aba inicial ao montar e a apaga logo depois. Nada na URL, no aparelho ou na conta. Só `apps/web` muda.

## Technical Context

**Language/Version**: TypeScript 6 strict, React 19, React Router 7 (data mode), Node 24

**Primary Dependencies**: as existentes; nenhuma nova

**Storage**: N/A (memória do módulo, perdida ao recarregar; `localStorage`, IndexedDB e conta não mudam)

**Testing**: Vitest + Testing Library (`source-choice.test.ts`, teste de `LibraryPage`/`GamePage`) e Playwright (`e2e/fontes.spec.ts`)

**Target Platform**: navegador, desktop e telefone

**Project Type**: web (front end)

**Performance Goals**: N/A

**Constraints**: sem mudar endereços (FR-007), compatível com a API atual, o botão "Voltar" do navegador deve funcionar

**Scale/Scope**: 1 módulo de estado, 2 pontos de ligação (`GamePage`, `LibraryPage`)

## Constitution Check

*GATE: passa antes da pesquisa e continua passando depois do desenho.*

- I (TS estrito): sem `any`; a fonte é validada com `puzzleSourceIdSchema`. Passa.
- II (qualidade automatizada): lint, format, typecheck e testes rodam como sempre. Passa.
- III/IV (camadas back, adaptadores): sem mudança no back. N/A.
- V (lógica pura e testada): a regra (fonte inicial = fonte lembrada ou padrão) fica em funções puras testadas em `source-choice.test.ts`. Passa.
- VI (segurança e privacidade): nenhum dado novo guardado nem enviado. Passa.
- VII (testes determinísticos): testes sem rede; e2e com a API local. Passa.
- IX (schema): sem migração. N/A.
- Fluxo: a correção muda uma regra documentada (021), então tem spec antes (feita) e começa por teste de regressão que falha. Context7: não é preciso, pois só se usam `useState`/`useEffect` e `Link` já em uso, sem API nova de biblioteca.

## Project Structure

### Documentation (this feature)

```text
specs/031-calendario-fonte-ao-voltar/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md   # /speckit-tasks
```

Sem `contracts/`: nenhuma interface externa muda (API, endereços e configurações ficam como estão).

### Source Code (repository root)

```text
apps/web/
├── src/features/library/
│   ├── source-choice.ts        # + rememberGameSource, initialSource (puras sobre o módulo), useSourceChoice
│   ├── source-choice.test.ts
│   └── LibraryPage.tsx         # apaga a memória da visita ao montar (efeito); nenhuma mudança visível
├── src/features/game/GamePage.tsx   # anota a fonte da cruzada carregada
└── e2e/fontes.spec.ts          # volta de um jogo de outra fonte, link e botão Voltar, recarga
```

**Structure Decision**: tudo em `apps/web`, no módulo que já guarda a escolha da fonte; nenhum arquivo novo de código.

## Complexity Tracking

Sem violações.
