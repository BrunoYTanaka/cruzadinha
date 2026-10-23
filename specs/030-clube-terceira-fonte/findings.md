# Achados do spike (T003, 2026-10-23)

Pedidos reais feitos à mão com `User-Agent: cruzadinha (projeto pessoal; uso privado)`. Nada do conteúdo da fonte foi versionado.

## Resultados

- **R1 (sandbox)**: o script `CC689.js` (≈ 39 kB) roda no QuickJS (`quickjs-emscripten` 0.32.0, variante singlefile) **sem nenhum stub** de `document`/`window`/`navigator`; `CrosswordPuzzleData` sai como string de ≈ 12,8 kB com 1 s de prazo e 32 MB.
- **R9 (User-Agent)**: o UA identificável do projeto recebe 200 na página, no script e na categoria.
- **R2 (página)**: `<small>postado em DD/MM/AAAA às HHhMM por <b>Autor</b></small>`; script em `/jogos/CC<n>.js`; link anterior em `<div id="pagination"><a href="/jogo/i/id/<id>/cruzadas-classicas-<n-1>/"><i class="prev-next"></i> Anterior</a>`. A categoria `/jogo/categoria/id/1/n/cruzadas-classicas` lista todas as edições (mais nova primeiro) como `<a class="lista-interna" href="/jogo/i/id/<id>/cruzadas-classicas-<n>/">`, sem datas. Ids não são sequenciais com o número (4774, 4766, 4758, ...: passo 8).
- **R3 (XML)**: raiz `crossword-compiler-applet` > `rectangular-puzzle` com `metadata` (`title` "Cruzadas clássicas 689", `creator`, `copyright`), `crossword` > `grid width="12" height="8"`, 96 `cell x y solution [left-bar] [top-bar]` (nenhum bloco, nenhum `number`), 44 `word id x y solution` onde `x`/`y` é uma posição ou um intervalo (`x="1-6" y="1"` horizontal, `x="1" y="2-4"` vertical; `is-theme` opcional) e `clues` (títulos `<b>Horizontais</b>` e `<b>Verticais</b>`) com `clue word="<id>" number=""` (número vazio).
- **Barras**: 14 `left-bar` e 12 `top-bar`; `left-bar` na célula é o limite com a célula da esquerda; `top-bar`, com a de cima.

## Consequências para o plano

1. **Numeração derivada**: a fonte não numera. O conversor atribui números pela ordem de leitura das células iniciais de palavra (uma célula que inicia horizontal e vertical tem um número só), como no formato interno.
2. **Direção pela forma do intervalo**, não pelo título (igual à `cruzadaonline`); o título só é conferido na contagem.
3. **Barras como conferência**: cada `left-bar` (x > 1) deve ser início de uma palavra horizontal e x-1 o fim de outra; idem `top-bar` na vertical.
4. **Copyright**: `metadata/copyright` ("CC689 - ©Autor") só repete o autor: `attribution.copyright` fica `null` (a atribuição mostra fonte, título e autor).
5. **Listagem**: `listRecent` usa a categoria só para achar a edição mais nova; depois segue "Anterior".
6. Não é preciso stub no sandbox; a premissa R1 se confirma.
7. A experiência 12 x 8 (T019) fica para depois de T028 (a edição real precisa passar pelo adaptador).

## Descoberta na análise do XML real (durante T006)

- A edição real tem **células soltas na horizontal**: uma célula entre duas barras (`left-bar` nela e na seguinte) que só tem palavra vertical (uma corrida de uma letra). No exemplo medido há 2 delas em 96 células (e 14 barras verticais contra 10 fins de palavra colada).
- Consequência (R4 revisado): a regra de `shared` aceita, ao lado do fim de uma palavra, (a) bloco/borda, (b) o início de uma palavra da mesma direção, ou (c) uma célula solta **entre duas palavras** (palavra | letra | palavra). Duas soltas seguidas, ou uma solta junto de bloco/borda, continuam recusadas, e uma palavra encurtada diante de uma borda também.
- `wordBoundaries(puzzle)` passou a receber o puzzle e marca a barra entre quaisquer células abertas vizinhas em que ao menos uma pertence a palavra e não são da mesma palavra, o que cobre as células soltas dos dois lados.

## Partida de teste da experiência 12 x 8 (T019, 2026-10-23)

Edição real (689) convertida pelo adaptador e salva só no banco local de teste, aberta no site (build de produção, Chromium) como visitante:

- Computador (1280 x 900): célula de 54 px, grade inteira visível ao lado das colunas de dicas, sem rolagem lateral; as barras (3 px) separam as palavras vizinhas e as corridas de uma letra, e se leem bem nos dois temas.
- Celular (390 x 800): célula de 30 px, grade inteira sem rolagem lateral, teclado na tela abaixo; as barras continuam visíveis.
- Digitar uma palavra e usar Tab/setas/Home/End/Delete se comporta como nas outras fontes (cobertos por `e2e/clube.spec.ts`).
- Veredito: a experiência é boa o bastante para seguir; nenhuma reavaliação necessária.
- Seis edições reais (2026-09-14 a 2026-10-19) convertem sem erro (`source:check:clube -- --count=6`): 12 x 8, 40 ou 44 palavras.
