# DDE-999 — [Nome do modelo de dados]

## Changelog
<!--
Use versionamento semântico. Comece em 0.0.1 e incremente só o patch. Versões major/minor são gerenciadas pelo usuário. Ordene da mais nova para a mais antiga.
Registre as mudanças em tópicos concisos, de preferência com no máximo duas frases cada.
-->

| Version | Date | Changes |
|---------|------|---------|
| `x.y.z` | aaaa-mm-dd | Resumo das mudanças |

## Scope
<!--
Descreva brevemente qual feature ou domínio de negócio este modelo cobre.
-->

Descrição curta do domínio e das funcionalidades que o modelo suporta.

## Source Artifacts
<!--
Liste cada spec.md (e os FR-NNN ou histórias de usuário) que contribuiu com entidades ou campos.
Use o caminho relativo da spec como link.
-->

| Source | Type | Description |
|--------|------|-------------|
| [specs/NNN-slug/spec.md](../../specs/NNN-slug/spec.md) (FR-NNN) | Spec | [Descrição breve] |

## Entity Summary
<!--
Toda entidade deve existir na seção `Entity Definitions`.
Use o nome da entidade como link relativo.
-->

| Entity | Description | Source |
|--------|-------------|--------|
| [Entity Name](#entity-name) | Papel da entidade em uma frase | FR-NNN |

## Entity Definitions
<!--
Uma subseção por entidade.
Inclua todos os campos identificados nos requisitos de origem.
A equipe pode estender os campos.
Use `lower_snake_case` para o nome dos campos. A PK é `<entidade>_id` do tipo UUID.
-->

### [Entity Name]

| Field | Description | Data Type | Mandatory | Notes |
|-------|-------------|-----------|-----------|-------|
| entity_name_id | Identificador único da entidade | UUID | Yes | PK |
| field_name | Descrição | Text / Number / Date / Boolean / UUID | Yes / No | FK → [Entity Name] / Unique / valores permitidos |

## Relationships
<!--
Cada entidade (origem e destino) deve existir na seção `Entity Definitions`.
Use o nome da entidade como link relativo.
-->

| From Entity | Cardinality | To Entity | Description |
|-------------|-------------|-----------|-------------|
| [Entity A](#entity-a) | one-to-many, one-to-one, etc | [Entity B](#entity-b) | Descrição breve |

## Entity Relationship Diagrams
<!--
Lista dos diagramas entidade-relacionamento gerados, se houver.
Use o ID do ERD como link relativo sempre que possível.
-->

| ID |
|----|
| [ERD-NNN](../entity-relationship-diagrams/ERD-NNN-nome.md) |
