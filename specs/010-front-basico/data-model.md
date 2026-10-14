# Modelo de dados: Front básico do Cruzadinha

**Feature**: [spec.md](./spec.md) | **Plano**: [plan.md](./plan.md) | **Pesquisa**: [research.md](./research.md)

Nenhuma tabela, coluna ou schema novo no servidor nem em `packages/shared`. Os tipos de servidor (`Puzzle`, `Solution`, `PuzzleResponse`, `Progress`, `SaveProgressRequest`, `LibraryItem`, `User`, `CreatedInvite`, `InviteList`) vêm de `@cruzadinha/shared`. Abaixo estão só os tipos do próprio front e os registros guardados no aparelho.

## 1. Estado da partida (`game-logic/state.ts`)

```ts
type Direction = 'across' | 'down'
type Position = { row: number; col: number }
type HelpMark = 'helped' | 'wrong'          // roxo | vermelho

type GameState = {
  cells: (string | null)[][]                 // letras do jogador; null em bloco ou vazia
  selected: Position | null
  direction: Direction
  locked: boolean[][]                        // células reveladas (não editáveis)
  marks: Record<string, HelpMark>            // chave "linha,coluna"; só células afetadas por ajuda
  usage: { letters: number; words: number }  // usos de revelar letra e revelar palavra
  mode: 'playing' | 'completed'              // completed = modo leitura
  completion: 'none' | 'pending' | 'confirmed' // pending = concluída aqui, ainda sem confirmação do servidor
  elsewhere: boolean                         // true = servidor avisou que outro aparelho concluiu
}

type GameLimits = { letters: number; words: number } // de config.ts
```

| Campo | Regra |
|---|---|
| `cells` | Mesmas dimensões da grade; só letras maiúsculas A–Z e Ç; bloco sempre `null`. Vai ao servidor em `PUT /api/progress`. |
| `selected` | Nunca aponta para bloco. Em `mode: 'completed'` é `null` e as ações de edição são ignoradas. |
| `locked` | `true` só em célula revelada por ajuda; digitar ou apagar nela não faz nada. |
| `marks` | `wrong` só entre uma verificação e a próxima edição da célula (que a torna `helped`). Célula sem ajuda não tem entrada. |
| `usage` | `letters ≤ limits.letters` e `words ≤ limits.words`; verificar não tem contador. |
| `completion` | `none` enquanto `mode` for `playing`; vira `pending` no instante em que a grade fica correta e `confirmed` quando o servidor confirma; só `confirmed` mostra o melhor tempo. |
| `elsewhere` | Só avisa; não muda `mode` nem bloqueia edição. O modo leitura só entra se a pessoa escolher "Ver como ficou". |

### Ações do reducer

`select`, `toggleDirection`, `type(letter)`, `backspace`, `move(arrow)`, `nextWord`, `previousWord`, `selectWord(number, direction)`, `revealLetter`, `revealWord`, `verify`, `hydrate(progress, help)`, `confirmCompletion(progress)`, `markElsewhere`, `viewServerProgress(progress)`, `reset`.

### Transições principais

| De | Ação | Para |
|---|---|---|
| célula X selecionada, direção D | `select(X)` repetido | mesma célula, direção alternada |
| célula vazia ou com letra, não travada | `type(L)` | `cells[X] = L`; seleção avança para a próxima célula aberta da palavra; fica na última letra se for o fim da palavra; se X era `wrong`, vira `helped` |
| célula com letra | `backspace` | letra apagada e seleção volta uma célula (apagar na primeira célula não sai da palavra) |
| célula X selecionada, letra errada ou vazia, `usage.letters < limite` | `revealLetter` | letra certa, X travada e `helped`, `usage.letters + 1` |
| palavra ativa com alguma célula errada ou vazia, `usage.words < limite` | `revealWord` | células corrigidas, travadas e `helped`; certas viram `helped`; `usage.words + 1` |
| qualquer | `verify` | cada célula preenchida: certa → `helped`, errada → `wrong`; vazia sem marca; sem letras, nada |
| `playing` e `isSolved(state, solution)` | (derivado após cada mudança) | `mode: 'completed'`, `completion: 'pending'` e a janela de conclusão abre na hora; o hook envia o salvamento `completed` |
| `completion: 'pending'` | `confirmCompletion(progress)` | `completion: 'confirmed'` com `completedAt`, `finishedMs` e `bestMs` do servidor |
| `playing` | `markElsewhere` | `elsewhere: true`; segue editável |
| `playing` e `elsewhere` | `viewServerProgress(progress)` | `mode: 'completed'`, `completion: 'confirmed'`, letras do servidor |
| `completed` | `reset` | `cells` vazias, `usage` e `marks` zerados, `mode: 'playing'` |

