# Research: Confirmar e-mail no cadastro e recuperar senha

Consulta ao Context7 (2026-10-26): `/websites/resend` (Resend), `/drizzle-team/drizzle-orm-docs` (`onConflictDoUpdate`/`onConflictDoNothing`, `delete().returning()`), `/fastify/fastify` (resposta antes do trabalho em segundo plano, `onResponse`), `/colinhacks/zod` (`z.strictObject`, `z.preprocess` com `z.coerce`), `/tanstack/query` (`useMutation`/`mutateAsync`, `setQueryData`, `enabled`), `/remix-run/react-router` (`createBrowserRouter`, `loader`, `hydrateFallbackElement`) e `/microsoft/playwright` (`route.fulfill`, `getByLabel`). Nenhuma divergência de API com o que o repositório já usa. Sem `NEEDS CLARIFICATION` pendente. Correções da análise (`/speckit-analyze`) já aplicadas abaixo.

## 1. Como chamar o Resend

- **Decisão**: `fetch` direto para `POST https://api.resend.com/emails` (`Authorization: Bearer`, corpo `from`, `to[]`, `subject`, `html`, `text`), com o cabeçalho `Idempotency-Key`. Nenhuma dependência nova.
- **Rationale**: é uma chamada só; o SDK não traria nada além do que a interface `EmailSender` já isola. O corpo de erro traz o nome (`daily_quota_exceeded`, `monthly_quota_exceeded`, `rate_limit_exceeded`), todos com HTTP 429, então a distinção é pelo `name` do corpo, nunca só pelo status.
- **Alternativas**: SDK `resend` (dependência extra para uma chamada); SMTP (mais configuração e sem os códigos de cota).

## 2. Quando a trava termina

- **Decisão**: `daily_quota_exceeded` → `blocked_until` = próxima 00:00 UTC; `monthly_quota_exceeded` → 00:00 UTC do primeiro dia do mês seguinte. `rate_limit_exceeded` não grava trava.
- **Rationale**: a documentação diz que a cota diária zera à meia-noite UTC (dia de calendário, não janela móvel). Para a cota mensal a documentação não dá o instante exato; o início do mês UTC seguinte é a melhor estimativa e, se for cedo demais, o envio seguinte recebe a recusa de novo e grava outra trava.
- **Alternativas**: usar o cabeçalho `retry-after` (não documentado para cota); bloquear 24 h fixas (bloqueia além do necessário).

## 3. Contagem de envios e tetos

- **Decisão**: reutilizar `rate_limit_attempts` e o `RateLimiter` (janela móvel de 24 h). Cada e-mail realmente enviado grava uma tentativa `EMAIL_SENT` com chave `GLOBAL` e outra com a chave `EMAIL` do destinatário. Cadastro, reenvio e aviso ao dono só passam enquanto `enviados < EMAIL_DAILY_CEILING − EMAIL_RECOVERY_RESERVE`; a recuperação passa até `EMAIL_DAILY_CEILING`. Padrões: teto 90, reserva 20, 5 por e-mail por dia.
- **Rationale**: uma janela móvel de 24 h sempre contém todo o dia UTC corrente, então conta no mínimo o que o Resend conta: nunca subestima. O teto 90 fica abaixo dos 100 do plano grátis. A migração só alarga os dois `CHECK` (ação e tipo de chave), como as features 021 e 029 fizeram.
- **Alternativas**: contador por dia UTC em tabela própria (mais uma tabela sem ganho); ler `x-resend-daily-quota` (acopla o domínio ao provedor).

## 4. Respostas iguais e tempo parecido

- **Decisão**: o envio acontece **depois** da resposta (tarefa solta, erros só no log). Cadastro, reenvio e recuperação fazem o mesmo trabalho síncrono nos dois casos: a mesma trava de intervalo por e-mail (contada com ou sem conta), as mesmas consultas e as mesmas gravações de limite. Resposta: `202 { retryAfter }`.
- **Rationale**: o envio é a parte lenta e só ocorre num dos casos; tirá-lo do caminho da resposta é o que iguala o tempo. A trava já gravada é checada de forma síncrona (503); uma cota esgotada só descoberta no envio solto trava as requisições seguintes, não a atual.
- **Mecanismo**: a rota chama `email.sendAfterResponse(...)` sem `await` depois de `reply.send`, e o serviço guarda as promessas em andamento; ele expõe `flush()` (só para testes e para o desligamento limpo da API) que as aguarda, assim os testes de integração esperam o envio sem `sleep`.
- **Consequência para a spec**: a tentativa que descobre a cota esgotada já foi respondida com `202`; a trava vale da requisição seguinte em diante. A spec (US4 AS1, edge case de falha de envio, FR-012) foi alinhada a isso.
- **Tolerância do tempo (SC-004)**: o teste `email-timing.int.test.ts` usa um envio de 1,5 s e exige que a resposta volte antes dele e que a diferença entre as medianas dos dois casos fique abaixo de 250 ms.
- **Risco aceito**: nesse envio solto, uma falha que não seja cota fica só no log e a pessoa usa o reenvio. A API do Render grátis pode dormir logo após responder, mas uma requisição acabou de acordá-la.
- **Alternativas**: enviar antes de responder e inserir atraso artificial (frágil, pior para quem tem conta); fila em banco (excesso para 100 e-mails por dia).

