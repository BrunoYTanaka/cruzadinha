# Contrato: uso da API pelo front

**Feature**: [spec.md](../spec.md) | **Modelo**: [data-model.md](../data-model.md)

A API não muda. Este documento fixa, para o cliente, quais rotas cada tela chama, em que ordem e como cada resposta vira comportamento visível. Os schemas de corpo e resposta vêm de `@cruzadinha/shared`; toda resposta entra como `unknown` e passa pelo schema Zod correspondente antes de ser usada. Respostas fora do contrato viram o erro genérico "algo deu errado" (nunca mostram o corpo). Todas as chamadas usam o mesmo domínio (`/api/*`, cookie de sessão `HttpOnly`) e `fetch` com `credentials: 'same-origin'`.

## Cliente único (`api/client.ts`)

- Devolve o corpo validado ou lança `ApiRequestError { status, code?, retryAfterSeconds? }`.
- `code` vem de `apiErrorSchema` quando o corpo é um erro conhecido; senão fica ausente.
- Em `429`, lê o cabeçalho `Retry-After` (segundos) para `retryAfterSeconds`.
- Em `401` com `code: 'unauthenticated'`, chama o tratador registrado por `setUnauthenticatedHandler`: fora da rota `/jogo` limpa a sessão em cache e redireciona ao login com o endereço de origem (exceto em `/login` e `/cadastro`); **na rota `/jogo` não redireciona**: marca a sessão como expirada, o jogo segue, as letras ficam na fila local e o `ReloginDialog` abre por cima do tabuleiro (FR-032).
- Guarda a diferença entre o cabeçalho `Date` de cada resposta e o relógio do aparelho (`getServerClockOffsetMs()`), usada para o `savedAt` dos salvamentos.
- Falha de rede (sem resposta) vira `ApiRequestError { status: 0 }`, tratada como "sem conexão".

## Por tela

### Login e cadastro

| Ação | Rota | Sucesso | Erros e comportamento |
|---|---|---|---|
| Entrar | `POST /api/auth/login` `{ email, password }` | `200 { user }` → vai ao endereço de origem ou à biblioteca | `401 invalid-credentials` → "E-mail ou senha incorretos."; `400 invalid-input` → destaca os campos de `fields`; `429` → "Muitas tentativas. Tente de novo em N minutos." |
| Criar conta | `POST /api/auth/register` `{ email, password, inviteCode }` | `201 { user }` → biblioteca | `400 invalid-invite` → "Convite inválido."; `409 registration-failed` → "Não foi possível criar a conta."; `400 invalid-input`; `429` como acima |
| Sair | `POST /api/auth/logout` | `204` → limpa o cache e vai ao login | falha de rede: ainda assim limpa o cache local e vai ao login |
| Guarda de sessão | `GET /api/auth/me` | `200 { user }` | `401` → login com retorno (fora do tabuleiro) |

As mensagens de login e cadastro nunca dizem se o e-mail existe nem qual foi o motivo da recusa do convite.

### Biblioteca

| Ação | Rota | Sucesso | Erros e comportamento |
|---|---|---|---|
| Carregar o calendário | `GET /api/library` | `200 { items }` (até 366) | `401` → login; falha de rede ou `5xx` → estado de erro com "Tentar de novo" |
| Abrir um dia guardado | (sem chamada) | navega a `/jogo/:puzzleId` | |
| Abrir hoje | usa o item de hoje se existir; senão `/dia/<hoje>` | | |

### Dia passado não guardado (`/dia/:date`)

| Ação | Rota | Sucesso | Erros e comportamento |
|---|---|---|---|
| Buscar | `GET /api/puzzles?level=daily&date=YYYY-MM-DD` | `200 { puzzleId, puzzle, solution }` → guarda no cache e redireciona a `/jogo/:puzzleId` (`replace`) | `404 puzzle-unavailable` → "Não há cruzada neste dia." e grava `cruzadinha:no-puzzle:<date>`; `502 puzzle-source-failed` → "A fonte está fora do ar agora. Tente mais tarde." e grava `cruzadinha:source-down` (10 minutos; a biblioteca mostra "Novas cruzadas não podem ser buscadas agora"); uma busca que funcione apaga a chave; `429 too-many-attempts` → "Muitas buscas seguidas. Tente de novo em N s."; `400 invalid-input` (data inválida) → página não encontrada |

