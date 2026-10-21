# Research: Documentação em dia com o sistema

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Não há `NEEDS CLARIFICATION` no Technical Context. As decisões abaixo dizem como aplicar a spec aos documentos existentes.

## R1. Data definitions: atualizar no lugar, com patch no changelog

- **Decision**: DDE-001, DDE-003 e DDE-004 são editadas no próprio arquivo, com o mesmo nome e ID. Cada uma ganha uma linha no topo do changelog datada de 2026-10-21: DDE-001 `0.0.4` (008, 021), DDE-003 `0.0.3` (021), DDE-004 `0.0.2` (021).
- **Rationale**: Mesma regra da feature 020 (R1 de lá): a skill proíbe mudar ID e o template incrementa só o patch.
- **Alternatives considered**: Nenhuma nova; a 020 já avaliou e rejeitou documentos novos para corrigir os antigos.

## R2. ERDs e DDE-002 sem mudança

- **Decision**: Os quatro ERDs e a DDE-002 não são tocados.
- **Rationale**: As mudanças nas DDEs são de notas, escopo e artefatos de origem; nenhuma muda entidade, campo, chave ou relacionamento, que é o que o ERD mostra (FR-007). A conferência com `schema.ts` (migração `0005`) não achou divergência de campo em nenhum documento. A ligação `User` → `UserSettings` já está no ERD-004; repeti-la no ERD-001 contraria "um diagrama por data definition".
- **Alternatives considered**: Acrescentar `USER_SETTINGS` e `PROGRESS` ao ERD-001 para mostrar a remoção em cascata (rejeitada: duplica entidades de outras DDEs e cria um diagrama do sistema inteiro aos poucos).

## R3. Modelo de dados no design: resumo com links, não colunas

- **Decision**: A tabela "Modelo de dados" do `docs/design.md` vira uma tabela de duas colunas, "Tabela" e "Para que serve", com uma linha por tabela do banco (`users`, `sessions`, `invites`, `rate_limit_attempts`, `puzzles`, `progress`, `user_settings`) e o link para a DDE que a define. A frase que segue a tabela hoje, sobre onde ficam as configurações, continua.
- **Rationale**: A tabela atual é uma segunda cópia do modelo e foi a que mais divergiu (nomes de coluna antigos, tabela faltando). As DDEs já são mantidas a cada mudança de schema (memória do autor: tabela mudou, DDE e ERD mudam junto). Um resumo por tabela muda só quando uma tabela nasce ou morre.
- **Alternatives considered**: Corrigir as colunas na tabela do design (rejeitada: volta a divergir na próxima migração); apagar a seção e deixar só um link (rejeitada: o design perde a visão rápida de quais tabelas existem).

## R4. Endpoints e módulos: a API registrada é a referência

- **Decision**: A lista "Endpoints" do design passa a ter exatamente as rotas de `apps/api/src/modules/*/*.routes.ts`: `GET /api/health`; `POST /api/auth/register`, `GET /api/auth/registration`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`; `GET /api/puzzles`, `GET /api/puzzles/:id`; `GET /api/library`; `GET`/`PUT /api/progress/:puzzleId`, `POST /api/progress/:puzzleId/reset`; `GET`/`PUT /api/settings`. As rotas de convite saem. Cada linha diz se a rota é aberta ao visitante ou pede sessão. A documentação da API (`/api/docs*`, fora de produção) é citada numa frase, não como endpoint do produto. A árvore de `apps/api/src/` ganha `health/`, `library/`, `rate-limit/`, `settings/`, `docs/` e `http/` com uma descrição de uma linha cada, no tom das linhas existentes, e a descrição de `auth/` perde o limite de tentativas, que hoje é de `rate-limit/` (FR-015a).
- **Rationale**: SC-004 pede coincidência nos dois sentidos; a fonte mais confiável é o código das rotas, que o quickstart confere por `grep`. A marcação visitante/sessão vem do CLAUDE.md (features 013 e 021) e evita que o leitor volte a supor "só logado".
- **Alternatives considered**: Listar também `/api/docs`, `/api/docs/json` e `/api/docs/yaml` como endpoints (rejeitada: não existem em produção e não são produto).

## R5. README: o que muda e o que fica

- **Decision**:
  - Apresentação: "a primeira fonte é o O Globo" vira as duas fontes (O Globo e Cruzada Online, do jornal Público), com escolha de data; "pequeno e privado" vira "pequeno, aberto a quem tem o endereço e fora dos buscadores". O "progresso salvo entre dispositivos" ganha a ressalva de que vale para quem tem conta.
  - Estado atual: joga-se sem conta (progresso no aparelho); com conta, progresso e configurações acompanham a pessoa; o cadastro fica fechado por padrão e o autor cria contas pela linha de comando.
  - Comandos: a linha `invites create` sai; entram `npm run cli -w @cruzadinha/api -- users create --email <email>` ("Cria uma conta, mesmo com o cadastro fechado; a senha é pedida sem eco") e `npm run cli -w @cruzadinha/api -- puzzles collect` ("Guarda o puzzle do dia de cada fonte e o histórico que faltar"). A linha do seed passa a citar também o puzzle de exemplo que ele guarda (FR-017; CLAUDE.md, `db:seed`).
  - Afiliação: "não é afiliado ao O Globo" vira "não é afiliado ao O Globo nem ao Público".
  - O resto (stack, versões, produção, contribuindo, licença) fica igual.
- **Rationale**: FR-016 a FR-018. A frase "aberto a quem tem o endereço e fora dos buscadores" é a do princípio VIII (4.0.0), já usada no design (seção 1). As descrições dos comandos vêm da ajuda de `run-cli.ts` e do CLAUDE.md.
- **Alternatives considered**: Listar no README todos os comandos do CLAUDE.md (`source:check`, `db:generate`) (rejeitada: o README é a porta de entrada; a lista completa é do CLAUDE.md).

## R6. Onde cada fato das DDEs vem

| Documento | Mudança | Origem |
| --- | --- | --- |
| DDE-001 | Nota de `RateLimitAttempt`: toda gravação de configurações na conta registrada por endereço | 021 FR-024 (valores em `research.md` R6 da 021) |
| DDE-001 | Nota de `User`: remover a conta remove sessões, progresso e configurações | 004 (sessão), 008 FR-014, 021 FR-026 |
| DDE-001 | Escopo: links para DDE-002, DDE-003 e DDE-004 | Documentos existentes |
| DDE-003 | Escopo: configurações, inclusive limites de ajuda, na DDE-004 | 021 FR-008, FR-020 |
| DDE-004 | Nota de `UserSettings`: corpo até 4 KB, 120 gravações por hora por endereço (`SETTINGS_SAVE` da DDE-001), visitante nunca envia | 021 FR-021, FR-024; `research.md` R6 da 021 |

A remoção das sessões com a conta vem do schema (`ON DELETE CASCADE` em `sessions.user_id`) e da spec 004; a DDE-001 já descreve `Session` como pertencente a um usuário, então a nota cita a 004 sem FR novo.

## R7. Formatação

- **Decision**: Rodar `npx prettier --write` nos cinco arquivos e conferir com `npm run format:check`.
- **Rationale**: `docs/` e o README não estão no `.prettierignore`; a CI reprova formatação errada (princípio II). As tabelas das DDEs se realinham sozinhas quando uma linha cresce.
