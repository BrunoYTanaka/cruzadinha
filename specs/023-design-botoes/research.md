# Research: Botões que parecem botões, distintos dos links

## R1. Inventário dos controles de hoje

Levantamento em `apps/web/src` (2026-10-22). Quase nada tem `:hover` ou `:active`: só `TodayCards` (`.link:hover`), `ResizeHandle` e a barra de rolagem. O contorno de foco vem de `:focus-visible` em `themes/global.css` e vale para todos.

| Controle | Onde | Hoje | Destino |
| --- | --- | --- | --- |
| `Button` `primary` | entrar, cadastro, nova entrada, pausa, conclusão | fundo `--accent` | principal |
| `Button` `default` | erro, avisos, calendário (‹ ›), "Tentar de novo", conclusão, "Jogar de novo", "Fechar" do painel de dicas | só borda `--line` (1,4:1 com o fundo no claro) | secundário |
| `Button` `ghost` | "Sair", "Restaurar padrões", dispensar aviso | sem borda e sem fundo | discreto |
| Link com classes do `Button` | conclusão ("Jogar … deste dia") | `buttonStyles.primary` | principal (já é) |
| `Pill` | ajudas (letra, palavra, verificar) | fundo `--pill`, sem borda | secundário em forma de pílula (`buttonClass()` + raio 999 local) |
| `ThemeButton` | modal de configurações | pílula com borda `--line` | secundário em forma de pílula (`buttonClass()` + raio 999 e 48 px locais) |
| `BoardSizeReset` | barra do jogo | borda `--line`, **texto `--accent`** | secundário pequeno, texto `--ink` |
| `.step` (− +) | configurações | borda `--line`, fundo `--surface` | secundário quadrado |
| `SettingsButton` | cabeçalho | ícone sem fundo | ícone |
| `Dialog .close` | modais | ícone sem fundo | ícone |
| `Toolbar .iconButton` (botões e o link de voltar) | barra do jogo | ícone sem fundo | ícone |
| `ClueBar .step` | barra da dica (computador) | ícone sem fundo sobre `--word` | ícone |
| `LegendButton` | botão redondo "?" | fundo `--accent` | principal redondo (`buttonClass({ variant: 'primary' })` + círculo e sombra locais) |
| `SourceTabs .tab` | biblioteca | aba com estado selecionado | só estados de mouse e pressionado |
| `.segmentButton` | configurações | segmento com `aria-pressed` | só estados |
| `.switch` | configurações | chave com `aria-checked` | só estados |
| `ClueList .clue` | jogo | linha de lista, destaques de ativa e resolvida | mouse por cima só sem destaque |
| `Keyboard .key` | celular | tecla | só pressionado |
| Dias do calendário e cartões "Hoje" | biblioteca | links em forma de cartão | mouse por cima e pressionado de cartão |
| Marca do cabeçalho | todas | link sem sublinhado | mouse por cima: cor `--accent` |
| "Entrar" do cabeçalho do visitante | todas | link com 44 px | discreto, com aparência de botão (FR-017) |
| Links no texto | entrar, cadastro, 404, dia, jogo, modo leitura, configurações, `SaveStatus` | sublinhados, cor `--accent` | links, com estados |
| `ResizeHandle`, células do tabuleiro | — | visual próprio | sem mudança |

**Decision**: os destinos da última coluna. Pílulas, tema e legenda passam a usar `buttonClass` em vez de repetir os estados: a classe local só dá a forma (FR-006). A navegação ‹ › do calendário perde a opacidade própria de 0,35 no desativado e usa os 0,6 do tipo. Dois controles que não têm `disabled` nativo usam `aria-disabled="true"`: as ajudas (`Pill`) e o `Button` em alguns pontos. Todo seletor de estado precisa excluir também esse atributo.

## R2. Organização do CSS: camadas de cascata

**Problema**: os controles com classe própria (`.step`, `BoardSizeReset .reset`, `Toolbar .iconButton`) vão juntar a classe compartilhada do `Button.module.css` com a sua. Com a mesma especificidade, quem vence é a ordem dos arquivos CSS. Com rotas carregadas sob demanda, essa ordem não é garantida no build. Além disso, `global.css` tem `button, input { color: inherit }` sem camada.

**Decision**: usar `@layer`, declarado como `@layer reset, components;` no topo de `global.css` e repetido no topo de `Button.module.css`. A repetição é inofensiva e garante a ordem qualquer que seja o primeiro arquivo carregado.

- As regras de elemento de `global.css` (`button`, `input`, `a`, `h1`–`h3`) vão para `@layer reset`.
- As classes compartilhadas de `Button.module.css` vão para `@layer components`.
- `:focus-visible`, `[hidden]`, a regra de menos movimento e a View Transition ficam fora de camada e sempre vencem.

