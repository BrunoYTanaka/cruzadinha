# Contratos do site: Jogo sem login e cadastro aberto

Mudanças em relação a `specs/010-front-basico/contracts/ui-contracts.md`. Textos em português do Brasil (FR-023).

## Rotas

| Rota | Antes | Agora |
|---|---|---|
| `/` (biblioteca) | exigia sessão | Aberta. Visitante: itens da API juntados com o IndexedDB (`mergeGuestLibrary`). |
| `/dia/:date` | exigia sessão | Aberta; mesmas mensagens de 404, 502 e 429. |
| `/jogo/:puzzleId` | exigia sessão | Aberta. Visitante: progresso no IndexedDB. Logado: servidor, como hoje. |
| `/login` | — | Ganha os links "Jogar sem entrar" (para `/`) e "Criar conta" (só com o cadastro aberto). Continua com `?next=`. |
| `/cadastro` | e-mail, senha e convite | E-mail e senha. Com o cadastro fechado (ou sem resposta do servidor): "O cadastro está fechado no momento." e o link "Entrar". |
| `/status` | — | sem mudança |

O `viewerLoader` substitui o `requireSessionLoader`: só garante que a consulta de sessão (que agora resolve `null` sem sessão) terminou.

## Quem está usando

- `useViewer()` → `{ kind: 'guest' } | { kind: 'user', user }`.
- **Cabeçalho**:
  - visitante: o texto "Visitante" e o botão "Entrar" (`/login?next=<rota atual>`);
  - logado: o e-mail da conta e "Sair", que agora volta para `/` como visitante.
- **Tela de jogo do visitante**: no lugar do `SaveStatus` do servidor, a linha "Salvo neste aparelho" e o link "Entrar para salvar na sua conta". Não bloqueia nada e é anunciada uma vez por `aria-live="polite"`.
- **Sessão que terminou fora do tabuleiro**: `Notice` no `AppLayout` com "Sua sessão terminou. Você está como visitante." e o botão "Entrar". Some ao entrar ou ao fechar.
- **Sessão que terminou no tabuleiro**: sem mudança (FR-032 da feature 010).

## Diferenças do jogo do visitante

| Item | Logado (sem mudança) | Visitante |
|---|---|---|
| Onde salva | fila com debounce para a API, com reenvio no `localStorage` | IndexedDB a cada mudança (R4) |
| Avisos de rede ao salvar | sim | nunca |
| Janela de conclusão sem conexão | "Vamos registrar quando a conexão voltar" | Sempre na hora, com o tempo e o recorde do aparelho, sem esse aviso. |
| "Jogar de novo" | exige o servidor | Local, também sem conexão. Mantém o recorde. |
| "Concluída em outro aparelho" | sim | não existe |
| Ajudas | `localStorage` por conta | dentro do registro do visitante |
| Sem armazenamento | — | `Notice`: "Seu navegador não deixou guardar o progresso. Ele vale só enquanto esta aba estiver aberta." |

## Armazenamento no aparelho

| Chave ou banco | Dono | Conteúdo |
|---|---|---|
| IndexedDB `cruzadinha-visitante` / store `progress` (novo) | visitante | [data-model.md §1](../data-model.md) |
| `cruzadinha:outbox:<userId>:<puzzleId>` | conta | sem mudança |
| `cruzadinha:help:<userId>:<puzzleId>` | conta | sem mudança |
| `cruzadinha:theme`, `cruzadinha:board-size`, `cruzadinha:library-width` | aparelho | sem mudança |

Os dados de visitante nunca são lidos nem apagados enquanto há sessão, e os dados da conta nunca são lidos como de visitante (FR-011, FR-012).

## Removido

- `features/invites` (`KonamiListener`, `InviteDialog`, `konami.ts`), `api/invites.ts` e `queryKeys.invites`. A sequência Konami não faz mais nada.
- O campo "Código do convite" e as mensagens de convite em `features/auth/messages.ts`.

## Mensagens novas (`features/auth/messages.ts`)

| Código | Texto |
|---|---|
| `registration-closed` | "O cadastro está fechado no momento." |

## Acessibilidade (FR-023, SC-007)

- "Entrar", "Jogar sem entrar" e "Criar conta" são links reais, alcançáveis pelo teclado, com foco visível.
- O texto "Visitante" fica no cabeçalho, e não só num ícone.
- Os avisos novos usam o `Notice` existente: `role="status"` para informação e `role="alert"` só onde já era usado.
- O `vitest-axe` roda na biblioteca e no jogo de visitante, no login e no cadastro (aberto e fechado), e no aviso de sessão terminada.
