# Research: Ajustes de layout e animação nas configurações e no botão de tema

Sem NEEDS CLARIFICATION no plano. As decisões abaixo fecham as escolhas de CSS e de componente.

## 1. Como manter o balão dentro da janela

- **Decision**: ao abrir, `useLayoutEffect` mede `getBoundingClientRect()` do balão e calcula o deslocamento horizontal com `clampShift(left, width, viewport, margin = 8)`; o resultado vai para a variável `--tip-shift`, usada em `translate: calc(-50% + var(--tip-shift, 0px)) 0`. `max-width: calc(100vw - 16px)` com `width: max-content` deixa o texto quebrar em janelas muito estreitas.
- **Rationale**: a engrenagem fica rente à borda direita; centralizar o balão nela corta o texto. Corrigir só no balão da engrenagem deixaria o mesmo defeito para qualquer botão novo. Medir ao abrir, antes da pintura, não causa salto.
- **Alternatives considered**: alinhar o balão da engrenagem à direita do botão (resolve só esse caso e muda o visual de quando já cabia, contra o FR-002); CSS anchor positioning com `position-try` (suporte ainda irregular entre navegadores); biblioteca de popover (dependência nova, contra a restrição de custo e de "sem biblioteca de UI").

## 2. Largura fixa do botão de tema

- **Decision**: os três rótulos ficam na mesma célula de uma grade (`grid-area: 1 / 1`); os dois inativos têm `visibility: hidden` e `aria-hidden`. A largura é a do mais largo, sempre.
- **Rationale**: não depende de uma largura em px (quebraria com outra fonte ou com zoom de 200 %) e não exige medir em JavaScript.
- **Alternatives considered**: `min-width` fixo (frágil com fontes e zoom); medir com `ResizeObserver` (complexidade sem ganho); esconder o texto e deixar só o ícone (muda o design da feature 021).

## 3. "Sem limite" à direita sem cortar o texto

- **Decision**: `.body` da modal vira `container-type: inline-size`; a linha da ajuda usa `@container (min-width: 400px)` para ficar numa linha só, com `margin-inline-start: auto` na caixa "Sem limite". Abaixo disso, ela desce para uma linha própria à esquerda, como hoje. A largura máxima da modal de configurações sobe para 460 px (conteúdo de 412 px).
- **Rationale**: o conteúdo atual (372 px) não comporta nome (72) + passos (184) + "Sem limite" (≈ 98) + intervalos (24) ≈ 378 px, então só mexer na margem não resolveria em desktop. Container query decide pela largura da própria modal, não da janela, e vale com zoom.
- **Alternatives considered**: reduzir a largura mínima do valor (o texto "Sem limite" no valor ficaria cortado, contra o FR-011); `@media` pela janela (a modal pode ser estreita numa janela larga).

## 4. Destaque deslizante no seletor

- **Decision**: o trilho vira grade de colunas iguais com um `thumb` posicionado por `translate: calc(var(--i) * (100% + var(--gap))) 0`, em que `--i` é o índice da fonte marcada; a transição é de `translate` e `background-color` em 200 ms com `cubic-bezier`. `@media (prefers-reduced-motion: reduce)` zera a transição. O botão marcado perde o fundo próprio e passa a ter só a cor do texto.
- **Rationale**: um elemento que se move comunica a troca melhor que um fundo que aparece e some; como depende só do índice salvo, dois cliques rápidos terminam na última escolha.
- **Alternatives considered**: View Transitions (já usadas no tema, mas aqui disputariam o mesmo recurso e o fundo da página não muda); animar `left` (dispara layout).

## 5. "Restaurar padrões" alinhado

- **Decision**: manter o tipo `quiet` da feature 023 e compensar o recuo do `padding` com margem negativa do mesmo valor no início da linha, para o texto alinhar com a margem das demais linhas; a área de clique e o hover continuam do tamanho do tipo.
- **Rationale**: preserva a hierarquia visual da feature 023 sem trocar o botão por um secundário.
- **Alternatives considered**: trocar para `secondary` (mais peso visual do que uma ação de baixa ênfase pede).

## 6. Como confirmar o que as setas da imagem 1 apontam

- **Decision**: o primeiro passo da implementação mede a modal em larguras de 320 a 1280 px e registra as bordas dos interruptores e do botão. O que não estiver alinhado entra na correção da história 3.
- **Rationale**: a issue não explica as setas; medir é mais barato do que perguntar e cobre as duas leituras possíveis.

### O que a medição mostrou

Medido em 2026-10-22 com Chromium, API e Postgres locais, em 320, 360, 420, 861 e 1280 px, nos temas claro e escuro (os dois deram os mesmos números). Área de conteúdo da modal: 238, 278, 338, 370 e 370 px (a modal é limitada a 420 px; o conteúdo é a modal menos 24 px de padding e 1 px de borda de cada lado).

| Elemento | Largura de tela | Valor medido | Esperado | Alinhado? |
|---|---|---|---|---|
| Interruptores (largura × altura) | todas | 52 × 44 os dois | iguais | sim |
| Borda direita dos interruptores | todas | igual à borda direita do conteúdo | igual | sim |
| Botões do seletor (largura) | todas | iguais entre si (113 a 179 px) | iguais | sim |
| Botões do seletor (altura) | 320 | 47 px os dois ("Cruzada Online" quebra em 2 linhas) | iguais | sim |
| Botões do seletor (altura) | 360 a 1280 | 44 px os dois | iguais | sim |
| Rolagem lateral da modal | todas | `scrollWidth` = `clientWidth` | sem rolagem | sim |
| Texto de "Restaurar padrões" | todas | começa 19 px à direita da margem (borda do botão em 41 px, borda 1 px, padding 18 px) | na margem | **não** |
| "Sem limite" | 861 e 1280 | em linha própria, à esquerda, com a modal larga | na linha dos passos, à direita | **não** (a linha precisa de 371 px e o conteúdo tem 370 px) |
| Botão de tema (Automático) | todas | 143 × 48 px | iguais nos três estados | pendente (US2) |

Conclusões:

- O desalinhamento apontado pelas setas da primeira imagem **não aparece** nos interruptores nem no seletor. O único item fora da margem é "Restaurar padrões". A T014 fica reduzida a esse item mais as colunas iguais do seletor, que a US5 já pede.
- Balão da engrenagem (medido com o `Tooltip` antigo): com a sessão carregada, a engrenagem fica em x=164 a 208 numa janela de 360 px e o balão cabe. Com a rota `/api/auth/me` atrasada (a API acordando), o cabeçalho mostra só a engrenagem, em x=300 a 344, e o balão vai de 270 a 374 px: 14 px para fora. A tela de espera (`/api/health` atrasado) sozinha não reproduz, porque a sessão responde. O teste e2e da US1 atrasa `/api/auth/me`.
- "Sem limite" não cabe na linha dos passos por 1 px; isso confirma a necessidade de alargar a modal (460 px dá 410 px de conteúdo, acima do limite de 400 px da container query).
