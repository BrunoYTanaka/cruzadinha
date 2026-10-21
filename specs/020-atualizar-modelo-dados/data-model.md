# Data Model: Data definitions e diagramas entidade-relacionamento em dia com o sistema

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Esta feature não muda o banco. Este arquivo lista o estado-alvo dos documentos de modelo de dados, campo a campo, para guiar a edição e a conferência. A referência de verdade é `apps/api/src/db/schema.ts` (migrações `0000` a `0004`) e as specs citadas.

## DDE-001 / ERD-001 — Banco, autenticação e convites

| Item | Hoje no documento | Alvo |
| --- | --- | --- |
| Changelog | `0.0.1` | + `0.0.2` (2026-10-20): cadastro sem convite (013), convites sem uso até o lançamento B, `PUZZLE_FETCH` (006, 013) |
| Scope | Cadastro mediante convite, cota de 3, administração de convites | Cadastro com e-mail e senha atrás de chave fechada por padrão; contas criadas pelo autor na linha de comando; convites guardados sem uso até o lançamento B |
| Source Artifacts | Só spec 004 | + spec 006 (US1), spec 013 (FR-003, FR-014 a FR-022) |
| `User` (resumo) | "Conta de uma pessoa convidada" | "Conta de uma pessoa", criada pelo cadastro aberto ou pela linha de comando |
| `User` (campos) | `user_id`, `email`, `password_hash`, `created_at`, `updated_at` | Sem mudança |
| `Session` | 8 campos | Sem mudança |
| `Invite` (resumo e campos) | Regras em vigor | Mesmos campos; descrição "sem uso desde a feature 013, descartado no lançamento B"; a nota de situação derivada e a cota passam a ser descritas como regras do cadastro antigo |
| `RateLimitAttempt.action` | `LOGIN, REGISTER, INVITE_CREATE` | `LOGIN, REGISTER, PUZZLE_FETCH, INVITE_CREATE`; `INVITE_CREATE` sem uso, sai no lançamento B |
| `RateLimitAttempt` (nota) | Login, cadastro e geração de convites | Login (falhas por e-mail e endereço), cadastro (toda tentativa por endereço) e busca de puzzle na fonte (por endereço, também para visitante) |
| Relationships | `User` gera `Invite`; `User` consome `Invite` | Os dois ficam, marcados como do cadastro antigo |
| ERD | `INVITE` sem aviso | Alias `INVITE["INVITE (sem uso)"]`, comentário no atributo, rótulos "gera (antigo)" e "consome (antigo)"; comentário em `action` com os quatro valores |

## DDE-002 / ERD-002 — Coleta e cache de puzzles

| Item | Hoje no documento | Alvo |
| --- | --- | --- |
| Changelog | `0.0.2` | + `0.0.3` (2026-10-20): fonte `cruzadaonline` (014), entrega ao visitante (013), relacionamento com `Progress` (008) |
| Scope | Entrega "ao jogador com a solução" | Entrega a quem tem sessão e ao visitante; duas fontes |
| Source Artifacts | Specs 006 e 007 | + spec 008 (FR-001, FR-014), 013 (FR-002, FR-003), 014 (FR-002) |
| `source` | `oglobo` | `oglobo`, `cruzadaonline`; o mesmo dia em fontes diferentes são registros diferentes |
| `level`, `date` | — | Sem mudança |
| `data` | Tipo `Text`, JSON | Sem mudança de tipo; nota de entrega também ao visitante |
| `solution` | "Só a usuário com sessão" | Entregue com `data` a quem tem sessão e ao visitante; validada contra a grade antes de sair; nunca em erro nem log |
| Entity Summary / Definitions | Só `Puzzle` | + `Progress` só com as chaves (`user_id`, `puzzle_id`), apontando para a DDE-003, como a DDE-003 faz com `User` e `Puzzle` |
| Relationships | "Nenhum; progresso futuro" | `Puzzle` one-to-many `Progress`; `RateLimitAttempt` continua sem vínculo |
| ERD | `data`/`solution` como `string`; só `PUZZLE` | `json`; comentário de `source` com os dois valores; `PROGRESS` só com as chaves (`user_id` com o comentário `"FK para USER, ver ERD-003"`, sem `USER` no diagrama) e `PUZZLE ||--o{ PROGRESS`, para mostrar o relacionamento da DDE (FR-008) |

## DDE-003 / ERD-003 — Progresso do usuário em cada puzzle

| Item | Hoje no documento | Alvo |
| --- | --- | --- |
| Changelog | `0.0.1` | + `0.0.2` (2026-10-20): nota sobre o progresso do visitante (013) |
| Scope | Só progresso de conta | + uma frase: o progresso do visitante fica só no aparelho, nunca vai ao servidor nem se mistura ao da conta, e não é entidade deste modelo |
| Source Artifacts | Spec 008 | + spec 013 (FR-004, FR-011, FR-012) |
| `Progress`, `User`, `Puzzle` | — | Sem mudança de campos |
| ERD | `PUZZLE.source` sem valores | Sem mudança obrigatória; só alinhar tipos com o ERD-002 (já `json`) |

## Regras de conferência

- Todo campo das DDEs aparece no ERD correspondente com o mesmo nome; `data`, `solution` e `cells` são `json` em todos os ERDs (R3).
- Toda linha nova de nota ou de origem cita uma `spec.md` (R4, R5).
- Nenhum valor de exemplo de senha, token ou código (constitution, princípio VI).
