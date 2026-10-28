# Data Model: Diálogo com atalhos de teclado

Nada é gravado (sem IndexedDB, `localStorage` ou API). A única "entidade" é a tabela constante em `apps/web/src/features/game/helpers/shortcuts.ts`.

## Shortcut

| Campo | Tipo | Regra |
|---|---|---|
| `keys` | `ShortcutKey[]` | Uma ou mais teclas mostradas juntas (as quatro setas são um atalho). |
| `action` | `BoardKey['type']` \| `'releaseTab'` \| `'openShortcuts'` \| `'letter'` | O que o tabuleiro (ou a página, para `openShortcuts`) faz. |
| `description` | `string` | Curta, em português. |

## ShortcutKey

| Campo | Tipo | Regra |
|---|---|---|
| `key` | `string` \| `null` | Valor de `KeyboardEvent.key` (`'ArrowUp'`, `'Tab'`, `'?'`...). `null` para "A a Z" (qualquer caractere único). |
| `shift` | `boolean` | `true` só em Shift+Tab. Para `?`, Shift é ignorado (o caractere decide). |
| `label` | `string` | Texto visível em `<kbd>` (`'Tab'`, `'Shift+Tab'`, `'↑'`, `'A a Z'`). |
| `spoken` | `string?` | Nome lido quando `label` é símbolo (`'seta para cima'`). |

## ShortcutGroup

`{ title: string; shortcuts: Shortcut[] }`, em ordem de exibição:

| Grupo | Atalhos (teclas → ação) |
|---|---|
| Mover | ↑ ↓ ← → → `arrow` (move e ajusta a direção); Home → `wordStart`; End → `wordEnd`; Tab → `nextWord`; Shift+Tab → `previousWord` |
| Escrever | A a Z → `letter` (escreve e avança; acentos viram a letra simples, Ç vale); Backspace → `backspace` (apaga e volta); Delete → `delete` (apaga sem mover) |
| Sair do tabuleiro | Esc → `releaseTab` (o próximo Tab sai do tabuleiro) |
| Ajuda | ? → `openShortcuts` (abre esta lista) |

## resolveBoardKey(key, shiftKey) → BoardKey \| 'releaseTab' \| null

- Percorre `SHORTCUT_GROUPS`; devolve a ação do primeiro `ShortcutKey` com `key` igual (e `shift` igual, para Tab).
- `'?'` → `null` (quem trata é a página, R3).
- Sem correspondência e `key.length === 1` → `{ type: 'letter', key }` (entrada "A a Z").
- Qualquer outra tecla → `null` (o navegador segue normal).
- Ctrl/Alt/Meta continuam recusados antes, no `Board`, como hoje.

Invariante testada (SC-002): toda tecla da tabela (exceto `?`) resolve para a ação declarada, e toda ação de `BoardKey` aparece em pelo menos um atalho da tabela.
