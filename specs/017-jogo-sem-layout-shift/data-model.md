# Data Model: Tela de jogo sem saltos e dica resolvida mais visível

Nada é persistido nem muda de forma. API, `shared`, Postgres, IndexedDB do visitante e `localStorage` ficam iguais.

## 1. Estado do salvamento (`SaveState`, existente)

`'saved' | 'saving' | 'offline' | 'session-expired' | 'completed-elsewhere' | 'local-only'`, vindo de `save-queue.ts` (conta) ou `guest-save-queue.ts` (visitante). O tipo e as transições não mudam; muda só o que a tela mostra:

| Estado | Conta: texto visível | Visitante: texto visível | Anúncio (igual a hoje) |
| --- | --- | --- | --- |
| `saved` | nenhum | "Progresso só neste aparelho" | "Conexão restabelecida" se vinha de `offline` |
| `saving` | nenhum | "Progresso só neste aparelho" | nenhum |
| `offline` | "Sem conexão, tentando de novo" (aviso) | não ocorre | "Sem conexão, tentando de novo" |
| `session-expired` | "Sessão expirada" | não ocorre | limpa |
| `completed-elsewhere` | "Concluída em outro aparelho" | não ocorre | limpa |
| `local-only` | "Não salvo: vale só nesta aba" (aviso) | "Não salvo: vale só nesta aba" (aviso) | "Não salvo: vale só nesta aba" |

O visitante tem também o link "Entrar para salvar na sua conta" em todos os estados e ouve "Seu progresso fica salvo só neste aparelho." ao abrir.

## 2. Dica ativa (`Word | null`, existente)

A barra mostra `word.number`, `directionName(word.direction)` e `word.clue`, ou "Escolha uma célula para começar." sem palavra (estado que não ocorre durante o jogo: a cruzada abre com a primeira palavra horizontal escolhida). O texto não é cortado nos dados; o corte com reticências é só visual.

## 3. Dica resolvida (`struck`, existente, feature 016)

`ReadonlySet<string>` com `wordKey(word)`. A regra e o nome não mudam; muda a aparência do estilo `.done` (fundo de sucesso e visto, sem risco).
