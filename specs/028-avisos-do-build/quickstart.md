# Quickstart: validar a feature 028

Pré-requisitos: Node.js 24 (`nvm use`) e `npm ci` na raiz.

## 1. Build sem os três avisos

```sh
npm run build -w @cruzadinha/web 2>&1 | tee /tmp/build.log
grep -c -E "configLoader|dubious ownership|larger than 500 kB" /tmp/build.log   # esperado: 0
```

## 2. Carregador nativo explícito

```sh
cd apps/web && npx vite build --configLoader native
```

Esperado: termina com sucesso, sem aviso, mesmos arquivos em `dist/`.

## 3. Commit no `version.json`

```sh
cd apps/web
npm run build && cat dist/version.json                          # HEAD local
GITHUB_SHA=abc123 npm run build && cat dist/version.json        # commit "abc123"
```

Sem repositório (copiar `apps/web` e a raiz para um diretório sem `.git`): o build termina, sem mensagem do git, e o commit é "desconhecido".

## 4. Chunks

Na saída do build, nenhum `.js` acima de 500 kB. Comparar a soma do gzip dos JS carregados em `/` com os 160,86 kB de antes (`npx vite preview` e a aba Rede do navegador).

## 5. Qualidade e testes

```sh
npm run typecheck && npm run lint && npm run format:check
npm test -w @cruzadinha/web
npm run test:e2e -w @cruzadinha/web      # ver o CLAUDE.md para o ambiente local
```

## 6. CI

Abrir a execução da branch: nos logs do job `e2e` (fatias 1 a 3) e do job de build, procurar os três avisos. Esperado: nenhum, e todos os jobs verdes.
