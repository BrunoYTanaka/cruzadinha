# Implementation Plan: Botões que parecem botões, distintos dos links

**Branch**: `feat/023-design-botoes` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/023-design-botoes/spec.md`

## Summary

A feature dá aos controles do site uma linguagem visual única, só em `apps/web` e só em CSS e classes. Comportamento, props de dados, API e armazenamento não mudam.

- **Quatro tipos de botão** (R6): principal, secundário, discreto e ícone. O `Button` troca `default | ghost` por `secondary | quiet | icon`, ganha `size: 'small'` e exporta `buttonClass()` para links e botões nativos com classe própria.
- **Estados** (R3, R4): mouse por cima e pressionado por sobreposições translúcidas (`--hover-overlay`, `--press-overlay`) sobre o fundo de cada controle, servindo para qualquer fundo. O mouse por cima só vale com `(hover: hover)`, e o desativado (`:disabled` ou `aria-disabled`) fica de fora.
- **Contraste** (R5): tokens novos `--control` e `--control-line`; o limite dos botões de texto fica ≥ 3:1 nos dois temas.
- **Organização do CSS** (R2): `@layer reset, components`, para a classe local de um componente vencer a compartilhada sem depender da ordem dos chunks.
- **Cores forçadas** (R7): borda de 1 px em todo botão (transparente nos de ícone).
- **Links** (R1): continuam sublinhados e ganham estados. Botões perdem a cor de link ("Tamanho padrão"). O "Entrar" do cabeçalho do visitante vira link com aparência de botão discreto.
- **Controles com estado próprio** (abas, segmentos, chave, linhas de dica, teclas, dias, cartões): mantêm o visual e só ganham os estados que faltam.

## Technical Context

**Language/Version**: TypeScript 6 (strict), CSS Modules; Node.js 24

**Primary Dependencies**: React 19, Vite 8 (Lightning CSS na minificação, sem mudança); nenhuma dependência nova

**Storage**: N/A (ver [data-model.md](data-model.md))

**Testing**:

- **Vitest (jsdom)**:
  - `themes/contrast.test.ts` (tokens e misturas);
  - `components/button-states.test.ts` (lê os CSS: estados, exclusão do desativado, sem cor fixa, duração);
  - `components/Button.test.tsx`;
  - `touch-targets.test.tsx` atualizado.
- **Playwright (Chromium) `e2e/botoes.spec.ts`**:
  - estados, caixas, foco, toque (`hasTouch`), cores forçadas (`emulateMedia({ forcedColors: 'active' })`), links × botões e axe;
  - nos dois temas, contra o build de produção (`vite preview`).

**Target Platform**: navegadores modernos (alvo padrão do Vite 8; `@layer` desde Chrome 99, Safari 15.4, Firefox 97), computador e celular

**Project Type**: web app (monorepo; só `apps/web` muda)

**Performance Goals**: resposta visual ≤ 150 ms (transição de 120 ms); zero salto de layout (±1 px)

**Constraints**:

- Componentes leem só tokens; dois temas; área de toque de 44 px.
- Contorno de foco atual intacto.
- Sem layout shift (feature 017).
- Sem biblioteca de UI.

**Scale/Scope**: cerca de 25 arquivos CSS/TSX em `apps/web/src` (inventário em R1), um spec e2e novo, `docs/design.md` e `CLAUDE.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
| --- | --- |
| I. TypeScript estrito | Passa: `ButtonVariant` e `ButtonSize` como uniões; os nomes antigos viram erro de tipo e guiam a troca; sem `any`. |
| II. Qualidade automatizada | Passa: unitários e e2e novos rodam na CI como hoje; lint e Prettier sem mudança. |
| III. Camadas no back | N/A: a API não muda. |
| IV. Adaptadores | N/A. |
| V. Lógica de jogo pura | Passa: `game-logic` não muda; só apresentação. |
| VI. Segurança e privacidade | Passa: nada é enviado nem guardado. |
| VII. Testes determinísticos | Passa: unitários leem arquivos do repositório; e2e contra API e banco locais com o seed. |
| VIII. Conteúdo de terceiros | Passa: a atribuição não muda. |
| IX. Migrações | N/A. |
| Restrições técnicas | Passa: CSS com variáveis, cores só em tokens (`light.css`, `dark.css`), funciona nos dois temas e no celular. |
| Context7 | Feito: `page.emulateMedia` com `forcedColors`, `hasTouch` e as consultas `hover`/`any-hover` no Chromium headless, `locator.evaluate` + `getComputedStyle` (`/microsoft/playwright`); Lightning CSS como minificador padrão e `build.cssTarget` (`/vitejs/vite/v8.0.10`). `@layer`, `(hover: hover)` e `forced-colors` são CSS padrão, fora do escopo do Context7. |

**Pós-design**: nenhuma dependência, dado ou camada nova. Os tokens novos seguem a regra de "componentes só leem tokens". Continua passando.

## Project Structure

### Documentation (this feature)

