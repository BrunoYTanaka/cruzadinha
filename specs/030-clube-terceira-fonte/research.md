# Research: Cruzadas Clube como terceira fonte

Observações da página feitas em 2026-10-23 com um pedido manual (página da edição 689 e `robots.txt`); nada foi salvo no repositório.

## R1. Como ler o XML do script ofuscado sem executar código remoto no processo da API

- **Decision**: `quickjs-emscripten` (QuickJS compilado para WASM), variante *singlefile* síncrona, com um runtime novo por edição: `setMemoryLimit` (32 MB), `setMaxStackSize` (512 KB), `setInterruptHandler` com prazo de 1 s (`shouldInterruptAfterDeadline`), sem registrar nenhuma função do host. O script roda com `evalCode`; depois lê-se `CrosswordPuzzleData` com `getProp(global, ...)` e `dump`/`getString`. O resultado precisa ser `string` até 1 MB, ou `unexpected-format`.
- **Rationale**: o motor não tem `fetch`, `require`, `process` nem sistema de arquivos: não existe caminho para rede ou disco, só o que o host expõe (nada). `node:vm` não é fronteira de segurança. `isolated-vm` é nativo (compilação no Docker/Render) e exige flags. A variante *singlefile* embute o WASM no JS e o tsdown inlina tudo em `dist/*.mjs`, sem arquivo `.wasm` novo no Dockerfile. API conferida no Context7 (`/justjake/quickjs-emscripten`: `setMemoryLimit`, `setMaxStackSize`, `setInterruptHandler`, `ModuleEvalOptions`).
- **Alternatives**: `node:vm` (rejeitada: sem isolamento real); `isolated-vm` (nativo, mais risco de build); processo filho com `--permission` (processo e Node completo, menos limites finos); decodificar a ofuscação à mão (frágil e é o que a fonte pode mudar). Pedir o XML aberto ao dono do site continua o caminho de menor risco (fora do escopo).
- **Confirmado no spike T003 (findings.md)**: o script roda sem stubs. Havia a dúvida: o script pode usar `document`/`window`/`navigator` na montagem da tabela de strings. A leitura da issue sugere que roda sem nada disso; se precisar, injetar *stubs* de valores inertes (objetos vazios), nunca funções do host.

## R2. Estrutura da página da edição

- **Decision**: ler três coisas da página HTML com expressões regulares estreitas, sobre texto já limitado a 1 MB:
  - data e autor: `postado em DD/MM/AAAA às HHhMM por <b>Autor</b>` (dentro do `<h2>`);
  - caminho do script: `/jogos/CC<nn>.js`;
  - edição anterior: `<a href="/jogo/i/id/<id>/cruzadas-classicas-<nn-1>/">`.
- **Rationale**: observado em `.../jogo/i/id/4774/cruzadas-classicas-689/`: data "19/10/2026", autor "Mano Mendonça", script `/jogos/CC689.js`, link para `/jogo/i/id/4766/cruzadas-classicas-688/`. O id da página **não** é sequencial com o número da edição (4774 → 4766), então só o link "anterior" leva à edição anterior. O número de edição não serve como data (FR-010).
- **Alternatives**: parser HTML completo (dependência a mais para três campos); adivinhar ids (quebra).
- **Risco**: a ordem dos elementos no HTML do link "anterior" não foi inspecionada além do `href`; a primeira tarefa confere com a edição 689 e a 688 e fixa o seletor num teste de contrato.

## R3. Conversão do XML (barras)

> Atualização do spike (findings.md): o XML real não numera (`number=""`), as palavras têm intervalos `x="1-6"` e as dicas ligam a `word id`. A numeração é derivada pela ordem de leitura e o `metadata/copyright` só repete o autor e não é guardado.

- **Decision**: reutilizar `cruzadaonline/xml.ts` (leitura segura) e escrever `clube/convert.ts` próprio. Palavras vêm da lista de palavras do XML (intervalo de células), não das barras: as barras (`left-bar`, `top-bar`) servem de **conferência** de que cada limite entre vizinhas tem uma palavra de cada lado e o resto vem da forma do intervalo. Palavra de uma letra, dica sem palavra, palavra sem dica, número divergente ou barra sem palavra do outro lado: `unexpected-format`.
- **Rationale**: o formato interno já guarda `row/col/length` por palavra; as barras são derivadas disso (R4). Usar as palavras como fonte da verdade evita ter duas descrições da mesma grade.
- **Alternatives**: derivar as palavras só das barras (quebra se uma palavra ocupar uma linha inteira ou se faltar barra); adicionar campo `bars` ao `Puzzle` (muda o formato e a regra das duas releases).

## R4. Regra de palavras vizinhas em `shared`

- **Decision**: em `checkPuzzleRules`, a verificação `isOpen(before) || isOpen(after)` passa a aceitar `after` aberta quando existe palavra **da mesma direção** que começa exatamente em `after` (e `before` aberta quando existe palavra da mesma direção que termina em `before`). **Revisto no spike (findings.md)**: também vale uma célula solta entre duas palavras (palavra | letra | palavra), porque a edição real tem corridas de uma letra entre barras. Sobreposição continua recusada pela cobertura (célula coberta duas vezes na mesma direção é erro novo `células sobrepostas`). `wordBoundaries(puzzle)` (novo, puro, em `shared`) devolve as arestas (célula, direção) onde uma barra deve ser desenhada: entre duas células abertas vizinhas em que ao menos uma pertence a palavra da direção e as duas não são da mesma palavra.
- **Rationale**: o formato não muda, então a regra das duas releases é cumprida (o site antigo continua lendo puzzles antigos; ele só não receberia `clube`, ver R7).
- **Alternatives**: um modo "sem blocos" por puzzle (flag nova no formato).

