---
name: data-definition
description: Cria uma Data Definition (DDE-NNN), um modelo lógico de dados em tabelas markdown, com ERD opcional. Use quando o usuário pedir explicitamente uma data definition e indicar um ou mais spec.md de specs/ como entrada.
disable-model-invocation: true
---

# Skill: Data Definition

## Objetivo
Produzir o modelo lógico de dados do Cruzadinha: entidades de negócio, relacionamentos e campos, derivados dos requisitos funcionais da spec. É um modelo lógico, anterior ao schema Drizzle. Tipos físicos, índices e SQL ficam para o `plan.md` e para as migrações.

## Entrada (estrita)
- A entrada DEVE ser um ou mais arquivos `specs/NNN-slug/spec.md`. Se ajudarem a explicar um requisito, `plan.md` e `research.md` da mesma feature podem ser lidos, mas não criam entidades sozinhos.
- `/home/bruno/Desktop/2026-10-12-cruzadas-design.md` só vale se o usuário o citar explicitamente.
- NÃO aceite descrições soltas digitadas na conversa nem fontes fora dessas.
- Se o usuário não indicar a fonte, pergunte qual `spec.md` usar.
- Se o arquivo não existir, pare e avise. Não invente entidades a partir do contexto da conversa.

## Pergunta obrigatória (a cada pedido)
Antes de gerar, SEMPRE pergunte qual formato o usuário quer:
1. **Só o modelo de dados**: modelo lógico em tabelas markdown.
2. **Modelo + ERD**: modelo lógico e um Diagrama Entidade-Relacionamento.

Nunca assuma a resposta, mesmo que uma data definition anterior da sessão tenha incluído ERD.

## Template e exemplo
- Template: `.claude/skills/data-definition/template/DDE-999-template.md`
- Exemplo: `.claude/skills/data-definition/template/DDE-999-example.md`

Siga a estrutura exatamente. Não crie seções que não estejam no template. O documento é escrito em português, como o restante do projeto.

## ID / Prefixo
Prefixo: `DDE`
Formato: `DDE-[3 dígitos]`, por exemplo `DDE-001`

## Sequência
- Comece em `DDE-001` se ainda não existir nenhuma data definition.
- Liste `docs/data-definitions/` e continue do maior ID existente.
- Nunca reutilize nem altere um ID.

## Caminho de saída
`docs/data-definitions/DDE-NNN-nome-descritivo.md`
Exemplo: `docs/data-definitions/DDE-002-progresso-de-jogo.md`

Trabalho de documentação é manutenção: não exige ciclo do Spec Kit (veja CLAUDE.md).

## Processo

### Sempre (modelo lógico)
1. Leia a(s) `spec.md` indicada(s).
2. Identifique as entidades de negócio e os relacionamentos entre elas.
3. Defina entidades e relacionamentos em tabelas markdown.
4. Adicione os campos de cada entidade. Em geral eles vêm dos requisitos funcionais (FR-NNN) e dos cenários das histórias de usuário, mas a equipe pode acrescentar campos depois, então deixe as tabelas fáceis de estender.
5. Para cada campo, registre no mínimo: nome, descrição, tipo lógico (Text, Number, Date, Boolean, UUID), obrigatório ou opcional. Marque os campos identificadores e as referências entre entidades.
6. Rastreie cada entidade até sua origem (FR-NNN ou história de usuário da `spec.md`), para deixar clara a origem do requisito.
7. O identificador de cada entidade (como `user_id` para `User`) é a chave primária (PK), segue a convenção `<entidade>_id` em todas as entidades e tem tipo UUID. Chaves estrangeiras repetem o nome da PK referenciada.
8. Nomes de entidade no singular e em inglês (`User`, `Invite`), campos em `lower_snake_case` em inglês, descrições e notas em português. Isso casa com as tabelas e colunas do Drizzle.
9. Segredos nunca viram valor de exemplo: guarde só o hash (`code_hash`, `password_hash`) e registre isso nas notas (constitution, princípio VI).

### Se o usuário escolheu Modelo + ERD (nesta ordem)
1. Gere a data definition em tabelas markdown (acima).
2. Dispare a skill `entity-relationship-diagram`, usando a data definition gerada como entrada.
3. Coloque o link do ERD resultante na seção **Entity Relationship Diagrams** da data definition.
