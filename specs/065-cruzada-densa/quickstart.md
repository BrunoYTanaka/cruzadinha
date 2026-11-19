# Quickstart: validar a Casa densa

Pré-requisitos: Node 24 (`nvm use`), `npm ci`, Docker para `test:int`. Comandos na raiz do repositório.

## 1. Lista de palavras

```sh
npm run words:build -w @cruzadinha/api
git diff --stat apps/api/src/sources/generated/words/
```

Esperado: o resumo mostra ~35 mil palavras e todas as faixas preenchidas. Uma segunda execução não muda o arquivo. Ver `contracts/word-list-build.md`.

## 2. Testes unitários (sem rede)

```sh
cd apps/api && npx vitest run src/sources/generated
```

Cobrem: desenho simétrico e válido, preenchimento com lista inventada e semente fixa (cruzamentos coerentes, sem repetição, sem resposta recente de 5+ letras), validação das dicas (faltando, sobrando, com a resposta, bloqueada), ordem tentativa → chamada (preenchimento falho não reserva chamada) e contrato com a resposta real salva.

## 3. Medição de viabilidade (SC-001, SC-003, SC-004)

```sh
npm run words:measure -w @cruzadinha/api
```

Preenche, sem modelo, 30 datas para cada tamanho (9, 11, 13, 15) e dificuldade com a lista real e imprime: grades fechadas, palavras (média e mínimo), % de pretas e tempo (médio e máximo). Esperado: ≥ 29/30 em cada combinação, ≥ 28 palavras no 11 x 11, tempo máximo ≤ 30 s.

## 4. Pedido real (gasta crédito; só o dono, com a chave)

```sh
DEEPSEEK_API_KEY=… npm run source:check:generated -w @cruzadinha/api -- --difficulty=easy --save
```

Esperado: imprime as respostas sorteadas da lista e as dicas; com `--save`, grava a resposta em `apps/api/.source-samples/`. Daí sai o fixture real reduzido do teste de contrato.

## 5. No site, local

```sh
docker compose up -d && npm run db:seed -w @cruzadinha/api
npm run dev -w @cruzadinha/api & npm run dev -w @cruzadinha/web
```

O seed cria a Casa de hoje a partir de dados inventados (agora densos). Abrir `/dia/<hoje>?fonte=casa`: grade cheia, simétrica, e o jogo funciona até a conclusão. Em `/admin`, "Fontes geradas" lista horizontais e verticais.
