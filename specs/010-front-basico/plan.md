# Implementation Plan: Front básico do Cruzadinha

**Branch**: `feat/010-front-basico` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-front-basico/spec.md`

## Summary

Construir o `apps/web` como um app de página única (React 19, React Router em modo de dados, TanStack Query) que consome as rotas já prontas da API (features 004 a 009) sem alterar o servidor. Telas: login e cadastro, biblioteca em calendário mensal, jogo, janela de conclusão com modo leitura e janela de convite do Konami. A regra do tabuleiro (seleção, digitação, navegação, ajudas, conclusão) mora em `game-logic/` como reducer puro e testado, sem React. O progresso das letras e o tempo vão ao servidor com salvamento automático e fila de reenvio, e nada que aconteça depois do carregamento tira o tabuleiro da tela (rede, salvamento, sessão expirada, conclusão sem rede ou em outro aparelho viram avisos que não bloqueiam); o uso de ajuda e as marcas ficam só no aparelho. Visual com CSS e tokens de tema (claro e escuro), Roboto servida pelo próprio site, acessibilidade no nível "básico sólido" verificada por teste automatizado (contraste calculado dos tokens, axe nos componentes e no navegador). Sem migração, sem rota nova e sem schema novo em `shared` (só reuso dos existentes).

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24 (build e testes); navegador moderno (últimas duas versões de Chrome, Firefox, Safari e Edge)

**Primary Dependencies**: React 19.3, Vite 8, TanStack Query 5 (já em uso); novas: `react-router` 7 (modo de dados, `createBrowserRouter`), `@fontsource/roboto` e `@fontsource/roboto-mono` (fonte servida pelo site). Teste: `@testing-library/user-event`, `vitest-axe`, `@playwright/test`, `@axe-core/playwright`

**Storage**: nenhum no servidor além do que já existe (progresso). No aparelho: `localStorage` para tema, uso de ajuda e marcas, fila de reenvio do progresso e "dia sem puzzle" (`sessionStorage`)

**Testing**: Vitest 5 + Testing Library + jsdom (unitário e de componente, sem rede), `vitest-axe` para regras de acessibilidade, teste de contraste dos tokens; Playwright para dois caminhos ponta a ponta contra API e Postgres reais (`npm run test:e2e`, fora do pré-push)

**Target Platform**: site estático (build do Vite) servido por qualquer hospedagem estática, com `/api` no mesmo domínio; uso em computador e celular

**Project Type**: aplicação web (front) em monorepo npm workspaces

**Performance Goals**: letra digitada visível em até 100 ms em celular de gama média (SC-003); rolar a biblioteca e trocar de mês sem recarregar; bundle inicial pequeno com divisão por rota (jogo carregado sob demanda)

**Constraints**: nenhuma biblioteca de UI pronta; componentes sem cores nem medidas fixas, só tokens; nenhuma requisição a terceiros (fonte e imagens do próprio site); valores configuráveis por `VITE_*` entram no build (ver research R7); todo dado externo entra como `unknown` e passa por Zod; `any` proibido

**Scale/Scope**: 5 telas, 1 reducer de jogo, ~6 módulos de API do cliente; uso privado por convidados (dezenas de usuários)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. TypeScript estrito | Passa. Contratos de `packages/shared` reusados; respostas HTTP entram como `unknown` e passam por Zod no cliente; variáveis `VITE_*` validadas por Zod em `config.ts`; sem `any`. |
| II. Qualidade automatizada | Passa. `eslint-plugin-react-hooks` e `jsx-a11y` já previstos; Prettier e hooks inalterados; a CI ganha um job de ponta a ponta. |
| III. Camadas no back | Não afetado (nenhuma mudança na API). |
| IV. Adaptadores | Não afetado. O front só fala com a API. |
| V. Lógica de jogo pura e testada | Passa e é o centro do plano: `game-logic/` sem React, reducer testável, toda regra (seleção, direção, digitação, avanço, conclusão, ajudas) com teste unitário. Estado de servidor fora da partida vem do TanStack Query, sem biblioteca de estado global. |
| VI. Segurança e privacidade | Passa. A solução só chega a quem tem sessão (já garantido pela API) e nunca vai a log nem a mensagem de erro do cliente; mensagens de login e convite genéricas; nada sensível em `VITE_*` nem em `localStorage` (só preferências e contadores de ajuda); o `.env` real continua fora do git. |
| VII. Testes determinísticos | Passa. Suíte unitária sem rede nem navegador; Playwright cobre dois caminhos (fora do pré-push) com a cruzada de amostra do seed, sem a fonte real. |
| VIII. Conteúdo de terceiros | Passa e é requisito: a atribuição à fonte aparece em toda cruzada (FR-016); o site continua privado. |
| IX. Migração de schema | Não se aplica: nenhuma mudança de esquema. |

Resultado: sem violações; Complexity Tracking vazio. Reavaliado após o design: sem mudança.

## Riscos e decisões pendentes

1. **Contraste dos estados do tabuleiro (SC-007) — decidido.** A paleta dos mockups tem texto acessível (4,5:1 ou mais), mas os estados do tabuleiro ficam abaixo de 3:1 entre si (no claro, selecionada contra vazia 1,44, palavra ativa contra vazia 1,33 e selecionada contra palavra ativa 1,08; no escuro, palavra ativa contra vazia 1,44 e bloco contra vazia 1,36). O autor decidiu manter a paleta e a selecionada só com a cor de fundo, aceitando e documentando a exceção. Consequências: o teste de contraste dos tokens exige 4,5:1 para texto e para a letra de cada estado e 3:1 para controles, foco e marcas de ajuda, e só registra os pares de estado; o `axe` do navegador desliga a regra de contraste apenas nas células do tabuleiro. Spec (FR-026, FR-027, SC-007 e Assumptions) já reflete isso. Risco residual: quem tem baixa visão pode ter dificuldade de separar a selecionada da palavra ativa no tema claro; se isso aparecer em uso, a saída é escurecer o âmbar (por volta de `#cc7f00`) ou acrescentar borda na palavra ativa.
2. **Seleção em 30 px no celular.** Alvos abaixo de 44 px são uma exceção assumida (spec, Assumptions); mitigada por seleção via dicas, setas e barra da palavra ativa.
3. **Limites configuráveis só por build.** O Vite inlina `VITE_*`; mudar 4 letras e 2 palavras exige gerar o site de novo (pesquisa R7). Aceitável para uso privado.
4. **Convite sem o número da cota.** O mockup mostrava "2 de 3"; o plano mostra só "N convites ativos" para não duplicar uma constante da API (pesquisa R11).
5. **Ponta a ponta na CI.** Playwright exige Postgres e API no job; é o único job novo e o mais lento da CI.
6. **Janela de login no jogo.** Só aceita o e-mail da conta da partida; se o login devolver outro usuário, a sessão é encerrada e a pessoa vê "Entre com a conta desta partida" (pesquisa R17).
7. **Relógio do aparelho adiantado.** O servidor recusa `savedAt` mais de 5 minutos no futuro; o cliente corrige pelo cabeçalho `Date` (pesquisa R6).

