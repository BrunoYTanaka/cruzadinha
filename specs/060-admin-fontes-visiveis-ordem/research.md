# Research: Painel de admin para esconder e reordenar fontes

## R1. Onde guardar visibilidade e ordem

- **Decision**: tabela `source_settings` com uma linha por fonte (`source_id` único, `visible`, `position`). Sem linhas, vale o padrão: todas visíveis na ordem de `puzzleSourceIdSchema.options`. Fonte do código sem linha entra visível no fim.
- **Rationale**: muda sem deploy (FR-015), sobrevive a reinício, e o "sem configuração" funciona sem seed.
- **Alternatives**: variável de ambiente (exige reinício e painel do Render); um único registro JSON (perde o `source_id` único e a verificação por linha).

## R2. Cache da configuração

- **Decision**: sem cache no servidor; cada pedido de puzzle por data, biblioteca ou `/api/sources` lê no máximo 4 linhas. No site, a consulta tem `staleTime` de 30 s e `refetchOnWindowFocus`.
- **Rationale**: a alteração aparece em até 1 minuto sem invalidação entre instâncias; o custo é uma consulta indexada trivial.
- **Alternatives**: cache em memória com TTL (inútil com mais de uma instância e dá estado para testar).

## R3. Resposta para quem não é admin

- **Decision**: hook `onRequest` nas rotas `/api/admin/*` que resolve a sessão e, se não houver usuário admin, chama `reply.callNotFound()`. `onRequest` roda antes da leitura do corpo, então corpo inválido, tipo de conteúdo errado ou campo faltando não distinguem a rota de uma inexistente. Um cookie inválido é apagado como nas outras rotas e também recebe o `404`.
- **Rationale**: `callNotFound` usa o mesmo tratador do Fastify de uma rota que não existe (não há `setNotFoundHandler` no projeto), então o corpo é igual; sem `401`, a sessão de uma conta comum não cai no site (clarificação 2).
- **Alternatives**: `preHandler` (roda depois do parse do corpo, vazaria a rota com um `400`); `403` (revela a rota).

## R4. Papel de admin

- **Decision**: coluna `users.is_admin boolean not null default false`, lida junto com o usuário em `authenticate` (já há uma consulta por pedido); `AuthUser` ganha `isAdmin`. Alterado só pela CLI: `users set-admin --email <e> [--remove]` e `users create --email <e> --admin`.
- **Rationale**: vale no pedido seguinte (FR-011) e some o acesso na hora ao retirar (US3 cenário 4), sem guardar o papel na sessão.
- **Alternatives**: papel dentro do token da sessão (não revoga na hora); tabela de papéis (excesso para um papel só).

## R5. Como o site descobre as fontes e se a conta é admin

- **Decision**: `GET /api/sources` público devolve só as visíveis, em ordem: `{ sources: PuzzleSourceId[] }`. `userSchema` ganha `isAdmin` (lido como `false` se faltar, para API anterior). O site usa `useVisibleSources()`; erro ou `404` (API anterior) cai em todas as fontes na ordem padrão.
- **Rationale**: compatível nos dois sentidos (duas versões); a resposta pública não traz dados de usuário.
- **Alternatives**: embutir a lista em `/api/library` (cada fonte faz a sua chamada, não serve para montar as abas).

## R6. Fonte escondida na API

- **Decision**: `GET /api/puzzles` (por data) e `GET /api/library` com fonte escondida respondem `400 invalid-input` com `fields: ['source']`, igual a uma fonte fora do enum (FR-003). `GET /api/puzzles/:id` continua servindo por id (UUID): é como uma partida em andamento é reaberta, e duelos e cópias offline dependem disso. `POST /api/duels/create` recusa puzzle de fonte escondida com a resposta de puzzle inexistente; um convite já enviado e ainda não aberto continua valendo (`lookup`, `start`, jogo e `finish` não checam a visibilidade). `collect` não muda.
- **Rationale**: o site já trata `400` de fonte como "Esta fonte não está disponível agora" (feature 048/054); progresso, recordes e duelos existentes ficam intactos (FR-013).
- **Alternatives**: bloquear também por id (quebra partida em andamento e duelos já criados, contra a spec).

## R7. Landing