## R5. Navegação no site

- **Decision**: `game-logic/navigation.ts` já usa `wordCells` (digitar, Home, End, Delete, Tab por palavra). O que muda: (a) auditar `reducer.ts` para trocar qualquer teste "próxima célula aberta" por "próxima célula **da palavra**" e (b) as setas: movem para a célula adjacente e a palavra ativa passa a ser a da nova célula na direção atual (comportamento já existente); a seta **não** é presa ao limite da palavra, porque senão ninguém passaria da primeira palavra de uma linha sem blocos. Decidido na sessão de esclarecimento de 2026-10-23 e escrito no FR-017.
- **Rationale**: grade sem blocos e com vizinhas coladas torna a seta o único modo de cruzar palavras na mesma linha.
- **Alternatives**: seta presa ao limite (exige Tab/clique para avançar).

## R6. Sem busca sob demanda para `clube`

- **Decision**: `PuzzleSource` ganha `readonly onDemand?: boolean` (padrão `true`); `clube` declara `false`. `getByDate` devolve `unavailable` sem pedir à fonte nem consumir `PUZZLE_FETCH` quando `onDemand === false` e o dia não está salvo. No site, `dayState` trata dia passado não salvo de uma fonte sem busca como `none`, e `DayRoute` mostra "não há cruzada". A lista de fontes sem busca vem de uma constante em `shared` (`puzzleSourcesWithoutFetch`), para o site e a API lerem a mesma verdade; um site antigo continuaria a pedir `/dia`, mas ele nem mostra a fonte (R7).
- **Rationale**: a edição é achada por link "anterior", não por data; pedir por data não existe.

## R7. Compatibilidade entre versões (regra das duas releases)

- **Decision**: o enum de resposta `source` ganha `clube`. Os schemas de resposta são tolerantes (feature 012), mas um enum desconhecido ainda quebra a leitura do site antigo. Mitigação: (1) a biblioteca e os puzzles só devolvem `clube` quando pedido por `?source=clube` (o site antigo nunca pede) e `GET /api/puzzles/:id` de um id de `clube` só chega com link novo; (2) liberar em duas releases: primeiro `shared`+API aceitando `clube` com coleta ligada, depois o site com a aba. O site novo contra a API antiga: `?source=clube` dá 400; a aba trata 400 como "fonte indisponível" (não bloqueia as outras).
- **Alternatives**: transformar `source` em `string` na resposta (afrouxa o contrato inteiro).

## R8. Coleta por "anterior"

- **Decision**: `PuzzleSource` ganha método opcional `listRecent(limit): Promise<ListResult>` que, para `clube`, parte da página "mais recente" (a categoria `/jogo/categoria/id/1/n/cruzadas-classicas`, primeiro link `/jogo/i/…`) e segue o link anterior até `COLLECT_HISTORY_DAYS` dias atrás ou edição já salva. A coleta usa `listRecent` quando a fonte o declara (em vez de `candidateDates`) e salva cada edição pela data da página. `listRecent` é assíncrono e entrega primeiro a página (data, autor, link anterior); a coleta consulta o banco (`existingDates`) e só então pede o script, de modo que uma edição já salva custa um pedido. Duplicata de data: `insertPuzzleIfAbsent` já ignora; entra em `skipped`.
- **Rationale**: a coleta atual é "por data candidata"; `clube` é "por edição". Mantém a interface comum e o relatório por fonte.
- **Alternatives**: iterar datas e tentar adivinhar; guardar um índice número → id.
- **Pausa**: 2 s entre pedidos, e cada edição tem até 2 pedidos (página; script só se a data não está salva), mais 1 da lista por coleta; `rate-limited` (429) para a coleta da fonte, como hoje.

## R9. Atribuição e `robots.txt`

- **Decision**: `attribution = { sourceName: 'Cruzadas Clube', title: 'Cruzadas clássicas <n>' (opcional), author: <autor da página>, copyright: null }`. `User-Agent: cruzadinha (projeto pessoal; uso privado)` nos dois pedidos. O `robots.txt` da fonte permite `User-agent: *` e declara `ai-train=no, use=reference`; o projeto não treina modelos e não redistribui. Risco registrado no Constitution Check.
- **Open**: confirmar na primeira tarefa que o UA identificável não é bloqueado (200 com UA de navegador foi o único testado).

## R10. Barras no tabuleiro

- **Decision**: cada célula com `data-bar-end` (direção `across` → borda direita, `down` → borda inferior) pinta uma linha de 3 px com `--bar` (novo token, contraste ≥ 3:1 contra `--bg`/`--surface` e `--word`), desenhada com `box-shadow inset`/pseudo-elemento para não mudar o tamanho da célula (sem salto de layout, features 017/018). Leitor de tela: a barra é decorativa (`aria-hidden`); o fim da palavra já é anunciado pela dica ativa.
- **Alternatives**: borda real (muda a caixa e o layout).

## R11. Validação da experiência 12 x 8

- **Decision**: a primeira tarefa de implementação é uma partida de teste manual com uma edição real (via `source:check:clube --save`, fora do Git) renderizada no tabuleiro com o `shared` já corrigido; o resultado vai para `findings.md`. Se a experiência for ruim (célula pequena demais, navegação confusa), a feature é reavaliada antes de seguir para o site.
