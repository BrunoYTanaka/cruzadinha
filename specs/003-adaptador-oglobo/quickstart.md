# Quickstart: validar a feature 003

Pré-requisitos: Node 24 (`nvm use`) e `npm ci` na raiz. Nenhum banco ou container é necessário.

## 1. Suíte automática, sem internet (histórias 1 e 2)

```sh
npm test -w @cruzadinha/shared
npm test -w @cruzadinha/api
```

Esperado:

- Testes do formato interno passam: o exemplo de [contracts/puzzle-format.md](./contracts/puzzle-format.md) é aceito e cada variação inválida (palavra fora da grade, palavra cruzando bloco, dica vazia, número repetido, célula órfã, solução com outra dimensão) é recusada com `path` (FR-003, FR-004).
- Testes do adaptador passam com as fixtures de `apps/api/src/sources/oglobo/fixtures/`: um caso para cada linha da tabela de mapeamento em [contracts/puzzle-source.md](./contracts/puzzle-source.md) (SC-001, SC-002), incluindo a nova tentativa após recusa e nenhuma nova tentativa após limite de uso.
- Tudo termina em menos de 10 segundos (SC-003).

Para provar que não há rede: desligar a conexão (ou rodar num container com `--network none`) e repetir os comandos; o resultado é o mesmo.

## 2. Teste de contrato quebra com mudança de formato (SC-005)

Num clone de trabalho, renomear `ipuzData.solution` para `ipuzData.solutions` na fixture válida e rodar `npm test -w @cruzadinha/api`: pelo menos um teste falha. Desfazer a alteração.

## 3. Qualidade do repositório

```sh
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

Esperado: tudo verde; o bundle `apps/api/dist/server.mjs` não inclui `check.ts`.

## 4. Verificação sob demanda contra a fonte real (história 3)

Faz até cinco pedidos reais (mais as novas tentativas por recusa). Rodar com moderação.

```sh
npm run source:check -w @cruzadinha/api
npm run source:check -w @cruzadinha/api -- 2026-10-12 --save
```

Esperado: uma linha por nível, no formato de [contracts/source-check.md](./contracts/source-check.md), sem token nem conteúdo do puzzle na saída. Com `--save`, as respostas ficam em `apps/api/.source-samples/` e `git status` não as mostra.

Usar o resultado para:

- criar uma fixture válida reduzida para cada nível que deu `ok` (FR-016);
- registrar como pendência os níveis que falharam;
- descobrir como a fonte responde a uma data sem puzzle e ajustar o mapeamento, se preciso.

## 5. Conferências finais

- `git grep -nE 'ANONYMOUS-[0-9a-f]{32}'` não encontra nada (SC-007). Os testes usam tokens falsos fora desse formato (por exemplo `token-de-teste-1`).
- Nenhuma fixture tem grade maior que 5 x 5 nem dica real (SC-007, FR-015).
