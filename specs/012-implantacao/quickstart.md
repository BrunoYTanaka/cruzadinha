# Quickstart: validar a implantação

Guia de validação. O passo a passo de criar contas e serviços fica no roteiro `docs/deploy.md` (FR-020), escrito na implementação. Este guia supõe o roteiro seguido e o primeiro deploy feito. `$SITE` é o endereço `https://<projeto>.pages.dev` e `$API` é o endereço `https://<serviço>.onrender.com`. Nenhum valor real deve ser colado em issues, commits ou conversas.

## 1. Local, sem provedores (antes do merge)

```sh
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
npm run test:int
npm run test:e2e -w @cruzadinha/web   # inclui a espera simulada do servidor
```

O que precisa passar:

- **`apps/web/functions`**: o repasse preserva método, corpo, cookies e `Retry-After`, troca HTML ou falha de conexão por `503` e remove os `x-cruzadinha-*` do navegador.
- **API com `PROXY_SECRET`** (`app.inject`):
  - `403 forbidden` sem o cabeçalho;
  - `GET /api/health` liberado;
  - `clientAddress` igual a `x-cruzadinha-client-ip`;
  - um `x-forwarded-for` inventado sem o segredo não muda o endereço.
- **API sem `PROXY_SECRET`**: comportamento de hoje (os testes existentes continuam verdes).
- **`waitForServer`** (relógio falso): pronto com `database: 'up'`, tenta de novo em `down`, HTML, 503 e falha de rede, e desiste aos 90 s.
- **`<ServerWake />`**: nada até 2 s, a mensagem depois, o erro e "Tentar de novo" aos 90 s, sem violações do `vitest-axe`.
- **Versões** (US3): `API_VERSION` igual ao `apps/api/package.json`; o health com `version` e, com `RELEASE_COMMIT`, `commit`; `siteVersionJson` com `GITHUB_SHA`, sem ele e sem git; `apps/web/dist/version.json` depois do build.
- **Recarregamento depois de publicar** (FR-024): `shouldReloadAfterChunkError` e `installReloadAfterDeploy` recarregam uma vez, não recarregam de novo em menos de 30 s no mesmo caminho e não recarregam sem `sessionStorage`.
- **Schemas** (FR-025): as respostas descartam campos extras; pedidos, `puzzleSchema` e `solutionSchema` continuam rejeitando.
- **E2E**: com `/api/health` atrasado 4 s por `page.route`, a espera aparece e depois a biblioteca abre no endereço pedido. Sem atraso, a espera não aparece.

O ambiente local continua igual (FR-021): `docker compose up -d` e `npm run dev -w @cruzadinha/web` funcionam sem `PROXY_SECRET`.

## 2. Depois do primeiro deploy

| # | Verificação | Esperado |
|---|---|---|
| 1 | `curl -sI http://<projeto>.pages.dev/` | redireciona para `https://` (FR-001) |
| 2 | `curl -sI $SITE/` | `200`, `x-robots-tag: noindex, nofollow` (FR-007) |
| 3 | `curl -s $SITE/robots.txt` | `Disallow: /` |
| 4 | `curl -sI $SITE/dia/2026-10-01` | `200` com o `index.html` (FR-004) |
| 5 | `curl -s $SITE/api/health` | `{"status":"ok","database":"up","version":"<versão>","commit":"<sha>"}` |
| 6 | `curl -s -o /dev/null -w '%{http_code}' $SITE/api/docs/` | `404` (FR-017) |
| 7 | `curl -s -o /dev/null -w '%{http_code}' $API/api/auth/me` | `403` (FR-005, SC-005) |
| 8 | `curl -s $API/api/health` | `200` (exceção do health) |
| 9 | `curl -s -o /dev/null -w '%{http_code}' -H 'x-cruzadinha-client-ip: 1.2.3.4' $API/api/auth/login -X POST` | `403`: o cabeçalho sozinho não serve |

## 3. Fluxo de uso (SC-001)

1. Criar um convite da máquina local, apontando para o banco de produção (veja o roteiro; a `DATABASE_URL` entra só no ambiente do comando, nunca em arquivo versionado):
   `npm run cli -w @cruzadinha/api -- invites create --days 1`
2. No celular, abrir `$SITE/cadastro`, cadastrar-se com o convite, jogar algumas letras e fechar.
3. No computador, entrar com a mesma conta, abrir a mesma cruzada e conferir as letras.
4. Nas ferramentas do navegador, conferir que o cookie `sid` é do `<projeto>.pages.dev`, com `HttpOnly`, `Secure` e `SameSite=Lax`.

## 4. Servidor dormindo (SC-002)

1. Deixar o site sem uso por 20 minutos.
2. Abrir `$SITE/dia/<uma data>` numa janela anônima depois de entrar.
   - **Esperado**: "Acordando o servidor" em até 3 s e o tempo correndo. Quando a API responde, o dia abre sozinho, sem recarregar.
3. Registrar em `docs/deploy.md` o que o Render devolveu ao repasse enquanto acordava (HTML ou pedido em espera). Para isso, ver o log da Function em Workers & Pages → projeto → Functions → Real-time logs (R5).
4. **Busca longa atrás do repasse** (edge case da spec, R11):
   - Com a API acordada, abrir `$SITE/dia/<data passada ainda não salva>`.
     - **Esperado**: a cruzada abre, sem `503` do repasse no meio da busca na fonte.
   - Registrar o tempo total no roteiro.
   - Repetir com a API dormindo.
     - **Esperado**: a espera aparece e depois o dia abre.

