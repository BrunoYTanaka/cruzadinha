# Implementation Plan: Interruptor e botão "Restaurar padrões" corretos nas configurações

**Branch**: `fix/025-interruptor-restaurar-config` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-interruptor-restaurar-config/spec.md`

## Summary

Dois defeitos de CSS no diálogo de configurações, só em `apps/web`:

1. `.switch` (`SettingsDialog.module.css`) define `height: 30px`, mas a regra global `button { min-height: var(--tap) }` (44 px) vence e o botão cresce. Correção: zerar `min-height` no `.switch` (a regra global está em `@layer reset`; a classe do módulo, fora de camada, vence) e devolver os 44 px de toque com um `::before` transparente, `position: absolute` e `inset: -7px 0`, que não entra na caixa medida nem no desenho.
2. `.restore` aplica `margin-inline-start: -19px` (feature 024), pensado para o texto ficar na margem, mas o tipo `quiet` tem contorno visível, então a caixa sai da margem. Correção: remover a margem negativa; a caixa visível passa a ficar na margem do conteúdo.

A prova vem antes: os testes e2e de regressão (trilho de 30 px, bolinha centralizada, faixa de toque de 44 px, caixa do botão dentro da margem) são escritos primeiro e falham no código atual.

## Technical Context

**Language/Version**: TypeScript 6 strict, CSS Modules (Node.js 24)

**Primary Dependencies**: React 19, Vite 8; Playwright (Chromium) e `@axe-core/playwright` nos testes, Vitest 5 nos unitários

**Storage**: N/A (nenhum dado muda)

**Testing**: e2e em `apps/web/e2e/ajustes-configuracoes.spec.ts` (helpers `box`, `expectNear`, `css` de `e2e/support.ts`); unitário de CSS em `apps/web/src/features/settings/` no estilo de `components/button-states.test.ts` (lê o CSS)

**Target Platform**: navegadores modernos, desktop e celular (320 px a 1920 px), temas claro e escuro, cores forçadas, movimento reduzido

**Project Type**: web (monorepo; só `apps/web`)

**Performance Goals**: N/A

**Constraints**: manter a regra global de 44 px para os demais botões; sem cores fixas (tokens); sem rolagem lateral; compatível com a versão anterior da API (não toca na API)

**Scale/Scope**: 2 regras de CSS em um arquivo, mais testes e a anotação de documentação

Sem `NEEDS CLARIFICATION`.

## Constitution Check

*Avaliação antes da Fase 0 e repetida após a Fase 1.*

| Princípio / regra | Situação |
|---|---|
| I. TypeScript estrito | Sem código novo além de testes; nenhum `any`. OK |
| II. Qualidade automatizada | Prettier, ESLint, typecheck, testes e CI rodam como hoje. OK |
| III, IV, IX. Back, adaptadores, migração | Não tocados. N/A |
| V. Lógica de jogo pura | Não tocada. N/A |
| VI. Segurança e privacidade | Sem dados nem rede. N/A |
| VII. Testes determinísticos | Regressão em Playwright (já previsto para o fluxo principal) e teste de CSS em Vitest, sem internet. OK |
| VIII. Conteúdo de terceiros | N/A |
| Restrições técnicas | Componentes leem tokens (`--tap`, `--line`, `--accent`); nenhuma cor fixa nova. Contraste e cores forçadas preservados (borda transparente do trilho mantida). OK |
| Fluxo: correção que altera regra documentada | A spec 025 já foi criada antes; a regra da spec 024 (texto na margem) é anotada como substituída. OK |
| Fluxo: teste de regressão primeiro, no mesmo commit | Tarefa de testes antes da correção; mesmo PR. OK |
| Fluxo: Context7 para bibliotecas | A mudança usa só CSS padrão e APIs do Playwright já usadas no repositório (`boundingBox`, `evaluate`, `mouse`); nenhuma API nova de biblioteca, então não houve consulta. Se uma API de Playwright nova entrar, consultar antes. OK |

Resultado: sem violações; a tabela de Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/025-interruptor-restaurar-config/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md              # /speckit-tasks (não criado aqui)
```

`contracts/` não existe: não há interface externa nova (nenhuma rota, esquema ou contrato de componente muda).

### Source Code (repository root)