As classes locais dos componentes ficam sem camada e vencem as compartilhadas sem depender da ordem. Assim um `.step` pode mudar só `width`, `padding` e `font-size`.

**Rationale**: o build de produção do Vite 8 mira navegadores amplamente disponíveis, que já têm `@layer` (Chrome 99, Safari 15.4, Firefox 97). O Lightning CSS minifica sem baixar a sintaxe. `postcss-modules` troca os nomes de classe dentro de blocos `@layer` normalmente. O teste `touch-targets.test.tsx` lê `.button {` por texto e continua achando a regra dentro do bloco.

**Alternatives considered**:

- `composes:` dos CSS Modules: a ordem entre arquivos continua não garantida no Vite.
- Dobrar a especificidade (`.step.step`): frágil e sem explicação para quem lê.
- Variáveis de ajuste (`--button-pad`): exigiria uma variável para cada propriedade que um componente quer trocar.

## R3. Estados de mouse e pressionado: sobreposição translúcida

**Decision**: dois tokens por tema, `--hover-overlay` e `--press-overlay`, uma cor da tinta com transparência:

- claro: `rgb(28 31 36 / 0.08)` e `0.16`
- escuro: `rgb(236 238 242 / 0.10)` e `0.18`

Os controles aplicam a sobreposição como `background-image: linear-gradient(var(--hover-overlay), var(--hover-overlay))` sobre o próprio fundo. O mesmo mecanismo serve para qualquer fundo:

- `--control`, `--surface`, `--pill`, `--word` (setas da barra da dica)
- aba selecionada
- `--accent` do principal: escurece no claro e clareia no escuro

**Rationale**: um token explícito para cada fundo multiplicaria os tokens (`--control-hover`, `--accent-hover`, `--pill-hover`…), e mesmo assim não cobriria as setas sobre `--word` nem a aba selecionada. Os contrastes medidos com a mistura ficam em R5.

**Alternatives considered**:

- `color-mix()`: também funciona, mas a mistura viraria uma expressão repetida em cada controle.
- `filter: brightness()`: muda também o texto e o ícone, e o contraste fica difícil de garantir.

## R4. Mouse por cima só com ponteiro que passa por cima; pressionado sempre

**Decision**: as regras `:hover` ficam dentro de `@media (hover: hover)`. Já `:active` fica fora da consulta, e assim o toque também ganha o estado pressionado. Todas as regras de estado excluem o desativado: `:not(:disabled, [aria-disabled='true'])`. A transição é `background-color`, `border-color`, `color` e `box-shadow` em 120 ms. Quem pede menos movimento já tem a regra global de `global.css`, que reduz toda transição a 0,01 ms (FR-008).

**Rationale (Context7, `/microsoft/playwright`)**:

- No Chromium headless, o Playwright fixa `primaryHoverType=2`, ou seja, `(hover: hover)` verdadeiro no contexto de computador.
- Com `hasTouch` (`devices['iPhone 6']`, por exemplo) as consultas `(hover: hover)` e `(any-hover: hover)` dão falso.

O e2e consegue, portanto, verificar as duas situações: o mouse por cima no computador e nenhum estado preso depois do toque.

## R5. Tokens novos e contrastes

**Decision**: tokens novos em `light.css` e `dark.css` (os dois blocos do escuro), listados em `tokens.css`:

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--control` | `#eef0f3` | `#24272d` | fundo do secundário |
| `--control-line` | `#80878f` | `#6e7581` | contorno de secundário (inclusive pílulas, tema e passos) e discreto |
| `--hover-overlay` | `rgb(28 31 36 / 0.08)` | `rgb(236 238 242 / 0.10)` | mouse por cima |
| `--press-overlay` | `rgb(28 31 36 / 0.16)` | `rgb(236 238 242 / 0.18)` | pressionado |

O `--line` continua como está, para separadores e bordas de superfície, que não são controles.

Contrastes medidos (WCAG 2.x, fórmula de luminância relativa):

| Par | Claro | Escuro | Mínimo |
| --- | --- | --- | --- |
| `--control-line` × `--bg` | 3,39 | 4,00 | 3 (SC-001) |
| `--control-line` × `--surface` | 3,63 | 3,68 | 3 |
| `--ink` sobre `--control` (repouso / mouse / pressionado) | 14,5 / 12,4 / 10,6 | 12,9 / 9,7 / 7,5 | 4,5 (SC-004) |
| `--ink` sobre `--pill` (pressionado) | 9,8 | 6,7 | 4,5 |
| `--ink` sobre `--word` (pressionado, setas) | 9,1 | 5,5 | 3 (ícone) |
| `--accent-ink` sobre `--accent` (repouso / mouse / pressionado) | 6,6 / 7,2 / 7,8 | 8,4 / 8,9 / 9,3 | 4,5 |
| `--mute` sobre `--surface` (desativado com opacidade não conta) | 7,4 | 7,4 | — |
| link `--accent` × `--bg` / `--surface` | 6,2 / 6,6 | 8,9 / 8,2 | 4,5 |

