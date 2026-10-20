# UI Contract: Tela de jogo sem saltos e dica resolvida mais visível

A API não muda. Este contrato descreve o que a tela de jogo garante e como os testes o verificam.

## 1. `SaveStatus` (faixa de ferramentas)

Props iguais às de hoje: `state: SaveState` e `guest?: { loginTo: string }`.

| Garantia | Verificação |
| --- | --- |
| `saved` e `saving` não renderizam texto visível nem elemento vazio (conta) | unitário: nenhum texto fora da região viva |
| Os textos "Salvo", "Salvando…" e "Salvo neste aparelho" não existem no componente | unitário + e2e (`getByText` com contagem 0 durante a digitação) |
| `offline`, `session-expired`, `completed-elsewhere` e `local-only` mostram o texto de hoje; `offline` e `local-only` com o estilo de aviso | unitário (tabela de estados) |
| Uma única região viva (`role="status"`, `aria-live="polite"`), com os mesmos anúncios de hoje | unitário (testes atuais de anúncio mantidos) |
| Visitante: "Progresso só neste aparelho" em `saved` e `saving`, e o link "Entrar para salvar na sua conta" sempre | unitário + `GuestGame.test.tsx` + e2e do visitante |
| Visitante em `local-only`: o aviso substitui o texto fixo | unitário |

## 2. `ClueBar` (barra da dica ativa)

Props iguais às de hoje. Só o CSS muda.

| Garantia | Verificação |
| --- | --- |
| Altura sempre igual à `min-height` (52 px; 56 px com anterior/próxima), com qualquer dica (o estado sem palavra não ocorre durante o jogo) | e2e: altura da barra igual em todas as palavras |
| Texto da dica numa linha, cortado no fim com reticências quando não cabe | e2e: `white-space` `nowrap`, `text-overflow` `ellipsis` e `scrollWidth > clientWidth` na dica longa |
| Dica que cabe aparece inteira | e2e: `scrollWidth <= clientWidth` numa dica curta |
| Número e direção nunca cortados | e2e: `scrollWidth <= clientWidth` no `<b>` com a dica longa |
| Região viva com a dica inteira, sem reticências no texto | unitário em `ClueBar.test.tsx` |
| O topo do tabuleiro não se move ao trocar de palavra (computador e celular com teclado) | e2e: `boundingBox().y` do `grid` igual em todas as palavras |
| Janela estreita sem teclado na tela (721 a 860 px, com mouse): a barra na coluna de dicas também fica numa linha | e2e: altura igual e reticências na dica longa |

## 3. Lista de dicas (`ClueList`, também no `ClueSheet`)

| Garantia | Verificação |
| --- | --- |
| Dica resolvida: fundo `--ok-tint`, texto `--ink`, sem risco (`text-decoration-line: none`) | e2e: `getComputedStyle` do botão resolvido comparado aos valores de `:root`, nos dois temas |
| Dica ativa e resolvida: fundo `--word`, visto presente | unitário (classes e visto) + e2e |
| Visto `<svg aria-hidden="true">` só nas resolvidas | unitário em `ClueList.test.tsx` e `ClueSheet.test.tsx` |
| Visto na cor `--ok` (contraste medido em research R7) | e2e: `stroke` computado igual ao de `var(--ok)` |
| Modo leitura: todas as dicas com o visto | e2e: número de botões com `svg` igual ao de palavras |
| Nome acessível igual ao da feature 016 (", resolvida" uma vez só) | testes atuais da 016 continuam passando |
| Acertar ou desfazer a palavra não muda a altura do botão nem do grupo | e2e: `boundingBox().height` antes e depois |
| axe sem violações com uma dica resolvida, nos dois temas | auditoria existente em `ajudas-e-retomada.spec.ts` |

## 4. Faixa de ferramentas e tabuleiro durante a digitação

| Garantia | Verificação |
| --- | --- |
| Digitar 20 letras com salvamentos normais não muda a caixa de nenhum filho da faixa nem do tabuleiro, com conta e como visitante | e2e: `boundingBox()` antes e depois, esperando as respostas do `PUT /api/progress/*` (conta) |
