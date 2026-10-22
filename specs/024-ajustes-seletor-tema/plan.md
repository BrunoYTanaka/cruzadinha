# Implementation Plan: Ajustes de layout e animação nas configurações e no botão de tema

**Branch**: `feat/024-ajustes-seletor-tema` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/024-ajustes-seletor-tema/spec.md` (issue #40)

## Summary

Cinco ajustes visuais só em `apps/web`, sem dado, API nem dependência nova:

1. **Balão (`Tooltip`)**: ao abrir, mede a própria caixa e desloca-se na horizontal o mínimo para ficar dentro da janela (margem de 8 px); com largura máxima da janela menos a margem, quebra o texto se preciso. Vale para todo botão com balão (engrenagem e botão de tema).
2. **Botão de tema**: os três rótulos são empilhados na mesma célula de uma grade; só o do estado atual fica visível, e a largura é a do mais largo (Automático), sem número fixo e sem depender da fonte ou do zoom.
3. **Linha das ajudas**: container query na modal; com espaço, "Sem limite" vai para a mesma linha, à direita (`margin-inline-start: auto`); sem espaço, desce para uma linha própria à esquerda. A modal de configurações passa de 420 px para 460 px de largura máxima, porque hoje o conteúdo (372 px) não comporta nome + passos + valor + "Sem limite" numa linha (≈ 378 px).
4. **Seletor da cruzada padrão**: um destaque deslizante (`thumb`) substitui o fundo por botão; ele se move com `translate` e `transition` de 200 ms, com `prefers-reduced-motion` sem transição. Colunas iguais (`grid-auto-columns: 1fr`) e quebra de linha nos nomes mantêm os botões alinhados.
5. **Alinhamento da modal**: interruptores e "Restaurar padrões" são medidos e corrigidos até terem a mesma borda direita/esquerda das demais linhas.

## Technical Context

**Language/Version**: TypeScript 6 estrito, React 19, CSS Modules (sem biblioteca de UI)

**Primary Dependencies**: nenhuma nova. Só recursos já usados no site: CSS container queries (`Calendar.module.css` já usa `container-type`), `translate`, `@media (prefers-reduced-motion)`, `useLayoutEffect`

**Storage**: N/A (a cruzada padrão e as ajudas continuam em `cruzadinha:settings` e em `user_settings`, sem mudança)

**Testing**: Vitest + Testing Library (unit, `jsdom`), `vitest-axe`, Playwright (Chromium) em `apps/web/e2e/` com os helpers `box`, `expectNear`, `css`, `probe` de `e2e/support.ts`

**Target Platform**: navegadores atuais, desktop e celular (a partir de 320 px), temas claro e escuro, cores forçadas

**Project Type**: web (apenas `apps/web`)

**Performance Goals**: transição do destaque entre 100 e 300 ms; nenhuma medição de layout fora da abertura do balão

**Constraints**: sem salto de layout (SC-002, SC-003); sem rolagem lateral em 320 px; cores só por tokens; nenhum teste da feature 023 (`botoes`, `tokens-contrast`, `button-states`) deixa de passar

**Scale/Scope**: 4 componentes (`Tooltip`, `ThemeButton`, `SettingsDialog`, `Dialog` só pela prop opcional `size`) e 4 arquivos de CSS

## Constitution Check

*Gate antes da pesquisa e reavaliado depois do desenho.*

| Princípio | Resultado |
|---|---|
| I. TypeScript estrito | Passa. Sem `any`; as novas props são tipadas. |
| II. Qualidade automatizada | Passa. Prettier, ESLint (`jsx-a11y`), typecheck e testes unitários seguem rodando. |
| III. Camadas no back | N/A (sem back). |
| IV. Adaptadores | N/A. |
| V. Lógica de jogo pura | N/A. A conta do deslocamento do balão é uma função pura (`clampShift`) com teste unitário. |
| VI. Segurança e privacidade | N/A. Sem dado, sem rota. |
| VII. Testes sem internet | Passa. Unit sem rede; Playwright mede layout. |
| VIII. Conteúdo de terceiros | N/A. |
| IX. Migração de schema | N/A (sem schema). |
| Restrições técnicas | Passa. Componentes leem tokens, sem cor fixa; funciona no celular e nos dois temas. |
| Context7 | Sem API de biblioteca nova: só CSS padrão e React já em uso. Nenhuma consulta necessária. |

Não há violações; a tabela de complexidade não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/024-ajustes-seletor-tema/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui.md
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code

```text
apps/web/
├── src/
│   ├── components/
│   │   ├── Tooltip.tsx             # mede e desloca o balão; max-width
│   │   ├── Tooltip.module.css      # --tip-shift em translate
│   │   ├── tooltip-position.ts     # clampShift (puro) + teste
│   │   ├── Tooltip.test.tsx
│   │   ├── Dialog.tsx              # prop opcional size ('default' | 'wide')
│   │   └── Dialog.module.css       # .wide { max-width: 460px }
│   ├── themes/
│   │   ├── ThemeButton.tsx         # três rótulos empilhados
│   │   ├── ThemeButton.module.css
│   │   └── ThemeButton.test.tsx
│   └── features/settings/
│       ├── SettingsDialog.tsx      # thumb do seletor, ordem de "Sem limite"
│       ├── SettingsDialog.module.css
│       └── SettingsDialog.test.tsx
└── e2e/
    └── ajustes-configuracoes.spec.ts   # novo: medidas em 320 a 1920 px, dois temas
