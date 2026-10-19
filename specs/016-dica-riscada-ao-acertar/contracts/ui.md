# UI Contract: Dica riscada só ao acertar a palavra

## Regra pura (`apps/web/src/game-logic/clue-strike.ts`)

```ts
export type StrikeMode = 'solved'
export function wordKey(word: Word): string // "6across"
export function isWordSolved(index: PuzzleIndex, cells: (string | null)[][], solution: Solution, word: Word): boolean
export function struckWords(index: PuzzleIndex, cells: (string | null)[][], solution: Solution, mode: StrikeMode): ReadonlySet<string>
```

- `isWordSolved`: verdadeiro só se toda célula de `index.cellsOf(word)` tem letra igual a `plainLetter` da solução.
- `struckWords` com `'solved'`: chaves de todas as palavras para as quais `isWordSolved` é verdadeiro. O `switch` sobre `mode` é exaustivo.

## `useGame`

- Passa a devolver `struck: ReadonlySet<string>` (memorizado por `game.index`, `solution` e `state.cells`), além do que já devolve.

## `ClueList` e `ClueSheet`

- A prop `filled` vira `struck` (mesmo tipo `ReadonlySet<string>`).
- Dica com a chave em `struck`:
  - classe `.done` (cor `--mute`, `line-through` de 1 px, número incluído), sem mudança visual em relação à feature 011;
  - nome acessível do botão termina com ", resolvida" (por exemplo "1 Casa de morar, resolvida"; antes ", preenchida").
- Dica fora de `struck` (vazia, incompleta ou completa e errada): sem classe `.done` e sem texto extra.
- A dica ativa (`aria-current="true"`) pode estar riscada ao mesmo tempo: mantém o fundo `--word` e o risco, com o texto em `--ink` (`.active.done`), porque `--mute` sobre `--word` fica em 4,44:1 no tema escuro, abaixo de 4,5:1. A combinação já existia antes (preenchida e ativa), mas nenhum teste a cobria; o axe do e2e (T013) a encontrou.

## Fora do contrato (não mudam)

- `ClueBar`/`WordBar`: sem risco.
- Tabuleiro (`Board`, `Cell`): sem cor ou marca para palavra certa.
- Ajuda "verificar", contadores de ajuda, relógio, conclusão, recorde, salvamento (conta e visitante) e API.