## 4b. Com a API acordada (SC-003)

1. No Chrome DevTools, aba Network, escolher o perfil "Fast 4G", com o cache desligado.
2. Abrir `$SITE/` já logado, com a API acordada (outro pedido feito há menos de 1 minuto).
   - **Esperado**: a biblioteca aparece em até 3 s, e "Acordando o servidor" não aparece.
3. Anotar no roteiro o tempo do `GET /api/health` e do `GET /api/auth/me`.

## 5. Limites por pessoa (SC-006)

1. De uma rede, errar o login 20 vezes com e-mails diferentes.
   - **Esperado**: `429` a partir da 21ª.
2. Logo depois, de outra rede (por exemplo, o 4G do celular), entrar com uma conta válida.
   - **Esperado**: entra normalmente.
3. Repetir o passo 1 mandando `x-forwarded-for` e `x-cruzadinha-client-ip` inventados.
   - **Esperado**: continua bloqueado, porque a Function sobrescreve esses cabeçalhos.

## 6. Lançamento, publicação e reversão (US3, SC-004, SC-011)

Contratos: [release.md](./contracts/release.md) e [deploy-workflow.md](./contracts/deploy-workflow.md).

1. **Pedido de lançamento**: fazer o merge de um `feat(web): ...` (tocando `apps/web/`) e de um `fix(api): ...` (tocando `apps/api/`).
   - **Esperado**:
     - o `Release` abre ou atualiza um único PR de lançamento, com `web` 0.1.0 → 0.2.0 e `api` 0.1.0 → 0.1.1, e os dois `CHANGELOG.md` listando os commits;
     - a CI roda nesse PR (token do App);
     - o `Deploy` dessas execuções termina com "nada a publicar".
2. **Lançar**: aceitar o PR de lançamento.
   - **Esperado**: tags `api-v0.1.1` e `web-v0.2.0` e duas releases no GitHub. Depois da CI verde, o `Deploy` publica as duas partes. Em até 15 min, `$SITE/api/health` mostra `"version":"0.1.1"` e `$SITE/version.json` mostra `"version":"0.2.0"`.
3. **Só uma parte**: lançar uma versão só com `fix(web)`.
   - **Esperado**: o site é publicado; o Render não tem deploy novo e o health continua na versão anterior.
4. **Sem versão**: fazer o merge de um commit `docs:` ou `chore:`.
   - **Esperado**: o PR de lançamento não muda (ou nem existe), e o `Deploy` termina com "nada a publicar".
5. **Shared**: fazer o merge de um `feat(shared): ...` que toca só `packages/shared/`.
   - **Esperado**: o PR de lançamento propõe o patch de `api` e de `web` ("dependências atualizadas"). Conferir que o plugin `node-workspace` não quebrou o `npm ci` na CI do PR (R12, ponto a confirmar).
6. **PR comum**: abrir um PR qualquer.
   - **Esperado**: nenhum deploy no Pages nem no Render (FR-014).
7. **Reversão**: `gh workflow run deploy.yml -f api=0.1.0 -f web=atual`.
   - **Esperado**: em até 15 min, o health mostra `0.1.0` e o site não muda. Depois, lançar uma correção, para o próximo `Deploy` não republicar a versão revertida (contrato do workflow, "Fora do workflow").
8. **Migração que falha** (teste opcional numa branch descartável publicada à mão):
   - **Esperado**: o deploy do Render falha no health check e a versão anterior continua atendendo.
9. **Aba aberta** (FR-024): abrir o site, publicar uma versão nova do site e, na aba antiga, abrir uma cruzada.
   - **Esperado**: a página recarrega uma vez sozinha e a cruzada abre, sem "Algo deu errado".
10. **Compatibilidade** (FR-025): com o site anterior aberto, publicar uma versão da API que acrescenta um campo numa resposta.
    - **Esperado**: o site anterior continua funcionando.

## 6b. Documentação de versionamento (SC-012)

1. Abrir o `README.md` no GitHub e seguir o link "Versões".
   - **Esperado**: abre o `docs/versionamento.md` com um clique.
2. Com o documento, prever o resultado de cinco mensagens:
   - `fix(web): corrige foco` → `web` patch;
   - `feat(api): adiciona rota` → `api` minor;
   - `feat(shared): novo campo` → `api` e `web` patch;
   - `docs: ajusta roteiro` → nada;
   - `feat(web)!: muda rotas` → `web` minor (abaixo de 1.0.0).
   - **Esperado**: as cinco previsões batem com o documento e com o PR de lançamento real.

## 7. Coleta (SC-010)

1. Rodar o `Coleta de puzzles` à mão (`workflow_dispatch`).
   - **Esperado**: sucesso, e o dia de hoje aparece no calendário publicado.
2. Nos 7 dias seguintes, conferir que as execuções agendadas passaram.
3. No primeiro dia 1 depois do deploy, conferir que o passo de reativação do agendamento rodou sem erro (R8).

## 8. Segredos (SC-009)

- `git grep -nE 'onrender\.com|neon\.tech|pages\.dev'` só encontra exemplos fictícios na documentação.
- Os logs do `Deploy` e do `Coleta de puzzles` não mostram URL de hook, token nem `DATABASE_URL` (o GitHub mascara os secrets; conferir que nenhum passo imprime valores derivados).
- No bundle publicado, `grep -r PROXY_SECRET apps/web/dist` não encontra nada.
