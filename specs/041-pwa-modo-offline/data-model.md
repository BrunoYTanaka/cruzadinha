# Data Model: PWA e modo offline (041)

Tudo fica no aparelho. **Nenhuma tabela, migração ou contrato da API muda** (sem DDE/ERD novo).

## 1. Cruzada guardada: IndexedDB `cruzadinha-offline`, store `puzzles`

| Campo | Tipo | Regra |
|---|---|---|
| `puzzleId` | string (keyPath) | igual ao `puzzleId` da API |
| `response` | `PuzzleResponse` | validado com `puzzleResponseSchema` ao ler; inválido → apagado e tratado como ausente |
| `source` | `PuzzleSourceId` | de `response.puzzle` |
| `date` | ISO date | de `response.puzzle` |
| `openedAt` | number (ms) | atualizado a cada abertura; índice `by-openedAt` |

- Escrito: ao abrir uma cruzada vinda da rede (FR-002), ao baixar as de hoje (FR-014), e `openedAt`
  atualizado ao abrir da cópia.
- Limite: `OFFLINE_PUZZLE_LIMIT = 60`. Depois de cada escrita, se passar do limite, remove as de menor
  `openedAt`, **exceto** as protegidas: a que acabou de ser aberta, as com outbox de qualquer conta,
  as em andamento no `guestStore` e as em andamento no progresso conhecido (FR-013).
- Não é apagado no logout (conteúdo público; clarificação 5).

## 2. Progresso conhecido da conta: mesmo banco, store `known-progress`

| Campo | Tipo | Regra |
|---|---|---|
| `[userId, puzzleId]` | chave composta | |
| `progress` | `Progress` (de `shared`) | validado ao ler |

- Escrito quando `getProgress` responde e quando a fila confirma um envio (só para cruzadas guardadas).
- Lido por `useGameData` quando a conta abre uma cruzada guardada e o progresso não vem do servidor
  (sem rede ou servidor não pronto).
- Apagado: todas as entradas do `userId` no logout; todas as de outro `userId` quando uma conta
  diferente entra.

## 3. Gravação pendente (outbox): `localStorage` `cruzadinha:outbox:<userId>:<puzzleId>`

Chave existente (feature 008/013). Formato novo, lido de forma tolerante:

```text
OutboxEntry =
  | SaveProgressRequest                              // formato atual, lido como save
  | { v: 2, items: OutboxItem[] }                    // 1 ou 2 itens, em ordem
OutboxItem = { kind: 'save', body: SaveProgressRequest } | { kind: 'reset', at: ISO datetime }
```

Transições (por conta e cruzada):

| Estado | Evento | Novo estado |
|---|---|---|
| vazio | save S | `[save S]` |
| `[save A]` | save S | `[save S]` (só o mais recente; FR-009) |
| qualquer | reset R | `[reset R]` |
| `[reset R]` / `[reset R, save A]` | save S | `[reset R, save S]` |
| `[reset R, …]` | reset confirmado | `[…resto]` |
| `[save S]` | save confirmado com `savedAt ≥ S.savedAt` | vazio |
| qualquer | logout dessa conta (confirmado) | apagado |
| qualquer | login de outra conta | apagado (com aviso) |
| qualquer | 401 / sessão expirada | inalterado (clarificação 1) |

Envio: `reset` → `POST /api/progress/:id/reset` (`resetProgress`, o mesmo da tela); `save` →
`PUT /api/progress/:id` (`saveProgress`). O reset não leva `savedAt`: reenviado depois, ele reinicia o
que estiver no servidor naquele momento, inclusive progresso feito em outro aparelho no intervalo
(risco aceito; ver plano, Complexity Tracking).
`429`, `5xx` e rede: espera `BACKOFF_MS` e repete. `409 progress-completed`: descarta o `save` e o jogo
mostra o estado real ("concluída em outro aparelho", já existente). `401`: para tudo e mantém.

## 4. Último usuário conhecido: `localStorage` `cruzadinha:last-user`

`User` (`{ id, email }`, validado com `userSchema`). Escrito quando a sessão é lida ou no login;
apagado no logout e quando o servidor responde sem sessão. Usado só para montar o visitante/conta sem
rede (R4).

## 5. Estado de conexão e instalação (memória, sem persistência)

- `online: boolean` de `navigator.onLine` + eventos.
- `installPrompt: BeforeInstallPromptEvent | null`, `installed: boolean` (display-mode standalone ou
  `appinstalled`).

## Limpeza no logout (FR-017)

Apaga: outbox da conta, `known-progress` da conta, `last-user`, cache do TanStack Query (já feito).
Mantém: store `puzzles`, banco do visitante, configurações do aparelho (decisão: não são dado pessoal, ver FR-017).
