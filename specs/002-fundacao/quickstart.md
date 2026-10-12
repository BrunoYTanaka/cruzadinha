# Quickstart: validar a fundação

Guia para provar a feature de ponta a ponta. Comandos em [contracts/root-scripts.md](./contracts/root-scripts.md), variáveis em [contracts/server-config.md](./contracts/server-config.md) e a rota de saúde em [contracts/health-api.md](./contracts/health-api.md).

## Pré-requisitos

- **Node.js 24**: a máquina do autor tem hoje o 22.23. Instalar o 24, por exemplo com `nvm install 24` (o `.nvmrc` da raiz indica a versão).
- **Docker com Compose**: não está instalado hoje. É necessário só para a história 4 e para conferir a imagem localmente.
- **Repositório público no GitHub** com o remote configurado: necessário só para a história 2.

## História 1: instalação e comandos de qualidade

1. Num clone limpo: `npm ci`. Esperado: instala sem erro, sem aviso de versão do Node, e os hooks ficam ativos.
2. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`. Esperado: os quatro passam, cada um em menos de 1 minuto, e a saída mostra as três partes.
3. Introduzir um erro de tipo em `apps/web/src/app/App.tsx` e rodar `npm run typecheck`. Esperado: falha apontando arquivo e linha. Desfazer.
4. Renomear o campo `database` em `packages/shared/src/health.ts` e rodar `npm run typecheck`. Esperado: falha no `api` e no `web`. Desfazer.

## História 2: verificação automática

1. Enviar a branch ao GitHub. Esperado: os jobs `quality` e `image` terminam verdes em menos de 10 minutos.
2. Num commit descartável, quebrar um teste e enviar com `git push --no-verify`. Esperado: o job `quality` fica vermelho no passo `test`. Repetir com um erro de lint e com um de tipo.
3. Mudar uma versão no `package.json` sem atualizar o lockfile e enviar com `--no-verify`. Esperado: o job falha no `npm ci`.

## História 3: hooks locais

1. Desformatar um arquivo `.ts`, fazer `git add` e `git commit`. Esperado: o arquivo é formatado e entra no commit.
2. Adicionar uma variável não usada e tentar o commit. Esperado: o commit é bloqueado com a mensagem do ESLint. Repetir com `const x: any = 1`. Esperado: bloqueado por `no-explicit-any`.
3. Fazer um commit que só muda um `.md`. Esperado: termina em menos de 10 segundos, sem rodar testes.
4. Quebrar um teste e tentar `git push`. Esperado: o push é bloqueado e o teste que falhou aparece.

## História 4: ambiente local

1. `cp .env.example .env` e depois `docker compose up -d`. Esperado: em menos de 2 minutos, `curl localhost:3000/api/health` responde `{"status":"ok","database":"up"}`.
2. `npm run dev -w @cruzadinha/web` e abrir o endereço que o Vite mostrar. Esperado: a página mostra "Cruzadinha" e o servidor e o banco disponíveis.
3. `docker compose stop db`. Esperado: `/api/health` responde `"database":"down"` e a página mostra o banco indisponível, com o servidor ainda no ar.
4. Rodar o servidor sem `DATABASE_URL` (`env -u DATABASE_URL npm run dev -w @cruzadinha/api`, sem `.env`). Esperado: não sobe, e a mensagem cita `DATABASE_URL` sem mostrar valores.

## Segredos (SC-007)

Antes do merge, procurar valores reais no repositório e no histórico, por exemplo `git log -p | grep -iE "postgres(ql)?://[^:]+:[^@]+@"`. Esperado: só aparecem os valores fictícios do `.env.example` e do Compose.