### Jogo

| Ação | Rota | Sucesso | Erros e comportamento |
|---|---|---|---|
| Carregar a cruzada | `GET /api/puzzles/:id` | `200 { puzzleId, puzzle, solution }` | `404` → "Cruzada não encontrada." com volta à biblioteca; `500` → erro genérico |
| Carregar o progresso (em paralelo) | `GET /api/progress/:puzzleId` | `200 { progress }` ou `{ progress: null }` | `404` como acima |
| Salvar | `PUT /api/progress/:puzzleId` `{ cells, elapsedMs, status, savedAt }` (`savedAt` = relógio do aparelho + desvio do servidor) | `200 { progress }` | `409 progress-completed` num corpo `in_progress` → para o reenvio, mantém as letras no aparelho e mostra "Esta cruzada já foi concluída em outro aparelho" com "Ver como ficou" (não tira a pessoa do jogo); um `200` repetido da própria conclusão não mostra nada; `400 invalid-input` por `savedAt` → repete uma vez com a hora do cabeçalho `Date`, e por outro campo → erro interno do app (não repete); `401` → mantém a fila e abre o `ReloginDialog` (na rota `/jogo`); falha de rede ou `5xx` → fila local, `SaveStatus` "Sem conexão, tentando de novo" e reenvio (ver research R6) |
| Concluir | `PUT` com `status: 'completed'` quando `isSolved` | `200 { progress }` com `completedAt`, `finishedMs`, `bestMs` | a janela de conclusão **abre na hora**, sem esperar a resposta; sem rede, mostra o tempo da pessoa, o aviso "Vamos registrar quando a conexão voltar" e "Melhor tempo" em "—"; o envio é repetido com prioridade e o melhor tempo aparece quando confirmar |
| Jogar de novo | `POST /api/progress/:puzzleId/reset` | `200 { progress }` → zera o jogo e o armazenamento de ajuda daquela cruzada | sem rede (`status: 0`) → "Sem conexão. Tente de novo quando voltar"; erro do servidor → "Não foi possível reiniciar. Tente de novo."; nos dois casos mantém o modo leitura e não reinicia localmente |

Reenvio depois do novo login: ao fechar o `ReloginDialog` com sucesso, o `save-queue` envia a fila local sem recarregar a página.

Abertura da cruzada: se `progress.status === 'completed'`, abre em modo leitura com as letras do progresso. Se `in_progress`, hidrata `cells` e `elapsedMs`. Se a fila local tiver `savedAt` mais novo que o `savedAt` do servidor, reenvia a fila antes de seguir.

### Convite (Konami)

| Ação | Rota | Sucesso | Erros e comportamento |
|---|---|---|---|
| Criar convite | `POST /api/invites` | `201 { code, expiresAt }` → abre a janela com o código e consulta `GET /api/invites` para a contagem | `409 invite-quota-reached` → janela de cota cheia; `429` → "Muitas tentativas. Tente de novo em N min."; `401` → login com retorno |
| Contar convites ativos | `GET /api/invites` | `200 { invites }` → N com `status: 'active'` e o menor `expiresAt` | falha: a janela mostra só o código, sem a contagem |

O código aparece só na resposta do `POST`; ele fica em memória enquanto a janela estiver aberta e nunca vai a `localStorage`, ao console nem a log.

## Itens que o front não faz

- Não chama `GET /api/puzzles?date=` para dias futuros (a biblioteca os marca como indisponíveis sem tentar).
- Não envia ajuda, marcas nem tema ao servidor.
- Não repete a regra de cota de convites nem o limite de buscas (ambos são do servidor).
