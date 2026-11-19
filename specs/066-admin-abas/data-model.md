# Data Model: Administração em abas

Sem tabela, coluna ou migração nova. DDE e ERD não mudam.

## Aba da Administração (site, só em memória e na URL)

| Campo | Tipo | Regra |
|-------|------|-------|
| `id` | `'fontes' \| GeneratedSourceId` | Valor de `?aba=`. Fora da lista conhecida → `'fontes'` (`resolveAdminTab`) |
| `name` | texto | "Fontes" ou `puzzleSourceNames[id]` |
| `caption` | texto | "ordem e visibilidade" ou "fonte gerada" |

Ordem: "Fontes" primeiro, depois as fontes geradas na ordem de `GET /api/admin/generated`. Com a lista em erro, só "Fontes".

## Rascunhos (site, estado local de cada painel)

- **Fontes**: `draft: Row[] | null` (ordem e visibilidade), como em 060.
- **Fonte gerada**: `size: number` (9 a 15, só pelo Contador), `difficulty: Difficulty`. `dirty` = diferente de `view.gridSize`/`view.difficulty`. Some só ao recarregar ou sair da página.
- **Resultados**: `saveResult` e `discardResult` (`{ variant: 'ok' | 'info' | 'error'; text }` ou `null`), um por painel de fonte gerada.

## `GeneratedSourceView.today` (shared, resposta de `GET /api/admin/generated`)

Campo novo:

| Campo | Tipo | Regra |
|-------|------|-------|
| `difficulty` | `Difficulty \| null`, opcional | Dificuldade com que a cruzada de hoje foi gerada, lida do título `Dificuldade: <rótulo>` (`parseDifficultyTitle`). `null` se o título não casar; ausente numa API anterior |

Funções em `shared` (`sources/generated-settings.ts`):

- `difficultyTitle(d) => 'Dificuldade: ' + difficultyLabels[d]` (usada pela geração).
- `parseDifficultyTitle(title: string | null) => Difficulty | null` (inversa; ida e volta testada para as três).