```

**Structure Decision**: tudo em `apps/web`. O `Dialog` ganha só a prop opcional `size` (`'default'` | `'wide'`); `.wide { max-width: 460px }` fica no `Dialog.module.css`, depois de `.panel`, para a ordem da cascata ser garantida, e a modal de configurações passa `size="wide"`. As outras modais ficam como estão (420 px).

## Ordem de implementação

1. **Reproduzir e medir** (antes de mexer): abrir a modal em 320, 360, 420, 861 e 1280 px nos dois temas e anotar, com `box`, o que as setas da imagem 1 da issue apontam (borda direita dos interruptores, recuo de "Restaurar padrões", seletor). Esse passo fecha a dúvida deixada na spec e registra, por item, o que está desalinhado.
2. **Balão** (US1): `clampShift` + teste, depois o `Tooltip` e o e2e da engrenagem em 320 a 1920 px.
3. **Botão de tema** (US2): rótulos empilhados e e2e de medida nos três estados.
4. **Linha das ajudas** (US4): largura da modal, container query, e2e da posição de "Sem limite".
5. **Alinhamento da modal** (US3): correções medidas no passo 1.
6. **Seletor animado** (US5): `thumb`, movimento reduzido, cliques rápidos.
7. Documentar no `CLAUDE.md` (resumo da feature 024).

## Riscos

- **Dúvida sobre as setas da issue**: tratada no passo 1; se apontarem outra coisa, só a história 3 muda.
- **Rótulos duplicados no DOM**: o botão de tema passa a ter três textos; os dois inativos ficam `aria-hidden` e `visibility: hidden`, e o nome acessível vem do `aria-label`, que não muda. Testes que buscam o texto visível precisam de `getByRole`.
- **Balão com `translate` calculado**: medir só ao abrir (e no `resize` com ele aberto) evita laço de layout; a medição acontece em `useLayoutEffect`, antes da pintura, sem piscar.
- **Cores forçadas**: o `thumb` ganha `border: 1px solid transparent` (como os botões da feature 023) para a fonte marcada continuar distinguível.
- **Largura de 460 px**: precisa caber com a barra de rolagem e em janelas de 360 px; a modal já tem `width: 100%` e `max-width`, então só o teto muda.
- **Cliques rápidos no seletor**: o destaque é função do valor salvo (um índice), não de um estado de animação, então termina sempre na última fonte.
