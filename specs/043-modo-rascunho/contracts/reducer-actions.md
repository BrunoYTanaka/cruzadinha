# Contrato: ações do reducer (domain/game/reducer.ts)

Adições ao tipo `GameAction`; as demais ações mantêm o formato atual.

```ts
| { type: 'setPencil'; on: boolean }
| { type: 'confirmDraft' }
| { type: 'discardDraft' }
| { type: 'hydrate'; cells: (string | null)[][]; help?: HelpSnapshot | null; draft?: (string | null)[][] | null }
```

Garantias (cada uma com teste unitário em `reducer.test.ts`):

1. `isSolved`, `struckWords` e o corpo enviado pelas filas de salvamento dependem só de `cells`; nenhuma ação do lápis escreve em `cells`, exceto `confirmDraft`.
2. Em `mode: 'completed'` as três ações novas não mudam o estado; `draft` fica vazio.
3. `hydrate` com `draft` de forma diferente da grade ignora o rascunho (não a ação inteira).
4. `type`/`backspace`/`delete` com o lápis movem o cursor exatamente como sem o lápis.

Exportações de apoio (`domain/game/draft.ts`): `pruneDraft(state)`, `wordHasDraft(index, state)`, `hasAnyDraft(draft)`.