```text
specs/023-design-botoes/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # R1–R9 (inventário, camadas, sobreposição, hover, tokens, tipos, cores forçadas, testes, docs)
├── data-model.md        # tokens, tipos, estados, controles com estado próprio, links
├── quickstart.md
├── contracts/ui.md      # Button/buttonClass, garantias e testes
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/themes/
│   ├── tokens.css            # comentário com os tokens novos
│   ├── light.css, dark.css   # --control, --control-line, --hover-overlay, --press-overlay
│   ├── global.css            # @layer reset, components; resets de elemento em @layer reset; links com estados
│   ├── ThemeButton.tsx/.module.css # buttonClass() + forma de pílula
│   └── contrast.test.ts      # novo
├── src/test/contrast.ts      # novo: luminância, contraste, mistura de sobreposição
├── src/components/
│   ├── Button.tsx            # variantes novas, size, buttonClass()
│   ├── Button.module.css     # @layer components; tipos e estados
│   ├── Button.test.tsx       # novo
│   ├── button-states.test.ts # novo
│   ├── touch-targets.test.tsx# seletores atualizados
│   ├── Pill.tsx/.module.css  # buttonClass() + forma de pílula
│   ├── Dialog.tsx/.module.css# fechar = ícone
│   └── Notice.tsx            # ghost → quiet
├── src/app/
│   ├── AppLayout.tsx/.module.css   # "Entrar" quiet, "Sair" quiet, marca com estado
│   └── ErrorState.tsx              # (variante padrão: secondary)
├── src/features/settings/
│   ├── SettingsButton.tsx/.module.css  # ícone
│   └── SettingsDialog.tsx/.module.css  # Restaurar = quiet; − + secundário; segmento e chave com estados
├── src/features/game/
│   ├── Toolbar.tsx/.module.css         # iconButton = ícone (botões e link)
│   ├── ClueBar.tsx/.module.css         # setas = ícone
│   ├── BoardSizeReset.tsx/.module.css  # secundário pequeno, texto --ink
│   ├── LegendButton.tsx/.module.css    # buttonClass({ variant: 'primary' }) + círculo
│   ├── ClueList.module.css             # borda transparente, mouse por cima sem destaque
│   ├── Keyboard.module.css             # pressionado
│   ├── HelpButtons.module.css          # aria-disabled sem estados
│   └── CompletionDialog.tsx            # buttonClass no link; default → secondary
├── src/features/library/
│   ├── Calendar.tsx/.module.css        # ‹ › secundário (sem opacidade própria); dias-link com estados
│   ├── SourceTabs.module.css           # estados sobre a aba
│   └── TodayCards.module.css           # cartão com estado pressionado
└── e2e/
    └── botoes.spec.ts                  # novo
docs/design.md                          # seção "Botões e links"
CLAUDE.md                               # linha da feature 023
```

`packages/shared`, `apps/api` e `game-logic/` não mudam.

**Structure Decision**: só `apps/web`. A aparência compartilhada fica em `components/Button.module.css` (camada `components`). Cada componente só acrescenta medidas, e as cores ficam nos arquivos de tema.

## Ordem de implementação

A ordem detalhada, com os testes que falham primeiro em cada fase, está em [tasks.md](tasks.md) e prevalece sobre este resumo.

1. **Fundação**: testes de contraste e do `Button` primeiro (falham); tokens em `light.css`, `dark.css` e no comentário de `tokens.css`; camadas em `global.css` (resets para `@layer reset`); `Button.module.css` em `@layer components` com os quatro tipos, ainda sem os estados; `Button.tsx` com `buttonClass`, `size` e as variantes novas; troca de `default`/`ghost` em todos os usos (o typecheck aponta).
2. **US1, contorno visível**: pílulas de ajuda e botão de tema passam a secundário com forma própria; − e + com `buttonClass`.
3. **US2, estados**: estados de mouse e pressionado em `.button`; botões de ícone (engrenagem, fechar modal, barra do jogo, setas da dica) e legenda (principal redondo) com `buttonClass`.
4. **US3, links**: links com estados em `global.css`, "Tamanho padrão" secundário pequeno, "Entrar" do cabeçalho `quiet`, marca, cartões e dias, ‹ › sem opacidade própria.
5. **US4, controles com estado próprio**: abas, segmentos, chave, linhas de dica e teclas; cores forçadas e axe nas oito telas.
6. **Conferência**: `lint`, `typecheck`, `test`, `build`, e2e (`botoes`, `sem-saltos`, `configuracoes`, `fluxo-principal`, `visitante`) e o [quickstart.md](quickstart.md) manual nos dois temas e no Firefox.
7. **Documentação**: `docs/design.md` (seção "Botões e links") e a linha da feature 023 em `CLAUDE.md`.

## Riscos

- **Resets em `@layer reset`**: o `color: inherit` de `button` deixa de vencer classes; algum botão que dependia disso pode mudar de cor. O e2e de cada tela e a varredura de botões com `--accent` no texto (contrato §3) apontam o caso.
- **Borda transparente nas linhas de dica**: muda 1 px do conteúdo se o `padding` não for compensado. O e2e de `sem-saltos` (quebras e alturas) cobre isso.
- **Testes por leitura de CSS**: o `button-states.test.ts` lê texto e pode ficar frágil com a formatação. Ele segue o mesmo padrão simples de `touch-targets.test.tsx` (busca por seletor), e o Prettier fixa o formato.
- **Contraste do discreto**: tem só o contorno, então a diferença para o secundário é o preenchimento. Se a revisão visual achar pouco, há uma saída sem mudar tokens: um peso de fonte diferente.

- **Sombras com cor fixa já existentes** (`rgb(0 0 0 / …)` em `LegendButton`, `Dialog`, `Tooltip`, `ClueBar`): ficam como estão. A feature não cria nenhuma sombra nova, e trocá-las por um token `--shadow` fica para uma manutenção futura.

## Complexity Tracking

Sem violações da constituição.
