# Quickstart: conferir a documentação

**Feature**: [spec.md](./spec.md) | **Data model**: [data-model.md](./data-model.md)

Pré-requisitos: Node.js 24 (`nvm use`) e `npm ci` na raiz. Todos os comandos rodam da raiz.

## 1. Toda ação limitada tem regra na DDE-001 (SC-001)

```sh
grep -n "rateLimitActions" -A 7 apps/api/src/db/schema.ts
grep -n "registrad" docs/data-definitions/DDE-001-banco-auth-convites.md
```

Esperado: a nota de `RateLimitAttempt` cobre as 4 ações em uso (login, cadastro, busca de puzzle e gravação de configurações), cada uma com a spec de origem; `INVITE_CREATE` aparece só como sem uso (SC-001).

## 2. A DDE-001 leva às outras e diz o que some com a conta (SC-002)

```sh
grep -on "DDE-00[234]-[a-z-]*\.md" docs/data-definitions/DDE-001-banco-auth-convites.md | sort -u -t: -k2
grep -n "remov" docs/data-definitions/DDE-001-banco-auth-convites.md
```

Esperado: links para DDE-002, DDE-003 e DDE-004; a nota de `User` cita sessões, progresso e configurações.

## 3. DDEs e ERDs batem com o schema (SC-003)

```sh
git diff --stat main -- docs/entity-relationship-diagrams docs/data-definitions/DDE-002-coleta-puzzles.md
```

Esperado: nenhuma mudança (R2). Depois, tabela a tabela, conferir que os campos das DDE-001, DDE-003 e DDE-004 continuam as colunas de `apps/api/src/db/schema.ts`.

## 4. Endpoints do design = rotas da API (SC-004)

```sh
grep -ohE "app\.(get|post|put)\(\s*'/api[^']*'|^\s*'/api[^']*'" apps/api/src/modules/*/*.routes.ts | sort -u
grep -n "/api/" docs/design.md
```

Esperado: cada rota de código aparece na seção "Endpoints" com o método certo, e a seção não tem rota que o código não registre (nenhum `/api/invites`). Os métodos de rotas declaradas em várias linhas (`app.get(` numa linha, caminho na seguinte) se conferem abrindo o arquivo. A menção a `/api/docs/` na nota que fecha a seção é esperada e fica fora da contagem das 14 rotas (SC-004).

```sh
ls apps/api/src/modules apps/api/src
```

Esperado: cada pasta de `modules/`, mais `docs/` e `http/`, aparece na árvore da seção 4 do design.

## 5. Nada removido aparece como regra em vigor (SC-005)

```sh
grep -n -i "convite\|invite\|privado\|só para usuário logado\|usuário logado não\|data do O Globo" README.md docs/design.md
```

Esperado: nenhuma linha no README. No design, só linhas que dizem que os convites deixaram de existir ou estão sem uso (seção 6, "Cadastro e visitante"), a tabela `invites` marcada sem uso no resumo do modelo, a seção 8 (testes ponta a ponta, "cadastro sem convite" como caminho testado) e a seção 10, histórica. Ler cada linha encontrada e confirmar pelo parágrafo.

## 6. Os comandos do README existem (SC-005)

```sh
grep -n "npm run cli" README.md
npm run cli -w @cruzadinha/api -- --help
```

Esperado: `users create --email` e `puzzles collect` no README e na ajuda; nenhum comando de convite. Se `--help` não for aceito, a ajuda aparece com qualquer comando desconhecido (`run-cli.ts`).

## 7. Changelog e formatação (SC-006, princípio II)

```sh
head -9 docs/data-definitions/DDE-00*.md
npm run format:check
```

Esperado: DDE-001 `0.0.4`, DDE-003 `0.0.3` e DDE-004 `0.0.2` na primeira linha de cada changelog, datadas de 2026-10-21; DDE-002 continua em `0.0.3`; `format:check` sem erros.
