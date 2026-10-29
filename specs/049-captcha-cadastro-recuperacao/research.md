# Research: Captcha no cadastro e na recuperação de senha

Fontes: documentação atual do Turnstile via Context7 (`/websites/developers_cloudflare_turnstile`, consultada em 2026-10-29) e o código do repositório. Itens que a documentação não responde estão marcados **não verificado**.

## D1. Onde mora o verificador

- **Decisão**: `apps/api/src/platform/captcha/` com `index.ts` como única entrada, e regra `api-captcha-entry` no `.dependency-cruiser.cjs` (cópia de `api-email-entry`).
- **Razão**: é uma integração externa sem regra de negócio, igual a `platform/email`; `modules/identity` o usa e `platform` nunca importa `modules`. Um módulo em `modules/captcha/` (como a issue sugere) obrigaria `identity` a importá-lo por `index.ts` sem ganho.
- **Alternativas**: `modules/captcha/` (issue); descartada por não ter rotas nem dados.

## D2. Contrato do `siteverify`

- **Fatos (documentação)**: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`, corpo JSON ou `x-www-form-urlencoded`, campos `secret`, `response`, `remoteip` (opcional), `idempotency_key` (opcional, não usar). Resposta: `success`, `challenge_ts`, `hostname`, `error-codes`, `action`, `cdata`. Token: até 2048 caracteres, validade de 300 s, uso único; expirado ou repetido devolve `timeout-or-duplicate`.
- **Decisão**: enviar JSON; resposta lida como `unknown` e validada por Zod (`success` obrigatório; `hostname`, `action`, `error-codes` opcionais). Aceitar só se `success === true`, `action` igual à esperada e `hostname` igual ao de `APP_BASE_URL`. Qualquer outra coisa (rede, timeout de 10 s via `AbortSignal.timeout`, status fora de 2xx, JSON inválido, Zod falhando) é recusa.
- **Log**: só o resultado e os `error-codes` (nomes), nunca o token nem o segredo.

## D3. `action` e `hostname`

- **Fato**: `action` é um valor do cliente, limitado a 32 caracteres alfanuméricos com `_` e `-`; vem de volta na validação. `signup`, `resend` e `forgot` cabem.
- **Decisão**: `CaptchaAction = 'signup' | 'resend' | 'forgot'`, constante em `shared` para API e site não divergirem.
- **Hostname**: o plano gratuito limita 10 hostnames por widget; o widget de produção precisa listar o domínio do site (e `localhost` só no widget de desenvolvimento). O `hostname` esperado é o de `APP_BASE_URL`.
- **Verificado em 2026-10-29** (chamada real a `siteverify` com a chave secreta de teste `1x…AA` e a prova de teste `XXXX.DUMMY.TOKEN.XXXX`): resposta `200` com `success: true`, `hostname: "example.com"`, `metadata.result_with_testing_key: true` e **sem o campo `action`**. Consequência: com as chaves de teste o verificador recusa de propósito (`wrong-action`, e `wrong-hostname` salvo `APP_BASE_URL=https://example.com`), porque a API exige `action` e `hostname`. As chaves de teste servem só para provar o caminho de recusa; o caminho feliz fica no verificador falso e nos testes de contrato com respostas escritas à mão. Não há como obter uma prova com `action` sem um widget real.

## D4. Chaves de teste

- **Confirmado na documentação**: site key `1x00000000000000000000AA` + secret `1x0000000000000000000000000000000AA` sempre passa; `2x…AB`/`2x…AA` sempre falha; secret `3x0000000000000000000000000000000AA` devolve `timeout-or-duplicate`; site key `3x00000000000000000000FF` força desafio interativo. A site key de teste funciona em qualquer domínio, inclusive `localhost`.
- **Decisão**: usadas só na verificação manual de desenvolvimento (quickstart), nunca em CI, e nunca gravadas como padrão de configuração.

## D5. Limites do plano gratuito

- **Fato**: até 20 widgets, desafios e verificações ilimitados, 10 hostnames por widget, análise de 7 dias, conformidade WCAG 2.2 AAA, sem remover a marca da Cloudflare.
- **Decisão**: o plano gratuito basta; não há cota a monitorar. Registrar em `docs/deploy.md` que o widget de produção precisa do domínio do site na lista de hostnames.

## D6. Renderização no site

- **Fatos**: carregar `api.js?render=explicit`; `turnstile.render(container, opções)` devolve o id; opções usadas: `sitekey`, `action`, `callback`, `error-callback`, `expired-callback`, `timeout-callback`, `theme` (`light`/`dark`/`auto`), `language`, `appearance: 'interaction-only'`; `turnstile.reset(id)` e `turnstile.remove(id)`.
- **Decisão**: componente próprio `Turnstile` (~40 linhas): injeta o script uma vez, espera `window.turnstile` com limite de 10 s, renderiza com `language: 'pt-br'` (**confirmado na documentação em 2026-10-29**: a lista de idiomas traz `pt-br` (e `pt`), e o texto de configuração também aceita `pt-BR`; a implementação usa `pt-br`) e expõe `onToken`, `onUnavailable` e um `reset` imperativo.
- **Alternativas**: `@marsidev/react-turnstile` (dependência a mais, sem ganho para um widget); `data-*` implícito (não deixa fixar `action` por tela nem fazer reset).
- **`interaction-only`**: o widget fica invisível até pedir interação; o botão continua bloqueado até haver token.

## D7. Tema

