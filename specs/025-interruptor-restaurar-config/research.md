# Research: Interruptor e botão "Restaurar padrões"

## 1. Por que o interruptor tem 44 px

- **Decision**: a causa é a precedência de `min-height`, não o `height`. `global.css` tem `button { min-height: var(--tap) }` dentro de `@layer reset`; `.switch` define `height: 30px` mas não `min-height`, então o mínimo de 44 px vence e o botão cresce. A bolinha tem `top: 2px`, por isso fica no alto do botão de 44 px.
- **Rationale**: confirmado pela leitura do CSS (a regra e o valor de `--tap: 44px` em `themes/tokens.css`). Um CSS em camada perde para um CSS fora de camada, então `min-height: 0` na classe do módulo basta, sem `!important` e sem mexer na regra global (que os outros botões precisam).
- **Alternatives considered**: (a) tirar `min-height` da regra global: afeta todos os botões e viola a regra de toque. (b) Trocar a altura do interruptor para 44 px e redesenhar: contradiz a spec (30 px). (c) `<button>` externo de 44 px com um `<span>` de 30 px dentro: mais DOM, muda o foco/anel e a medição do botão.

## 2. Como manter a área de toque de 44 px

- **Decision**: `::before` transparente, `position: absolute`, `inset: -8px -1px`, no próprio `.switch`. O `inset` conta a partir da caixa de preenchimento (28 px, dentro da borda de 1 px), então 28 + 8 + 8 = 44 px; a primeira versão, `-7px 0`, dava só 42 px e o e2e (±21 px) a reprovou.
- **Rationale**: um pseudo-elemento absoluto não participa do layout nem da caixa medida pelo Playwright (`boundingBox` do botão fica 30 px), mas recebe cliques e toques como parte do botão. É o que a issue sugere. O trilho já é `position: relative` e não corta o conteúdo.
- **Alternatives considered**: `padding` vertical (deforma o trilho); `outline`/`box-shadow` ampliado (não recebe toque); aumentar a linha inteira como alvo (`label` clicável; muda semântica e o rótulo hoje é `aria-label`).
- **Risco**: a faixa de 7 px acima e abaixo do trilho poderia sobrepor um alvo vizinho. Na modal, cada interruptor está numa linha com texto de duas linhas e `gap` de 14 px, e os alvos vizinhos já têm 44 px; a medição no e2e (celular de 320 px) confirma que a faixa não passa para o item seguinte. Se passasse, reduzir o `inset` mantendo ≥ 44 px só onde houver espaço.

## 3. Por que "Restaurar padrões" sai da margem

- **Decision**: remover a margem negativa. A premissa da feature 024 (botão sem contorno: só o texto tocaria a margem) não vale mais desde a feature 023, quando o tipo `quiet` ganhou `border-color: var(--control-line)`. Com −19 px (18 de padding + 1 de borda), o texto fica na margem e a caixa visível, 19 px para fora.
- **Rationale**: a spec 025 troca a regra (caixa visível na margem). Sem margem negativa a caixa começa na margem do conteúdo por construção, em qualquer largura. A causa na issue era "provável"; a leitura do CSS (`.restore` e `.quiet`) a confirma, e o e2e mede a caixa no navegador, que é a confirmação final.
- **Alternatives considered**: (a) trocar para o tipo `icon`/sem contorno: muda o visual definido na feature 023. (b) Manter a margem e adicionar `padding` ao rodapé: equivale a remover a margem, com mais código. (c) Alinhar o texto e esconder o contorno só nesse botão: contradiz o pedido da issue e a regra 023 de que todo botão mostra a borda.

## 4. Como provar sem depender de impressão visual

- **Decision**: e2e de Chromium com medições (altura/largura do trilho, centro da bolinha, `elementFromPoint` a ±21 e ±24 px, esquerda da caixa do botão) e um teste de CSS em Vitest como guarda no pré-push.
- **Rationale**: segue o padrão do repositório (`ajustes-configuracoes.spec.ts`, `button-states.test.ts`). O teste de CSS não prova o desenho, só impede o retorno exato do defeito; a prova é o e2e.
- **Alternatives considered**: screenshot comparado (frágil entre máquinas e temas); medir só em jsdom (jsdom não faz layout).

## 5. Tolerância de medição

- O helper `expectNear` aceita 1 px; a spec 025 pede 0,5 px para o trilho e a bolinha. Como esses valores vêm de CSS inteiro (30 px, 52 px), o teste usa igualdade de 0,5 px própria para essas medidas e `expectNear` para o alinhamento da esquerda do botão (SC-004 permite 1 px).

## Nenhum `NEEDS CLARIFICATION` pendente.

## Medição inicial (T001)

Medida pelos testes de regressão novos contra o CSS ainda sem correção (Chromium, 320 a 1920 px, os dois temas):

| Elemento | Largura de tela | Valor atual | Valor esperado |
|---|---|---|---|
| Altura do trilho do interruptor | 320, 360, 1280 px | 44 px (14 px acima do esperado) | 30 px |
| Esquerda da caixa de "Restaurar padrões" | 320, 360, 861, 1920 px e zoom 200 % | 19 px antes da esquerda do conteúdo | na esquerda do conteúdo (até 1 px) |

As duas causas ficaram confirmadas: o `min-height` global de 44 px vence o `height: 30px`, e a margem de −19 px (18 px de padding + 1 px de borda do tipo discreto) leva a caixa, e não só o texto, 19 px para fora.
Achado extra: a primeira versão da faixa de toque (`inset: -7px 0`) dava 42 px, porque o `inset` conta a partir da caixa de preenchimento; o teste de ±21 px a reprovou e a correção é `inset: -8px -1px`.
