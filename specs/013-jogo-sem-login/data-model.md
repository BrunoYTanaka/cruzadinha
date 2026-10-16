# Data Model: Jogo sem login e cadastro aberto

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## 1. Progresso de visitante (navegador, IndexedDB)

Banco `cruzadinha-visitante`, versão 1, store `progress`, `keyPath: 'puzzleId'`. Não tem índices: a biblioteca lê tudo com `getAll` (no máximo algumas centenas de registros). Validado ao ler por `guestProgressRecordSchema` (Zod) em `apps/web/src/features/guest/guest-record.ts`.

| Campo | Tipo | Regra |
|---|---|---|
| `v` | `1` | Versão do formato. Outro valor: o registro é descartado (R6). |
| `puzzleId` | UUID | Chave. É o mesmo `puzzleId` da API. |
| `date` | `YYYY-MM-DD` | Data do puzzle, usada pela biblioteca sem precisar abrir a cruzada. |
| `cells` | `(string \| null)[][]` | Letras, no formato de `progressCellsSchema`. Ao abrir, precisa passar por `cellsMatchGrid` com a grade atual; se não passar, o registro é descartado. |
| `elapsedMs` | inteiro de 0 a `MAX_ELAPSED_MS` | Tempo decorrido da partida atual. |
| `status` | `'in_progress' \| 'completed'` | |
| `savedAt` | instante ISO | Relógio do aparelho. O mais recente prevalece entre abas. |
| `completedAt` | instante ISO ou `null` | Preenchido na conclusão. |
| `finishedMs` | inteiro ou `null` | Tempo da conclusão. |
| `bestMs` | inteiro ou `null` | Menor tempo de conclusão. Sobrevive a "Jogar de novo". |
| `bestAt` | instante ISO ou `null` | Vem junto com `bestMs` (os dois nulos ou os dois preenchidos). |
| `help` | `HelpSnapshot` ou `null` | Uso das ajudas, marcas e células travadas, no mesmo formato de `help-storage.ts`. Nunca a solução. |

Nenhum campo guarda a solução, e-mail, senha ou token.

### Transições (funções puras em `apps/web/src/game-logic/guest-progress.ts`)

`decideGuestSave(current | null, incoming, now) → { kind: 'apply', next } | { kind: 'unchanged' }`

| Situação | Resultado |
|---|---|
| Sem registro | `apply`. Se `incoming.status = completed`, já grava conclusão e recorde. |
| `incoming.savedAt < current.savedAt` | `unchanged` (outra aba gravou algo mais novo). |
| `current.status = completed` e `incoming.status = in_progress` | `unchanged` (concluída só reabre por "Jogar de novo"). |
| `current.status = completed` e `incoming.status = completed` | `unchanged` (repetição). |
| `in_progress → in_progress` | `apply` com letras, tempo, ajudas e `savedAt` novos. |
| `in_progress → completed` | `apply`: `completedAt = now`, `finishedMs = elapsedMs`, recorde = menor entre `bestMs` e `elapsedMs` (com `bestAt = now` quando bate o recorde). |

`decideGuestReset(current, now) → next`: `cells` todas nulas, `elapsedMs = 0`, `status = in_progress`, `completedAt`/`finishedMs` nulos, `help = null`, `savedAt = now`. `bestMs`/`bestAt` mantidos.

A leitura e a gravação de cada decisão acontecem numa única transação `readwrite` (R1). Assim, duas abas não perdem a gravação mais nova.

### Situação na biblioteca (`mergeGuestLibrary`, pura)

Para cada `LibraryItem` vindo do servidor (sem sessão: sempre `not_started`), procura o registro pelo `puzzleId`:

| Registro | `status` | Tempos |
|---|---|---|
| ausente ou inválido | `not_started` | nulos (recorde também) |
| `in_progress` sem nenhuma letra | `not_started` | só `bestMs`/`bestAt` |
| `in_progress` com letras | `in_progress` | `elapsedMs`, recorde |
| `completed` | `completed` | `finishedMs`, `completedAt`, recorde |

É a mesma derivação de `toLibraryItem` da API (feature 009), para o calendário (`DayCell`) não mudar.

## 2. Chave de cadastro (configuração da API)

| Variável | Valores | Padrão | Onde |
|---|---|---|---|
| `REGISTRATION_ENABLED` | `true` \| `false` (texto vazio vale como ausente) | `false` | `config.ts` → `ServerConfig.registrationEnabled`. Outro valor impede a API de subir. |

Não é segredo. Entra em `.env.example` como `REGISTRATION_ENABLED=false` e em `render.yaml` com `sync: false` e sem `value`. Um valor no Blueprint seria reaplicado a cada sincronização e desfaria o painel; ausente, vale `false`. O autor muda o valor no painel do Render e reinicia (FR-018).

## 3. Usuário (sem mudança de schema)

`users` continua igual. As contas criadas com convite continuam válidas. O cadastro e o `users create` usam as mesmas regras: `emailSchema` (normalizado, único) e `passwordSchema` (8 a 128), hash argon2id.

## 4. Convites (removidos em dois lançamentos)

| Lançamento | Banco | Código |
|---|---|---|
| **A** (esta feature) | Nada muda: a tabela `invites` e o valor `INVITE_CREATE` no `CHECK` de `rate_limit_attempts` ficam, sem uso. | Sai todo código que lê ou grava convites (R13). `schema.ts` ainda declara `invites`, para o `drizzle-kit` não gerar a remoção antes da hora. |
| **B** (PR seguinte, depois do A no ar) | Migração `0004_drop_invites`: `DROP TABLE invites`; `DELETE FROM rate_limit_attempts WHERE action = 'INVITE_CREATE'`; o `CHECK` refeito com `('LOGIN', 'REGISTER', 'PUZZLE_FETCH')`. | `invites` sai de `schema.ts` e `INVITE_CREATE` de `rateLimitActions`. Saem também os códigos `invalid-invite` e `invite-quota-reached` e o `inviteCode` opcional do pedido de cadastro (R15). |

A migração B é gerada pelo `npm run db:generate -w @cruzadinha/api -- --name drop_invites`. O `DELETE` é acrescentado à mão antes do novo `CHECK`, se o gerador não o incluir. Nunca se usa `drizzle-kit push`.

## 5. Tentativas limitadas (sem mudança de schema no lançamento A)

| Ação | Limite | Mudança |
|---|---|---|
| `LOGIN` | 5 por e-mail e 20 por endereço em 15 min | nenhuma |
| `REGISTER` | 10 por endereço em 1 h | Só conta quando a chave está ligada (com ela desligada, a recusa vem antes). |
| `INVITE_CREATE` | — | Deixa de ser usado no A; os registros saem no B. |
| `PUZZLE_FETCH` | 30 por endereço em 1 h | Agora vale também para visitantes (FR-003). |