`isSolved(state, solution)`: toda célula aberta tem a letra da solução. A comparação ignora marcas e travas.

## 2. Registros no aparelho (`localStorage` e `sessionStorage`)

Toda leitura e escrita passa por `lib/storage.ts`, que captura exceções (modo privado, armazenamento bloqueado ou limpo) e devolve valor ausente; a aplicação funciona sem ele.

| Chave | Valor | Escopo | Observação |
|---|---|---|---|
| `cruzadinha:theme` | `"auto" \| "light" \| "dark"` | aparelho | lido por script inline antes da primeira pintura |
| `cruzadinha:help:<userId>:<puzzleId>` | `{ usage: { letters, words }, marks: Record<"r,c", "helped"\|"wrong"> , locked: "r,c"[] }` | usuário e cruzada | zerado em "jogar de novo" |
| `cruzadinha:outbox:<userId>:<puzzleId>` | corpo do último `PUT /api/progress` não confirmado (`SaveProgressRequest`) | usuário e cruzada | apagado quando o servidor confirma |
| `cruzadinha:no-puzzle:<date>` (`sessionStorage`) | `"1"` | sessão do navegador | dia em que a fonte respondeu 404 |
| `cruzadinha:source-down` | hora em milissegundos (inteiro) | aparelho | gravada no `502` de `/dia/:date`, apagada quando uma busca funciona; a biblioteca só mostra o aviso se tiver menos de 600000 ms (10 minutos) |

Nenhum registro contém senha, token, código de convite nem solução. O `userId` evita que duas contas no mesmo aparelho compartilhem ajudas.

## 3. Calendário (`features/library/calendar.ts`)

```ts
type DayState =
  | { kind: 'completed'; finishedMs: number; puzzleId: string }
  | { kind: 'in_progress'; puzzleId: string }
  | { kind: 'not_started'; puzzleId: string }
  | { kind: 'future' }
  | { kind: 'fetchable' }     // passado, não guardado
  | { kind: 'none' }          // fonte já disse que não há cruzada neste dia

type MonthView = { year: number; month: number; leadingBlanks: number; days: { date: string; day: number; isToday: boolean; state: DayState }[] }
```

Regras: domingo é o primeiro dia da semana; "hoje" é a data de Brasília; `completed` mostra `finishedMs` formatado `mm:ss`; o primeiro mês navegável é o de 12 meses antes de hoje e o último é o mês atual mais o que houver de futuro até o fim do mês corrente.

## 4. Sessão e convites (cliente)

- **Sessão expirada no jogo**: estado em memória (contexto) com `expired: boolean` e `lastUser: User | null`; não vai a armazenamento. Enquanto `expired`, o jogo segue, as letras ficam na fila local e o `ReloginDialog` aceita só o e-mail de `lastUser`.
- **Desvio do relógio**: `serverClockOffsetMs`, em memória, calculado pelo cabeçalho `Date` das respostas; `savedAt` = relógio do aparelho + desvio.
- **Sessão**: `User` (`id`, `email`) da consulta `GET /api/auth/me`, em cache do TanStack Query; ausente ou 401 significa sem sessão.
- **Convite criado**: `CreatedInvite` (`code`, `expiresAt`) mantido só na memória do diálogo; fechar o diálogo descarta o código.
- **Convites ativos**: contagem de `InviteList.invites` com `status === 'active'` e a menor `expiresAt` entre eles.

## 5. Relações

```text
Sessão ──(userId)──▶ chaves de armazenamento por usuário
Cruzada (Puzzle + Solution) ──┬─▶ Estado da partida ──(letras, tempo)──▶ Progresso (servidor)
                              └─▶ Ajuda usada (aparelho) ──▶ marcas na grade
Biblioteca (LibraryItem[]) ──▶ Calendário (DayState por dia) ──▶ /jogo/:puzzleId ou /dia/:date
```
