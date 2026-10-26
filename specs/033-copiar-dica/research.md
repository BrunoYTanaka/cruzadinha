# Research: Copiar a dica

**Documentação (constituição, Fluxo)**: antes de escrever, consultar via Context7 a API atual de React (`onDoubleClick`), Zod (`extend`, `optional`) e Playwright (permissões de área de transferência); a Clipboard API é da plataforma (MDN). Tarefa T001a.

## R1 — Onde ligar o duplo clique
- **Decisão**: `onDoubleClick` no botão da dica de `ClueList` (e `ClueSheet`, que reusa a lista) e no texto da dica de `ClueBar`; os botões anterior/próxima ficam de fora.
- **Por quê**: o clique simples já seleciona a palavra, então o segundo clique do duplo opera sobre a palavra ativa. Não há listener no tabuleiro, então células nunca disparam (FR-006).
- **Alternativas**: listener global (pega as células, precisa filtrar); atalho de teclado (fora do escopo, ver spec).

## R2 — Montar o texto
- **Decisão**: `clueCopyText(index, cells, word)` pura: `${word.clue} (${word.length}): ${letters}`, uma posição por célula via `index.cellsOf(word)`, `_` quando a célula é `null`. Lê só `cells` (o que a pessoa digitou), nunca a solução.
- **Por quê**: reaproveita `PuzzleIndex.cellsOf` (como `isWordFilled`); cobre letras dos cruzamentos e acentos sem tratamento extra.
- **Alternativas**: espaçar as posições ("A _ _ _ R"): mais largo, e o exemplo do issue é `A___R`.

## R3 — Copiar e avisar
- **Decisão**: `navigator.clipboard.writeText` dentro do gesto; sucesso e falha viram um toast fixo (`position: fixed`, fora do fluxo), com `role="status"`/`aria-live="polite"`, que some em ~2,5 s. Estado local ao jogo; um novo duplo clique reinicia o timer, sem empilhar.
- **Por quê**: fixo e fora do fluxo cumpre a feature 017 (sem saltos). A API de área de transferência pode não existir (contexto inseguro) ou ser recusada: o `catch` mostra o aviso de falha.
- **Alternativas**: `document.execCommand('copy')` (obsoleto); `Notice` no fluxo (desloca a página).

## R4 — Texto selecionado pelo duplo clique
- **Decisão**: com a opção ligada, `event.preventDefault()` no `mousedown` com `detail > 1` na área da dica (lista e barra). Com a opção desligada nenhum handler é ligado, então a seleção de texto fica como hoje (SC-002).
- **Por quê**: o navegador seleciona uma palavra no duplo clique; a spec pede que o texto não fique selecionado.
- **Alternativas**: limpar a seleção com `getSelection().removeAllRanges()` depois. Plano B se o `preventDefault` atrapalhar o foco.

## R5 — Novo campo e compatibilidade
- **Decisão**: `copyClue: z.boolean()` em `fields` (leitura campo a campo, padrão `false`). No pedido de salvar, `settings` aceita `copyClue` ausente (`.extend({ copyClue: z.boolean().optional() })`), para que um site anterior, que não envia o campo, não seja recusado com 400 pela API nova.
- **Por quê**: regra do projeto (compatível com a versão anterior da outra parte). A resposta já é tolerante (`.partial()`), e uma API antiga descarta a chave desconhecida, então só falta a sincronização da opção até ela atualizar.
- **Alternativas**: campo obrigatório no pedido: quebra o site antigo.

## R7 — Pausa
- **Decisão**: `useCopyClue` ignora o duplo clique quando o relógio está pausado.
- **Por quê**: a lista de dicas não é `inert` na pausa (só o tabuleiro é); copiar revelaria as letras que a capa esconde.
- **Alternativas**: tornar a lista inerte na pausa: muda o jogo de quem não usa a opção.

## R6 — Fechar os ajustes ao clicar fora
- **Decisão**: passar `closeOnBackdrop` ao `Dialog` dos ajustes. O `Dialog` fecha no `pointerdown` fora do painel (captura), então arrastar de dentro para fora não fecha (FR-011) e os demais diálogos mantêm o padrão `false` (FR-012).
- **Verificar**: portais fora do painel (tooltip do botão de ajuda do diálogo, se houver) não devem contar como "fora"; cobrir por teste.
