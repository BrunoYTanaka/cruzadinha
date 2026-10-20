# Research: Tela de jogo sem saltos e dica resolvida mais visível

Não houve marcadores NEEDS CLARIFICATION no contexto técnico. As decisões abaixo partem do código atual de `apps/web/src/features/game/` e da spec.

## R1. O que `SaveStatus` mostra em cada estado

- **Decision**: `saved` e `saving` não renderizam o `<span>` visível. Os outros quatro estados continuam com o texto e a classe de hoje (`offline` e `local-only` com `.warn`). Fica uma tabela `WARNING: Partial<Record<SaveState, string>>` com só os avisos; o estado sem entrada não mostra nada.
- **Rationale**: FR-001 e FR-005. O `<span>` vazio também sairia: um elemento sem texto na faixa ainda ocupa o `gap` do flex e mudaria a posição dos vizinhos ao aparecer. Os avisos são raros e precisam chamar atenção, então podem entrar e sair (edge case da spec).
- **Alternatives considered**:
  - Reservar a largura do maior texto (`min-width`): mantém um espaço vazio na faixa e não resolve a quebra de linha no celular. O autor pediu para tirar o texto.
  - Trocar por um ícone de nuvem fixo: informação sem valor para quem joga (Assumptions da spec) e mais um elemento na faixa estreita.

## R2. Anúncios ao leitor de tela

- **Decision**: a lógica de `previous`/`wasOffline`/`announcement` e a região viva `VisuallyHidden role="status"` ficam iguais.
- **Rationale**: FR-003 e cenário 3 da US1: o "Conexão restabelecida" depende de ver `offline → saving → saved`, o que já é feito pela comparação de estados e não pelo texto visível. Os testes atuais de anúncio continuam valendo.
- **Alternatives considered**: mover o anúncio para o `Notice`: mudaria uma peça que funciona sem ganho para esta feature.

## R3. Texto fixo do visitante

- **Decision**: com `guest`, mostrar sempre "Progresso só neste aparelho" (cor `--mute`, 13 px, como o texto de hoje) seguido do link "Entrar para salvar na sua conta". Em `local-only` o aviso "Não salvo: vale só nesta aba" aparece no lugar do texto fixo, porque ele contradiz o texto fixo e é um aviso de problema. O anúncio de abertura "Seu progresso fica salvo só neste aparelho." continua.
- **Rationale**: FR-004 pede o mesmo texto do começo ao fim em salvamentos normais. A fila do visitante (`guest-save-queue.ts`) não passa por `saving`: o estado é `saved` enquanto o armazenamento está disponível e `local-only` quando não está, então na prática o visitante vê um texto só durante a partida inteira. `saving` recebe o texto fixo mesmo assim, por segurança.
- **Alternatives considered**:
  - Manter "Salvo neste aparelho": o texto fixo diria "Salvo" mesmo enquanto grava, e a FR-001 proíbe esse texto.
  - Mostrar o texto fixo e o aviso `local-only` lado a lado: duas frases que se contradizem.

- **Nota de implementação**: no celular (360 px), o grupo da faixa com relógio, pausa, calendário, texto do visitante e link não quebrava linha, e a página do visitante já rolava na horizontal antes desta feature (464 px de largura); o texto fixo, mais longo, piorava (508 px). `.group` em `Toolbar.module.css` ganhou `flex-wrap: wrap`: o texto e o link vão para linhas próprias, que não mudam durante a partida. O e2e da barra confere que a página não rola na horizontal.

## R4. Barra da dica numa linha com reticências