```text
apps/web/
├── src/features/settings/
│   ├── SettingsDialog.module.css   # .switch (min-height, ::before), .restore (sem margem negativa)
│   └── settings-css.test.ts        # novo: lê o CSS e confere as duas regras (guarda barata)
└── e2e/
    └── ajustes-configuracoes.spec.ts   # regressão: trilho 30 px, bolinha, faixa de 44 px, caixa do botão

CLAUDE.md                            # linha da feature 024 (−19 px) atualizada; linha da feature 025
specs/024-ajustes-seletor-tema/spec.md   # nota "substituído pela 025" no cenário 2, FR-006a e SC-008
```

**Structure Decision**: mudança confinada a `apps/web/src/features/settings` e ao e2e existente; nenhum componente novo, nenhuma alteração em `Button`, `Dialog` ou `global.css`.

## Design

### Interruptor

- `.switch`: acrescentar `min-height: 0` (com comentário curto: a regra global de toque é devolvida pelo `::before`). `height: 30px`, `width: 52px`, borda transparente e `border-radius` ficam.
- `.switch::before`: `content: ''`, `position: absolute`, `inset: -8px -1px` (caixa de preenchimento de 28 px + 8 + 8 = 44 px de altura; −1 px dos lados cobre a borda, largura igual à do trilho). Como `.switch` já é `position: relative` e não tem `overflow: hidden`, a faixa recebe o toque e o clique como parte do botão, sem mudar a caixa medida.
- `.knob`: `top: 2px; left: 2px` já centraliza com trilho de 30 px (borda de 1 px + 2 px + 24 px + 2 px + 1 px = 30). Nada a mudar.
- A linha (`.row`, `align-items: center`) já é mais alta que 44 px por causa do texto/dica, então a faixa de toque não invade linhas vizinhas; confirmar na medição do e2e com rótulo quebrado (celular de 320 px).

### Restaurar padrões

- Remover a regra `.restore` inteira (e a classe em `SettingsDialog.tsx`, se ficar sem uso). A caixa do botão `quiet` começa na margem do conteúdo; o texto fica 19 px adiante, como em qualquer botão com contorno.
- Alternativas e justificativa em [research.md](./research.md).

### Testes (escritos antes e vistos falhar)

e2e, em `ajustes-configuracoes.spec.ts`, em blocos novos "F025-US1" (interruptor) e "F025-US2" (botão), mais a troca da checagem antiga no bloco da história 3 da feature 024, nos dois temas e em 320, 360, 1280 px:

1. Trilho: `box(switch)` com altura 30 e largura 52 (`expectNear`, margem de 1 px do helper; a spec pede 0,5 px, então para esta checagem usar comparação direta com `toBeCloseTo(30, 0)` ou tolerância própria).
2. Bolinha: centro vertical da bolinha igual ao do trilho, ligado e desligado, e mesma posição vertical nos dois estados.
3. Toque: `document.elementFromPoint` a ±21 px do centro vertical (dentro dos 44 px) retorna o interruptor ou um filho; a ±24 px (fora) não retorna. Mais um clique real com `page.mouse.click` a +20 px que alterna o estado. Em 320 px, o centro de cada outro controle do diálogo não é coberto por um interruptor.
4. "Restaurar padrões": `box(restore).x >= content.left` (menos 0,5 px), com `expectNear` contra a esquerda do conteúdo; altura ≥ 44.
5. Substituir a checagem antiga (texto do botão na margem, linhas 148 a 154) pela nova de caixa.
6. Sem rolagem lateral e axe sem violações já existem no bloco e continuam.

Unitário (Vitest, lê o CSS): `.switch` declara `min-height: 0` e tem `::before` com `inset` vertical negativo; `.restore` não existe ou não tem margem negativa. Guarda barata que roda no pré-push, já que o e2e não roda lá.

### Documentação

- `CLAUDE.md`: na linha da feature 024, trocar a frase do −19 px por "a caixa do botão ocupa a margem (feature 025)"; acrescentar a linha da feature 025.
- `specs/024-ajustes-seletor-tema/spec.md`: nota curta de que o cenário 2, FR-006a (parte do botão) e SC-008 (parte do texto) foram substituídos pela 025.
- `specs/024-.../research.md`: sem mudança.

### Versão

Commits `fix(web): ...` (patch no site). Nada em `apps/api` nem `packages/shared`, então a API não é versionada.

## Complexity Tracking

Sem violações a justificar.
