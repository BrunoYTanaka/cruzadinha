# Quickstart: Adaptador da fonte Público

Roteiro para conferir a feature de ponta a ponta. Os detalhes estão em [contracts/](./contracts/) e [data-model.md](./data-model.md).

## Pré-requisitos

- Node.js 24 (`nvm use`), `npm ci` na raiz.
- Docker com Compose, para o Postgres local, a integração e o e2e.
- `cp .env.example .env`, se ainda não houver.

## 1. Suíte automática (sem internet)

```sh
npm run format:check && npm run lint && npm run typecheck && npm test
npm run test:int
```

Esperado:

- Os testes de `apps/api/src/sources/cruzadaonline/` passam com as fixtures (SC-001, SC-002, SC-004).
- Os testes de `shared` aceitam `cruzadaonline` e o `source` com padrão `oglobo` no item da biblioteca.
- A integração cobre a migração da regra, a biblioteca filtrada por fonte e o puzzle buscado na hora para as duas fontes.
- Com a rede desligada, o resultado é o mesmo (SC-005).

## 2. Banco local com as duas fontes

```sh
docker compose up -d
npm run db:migrate -w @cruzadinha/api
npm run db:seed -w @cruzadinha/api
```

Esperado: a migração `0004_puzzles_source_cruzadaonline` foi aplicada, e o seed grava um exemplo de hoje para `oglobo` e outro para `cruzadaonline`, sem rede.

## 3. API

```sh
npm run dev -w @cruzadinha/api
curl -s 'localhost:3000/api/library' | jq '[.items[].source] | unique'                          # ["oglobo"]
curl -s 'localhost:3000/api/library?source=cruzadaonline' | jq '[.items[].source] | unique'     # ["cruzadaonline"]
curl -s "localhost:3000/api/puzzles?date=$(TZ=America/Sao_Paulo date +%F)&source=cruzadaonline" | jq '.puzzle.attribution.sourceName'   # "Cruzada Online"
curl -s -o /dev/null -w '%{http_code}\n' 'localhost:3000/api/puzzles?date=2026-10-16&source=xyz'  # 400
```

Um pedido sem `source` responde igual ao de antes da feature (SC-007).

## 4. Site

```sh
npm run dev -w @cruzadinha/web
```

1. Abra `/`: o seletor "Fonte da cruzada" mostra "O Globo" ativo.
2. Toque em "Cruzada Online" e depois em "Jogar a de hoje": o jogo abre com "Fonte: Cruzada Online" (SC-008, 2 interações).
3. Digite uma letra, volte ao calendário: o dia de hoje está em andamento só em "Cruzada Online". Em "O Globo", continua não iniciado.
4. Recarregue a página: "Cruzada Online" continua escolhido.
5. Abra `/dia/<um dia passado>?fonte=cruzadaonline` sem esse dia salvo: o puzzle é buscado na hora (rede real em desenvolvimento).

E2E automático (com a API e o banco do passo 2):

```sh
npm run test:e2e -w @cruzadinha/web
```

Inclui `fontes.spec.ts` (troca de fonte, jogo, separação do progresso).

## 5. Contra a fonte real (sob demanda, fora da CI)

```sh
npm run source:check:cruzadaonline -w @cruzadinha/api -- 2024-01-01 2025-01-01 2026-01-01 2026-09-01 2026-10-16
```

Esperado: cinco linhas `ok 11x11 <n> palavras` (SC-003). Registre o resultado em `specs/014-adaptador-publico/findings.md`.

```sh
npm run cli -w @cruzadinha/api -- puzzles collect
```

Esperado: duas linhas de resumo, O Globo e Cruzada Online. Uma falha numa fonte não impede a outra, e a saída é 1 se houver falha.