- **Decision**: a landing continua estática e lista as quatro fontes; FR-002 e o cenário 2 da história 1 foram ajustados para não incluí-la.
- **Rationale**: a landing é pré-renderizada, não faz pedido à API e não deve acordar o servidor gratuito de quem só a visita (features 048 e 059).
- **Alternatives**: buscar `/api/sources` na landing (acorda o servidor, muda um comportamento decidido).

## R8. Fonte padrão

- **Decision**: a fonte padrão é a primeira da lista visível. Se `defaultSource` guardado nas configurações da pessoa estiver escondido, vale a primeira visível, sem aviso e sem apagar a escolha (volta a valer se a fonte reaparecer).
- **Rationale**: FR-006 e a regra do calendário ao voltar do jogo (`source-choice.ts`).

## R9. Estatísticas

- **Decision**: a API de estatísticas e `computeStats` ficam como estão; `StatsView` mostra só as linhas das fontes visíveis. Total, média e sequência continuam contando tudo que foi concluído.
- **Rationale**: o cálculo é compartilhado entre API e visitante; esconder uma fonte não pode apagar o progresso (FR-013).

## R10. Registro de alterações

- **Decision**: `source_setting_changes` (`user_id` anulável `SET NULL`, `before`/`after` jsonb), uma linha por salvamento, na mesma transação do `upsert`. Só grava quando algo mudou. Nenhuma rota lê; o dono consulta o banco.
- **Rationale**: clarificação 1 e FR-016.

## R11. Documentação consultada (Context7)

- **Fastify v5.12.7** (`/fastify/fastify`): `reply.callNotFound()` chama o tratador de não encontrado; no `onRequest` `request.body` é sempre `undefined`, porque o parse do corpo acontece antes de `preValidation`. Confirma R3: o `404` sai antes de ler o corpo. Sem `setNotFoundHandler` no projeto, o tratador é o padrão do Fastify, o mesmo de uma rota inexistente.
- **Drizzle** (`/drizzle-team/drizzle-orm-docs`, T046): `uniqueIndex(...).on(...)` e `check(...)` no callback de colunas extras; `references(() => users.userId, { onDelete: 'set null' })`; `db.transaction(async (tx) => ...)`. Usados em `source_settings`, `source_setting_changes` e no salvamento.
- **TanStack Query v5** (`/tanstack/query`, T047): `refetchOnWindowFocus` por consulta; `ensureQueryData` devolve o cache mesmo vencido (só revalida com `revalidateIfStale`). Por isso os loaders usam `queryClient.fetchQuery` com o mesmo `staleTime`: lista fresca vem do cache, vencida é pedida de novo. `retryOnMount: false` evita um laço de remontagem após erro (achado nos testes).

## R12. Loaders e carregamento da lista

- **Decision**: `fetchVisibleSources(queryClient)` (função, sem hook, `ensureQueryData` com a mesma chave e `staleTime` do hook, fallback a todas as fontes em erro ou `404`) é usada por `source-choice.ts`, `playTodayLoader` e `directPlayLoader`, sempre depois de `whenServerReady`. `useVisibleSources` expõe `isPending`; enquanto pende, calendário, "Hoje", x1, estatísticas e configurações esperam (sem abas, sem pedidos de biblioteca) e só erro ou `404` cai em todas as fontes.
- **Rationale**: loaders rodam fora de componentes (sem hooks) e não podem pedir nada antes de o servidor acordar; mostrar as quatro fontes durante o carregamento faria a fonte escondida piscar e disparar `400`.
- **Alternatives**: `defaultSource` só no hook (inutilizável em loader).

## R13. Admin sem rede e precedência na página

- **Decision**: em `AdminPage`, sem rede mostra `RequiresConnection` antes de decidir o papel; `NotFoundPage` só com `isAdmin` confirmado por `/api/auth/me` (ou sessão ausente confirmada). Sem rede, `readLastUser()` não traz `isAdmin`, então nunca basta para negar.
- **Rationale**: um admin offline não pode ver "página não encontrada".

## R14. Quem aplica a visibilidade na API

- **Decision**: a verificação é uma porta do `modules/sources` (`sourcesService.isVisible(source)`), injetada nos services de puzzles, library e duels, que devolvem o erro de domínio; as rotas só o traduzem. Nenhuma rota recebe `db`.
- **Rationale**: constitution III (rota sem regra, SQL só no repository).