## Project Structure

### Documentation (this feature)

```text
specs/010-front-basico/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-usage.md         # como o front usa cada rota e trata cada erro
│   └── ui-contracts.md      # rotas do site, chaves de armazenamento, tokens, acessibilidade
└── tasks.md                 # /speckit-tasks (não criado aqui)
```

### Source Code (repository root)

```text
apps/web/
├── index.html                       # lang pt-BR, script inline do tema (sem flash)
├── vite.config.ts                   # envDir na raiz; proxy /api também no preview
├── playwright.config.ts
├── e2e/
│   ├── support.ts                   # convite pela CLI, seed e limpeza do banco (só local)
│   ├── fluxo-principal.spec.ts      # cadastro, jogo, conclusão, modo leitura
│   └── ajudas-e-retomada.spec.ts    # ajudas, recarga, acessibilidade nos dois temas
└── src/
    ├── main.tsx                     # providers e roteador
    ├── config.ts                    # limites de ajuda validados com Zod
    ├── vite-env.d.ts
    ├── app/
    │   ├── router.tsx               # rotas, carregamento sob demanda do jogo
    │   ├── AppLayout.tsx            # cabeçalho, botão de tema, "Sair", escuta do Konami
    │   ├── session-expired.ts        # sessão expirada no jogo (store externo), sem redirecionar
    │   ├── session-handlers.ts       # trata o 401: redireciona ou marca a sessão como expirada
    │   ├── RequireSession.tsx       # guarda de login com retorno ao ponto de origem
    │   ├── NotFoundPage.tsx
    │   └── ErrorState.tsx           # carregando e erros compreensíveis (FR-031)
    ├── api/
    │   ├── client.ts                # fetch único: Zod, ApiError tipado, Retry-After
    │   ├── auth.ts  invites.ts  library.ts  puzzles.ts  progress.ts
    │   └── query-keys.ts
    ├── features/
    │   ├── auth/                    # LoginPage, RegisterPage, ReloginDialog, useSession
    │   ├── library/                 # LibraryPage, Calendar, DayCell, calendar.ts, DayRoute, source-down.ts
    │   ├── game/
    │   │   ├── GamePage.tsx  Board.tsx  Cell.tsx  ClueBar.tsx  ClueList.tsx
    │   │   ├── Toolbar.tsx  HelpButtons.tsx  Keyboard.tsx  WordBar.tsx  ClueSheet.tsx  SaveStatus.tsx
    │   │   ├── LegendButton.tsx  CompletionDialog.tsx  ReadModeBanner.tsx  PauseCover.tsx
    │   │   ├── useGame.ts           # liga reducer, relógio e salvamento
    │   │   ├── clock.ts             # tempo corrido com pausa e aba oculta
    │   │   ├── save-queue.ts        # debounce, reenvio e fila local
    │   │   └── help-storage.ts      # uso de ajuda e marcas no aparelho
    │   └── invites/                 # konami.ts, KonamiListener, InviteDialog
    ├── game-logic/                  # sem React
    │   ├── state.ts  reducer.ts  navigation.ts  letters.ts
    │   ├── help.ts                  # revelar letra, revelar palavra, verificar
    │   └── completion.ts
    ├── themes/
    │   ├── tokens.css  light.css  dark.css  fonts.css
    │   └── theme.ts                 # automático, claro, escuro; chave de armazenamento
    ├── components/                  # Button, Dialog, Notice, VisuallyHidden, Pill
    ├── lib/                         # dates.ts (Brasília), storage.ts (seguro), time.ts
    └── test/                        # setup, utilitários, contraste dos tokens
```

**Structure Decision**: tudo o que é novo mora em `apps/web`; `packages/shared` é só consumido (nenhum schema novo). `game-logic/` fica dentro do `apps/web` (decisão já registrada no `CLAUDE.md`), sem dependência de React. O CSS usa módulos CSS por componente lendo variáveis de `themes/`. A CI ganha o job `e2e`; nenhum outro workspace muda.

## Complexity Tracking

> Sem violações da constituição a justificar.
