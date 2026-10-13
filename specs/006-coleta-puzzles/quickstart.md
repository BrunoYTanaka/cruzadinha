# Quickstart: validar a coleta e o cache de puzzles

**Feature**: [spec.md](./spec.md) | **Contratos**: [http-api.md](./contracts/http-api.md), [collect-command.md](./contracts/collect-command.md)

## Pré-requisitos

- Node.js 24 (`nvm use`), `npm ci` na raiz.
- Docker (Postgres local e Testcontainers).
- `.env` copiado de `.env.example` (`NODE_ENV=development`, conta de seed fictícia).

## 1. Testes automáticos (sem rede)

```sh
npm run lint && npm run typecheck && npm test
npm run test:int
```

Esperado:

- Serviço: puzzle guardado não chama a fonte; ausente é buscado e gravado; data futura não chama a fonte; falha da fonte vira `source-failed`; `collect` pula o que existe, para em `rate-limited` e é idempotente.
- Rotas: `401` sem sessão; `200` com `puzzleId` e `puzzle` e sem `solution`; `404`, `502`, `429` com `Retry-After`; segunda chamada da mesma data não consulta a fonte; duas chamadas simultâneas deixam uma linha.
- CLI: saída e códigos 0, 1 e 2.
- `conventions.int.test.ts` e `docs.test.ts` passam com a tabela, o trigger e as rotas novas.

## 2. Coleta contra a fonte real (sob demanda)

```sh
docker compose up -d postgres
npm run db:migrate -w @cruzadinha/api
npm run cli -w @cruzadinha/api -- puzzles collect
```

Para limitar o histórico, defina `COLLECT_HISTORY_DAYS` (por exemplo, `COLLECT_HISTORY_DAYS=0` coleta só hoje; padrão 31). Esperado: o puzzle de hoje e as datas passadas disponíveis dentro da janela ficam em `puzzles`. Rodar de novo: `0 gravados`, todos "já existentes", sem pedidos novos e código de saída 0.

## 3. Seed com puzzle de exemplo

```sh
npm run db:seed -w @cruzadinha/api
```

Esperado: cria a conta de teste e grava o puzzle de exemplo de hoje (5×5, atribuição própria "Exemplo de desenvolvimento (seed)", sem o nome da fonte real) sem acessar a rede. Rodar de novo: nada muda e a saída diz que já existe. Com `NODE_ENV=production`, o seed recusa rodar.

Observação: enquanto o exemplo ocupa hoje, `puzzles collect` o conta como já existente. Para obter o puzzle real de hoje no banco local, recrie-o (`docker compose down -v && docker compose up -d`, depois `db:migrate`) e rode a coleta antes do seed.

## 4. Rota pelo Swagger

```sh
npm run dev -w @cruzadinha/api
```

Em `http://localhost:3000/api/docs/`: executar `login` com a conta de seed e depois `GET /api/puzzles` com `date` de hoje. Esperado: `200`, `puzzleId` e `puzzle` sem nenhuma letra de resposta (o exemplo do seed, se foi gravado). Com o banco vazio e a fonte acessível, a primeira chamada grava; a segunda responde do banco.

## 5. Workflow agendado

0. Sem o segredo cadastrado, o disparo agendado é ignorado com um aviso (job verde) e o manual falha com erro: é o comportamento esperado antes da implantação.
1. Publicar a API com a migração `0002` (o workflow não migra) e cadastrar o segredo `DATABASE_URL` do banco de produção em *Settings → Secrets*.
2. Disparar `collect` manualmente (*Actions → collect → Run workflow*) e conferir o log (sem URL do banco nem token) e o resultado do job.
3. Para conferir o aviso de falha (SC-008), dispare uma vez com `DATABASE_URL` inválida num teste e confirme que o job fica vermelho e o GitHub notifica.
4. Observação: em repositório público o GitHub desativa agendamentos após 60 dias sem commits; reative em *Actions* se isso ocorrer.
