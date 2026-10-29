# Implementation Plan: Captcha no cadastro e na recuperação de senha

**Branch**: `feat/049-captcha-cadastro-recuperacao` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/049-captcha-cadastro-recuperacao/spec.md` (issue #113)

## Summary

Os três pedidos que mandam e-mail sem sessão (`register`, `resend-verification`, `forgot-password`) passam a exigir uma prova do Cloudflare Turnstile quando `CAPTCHA_ENABLED=true`. A API valida a prova em `siteverify` (fail-closed, 10 s, confere `action` e `hostname`) **antes** de qualquer outra coisa da rota, atrás de uma interface `CaptchaVerifier` no molde de `EmailSender`. O site renderiza o widget `interaction-only` num componente próprio sobre `turnstile.render`, só nas telas que enviam, e só quando `GET /api/auth/registration` diz que a verificação está ativa. Sem migração, sem tabela nova. Detalhes e decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 6 (strict), Node.js 24, React 19.3, Vite 8.3

**Primary Dependencies**: nenhuma nova. API: `fetch` e `AbortSignal.timeout` nativos, Zod. Site: script `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` carregado sob demanda (sem biblioteca; `@marsidev/react-turnstile` descartada, ver research).

**Storage**: N/A (a prova nunca é guardada; sem mudança de schema, então sem migração, DDE ou ERD)

**Testing**: Vitest 5 (API com `CaptchaVerifier` falso, site com `window.turnstile` falso), `vitest-axe`, integração com Postgres (Testcontainers) para provar que a recusa não gasta limites, Playwright com o script do widget interceptado

**Target Platform**: API Fastify 5 no Render; site estático no Cloudflare Pages

**Project Type**: web app (`apps/api`, `apps/web`, `packages/shared`)

**Performance Goals**: prova pronta em até 3 s com o widget invisível; uma chamada extra de até 10 s no pior caso por pedido de e-mail

**Constraints**: fail-closed; resposta de recusa igual com e sem conta; token nunca em log; chave secreta só no painel do Render; site antigo funciona contra a API nova com o interruptor desligado

**Scale/Scope**: 3 rotas protegidas, 1 campo novo em 3 schemas e 1 campo novo em `GET /api/auth/registration`, 1 módulo de plataforma novo, 1 componente e 1 hook novos no site

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. TypeScript estrito | OK: resposta do `siteverify` entra como `unknown` e passa por Zod; `captchaToken` e o campo de status vivem em `packages/shared`; sem `any`. |
| II. Qualidade automatizada | OK: testes unitários, integração, axe, e2e; `lint`, `check:deps` (regra nova para `platform/captcha`) e `typecheck` nos hooks. |
| III. Camadas no back | OK: rota chama o verificador via um guarda; sem regra de negócio na rota; sem SQL (sem banco). |
| IV. Adaptadores externos | OK: o Turnstile fica atrás de `CaptchaVerifier`, só `turnstile.verifier.ts` conhece o formato da Cloudflare; teste de contrato com respostas de `siteverify` (sanitizadas, sem segredo). |
| V. Lógica de jogo pura | N/A. |
| VI. Segurança e privacidade | OK: reforça o limite no cadastro; erro genérico; segredo só no cofre do provedor; token fora de log e fixtures. |
| VII. Testes sem internet | OK: verificador falso na API, `window.turnstile` falso e script interceptado no e2e; as chaves de teste da Cloudflare não são usadas em nenhuma suíte. |
| VIII. Conteúdo de terceiros | N/A (o widget só roda em `/cadastro` e `/esqueci-a-senha`, sem conteúdo de fonte). |
| IX. Schema por migração | N/A (sem mudança de schema). |

Resultado: sem violações; nada em Complexity Tracking. Reavaliado após o desenho (Phase 1): continua sem violações. Um desvio de lugar em relação à issue está justificado em research (D1): o módulo vai em `platform/captcha/`, não em `modules/captcha/`.

## Project Structure

### Documentation (this feature)

```text
specs/049-captcha-cadastro-recuperacao/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── captcha-api.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks (não criado aqui)
```

### Source Code (repository root)

```text
packages/shared/src/auth/
├── schema.ts                         # + captchaTokenSchema; captchaToken opcional nos 3 pedidos;
│                                     #   registrationStatusSchema ganha captchaRequired (padrão false)
└── schema.test.ts

