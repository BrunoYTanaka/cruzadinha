# Contract: atualização do site (`features/offline`)

Interface interna do site. Estados e transições em [data-model.md](../data-model.md).

## `installAppUpdate(register, win: AppUpdateWindow = window): () => void`

Chamado uma vez em `main.tsx`, no lugar de `registerSW({ immediate: true })`. Devolve uma limpeza (remove o ouvinte, cancela o timer, volta a `none`), usada pelos testes como um novo carregamento, no padrão de `captureInstallPrompt`.

- `win`: só `location.reload`, `setTimeout`, `clearTimeout`, `document` (`visibilityState`, ouvinte de `visibilitychange`) e `navigator.onLine`; o `window` real satisfaz o tipo.
- `register`: a função `registerSW` de `virtual:pwa-register` (injetada; os testes passam uma falsa).
- Chama `register({ immediate: true, onNeedRefresh, onNeedReload, onRegisteredSW })` e guarda a função devolvida (`updateSW`).
- `onNeedRefresh` → `waiting` (exceto se `dismissed`/`updating`).
- `onNeedReload` → `win.location.reload()` somente se esta aba pediu a atualização.
- `onRegisteredSW(url, registration)` → ouve `visibilitychange` em `win.document`; quando `win.document.visibilityState === 'visible'`, chama `registration.update()` se `registration` existe, não há `registration.installing` e `win.navigator.onLine` é verdadeiro.

## `useAppUpdate(): { status, update, dismiss }`

- `status`: `'none' | 'waiting' | 'dismissed' | 'updating'`.
- `update()`: só age em `waiting`; passa a `updating`, chama `updateSW()`, agenda `win.location.reload()` em 10 000 ms.
- `dismiss()`: só age em `waiting`; passa a `dismissed`.

## `<UpdateNotice />`

Sem props. Renderiza `null` em `none`/`dismissed`. Em `waiting`/`updating`:

```text
Notice variant="info" (role="status")
  texto:   "Saiu uma versão nova do Cruzadinha."
  ação:    "Atualizar"     | em updating: "Atualizando…", pending (desativado, aria-busy)
  Fechar:  presente só em waiting
```

Não toma o foco ao aparecer. Usado só em `pages/library/LibraryPage.tsx`, no topo do conteúdo.

## `Notice` (mudança compatível)

`action?: { label: string; onClick: () => void; pending?: boolean }` — `pending` repassado ao `Button`.

## Exportações em `features/offline/index.ts`

`installAppUpdate`, `UpdateNotice`.
