# DDE-009 — Configuração das fontes geradas

## Changelog

| Version | Date       | Changes                                                        |
| ------- | ---------- | -------------------------------------------------------------- |
| `0.0.1` | 2026-11-17 | - Versão inicial derivada da spec 064 (tamanho e dificuldade). |

## Scope

Cobre a configuração de cada fonte gerada (fonte cujas cruzadas são criadas pela coleta a partir de um modelo de linguagem, hoje só `casa`): o tamanho da grade e a dificuldade pedida ao modelo. A cruzada gerada é um `Puzzle` comum ([DDE-002](./DDE-002-coleta-puzzles.md)); a visibilidade e a ordem da fonte ficam em `SourceSetting` ([DDE-008](./DDE-008-admin-fontes.md)); o limite de chamadas por dia usa `RateLimitAttempt` ([DDE-001](./DDE-001-banco-auth-convites.md), ação `PUZZLE_GENERATE`). Modelo, provedor e chave não ficam no banco: são variáveis de ambiente da coleta.

## Source Artifacts

| Source                                                                                                    | Type | Description                                         |
| --------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [specs/064-cruzada-gerada-ia/spec.md](../../specs/064-cruzada-gerada-ia/spec.md) (FR-017 a FR-020, US4)   | Spec | Tamanho e dificuldade por fonte gerada, só admin    |
| [specs/064-cruzada-gerada-ia/spec.md](../../specs/064-cruzada-gerada-ia/spec.md) (FR-001, Clarifications) | Spec | Várias fontes geradas, cada uma com a própria linha |

## Entity Summary

| Entity                                            | Description                                        | Source                  |
| ------------------------------------------------- | -------------------------------------------------- | ----------------------- |
| [GeneratedSourceSetting](#generatedsourcesetting) | Tamanho da grade e dificuldade de uma fonte gerada | FR-001, FR-017 a FR-020 |

## Entity Definitions

### GeneratedSourceSetting

| Field                       | Description                              | Data Type | Mandatory | Notes                                                                                          |
| --------------------------- | ---------------------------------------- | --------- | --------- | ---------------------------------------------------------------------------------------------- |
| generated_source_setting_id | Identificador único da configuração      | UUID      | Yes       | PK; gerado pelo banco                                                                          |
| source_id                   | Fonte gerada configurada                 | Text      | Yes       | Único; valores permitidos: casa (064); cada nova fonte gerada alarga a restrição por migração  |
| grid_size                   | Lado da grade quadrada                   | Number    | Yes       | Inteiro de 9 a 15; padrão 11 (FR-017)                                                          |
| difficulty                  | Dificuldade pedida ao modelo             | Text      | Yes       | Valores permitidos: easy, medium, hard (Fácil, Médio, Difícil na tela); padrão medium (FR-017) |
| created_at                  | Data e hora em que o registro foi criado | Date      | Yes       | Preenchido pelo banco; UTC                                                                     |
| updated_at                  | Data e hora da última alteração          | Date      | Yes       | Preenchido e avançado pelo banco; UTC                                                          |

Regras:

- A migração cria a linha de `casa` com os padrões. Sem linha, vale o padrão (11, medium).
- Só administradores leem e mudam, em `/admin` (FR-018); valor fora da faixa ou desconhecido é recusado sem mudar nada (FR-019).
- A coleta lê a linha uma vez no início da geração; mudar a configuração não altera cruzadas já salvas (FR-020). A dificuldade usada fica registrada na atribuição do próprio `Puzzle`.
- Sem histórico de alterações nesta versão (premissa da spec 064).

## Relationships

`GeneratedSourceSetting` não tem relacionamento com outra entidade: `source_id` é um identificador de fonte do código, não uma chave estrangeira, como em `SourceSetting` (DDE-008).

## Entity Relationship Diagrams

| ID                                                                                |
| --------------------------------------------------------------------------------- |
| [ERD-009](../entity-relationship-diagrams/ERD-009-configuracao-fontes-geradas.md) |
