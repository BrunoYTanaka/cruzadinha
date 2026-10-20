# Research: Data definitions e diagramas entidade-relacionamento em dia com o sistema

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Não há `NEEDS CLARIFICATION` no Technical Context. As decisões abaixo resolvem como aplicar as regras das skills `data-definition` e `entity-relationship-diagram` aos documentos existentes.

## R1. Atualizar no lugar, sem ID novo

- **Decision**: As três DDEs e os três ERDs são editados no próprio arquivo, com o mesmo nome e ID. Cada DDE ganha uma linha de patch no topo do changelog (DDE-001 `0.0.2`, DDE-002 `0.0.3`, DDE-003 `0.0.2`), datada de 2026-10-20.
- **Rationale**: As skills proíbem reutilizar ou alterar IDs, e o template de changelog manda incrementar só o patch. A DDE-002 já foi atualizada assim na feature 007 (`0.0.2`). Um documento novo (DDE-004 "estado atual") duplicaria entidades e deixaria os antigos errados.
- **Alternatives considered**: Uma DDE única do sistema inteiro (rejeitada: o ERD não pode modelar o sistema inteiro num diagrama, e as DDEs são por feature); novas DDEs por feature (013, 014) que só corrigem as antigas (rejeitada: o leitor teria de juntar várias versões do mesmo `Puzzle`).

## R2. Como mostrar no ERD uma entidade sem uso

- **Decision**: No ERD-001, `INVITE` ganha um alias e um comentário: `INVITE["INVITE (sem uso)"]`, e os campos ou o primeiro campo levam o comentário `"sem uso desde a feature 013; sai no lançamento B"`. Os rótulos dos dois relacionamentos com `USER` ganham o sufixo "(antigo)". O mesmo comentário vai no atributo `action` de `RATE_LIMIT_ATTEMPT` para `INVITE_CREATE`.
- **Rationale**: A skill exige que o arquivo do ERD tenha só o bloco Mermaid, sem texto fora dele; o aviso tem de estar dentro do diagrama. A documentação atual do Mermaid (Context7, `/mermaid-js/mermaid`, sintaxe `erDiagram`) confirma o alias entre colchetes, que "segue as mesmas regras do nome da entidade" e aceita texto entre aspas, e o comentário entre aspas no fim do atributo, sem aspas duplas dentro.
- **Alternatives considered**: Tirar `INVITE` do diagrama (rejeitada: a tabela ainda existe; ERD e DDE ficariam diferentes, contra o FR-008); comentário Mermaid `%%` (rejeitada: não aparece no diagrama renderizado).

## R3. Tipo de `data`, `solution` e `cells` nos ERDs

- **Decision**: `json` nos três campos, em todos os ERDs. O ERD-002 troca `string` por `json` e mantém os comentários. Nas DDEs o tipo lógico continua `Text`, com a nota "Documento JSON".
- **Rationale**: O FR-008 pede um tipo por campo em todos os ERDs. Os ERDs já refinam os tipos lógicos (`Date` vira `date` ou `datetime`, `Number` vira `int`), então `json` segue o padrão e é o mais informativo; o ERD-003 já usa `json`. As DDEs ficam presas aos cinco tipos lógicos da skill (Text, Number, Date, Boolean, UUID).
- **Alternatives considered**: `string` com comentário "JSON" nos dois ERDs (rejeitada: perde informação e muda o ERD-003, que já estava certo).

## R4. Origem rastreável de `PUZZLE_FETCH`

- **Decision**: A DDE-001 lista `PUZZLE_FETCH` citando a spec 013 (FR-003: busca de dia passado com o "limite por endereço de rede de hoje (feature 006)") e a spec 006 (US1, busca sob demanda). O `plan.md` da 006, que nomeia a ação, só é usado para explicar.
- **Rationale**: A skill aceita só `spec.md` como origem; `plan.md` pode explicar, mas não cria nada sozinho. A spec 006 não tem um FR que nomeie o limite; a 013 o enuncia como regra em vigor. O FR-011 desta feature exige essa rastreabilidade.
- **Alternatives considered**: Citar só o `plan.md` da 006 (rejeitada pela regra de entrada da skill).

## R5. Onde cada fato vai e de qual spec vem

| Documento | Mudança | Origem |
| --- | --- | --- |
| DDE-001 | Escopo e `User`: cadastro só com e-mail e senha, atrás de chave fechada por padrão, contas criadas pelo autor na linha de comando | 013 FR-014 a FR-019 |
| DDE-001 | `Invite` e seus relacionamentos marcados sem uso; regras de convite descritas como históricas; destino no lançamento B | 013 FR-020 a FR-022 |
| DDE-001 | `RateLimitAttempt.action`: `LOGIN`, `REGISTER`, `PUZZLE_FETCH`, `INVITE_CREATE` (sem uso); busca de puzzle registrada por endereço, também para visitante | 006 US1, 013 FR-003, FR-014, FR-021 |
| DDE-002 | `source`: `oglobo`, `cruzadaonline`; fontes diferentes no mesmo dia são registros diferentes | 014 FR-002, 006 FR-003 |
| DDE-002 | `solution` e `data` entregues também ao visitante, validadas antes | 013 FR-002 |
| DDE-002 | Relacionamento com `Progress` no lugar de "feature futura" | 008 FR-001, FR-014 |
| DDE-003 | Nota sobre o progresso do visitante, sem entidade | 013 FR-004, FR-011, FR-012 |

O que não entra (spec, Assumptions): preferências do aparelho (features 010, 011, 014, 015), a biblioteca (009, só leitura), os nomes de exibição das fontes (não são dado guardado em coluna própria) e o lançamento B.

## R6. Formatação

- **Decision**: Rodar `npx prettier --write` nos seis arquivos e conferir com `npm run format:check`.
- **Rationale**: `docs/` não está no `.prettierignore`; as tabelas das DDEs já estão alinhadas pelo Prettier, e a CI reprova formatação errada (constitution, princípio II).

## R7. Validação dos diagramas

- **Decision**: Renderizar os três ERDs com o Mermaid CLI (`npx -y @mermaid-js/mermaid-cli@11.4.2`), que aceita Markdown de entrada, e conferir que não há erro de sintaxe. Alternativa sem instalar nada: a pré-visualização do arquivo no GitHub, que renderiza blocos `mermaid`.
- **Rationale**: O SC-003 pede renderização sem erro. O repositório não tem Mermaid como dependência, e a validação não deve virar dependência nova só para documentação.