- **Fato**: `theme: 'auto'` segue a preferência do visitante no sistema, não o tema escolhido no site (que grava `data-theme` em `<html>`).
- **Decisão**: passar `light` ou `dark` calculados a partir de `data-theme` (ou de `prefers-color-scheme` quando ausente) e, ao mudar o atributo (`MutationObserver`), remover e renderizar o widget de novo, preservando o bloqueio do botão até chegar nova prova.

## D8. Cabeçalhos do Pages

- **Fatos do repositório**: `public/_headers` não define CSP; `Referrer-Policy: no-referrer` está só em `/verificar-email`, `/redefinir-senha` e `/confirmar-email`. Nenhuma dessas rotas tem widget.
- **Fato (documentação)**: com CSP seria preciso liberar `challenges.cloudflare.com` em `script-src`, `connect-src` e `frame-src`.
- **Decisão**: sem mudança em `_headers`. Um teste de `_headers` garante que `/cadastro` e `/esqueci-a-senha` não recebem `no-referrer` nem CSP sem a liberação. **Não verificado** em navegador real: o comportamento do iframe sob `no-referrer`; irrelevante enquanto as páginas com widget não o usam.
- **Service worker**: o Workbox só pré-cacheia a casca; o script do Turnstile é de outra origem e não é interceptado. Sem conexão a tela já mostra "Esta tela precisa de conexão." (`RequiresConnection`).

## D9. Flag para o site

- **Decisão**: `GET /api/auth/registration` ganha `captchaRequired: boolean`. No `shared`, `captchaRequired` é `z.boolean().default(false)` na resposta, então um site novo contra uma API antiga lê `false` e não renderiza nada; um site antigo ignora o campo novo (respostas são tolerantes). A recuperação de senha também lê esta rota, mesmo com o cadastro fechado.
- **Alternativa**: rota nova só para o captcha; descartada: uma chamada a mais por tela sem benefício.

## D10. Ordem na rota e erro

- **Decisão**: `register` e `resend` mantêm `registration-closed` primeiro (sem consultar o serviço, FR da feature 013 e edge case da spec); logo depois vem o guarda. `forgot-password` começa pelo guarda. O erro é `400 captcha-failed` com mensagem genérica em português em `platform/http/errors.ts`. Não é `401` (o site trata `401` como sessão encerrada), nem `403` (usado por `registration-closed`), nem `429` (é o limite por endereço).
- **Cuidado de enumeração**: o guarda roda antes de qualquer consulta de conta, então a resposta de recusa não depende de o e-mail existir.
- **Cuidado com o corpo**: o token é lido de `request.body` como `unknown` com um schema mínimo; o `strictObject` completo roda depois, como hoje. Um token maior que 2048 caracteres falha em `captchaTokenSchema` e vira `captcha-failed` sem chamar a Cloudflare.

## D10b. Teto de verificações em andamento

- **Problema**: o captcha vem antes dos limites, então provas inventadas fariam uma chamada de até 10 s à Cloudflare por pedido, sem teto.
- **Decisão**: contador em memória no guarda, 2 por endereço e 20 no total, liberado em `finally`. Um processo só no Render grátis; com mais réplicas o teto vale por processo (`shortcut`: por processo, subir para o banco se houver mais de uma réplica).
- **Alternativas**: usar `rate_limit_attempts` (grava no banco antes do captcha, o que a issue quer evitar); descartada.

## D11. Compatibilidade

- **Fatos**: os schemas de pedido são `strictObject`; sem `captchaToken` opcional, enviá-lo quebraria a API antiga.
- **Decisão**: `captchaToken: captchaTokenSchema.optional()` nos três pedidos. Com o interruptor desligado, a API ignora o campo mesmo presente. O site só envia o token quando `captchaRequired` é `true`, o que uma API antiga nunca diz. Por isso API e site podem sair no mesmo lançamento; o único passo ordenado é ligar `CAPTCHA_ENABLED=true` depois de ambos publicados.
- **Aba antiga com o interruptor ligado**: o site antigo não envia token e recebe `captcha-failed`; a mensagem pede para recarregar a página.

## D12. Testes

- **API (unidade)**: verificador por `fetch` injetado (sucesso; `success:false`; `action` errada; `hostname` errado; 5xx; JSON inválido; timeout; rede); guarda (interruptor desligado não chama nada; token ausente/vazio/grande; ação certa); rotas com verificador falso (os três fluxos; resposta igual com e sem conta; `registration-closed` primeiro).
- **API (integração, Postgres real)**: pedido recusado por captcha não grava em `rate_limit_attempts`, não consome o intervalo por e-mail nem o teto diário de `email`.
- **Site (unidade)**: componente com `window.turnstile` falso (render com `action`, `appearance`, `language`, tema; `reset` após envio; expirado e erro desabilitam o botão; script que não carrega mostra aviso e "Tentar de novo"); formulários (botão bloqueado sem prova; corpo leva `captchaToken`; reenvio usa prova nova); axe nos dois temas.
- **e2e**: o script do widget e as respostas de `GET /api/auth/registration` e dos POST são interceptados pelo Playwright (`page.route`); cobre teclado, bloqueio do botão e reset. A API real com `CAPTCHA_ENABLED=true` e verificador falso é coberta na integração, porque o processo da API do e2e usa a configuração de desenvolvimento (interruptor desligado).
- **Fora**: nenhuma suíte usa a rede, o Turnstile real ou as chaves de teste.