- **Decision**: em `ClueBar.module.css`:
  - `.text`: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` (já tem `flex: 1; min-width: 0`).
  - `.number`: acrescentar `flex: none` (já tem `white-space: nowrap`).
  - `.bar` e `.navigable` mantêm `min-height` (52 e 56 px) e `align-items: center`.
- **Rationale**: FR-006 e FR-007. Com uma linha, a altura da barra é sempre a `min-height` (a linha de 17 px cabe com folga em 56 − 8 de padding), igual à de hoje com dica curta, então `useMeasuredSpace` e `board-size.ts` medem o mesmo espaço (FR-009). `min-width: 0` no `.live` e no `.text` já existe, o que é necessário para o `text-overflow` funcionar dentro do flex. A barra é a mesma nos três lugares (computador, celular com teclado, coluna de dicas da janela estreita sem teclado na tela), então uma mudança cobre todos.
- **Alternatives considered**:
  - `-webkit-line-clamp: 1`: equivalente aqui, mas `text-overflow` é o padrão para uma linha e não depende de `display: -webkit-box`.
  - Reservar a altura da maior dica do puzzle: primeira versão da spec, descartada pelo autor.

- **Nota de implementação**: com a dica numa linha, a largura intrínseca da barra passou a ser a da dica inteira, e no computador a coluna do tabuleiro (`flex: none`) crescia até ela, alargando a página. `.bar` ganhou `contain: inline-size`: a largura vem de quem contém a barra, nunca da dica. O e2e confere que a página não rola na horizontal com a dica longa.

## R5. Leitor de tela com a dica cortada

- **Decision**: nada muda no JSX. O corte é só de CSS; o texto inteiro continua no DOM dentro do `.live` (`aria-live="polite"`, `aria-atomic="true"`).
- **Rationale**: FR-008. `text-overflow` não altera o texto acessível. O teste de `ClueBar` confere que a região viva tem a dica inteira e nenhum "…" acrescentado.
- **Alternatives considered**: `title` com a dica inteira para o mouse: fora do escopo (Assumptions da spec).

## R6. Aparência da dica resolvida

- **Decision**: opção B do mockup, escolhida pelo autor. Em `ClueList.module.css`:
  - `.clue` ganha `position: relative` e `padding-right` com o espaço do visto (10 px de hoje + 18 px do ícone + 8 px de folga) em toda dica, resolvida ou não.
  - `.done` passa a ser só `background: var(--ok-tint)`: saem `color: var(--mute)`, `text-decoration: line-through` e a espessura.
  - `.active.done` passa a `background: var(--word)` (a regra de cor de hoje sai, porque o texto já é `--ink`).
  - `.check`: `position: absolute`, à direita e alinhado à primeira linha, 18 x 18 px, `stroke: var(--ok)`.

  Em `ClueList.tsx`, a dica resolvida recebe um `<svg aria-hidden="true" className={styles.check}>` com o traço do visto, depois do texto oculto ", resolvida".
- **Rationale**: FR-010, FR-011 e FR-013. O espaço reservado em toda dica e o ícone em posição absoluta garantem que acertar ou desfazer uma palavra não muda onde o texto quebra nem a altura da lista (a feature 011 rola cada grupo por dentro e mantém a ativa visível; uma mudança de altura moveria a lista). O `aria-hidden` mantém o nome acessível de hoje (", resolvida" uma vez só), então os testes da 016 que leem o nome continuam valendo. `ClueSheet` reaproveita `ClueList`, então a lista do celular muda junto. A classe `.done` e o conjunto `struck` mantêm o nome da feature 016.
- **Alternatives considered** (comparadas no mockup):
  - Risco na cor de sucesso: primeira versão desta spec; o autor achou que não ajuda.
  - A, texto verde com visto: menos visível que o fundo.
  - C, contador e certas no fim da lista: muda a ordem da lista durante o jogo, um salto do tipo que a feature tira.
  - D, letras verdes no tabuleiro: fora do escopo e contra o item 12 de `docs/design.md`.
  - Visto como elemento no fluxo do texto (`inline`): ao aparecer, mudaria a quebra de linha da dica.

## R7. Contraste

- **Decision**: usar `--ok-tint` e `--ok` sem ajuste. Medido com a fórmula WCAG (luminância relativa):

| Tema | Par | Contraste | Mínimo |
| --- | --- | --- | --- |
| Claro | texto `--ink` `#1c1f24` sobre `--ok-tint` `#dff3e6` | 14,24:1 | 4,5:1 |
| Claro | visto `--ok` `#17693a` sobre `--ok-tint` | 5,80:1 | 3:1 |
| Claro | visto `--ok` sobre `--word` `#cfe0ff` (ativa) | 5,05:1 | 3:1 |
| Escuro | texto `--ink` `#eceef2` sobre `--ok-tint` `#17301f` | 12,22:1 | 4,5:1 |
| Escuro | visto `--ok` `#6fd69a` sobre `--ok-tint` | 7,95:1 | 3:1 |
| Escuro | visto `--ok` sobre `--word` `#27406e` (ativa) | 5,75:1 | 3:1 |

