# Quickstart: validar o jogo sem login e o cadastro aberto

Roteiro de validação ponta a ponta. Os contratos estão em [contracts/api.md](./contracts/api.md) e [contracts/ui-contracts.md](./contracts/ui-contracts.md), e o formato dos dados em [data-model.md](./data-model.md).

## Pré-requisitos

- Node.js 24 (`nvm use`), Docker com Compose, `npm ci`.
- `cp .env.example .env`, depois `docker compose up -d postgres`, `npm run db:migrate -w @cruzadinha/api` e `npm run db:seed -w @cruzadinha/api`.
- API: `npm run dev -w @cruzadinha/api`. Site: `npm run dev -w @cruzadinha/web` (abre em `http://localhost:5173`).

## 1. Verificações automáticas

```sh
npm run lint && npm run typecheck && npm test
npm run test:int                       # Postgres em container
npx playwright install chromium        # uma vez
npm run test:e2e -w @cruzadinha/web    # API com REGISTRATION_ENABLED=true, como no job de E2E
```

Esperado: tudo verde. `docs.test.ts` confirma que `GET /api/auth/registration` tem `schema` e que não restou nenhuma rota de convite.

## 2. Visitante (US1, US2, SC-001, SC-002, SC-003)

1. Abra o site numa janela anônima. Esperado: a biblioteca abre direto, com "Visitante" e "Entrar" no cabeçalho.
2. Abra a cruzada de hoje (a de amostra do seed), preencha algumas letras e use "Revelar letra". Esperado: "Salvo neste aparelho".
3. Recarregue a página. Esperado: as letras, o tempo e a marca da ajuda voltam iguais.
4. Desligue a rede (DevTools → Offline) e continue digitando. Esperado: nenhum aviso de erro ao salvar.
5. Complete a grade. Esperado: a janela de conclusão abre na hora com o tempo e o recorde, sem "vamos registrar".
6. Volte à biblioteca. Esperado: o dia aparece como concluído, com o tempo.
7. Use "Jogar de novo", ainda sem rede. Esperado: reinicia do zero, e o recorde continua.
8. Confira o banco: `SELECT count(*) FROM progress;` → `0` (nada do visitante foi ao servidor).
9. DevTools → Application → IndexedDB → `cruzadinha-visitante` → `progress`. Esperado: um registro com `v: 1` e sem a solução.

## 3. Sessão opcional na API

```sh
curl -s localhost:3000/api/library | head -c 300                      # sem cookie: 200, todos not_started
curl -s 'localhost:3000/api/puzzles?level=daily&date=<hoje>' | head -c 100   # 200 com puzzle e solução
curl -si --cookie 'session=invalido' localhost:3000/api/library | head -5    # 401 e Set-Cookie apagando
```

## 4. Chave de cadastro (US3, SC-004, SC-005)

1. Sem `REGISTRATION_ENABLED` no `.env` (ou com `false`):
   - `curl -s localhost:3000/api/auth/registration` → `{"open":false}`;
   - `/login` não tem "Criar conta" e `/cadastro` mostra "O cadastro está fechado no momento.";
   - `curl -si -X POST localhost:3000/api/auth/register -H 'content-type: application/json' -d '{"email":"novo@exemplo.com","password":"senha-qualquer-1"}'` → `403` com `registration-closed`, e nenhuma linha nova em `users`.
2. Ponha `REGISTRATION_ENABLED=true` e reinicie a API, sem gerar o site de novo. Recarregue `/login`: "Criar conta" aparece. Cadastre só com e-mail e senha. Esperado: chega à biblioteca logado.
3. Repita o cadastro com o mesmo e-mail. Esperado: mensagem genérica, sem confirmar que o e-mail existe.
4. Ponha `REGISTRATION_ENABLED=talvez`. Esperado: a API não sobe e diz qual variável está inválida, sem expor outros valores.

## 5. Conta pelo autor (FR-019)

```sh
npm run cli -w @cruzadinha/api -- users create --email amigo@exemplo.com   # pede a senha duas vezes, sem eco
npm run cli -w @cruzadinha/api -- users create --email amigo@exemplo.com   # → "Já existe uma conta com esse e-mail.", código 1
npm run cli -w @cruzadinha/api -- users create --email x --password y      # → uso, código 2
npm run cli -w @cruzadinha/api -- invites create                           # → "Comando desconhecido.", código 2
```

Entre no site com a conta criada. Esperado: funciona com a chave desligada.

## 6. Entrar e sair (US5)

1. Como visitante, preencha parte de uma cruzada. Entre com a conta do seed. Esperado: a mesma cruzada mostra o progresso da conta (ou vazia), não o do visitante.
2. Saia. Esperado: volta à biblioteca como visitante, e a cruzada mostra de novo as letras de visitante do passo 1.
3. Logado, apague a linha da sessão no banco (`DELETE FROM sessions;`) e troque de mês na biblioteca. Esperado: aviso "Sua sessão terminou. Você está como visitante." e a biblioteca de visitante.

## 7. Fim dos convites (US4)

1. Logado, fora do tabuleiro, digite ↑ ↑ ↓ ↓ ← → ← → B A. Esperado: nada acontece.
2. `curl -si -X POST localhost:3000/api/invites` → `404`.

## 8. Lançamento B (depois do A no ar)

Depois de `npm run db:migrate -w @cruzadinha/api`:

- `\dt invites` não encontra a tabela;
- `SELECT count(*) FROM rate_limit_attempts WHERE action = 'INVITE_CREATE';` → `0`;
- um `INSERT` com `INVITE_CREATE` falha no `CHECK`.

## Resultado da validação (2026-10-16, lançamento A)

- Verificações automáticas: format, lint, typecheck, unitários (API 221, shared 108, site 552), build e integração (161) verdes. Ponta a ponta: 23 de 23, duas vezes seguidas, contra uma API com `REGISTRATION_ENABLED=true` e um Postgres 17 descartável.
- §3 a §5 conferidos à mão: biblioteca e puzzle sem cookie respondem 200; cookie inválido dá 401 e apaga o cookie; cadastro fechado dá `403 registration-closed` sem criar conta; `REGISTRATION_ENABLED=talvez` impede a API de subir; `users create` cria a conta, sai com 1 para e-mail repetido e recusa `--password`; `invites create` e `POST /api/invites` deixaram de existir.
- Diferenças em relação ao plano: em produção o `users create` roda da máquina do autor contra o banco (o terminal remoto do Render é pago), como já era com os convites (`docs/deploy.md` §8). O `TRUNCATE` dos testes de integração já é genérico (`truncateAll`), então não há `invites` para tirar de `apps/api/src/test/database.ts` no lançamento B; só o do E2E (`apps/web/e2e/support.ts`).
- Correção feita durante a validação: o teste ponta a ponta do cadastro esperava a tela de cadastro antes de preencher (o login também tem "E-mail"), e o e-mail da conta no cabeçalho some abaixo de 560 px para não criar rolagem horizontal no celular.
