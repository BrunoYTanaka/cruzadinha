---
name: entity-relationship-diagram
description: Cria um Diagrama Entidade-Relacionamento (ERD-NNN) em sintaxe Mermaid erDiagram. Use quando o usuário pedir explicitamente um ERD e fornecer entidades ou um modelo de dados, ou quando a skill data-definition o acionar.
---

# Skill: Entity Relationship Diagram (ERD)

## Tipo Mermaid
`erDiagram`
Referência de sintaxe: https://mermaid.js.org/syntax/entityRelationshipDiagram.html

## ID / Prefixo
Prefixo: `ERD`
Formato: `ERD-[3 dígitos]`, por exemplo `ERD-001`

## Sequência
- Comece em `ERD-001` se ainda não existir nenhum ERD.
- Liste `docs/entity-relationship-diagrams/` e continue do maior ID existente.
- Nunca reutilize nem altere um ID.

## Caminho de saída
`docs/entity-relationship-diagrams/ERD-NNN-nome-descritivo.md`
Exemplo: `docs/entity-relationship-diagrams/ERD-001-convites-e-cadastro.md`
Exemplo completo: `.claude/skills/entity-relationship-diagram/template/ERD-999-example.md`
O arquivo contém só o código do diagrama em Mermaid (bloco ```` ```mermaid ````), sem texto nem explicação adicionais.

## Processo
- Desenhe o diagrama da feature descrita pelo usuário ou, quando acionada pela skill `data-definition`, das entidades e campos da data definition gerada (use-a como única entrada).
- Use nomes de entidade no singular, em UPPER_SNAKE_CASE e em inglês, de forma consistente (`USER`, `INVITE`, `PUZZLE_PROGRESS`).
- Mostre a cardinalidade em pé de galinha (crow's foot) em todo relacionamento: um-para-um, um-para-muitos ou muitos-para-muitos. Rotule cada relacionamento com um verbo.
- Troque todo relacionamento muitos-para-muitos por uma entidade de junção com atributos próprios.
- Inclua chave primária em toda entidade e chaves estrangeiras onde couber. Use os mesmos nomes de campo e tipos da data definition (PK `<entidade>_id` do tipo `uuid`).
- Modele só as entidades e atributos relevantes à feature. Não modele o sistema inteiro num único diagrama.