## 5. Cadastro repetido dentro do intervalo

- **Decisão**: nunca responder 429 por "pedido cedo demais" quando isso revelaria que há pendência ou conta: o cadastro e a recuperação respondem `202` com o `retryAfter` restante e não enviam. O `429 too-many-attempts` fica para os limites por endereço, que valem para qualquer e-mail. O reenvio de confirmação segue a mesma regra.
- **Rationale**: a spec exige resposta igual exista ou não pendência/conta. O 429 por endereço não depende do e-mail.
- **Nota**: o critério da issue ("`429` por pedido cedo demais") é atendido só pelo limite por endereço; o `retryAfter` aparece no corpo e no cabeçalho `Retry-After`. É um desvio consciente da issue #82, registrado nas suposições da spec.
- **Intervalo por e-mail** (revisão de código): uma tentativa `REGISTER` (cadastro, reenvio e aviso ao dono) ou `FORGOT_PASSWORD` (recuperação) com chave `EMAIL`, gravada **sempre**, haja ou não conta ou pendência, e desfeita só quando nenhum e-mail chegou a sair. Assim o `retryAfter` restante é igual nos dois casos. Soltar a tentativa quando não há conta ou pendência faria o tempo revelá-las. A pendência não tem mais `last_sent_at`.
- **A senha é escolhida na confirmação** (revisão de código): se o cadastro guardasse a senha, quem cadastrasse o e-mail de outra pessoa poderia definir a senha da conta dela. Por isso o cadastro pede só o e-mail e `verify-email` recebe `{ token, password }`; abrir o link não chama a API.

## 6. Tokens

- **Decisão**: `generateSessionToken()` (32 bytes, base64url) e `sha256Hex` já existentes; guardar só o hash. Confirmação: `DELETE ... WHERE token_hash AND expires_at > now RETURNING` dentro da transação que cria o usuário (uso único atômico). Recuperação: `UPDATE ... SET used_at WHERE used_at IS NULL AND expires_at > now RETURNING user_id`, na transação que troca a senha e encerra as sessões. Validades: confirmação 24 h, recuperação 1 h (constantes, não configuração).
- **Rationale**: o token tem 256 bits, então hash rápido basta (como nas sessões). O uso único vem da própria instrução SQL, sem corrida.
- **Alternativas**: JWT assinado (não revogável, exigiria segredo novo).

## 7. Limpeza agendada

- **Decisão**: comando `auth cleanup` na CLI do autor (apaga pendências e tokens vencidos há mais de 7 dias, tokens usados há mais de 7 dias, tentativas `EMAIL_SENT` com mais de 2 dias) e um passo em `.github/workflows/collect.yml`, que já roda duas vezes por dia com `DATABASE_URL`.
- **Rationale**: reaproveita o agendador e o segredo existentes (custo zero); não cria workflow novo.
- **Alternativas**: workflow próprio (mais um agendamento e guarda de segredo); limpar dentro da API a cada requisição (trabalho no caminho quente).

## 8. Site

- **Decisão**: rotas `/verificar-email`, `/esqueci-a-senha`, `/redefinir-senha`; o token vem em `#token=`, é lido uma vez para memória e o fragmento é apagado com `history.replaceState`; o `apps/web/public/_headers` **não** tem `Referrer-Policy` hoje; uma tarefa (T021a) acrescenta `Referrer-Policy: no-referrer` às duas rotas dos links. As páginas não carregam recursos de terceiros. A leitura do token resiste à dupla renderização do `StrictMode` (`token-fragment.ts`). A confirmação e a redefinição são formulários: abrir o link não chama a API, e o token só é gasto no envio da senha.
- **Rationale**: o fragmento não vai ao servidor nem em `Referer`. Leitores de e-mail que só fazem `GET` não consomem o token, e o `POST` só ocorre com JavaScript de navegador.
- **Alternativas**: botão "Confirmar" na tela (um clique a mais; fica como ajuste se algum scanner de e-mail consumir o link).

## 9. Ambiente local e testes

- **Decisão**: `EmailSender` com três implementações: `createResendSender` (produção), `createLogSender` (desenvolvimento, imprime o link no log) e fakes de teste. Sem `RESEND_API_KEY`/`MAIL_FROM`: em produção as rotas que enviam respondem `503 email-unavailable`; fora dela usa o `LogSender`. As três são opcionais no `config.ts`; `RESEND_API_KEY` exige `MAIL_FROM` e `APP_BASE_URL`. Sem `APP_BASE_URL` fora de produção, o padrão é `http://localhost:5173` (para o link do `LogSender`); em produção ela só é exigida junto com a chave.
- **Rationale**: a API continua subindo no Render antes de o autor configurar o Resend (lançamento A com cadastro fechado), e o desenvolvimento não precisa de conta no provedor.
- **Alternativas**: exigir as três variáveis sempre (quebra o ambiente local e o primeiro deploy).