Um teste unitário (R8) recalcula a tabela a partir dos arquivos de tema, para que uma mudança de cor que quebre o mínimo falhe na CI.

## R6. Hierarquia dos quatro tipos

**Decision**: os quatro tipos ficam assim.

- **Principal**: fundo `--accent`, texto `--accent-ink`, sem contorno visível. A borda é da mesma cor do fundo.
- **Secundário**: fundo `--control`, contorno de 1 px `--control-line`, texto `--ink` com peso 500.
- **Discreto**: fundo transparente, contorno de 1 px `--control-line`, texto `--ink` com peso 500. Tem menos destaque que o secundário por não ter preenchimento, e o limite continua a 3:1 (SC-001).
- **Ícone**: sem fundo e sem contorno em repouso, com borda de 1 px transparente (R7). Ganha a sobreposição ao passar o mouse e ao pressionar.

Nos quatro, o raio é `--radius-md` e a altura mínima é `--tap`. Os nomes no código passam a ser `primary | secondary | quiet | icon`. `default` e `ghost` saem, e todos os usos são trocados no mesmo commit; o TypeScript aponta os que faltarem.

O `Button` ganha também a função exportada `buttonClass({ variant, block, size })`. Ela devolve as classes para os links que precisam da aparência de botão (conclusão, "Entrar" do cabeçalho) e para os botões nativos com classe própria. Com isso, o `CompletionDialog` deixa de montar as classes à mão. A variante `size: 'small'` (13 px, `padding: 0 14px`) serve ao "Tamanho padrão", que hoje usa 13 px.

**Alternatives considered**: o discreto só com fundo sutil (`--control`) e sem contorno. Não serve porque `--control` sobre `--bg` dá 1,05:1, abaixo dos 3:1 do SC-001.

## R7. Cores forçadas

**Decision**: todo botão tem borda de 1 px. O principal usa a cor `--accent`, e os de ícone (botões e links da barra) e as setas usam `transparent`. No modo de cores forçadas, o navegador pinta toda borda com a cor de sistema, inclusive a transparente, e o limite aparece (FR-020). Com `box-sizing: border-box` (global) e as larguras fixas atuais, a borda não muda o tamanho. A espessura de 1 px é a mesma dos outros tipos, e trocar de tipo não muda o layout.

Os segmentos da cruzada padrão, a chave e as linhas da lista de dicas também ganham a borda transparente. Nas linhas de dica, cada lado do `padding` perde 1 px, para o texto não mudar de lugar nem de quebra (feature 017).

O e2e verifica com `page.emulateMedia({ forcedColors: 'active' })` (Context7, `/microsoft/playwright`, desde a 1.15) que cada tipo tem `border-style` diferente de `none` e `border-width` de pelo menos 1 px.

## R8. Testes

**Decision**:

1. **Unitário, `themes/contrast.test.ts`**:
   - lê `light.css` e `dark.css`;
   - mistura as sobreposições sobre cada fundo;
   - confere a tabela de R5: 3:1 para limites e ícones, 4,5:1 para texto.
   - O cálculo de contraste fica em `src/test/contrast.ts`, o código de teste.
2. **Unitário, `components/button-states.test.ts`**, no estilo de `touch-targets.test.tsx`:
   - lê os CSS e confere que cada classe de controle tem regra `:hover` dentro de `@media (hover: hover)` e regra `:active`;
   - confere que os seletores de estado excluem `:disabled` e `[aria-disabled='true']`;
   - confere que nenhum arquivo de componente usa cor fixa nos estados.
3. **Unitário, `components/Button.test.tsx`**: `buttonClass` monta as classes de cada variante e o `Button` aplica `type="button"` por padrão.
4. **e2e, `e2e/botoes.spec.ts`**, em computador, nos temas claro e escuro, em entrar, biblioteca, jogo, configurações e conclusão:
   - fundo diferente em repouso, com o mouse e pressionado (`mouse.down`);
   - caixa igual nos três estados, até 1 px (`expectNear` de `sem-saltos.spec.ts`);
   - contorno de foco com `outline-width` de 3 px depois de Tab;
   - botão desativado sem mudança;
   - axe sem violações;
   - cores forçadas com borda;
   - num contexto com `hasTouch`: depois de tocar, o fundo volta ao de repouso;
   - links com `text-decoration-line: underline` e botões sem.

## R9. Documentação

**Decision**: `docs/design.md` ganha a seção "Botões e links", com os quatro tipos, os estados, a regra link × botão e os tokens novos. A linha da feature 023 entra em `CLAUDE.md`. `tokens.css` lista os tokens novos no comentário de cabeçalho.
