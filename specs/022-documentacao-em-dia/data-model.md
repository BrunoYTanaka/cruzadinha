# Data Model: Documentação em dia com o sistema

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Esta feature não muda o banco. Este arquivo lista o estado-alvo de cada documento, trecho a trecho, para guiar a edição e a conferência. As referências de verdade são `apps/api/src/db/schema.ts` (migrações `0000` a `0005`), as rotas em `apps/api/src/modules/*/*.routes.ts`, os comandos em `apps/api/src/cli/run-cli.ts` e as specs citadas.

## DDE-001 — Banco, autenticação e convites

| Item | Hoje no documento | Alvo |
| --- | --- | --- |
| Changelog | `0.0.3` no topo | + `0.0.4` (2026-10-21): gravação de configurações no limite (021); o que some com a conta (008, 021); links para as outras DDEs |
| Scope | "Puzzles e progresso ficam nas DDE-002 e DDE-003" | Puzzles, progresso e configurações ficam nas DDE-002, DDE-003 e DDE-004 (FR-003) |
| Source Artifacts | Specs 004, 006, 013 | + spec 008 (FR-014), spec 021 (FR-024, FR-026) |
| Entity Summary, `User` | FR-005 a FR-009 (004); FR-014 a FR-019 (013) | + FR-014 (008); FR-026 (021) |
| Entity Summary, `RateLimitAttempt` | FR-027 a FR-029 (004); US1 (006); FR-003, FR-014 (013) | + FR-024 (021) |
| Nota de `User` | Como a conta nasce | + remover a conta remove as sessões, o progresso ([DDE-003](../../docs/data-definitions/DDE-003-progresso-usuario-puzzle.md)) e as configurações ([DDE-004](../../docs/data-definitions/DDE-004-configuracoes-usuario.md)) (FR-004) |
| Nota de `RateLimitAttempt` | Login, cadastro, busca de puzzle | + toda gravação de configurações na conta é registrada por endereço de rede (021, FR-024) (FR-001) |
| Campos, relacionamentos | — | Sem mudança |

## DDE-003 — Progresso do usuário em cada puzzle

| Item | Hoje no documento | Alvo |
| --- | --- | --- |
| Changelog | `0.0.2` no topo | + `0.0.3` (2026-10-21): configurações fora do progresso, na DDE-004 (021) |
| Scope | Aponta para DDE-001 e DDE-002 | + as configurações da pessoa, inclusive os limites de ajuda, ficam na DDE-004 e não fazem parte do progresso (FR-006) |
| Source Artifacts | Specs 008, 013 | + spec 021 (FR-008, FR-020) |
| Campos, relacionamentos | — | Sem mudança |

## DDE-004 — Configurações do usuário

| Item | Hoje no documento | Alvo |
| --- | --- | --- |
| Changelog | `0.0.1` | + `0.0.2` (2026-10-21): limites da gravação e regra do visitante (021) |
| Source Artifacts | spec 021 (FR-007 a FR-015; FR-020 a FR-026, US3), `data-model.md` da 021 | + `research.md` da 021 (R6), tipo Plan |
| Nota de `UserSettings` | "A chave é o próprio `user_id`" | + cada gravação na conta tem corpo de até 4 KB e conta no limite de 120 por hora por endereço (ação `SETTINGS_SAVE` da DDE-001) (FR-024); o visitante nunca envia configurações ao servidor (FR-021) (FR-005) |
| Campos, relacionamentos | — | Sem mudança |

## DDE-002 e ERD-001 a ERD-004

Sem mudança (R2).

## `docs/design.md`

| Trecho | Hoje | Alvo |
| --- | --- | --- |
| Seção 1, "Sucesso" | "escolhe uma data do O Globo" | escolhe uma cruzada e uma data (FR-015) |
| Seção 4, árvore de `apps/api/src/` | `modules/` com `auth`, `puzzles`, `progress` | + `health/`, `library/`, `rate-limit/`, `settings/` em `modules/`; + `docs/` (documentação da API, fora de produção) e `http/` (guarda do repasse e endereço de quem acessa); descrição de `auth/` sem o limite de tentativas, que é de `rate-limit/` (FR-015a) |
| Seção 4, "Formato interno" | solução "só para usuário logado" | solução para quem tem sessão e para o visitante (features 007 e 013) (FR-012) |
| Seção 4, "Modelo de dados" | Tabela de colunas, divergente | Tabela "Tabela / Para que serve" com as 7 tabelas e link para a DDE de cada uma; `invites` marcada sem uso até o lançamento B da 013; frase sobre configurações mantida (FR-011, R3) |
| Seção 4, "Busca sob demanda" | limite "para um usuário logado não martelar a fonte" | limite por endereço, para todos, com ou sem conta (FR-013) |
| Seção 4, "Endpoints" | Com rotas de convite; sem `registration` e `health` | As 14 rotas de R4, cada uma marcada como aberta ao visitante ou com sessão; sem rotas de convite; frase sobre `/api/docs` fora de produção (FR-014) |
| Seções 2, 3, 5 a 9 | — | Sem mudança |
| Seção 10 e "Fora do escopo da v1" | Históricas | Sem mudança |

Mapa de acesso usado nos endpoints (CLAUDE.md, features 013 e 021):

| Acesso | Rotas |
| --- | --- |
| Aberta | `GET /api/health`, `POST /api/auth/register` (com a chave ligada), `GET /api/auth/registration`, `POST /api/auth/login`, `POST /api/auth/logout` (idempotente: sem sessão também responde 204) |
| Sessão opcional (visitante ou conta) | `GET /api/puzzles`, `GET /api/puzzles/:id`, `GET /api/library` |
| Sessão obrigatória | `GET /api/auth/me`, `GET`/`PUT /api/progress/:puzzleId`, `POST /api/progress/:puzzleId/reset`, `GET`/`PUT /api/settings` |

Conferido contra os `preHandler` de cada rota em 2026-10-21.

## `README.md`

| Trecho | Hoje | Alvo |
| --- | --- | --- |
| Primeiro parágrafo | progresso salvo entre dispositivos | idem, para quem tem conta; sem conta, no aparelho |
| Segundo parágrafo | "A primeira fonte é o O Globo"; "pequeno e privado" | As duas fontes (O Globo e Cruzada Online); "pequeno, aberto a quem tem o endereço e fora dos buscadores" (FR-018) |
| Estado atual | "login por convite" | Jogo sem conta; conta com progresso e configurações entre aparelhos; cadastro fechado por padrão; contas criadas pelo autor (FR-016) |
| Tabela de comandos | `invites create` | `users create --email <email>` e `puzzles collect`; linha do seed passa a citar o puzzle de exemplo (FR-017) |
| Licença, afiliação | "não é afiliado ao O Globo" | "não é afiliado ao O Globo nem ao Público" (FR-018) |
| Stack, versões, produção, contribuindo | — | Sem mudança |
