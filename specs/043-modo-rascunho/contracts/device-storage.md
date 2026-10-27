# Contrato: armazenamento no aparelho e interface

## `features/offline` (index.ts)

```ts
loadDraft(owner: string, puzzleId: string): (string | null)[][] | null
saveDraft(owner: string, puzzleId: string, cells: (string | null)[][]): void // vazio remove
clearDraft(owner: string, puzzleId: string): void
```

`owner` é o `userId` ou `'guest'`. Uso interno do `offline`: `listDrafts()` para `protectedIds`, `clearAccountData`, `discardOtherAccounts` e a remoção pelo limite. Falha do `localStorage` nunca lança (via `shared/services/storage`).

Compatibilidade: nenhuma chave existente muda de formato; uma aba com a versão anterior ignora as chaves novas.

## Interface (`DraftControls`)

| Controle | Papel acessível | Estado |
| --- | --- | --- |
| Lápis | `button`, nome "Lápis (rascunho)", `aria-pressed` | ligado/desligado |
| Confirmar rascunho | `button` | `aria-disabled` sem rascunho na palavra ativa |
| Descartar rascunho | `button` | `aria-disabled` sem rascunho na palavra ativa |

- Só aparece jogando (some em modo leitura); presente desde a abertura, para não deslocar a faixa.
- Região `aria-live="polite"`: "Rascunho confirmado" / "Rascunho descartado".
- Célula com rascunho: descrição "rascunho <letra>"; aspecto `.draft` (itálico, peso menor, tamanho menor, token de texto secundário).
