# UI Contract: Botões que parecem botões, distintos dos links

A API não muda. Este contrato descreve o que o site garante e como os testes o verificam. Nomes e valores em [data-model.md](../data-model.md); decisões em [research.md](../research.md).

## 1. Componente `Button` e `buttonClass`

```ts
type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'icon'
type ButtonSize = 'regular' | 'small'

function buttonClass(options?: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean }): string

<Button variant? size? block? type? ...props de <button> />
```

- O padrão é `variant: 'secondary'`, `size: 'regular'`, `block: false` e `type: 'button'`.
- `'default'` e `'ghost'` deixam de existir, e o TypeScript recusa os usos antigos.
- `buttonClass` é a única forma de dar a um link (`<Link className={buttonClass(...)}>`) ou a um `<button>` com classe própria a aparência de um tipo. A classe local entra depois e só muda medidas e forma (largura, altura, `padding`, tamanho da fonte, raio, a sombra que já existe), nunca cores nem estados. Pílulas de ajuda, botão de tema e botão de legenda seguem essa regra.

| Garantia | Spec | Verificação |
| --- | --- | --- |
| Cada variante gera as classes base, a da variante e as de `size` e `block` | FR-001 | unitário `Button.test.tsx` |
| `Button` usa `type="button"` quando nada é passado | — | unitário |
| Classes compartilhadas em `@layer components`, resets de elemento em `@layer reset`; a classe local vence sem depender da ordem dos arquivos | FR-001, FR-006 | unitário `button-states.test.ts` (lê o CSS) + build de produção conferido no e2e |

## 2. Aparência e estados

| Garantia | Spec | Verificação |
| --- | --- | --- |
| Principal: fundo `--accent`; no máximo um por grupo de ações | FR-002 | revisão das telas (quickstart) + e2e: conta `primary` visíveis por formulário ou modal |
| Secundário e discreto: borda `--control-line` com ≥ 3:1 contra `--bg` e `--surface`, nos dois temas | FR-003, FR-004, SC-001 | unitário `contrast.test.ts` (tokens) + e2e (`border-color` calculada igual a `--control-line`) |
| "Restaurar padrões" é `quiet` (com contorno) | FR-004 | e2e na modal de configurações |
| Botões de ícone (engrenagem, fechar modal, barra do jogo, setas da dica, voltar) mostram fundo ao passar o mouse e ao pressionar | FR-005, US2-1 | e2e: `background-image` diferente de `none` com o mouse, e diferente do de mouse ao pressionar |
| "Tamanho padrão", − e +, ‹ › do calendário, "Fechar" do painel de dicas, pílulas de ajuda, tema e legenda seguem um tipo; o "Tamanho padrão" tem texto `--ink`; ‹ › desativado usa a opacidade do tipo | FR-006, US3-2 | e2e: `color` calculada igual a `--ink`; borda e fundo das pílulas e do tema iguais aos do secundário (US1) |
| Três aparências diferentes: repouso, mouse por cima, pressionado | FR-007, SC-002 | `button-states.test.ts` (regras `:hover` em `@media (hover: hover)` e `:active` para cada classe de controle) + e2e por amostra em cada tela |
| Transição ≤ 120 ms; com menos movimento, sem transição | FR-008, SC-007 | `button-states.test.ts` (duração ≤ 150 ms) + regra global existente |
| Depois de um toque, o fundo volta ao de repouso | FR-009, US2-5 | e2e com `hasTouch`: toca e compara o `background-image` com o de repouso |
| Contorno de foco inteiro em qualquer estado | FR-010, US2-3 | e2e: Tab até o botão com o mouse por cima, `outline-width` 3 px e `outline-style` `solid` |
| Desativado (`:disabled` ou `aria-disabled="true"`): não muda, cursor `not-allowed` | FR-011, US2-4 | `button-states.test.ts` (todos os seletores de estado excluem os dois) + e2e em "Tamanho padrão" no tamanho padrão e numa ajuda esgotada |
| Nenhum estado muda caixa do botão nem dos vizinhos (±1 px) | FR-012, SC-006 | e2e: `boundingBox` em repouso, com o mouse, pressionado e com foco |
| Aba, segmento e chave: o estado selecionado continua visível com o mouse e pressionado | FR-013 | e2e: `box-shadow`/borda da aba selecionada iguais com o mouse |
| Texto de botão ≥ 4,5:1 em todo estado habilitado | FR-018, SC-004 | unitário `contrast.test.ts` (sobreposição misturada sobre cada fundo) |
| Altura mínima de 44 px mantida | FR-019 | `touch-targets.test.tsx` existente (atualizado para os novos seletores) |
| Cores forçadas: todo botão com borda visível | FR-020 | e2e com `emulateMedia({ forcedColors: 'active' })`: `border-style` ≠ `none` e largura ≥ 1 px |
| Estados só com tokens, sem cor fixa | FR-021 | `button-states.test.ts`: nenhum `#`, `rgb(` ou `hsl(` nas regras de estado dos componentes |
| axe sem violações em entrar, cadastro, biblioteca, jogo, configurações, conclusão, 404 e erro, nos dois temas | FR-022, SC-005 | e2e `botoes.spec.ts` + axe existentes |

## 3. Links

| Garantia | Spec | Verificação |
| --- | --- | --- |
| Link de texto sublinhado em repouso; ao passar o mouse, sublinhado mais grosso; sem fundo nem contorno | FR-014, US3-3 | e2e: `text-decoration-line` `underline`, `text-decoration-thickness` maior com o mouse, `background-image` `none` |
| Botão nunca sublinhado e, fora o principal, sem a cor `--accent` no texto | FR-015, SC-003 | e2e: varre os `button` visíveis de entrar, cadastro, biblioteca, jogo, configurações, conclusão, 404 e erro |
| Na tela de entrar: "Criar conta" e "Jogar sem entrar" são links; "Entrar" é principal | US3-1 | e2e |
| Cartões "Hoje", dias do calendário, voltar da barra e marca mantêm a aparência e ganham estados | FR-016, US3-4 | e2e: borda `--accent` com o mouse no cartão e no dia |
| "Entrar" do cabeçalho do visitante: link com `buttonClass({ variant: 'quiet' })` | FR-017 | e2e |

## 4. Fora do contrato

Continuam sem mudança visual: as células do tabuleiro, a alça de redimensionar, o balão da dica (feature 019) e a animação do tema (feature 021). As teclas do teclado na tela só ganham o estado pressionado.