apps/api/src/
├── config.ts                         # CAPTCHA_ENABLED, TURNSTILE_SECRET_KEY; config.captcha
├── app.ts                            # AppDeps.captchaVerifier; cria o guarda e passa às rotas
├── platform/captcha/
│   ├── types.ts                      # CaptchaVerifier, CaptchaAction, CaptchaResult
│   ├── turnstile-verifier.ts         # implementação por fetch (siteverify)
│   ├── turnstile-verifier.test.ts    # contrato: fetch injetado, respostas sanitizadas
│   ├── captcha-guard.ts              # extrai o token do corpo, confere interruptor, chama o verificador
│   ├── captcha-guard.test.ts         # inclui o teto de verificações em andamento
│   └── index.ts                      # única entrada (regra nova em .dependency-cruiser.cjs)
├── platform/http/errors.ts           # + 'captcha-failed' (400)
├── modules/identity/registration/registration.routes.ts   # guarda logo após registration-closed
├── modules/identity/recovery/recovery.routes.ts           # guarda no início de forgot-password
├── modules/identity/*/**.schemas.ts  # documentação OpenAPI dos corpos e da resposta nova
└── test/                             # captcha falso; *.int.test.ts de não-consumo

apps/web/src/
├── shared/components/Turnstile/      # Turnstile.tsx, turnstile-script.ts (carrega o script), teste
├── test/turnstile.ts                 # window.turnstile falso dos testes
├── shared/services/config/config.ts  # VITE_TURNSTILE_SITE_KEY (opcional)
├── shared/services/api/auth/auth.ts  # corpos levam captchaToken
├── features/account/hooks/useCaptcha.ts       # estado do token, reset, aviso de falha
├── features/account/hooks/useRegistration.ts  # expõe captchaRequired
├── features/account/components/RegisterForm/RegisterForm.tsx
├── features/account/components/ForgotPasswordForm/ForgotPasswordForm.tsx
├── features/account/components/ResendLink/ResendLink.tsx   # botão bloqueado sem prova
└── e2e/captcha.spec.ts

docs/deploy.md, render.yaml, .env.example, .github/workflows/{ci,deploy}.yml, CLAUDE.md, docs/design.md
.dependency-cruiser.cjs               # api-captcha-entry
```

**Structure Decision**: web application existente. O verificador é uma integração externa sem regra de negócio, como o e-mail; por isso `platform/captcha/` com `index.ts` como única entrada, e o `check:deps` ganha a regra `api-captcha-entry`. O componente do widget é genérico e vive em `shared/components`; o estado (prova, aviso, reset) fica em `features/account`, que já importa só `session`.

## Design decisions (resumo; razões em research.md)

1. **Ordem na rota**: `registration-closed` (como hoje) → guarda de captcha → `admit*` → `safeParse` completo → `email.admit()` → serviço. Recusa devolve `400 captcha-failed`, nunca `401` (o site lê `401` como sessão encerrada) nem `403` (reservado a `registration-closed`).
2. **Token fora do `safeParse` principal**: o guarda lê só `captchaToken` do corpo (`unknown`) com `captchaTokenSchema`; o schema completo continua depois. Token ausente com o interruptor ligado é a mesma recusa.
3. **`hostname`** vem de `APP_BASE_URL` (já obrigatório com Resend), obrigatório com `CAPTCHA_ENABLED=true`. `remoteip` (só quando é um IP; um IPv6 chega como chave /64 e não é enviado) vem de `request.clientAddress`.
4. **Padrão do interruptor**: `true` em produção, `false` no resto; `true` sem `TURNSTILE_SECRET_KEY` ou sem `APP_BASE_URL` não sobe. No Render, definir `CAPTCHA_ENABLED=false` **antes** do primeiro deploy desta versão (senão a API nova recusa subir e o Render mantém a versão anterior).
5. **Um lançamento só**: o site só renderiza o widget se a API disser `captchaRequired: true`; assim a ordem API → site da issue deixa de ser obrigatória. O que continua obrigatório é ligar `CAPTCHA_ENABLED=true` depois de os dois estarem publicados.
6. **Widget por tela**: `signup` na tela do e-mail, `resend` na tela "Confira seu e-mail" (um widget novo, porque a `action` é fixada na renderização), `forgot` em `/esqueci-a-senha`. `reset` após cada envio, inclusive no reenvio.
7. **Falha ao carregar**: sem `window.turnstile` em 10 s, ou `error-callback`, o formulário mostra aviso com "Tentar de novo" (recarrega o script e o widget); envio segue bloqueado.
8. **Tema**: `theme` explícito lido do `data-theme` (ou da preferência do sistema quando `auto`); mudança de tema remove e renderiza o widget de novo.
9. **Teto de verificações**: o guarda aceita no máximo 2 verificações em andamento por endereço e 20 no total (memória do processo); acima disso recusa como `captcha-failed` sem chamar a Cloudflare. Recusas por prova ausente ou por excesso saem em `debug`.
10. **Erro de partida**: a mensagem de `TURNSTILE_SECRET_KEY` ausente diz que o padrão de produção é `true` e que `CAPTCHA_ENABLED=false` desliga.
11. **Cabeçalhos**: `public/_headers` não tem CSP e o `Referrer-Policy: no-referrer` só vale para `/verificar-email`, `/redefinir-senha` e `/confirmar-email`, onde não há widget; nenhuma mudança é necessária, só um teste que prova isso (ver research D8).

## Complexity Tracking

Sem violações a justificar.
