# Implementation Plan: Ajustes de layout e comportamento (landing, cabeçalho, balões, jogo)

**Branch**: `feat/063-landing-sem-atalhos` | **Date**: 2026-11-10 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md), contrato visual [design-system.html](../../docs/mockups/design-system.html) e [design.md](../../docs/design.md) (já atualizados)

## Summary

Oito ajustes só em `apps/web`: cabeçalho enxuto na landing, Estatísticas e x1 junto de Instalar e das configurações, balão só com foco de teclado, tela de espera do servidor na landing, "Entrar" na landing (já existe; só teste), jogo sem o aviso de progresso do visitante, títulos fixos das dicas com esmaecer e "Tamanho padrão" como ícone. Nenhuma mudança em `apps/api`, `packages/shared`, rotas ou dados. Pesquisa e decisões em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6 estrito, React 19, Vite 8, CSS Modules (Node 24)

**Primary Dependencies**: as atuais; nenhuma nova

**Storage**: N/A

**Testing**: Vitest + Testing Library + `vitest-axe`; Playwright (`e2e/landing.spec.ts`, `espera-servidor.spec.ts`, `sem-saltos.spec.ts`, `tamanhos.spec.ts`); `readCss` para CSS; `npm run check:build-output -w @cruzadinha/web` (HTML pré-gerado)

**Target Platform**: navegadores modernos, celular e computador, claro e escuro, PWA

**Project Type**: web (só `apps/web`)

**Performance Goals**: sem regressão; esmaecer e ícone sem reflow

**Constraints**: nada desloca ao digitar (`sem-saltos`); landing indexável com um `h1`; HTML pré-gerado com o mesmo começo de cabeçalho da landing montada; `check:deps` verde; `LoadingState` é a única tela de espera (059)

**Scale/Scope**: `AppLayout`, `HeaderStart`, `LandingShell`, `PlayLink`, `Tooltip`, `SaveStatus`/`GameScreen`, `ClueList`, `BoardSizeReset`

## Constitution Check

| Princípio | Resultado |
|---|---|
| I TypeScript estrito, sem `any` | Passa. |
| II Qualidade automatizada | Passa: `lint`, `check:deps`, `typecheck`, testes por história. |
| V Lógica pura e testada | Passa: a regra "só foco de teclado" e o destino do clique ficam em funções testadas. |
| VI Segurança e privacidade | Passa: sem dado, rede ou armazenamento novos. |
| VII Testes determinísticos | Passa: espera simulada com API lenta injetada, sem rede real. |
| Restrições técnicas | Passa: tokens existentes; sem biblioteca nova. |
| Fluxo | Passa: ciclo completo; `fix` do balão com teste de regressão antes. |

Reavaliado após o desenho: sem violação.

## Divergências entre o pedido e o código (achadas na leitura)

- **A landing já tem espera própria**: `PlayLink` mostra "Abrindo…" e, após 2 s, um balão com a explicação. O pedido é a tela de espera completa (`LoadingState`), então o balão da landing sai (D4, FR-013, confirmado). O aviso sob o botão dos formulários de conta fica (FR-010).
- `AppLayout` é o cabeçalho da landing também. A ordem do DOM já é marca, Calendário, `.spacer`, Estatísticas, x1, Menu, `.tail`; quem põe Estatísticas e x1 junto da marca é o `order` do CSS (`.spacer` 1, `.tail` 2, links 0). Hoje o foco já diverge da tela.
- O "Entrar" já existe no `AppLayout` e `safeNext` já manda ao calendário; falta teste que garanta a partir da landing.
- A correção do balão (`isKeyboardFocus` em `Tooltip.tsx`) já está na árvore, sem teste.
- `SaveStatus` do visitante recebe `guest` de `GameScreen`; a prop deixa de ter uso.

## Fatias

1. **Balão (história 3, `fix`)**: teste de regressão primeiro (clique não abre; Tab abre; foco devolvido por diálogo não abre; toque não abre), depois `Tooltip.tsx` (já escrito). Sem `:focus-visible` (jsdom) cai no comportamento antigo; o teste mocka `matches`.
2. **Cabeçalho (histórias 1, 2, 5)**: `HeaderStart` ganha `landing` (só marca, sem Calendário). `AppLayout` calcula `isLanding = pathname === '/'` e nela omite Estatísticas, x1, `Menu`, `SettingsButton` e o contador; mantém `InstallButton`, "Entrar"/círculo. Fora da landing, só CSS: `.statsLink`, `.duelLink` e `.menu` ganham o `order` de `.tail` (D2), sem mexer no DOM de `HeaderStart`. `LandingShell` usa `HeaderStart landing`. `SettingsDialog` só monta fora da landing. Testes em `AppLayout.test.tsx`, `LandingShell.test.tsx`, e2e `landing.spec.ts` (largura 390 e desktop; "Entrar" → login → `/calendario`).
3. **Espera na landing (história 4)**: `PlayLink` troca "Abrindo…" + balão por: servidor pronto (`isServerReady()`) navega na hora; senão mostra `LoadingState level={1}` no lugar do conteúdo e navega com `whenServerReady` quando acorda. `ServerWakeTimeoutError` leva à mensagem de erro de conexão existente (`RouteError`). Voltar do navegador durante a espera cancela. "Entrar" do cabeçalho vai por `/login`, cuja rota já espera o servidor (`serverReadyLoader`), então só se confere por teste. Remover `PlayLink.module.css` `.notice` e o texto `pendingLabel` se sobrarem sem uso.
4. **Jogo sem aviso (história 6)**: remover `GUEST_TEXT`, `GUEST_ANNOUNCEMENT`, o link "Entrar para salvar na sua conta" e a prop `guest` de `SaveStatus`; `GameScreen` deixa de passá-la. Indicador de quem tem conta intacto. `sem-saltos.spec.ts` confere que a faixa não pula.
5. **Títulos das dicas (história 7)**: em `ClueList.module.css`, `.heading` ganha `::after` com gradiente de `var(--bg)` a transparente (~12 px, `top: 100%`, `pointer-events: none`), `z-index` acima da lista; mesma regra na `ClueSheet`. Teste de CSS (`readCss`) e e2e rolando a lista.
6. **Tamanho padrão como ícone (história 8)**: `BoardSizeReset` vira `Button variant="icon" size="small"` com `aria-label="Tamanho padrão"` e `Tooltip`; ícone de quatro cantos (mesmo SVG do mockup). Ajustar `GamePage.test.tsx` (nome acessível não muda) e `button-states.test.ts`.
7. **Fechamento**: `npm run lint`, `typecheck`, `test`, `build`, `check:build-output`; e2e de landing, espera, sem-saltos e tamanhos. `CLAUDE.md`: atualizar a linha do cabeçalho/landing (048/062) se algo ali ficar falso.

Commits: `fix(web): ...` para o balão (patch; fica na branch da feature por ser parte deste pacote de ajustes, não num `fix/<slug>` separado); `feat(web): ...` para o restante (minor da parte web). Sem mexer em versões nem `CHANGELOG.md`.