- **Rationale**: FR-012. O fundo de sucesso contra o fundo da lista fica perto de 1,2:1 nos dois temas, por isso ele não é o único sinal: o visto (acima de 3:1) e o ", resolvida" do leitor de tela identificam a dica (Assumptions da spec). O axe mede o texto sobre o fundo de sucesso na auditoria que já existe; o contraste do visto fica registrado nesta tabela, e o e2e confere que o visto usa o token `--ok` (stroke computado).
- **Alternatives considered**: um fundo mais escuro para ser percebido sozinho: perderia contraste do texto `--mute` dos números e brigaria com o fundo da palavra ativa.

## R8. Como provar que nada se move

- **Decision**: spec e2e novo `e2e/sem-saltos.spec.ts`, com o seed local:
  - `page.route('**/api/puzzles*', …)` usa `route.fetch()`, lê o JSON e troca a dica das palavras de índice par por uma dica longa inventada (mais de 200 caracteres), devolvendo com `route.fulfill({ response, json })`. Isso cobre `GET /api/puzzles?…` e `GET /api/puzzles/:id`.
  - Dica resolvida: num puzzle sem alteração, anota a altura de cada grupo e do botão da dica 1 horizontal, digita a palavra certa e confere alturas iguais, fundo computado igual a `--ok-tint` e `text-decoration-line` `none` (FR-013, SC-004).
  - Computador (1280 x 800): anota `boundingBox()` do `grid` e da barra; aperta Tab por todas as palavras (o tabuleiro cicla as palavras com Tab, feature 011) e confere `y` do tabuleiro e altura da barra iguais em cada passo (SC-001); na dica longa, `evaluate` confere `scrollWidth > clientWidth` no texto e que o número e a direção não estão cortados (SC-003).
  - Celular com teclado (360 x 740, `hasTouch`, `isMobile`, como em `tamanhos.spec.ts`): o mesmo percurso com Tab (a barra do celular não tem anterior/próxima; o Tab do teclado emulado cicla as palavras). Também a janela estreita sem teclado na tela (800 x 900, sem toque), única faixa em que a barra fica na coluna de dicas.
  - Digitação: anota `boundingBox()` de cada filho da faixa (`role="toolbar"`) e do tabuleiro, digita 20 letras e espera as respostas `PUT /api/progress/*`, e confere as mesmas caixas (SC-002), com conta e como visitante; confere que "Salvo" e "Salvando…" nunca aparecem.
  - Onde os specs atuais esperavam "Salvo" para saber que o progresso foi gravado, passam a usar `page.waitForResponse` do `PUT /api/progress/:id`.
- **Rationale**: o seed só tem dicas curtas; trocar a resposta dentro do navegador do teste dá uma dica longa determinística sem tocar na fonte real nem no banco (princípio VII). As APIs do Playwright usadas foram conferidas no Context7.
- **Alternatives considered**:
  - Um puzzle de seed com dicas longas: mudaria o seed da API (fora do escopo, só o site muda).
  - Teste em jsdom: jsdom não faz layout, então não mede posição nem reticências.
