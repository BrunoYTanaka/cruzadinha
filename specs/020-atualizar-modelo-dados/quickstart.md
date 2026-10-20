# Quickstart: conferir os documentos de modelo de dados

**Feature**: [spec.md](./spec.md) | **Data model**: [data-model.md](./data-model.md)

Pré-requisitos: Node.js 24 (`nvm use`) e `npm ci` na raiz.

## 1. Nada do que foi removido aparece como regra em vigor (SC-002)

```sh
grep -n "convidad\|mediante convite\|cota de 3\|feature futura\|só a usuário com sessão" docs/data-definitions/*.md
```

Esperado: nenhuma linha, ou só linhas que dizem "sem uso", "antigo" ou "lançamento B". O `grep` é só uma primeira passada: ler cada linha encontrada e confirmar, pelo parágrafo inteiro, que ela descreve o cadastro antigo e não uma regra em vigor.

## 2. Valores permitidos batem com o schema (SC-001)

```sh
grep -n "puzzleSources\|rateLimitActions\|progressStatuses\|puzzleLevels" apps/api/src/db/schema.ts
grep -n "Valores permitidos" docs/data-definitions/*.md
```

Esperado: `source` com `oglobo, cruzadaonline`; `action` com `LOGIN, REGISTER, PUZZLE_FETCH, INVITE_CREATE`; `level` com `daily`; `status` com `in_progress, completed`. Conferir também, tabela a tabela, que os campos de cada entidade são as colunas de `schema.ts` (ver [data-model.md](./data-model.md)).

## 3. Um tipo por campo nos ERDs (SC-003, FR-008)

```sh
grep -hn "data\b\|solution\|cells" docs/entity-relationship-diagrams/*.md
```

Esperado: `json` em todas as ocorrências.

## 4. Os diagramas renderizam (SC-003)

```sh
out=$(mktemp -d)
for f in docs/entity-relationship-diagrams/ERD-00[123]-*.md; do
  npx -y @mermaid-js/mermaid-cli@11.4.2 -i "$f" -o "$out/$(basename "$f" .md)-out.md" || echo "FALHOU: $f"
done
```

Esperado: nenhum "FALHOU". Sem rede ou sem Chromium para o CLI, abrir cada arquivo na pré-visualização do GitHub, que renderiza blocos `mermaid`.

## 5. Changelog e formatação (SC-004, princípio II)

```sh
head -8 docs/data-definitions/DDE-00*.md
npm run format:check
```

Esperado: DDE-001 `0.0.2`, DDE-002 `0.0.3`, DDE-003 `0.0.2` na primeira linha de cada tabela, datadas de 2026-10-20; `format:check` sem erros.
