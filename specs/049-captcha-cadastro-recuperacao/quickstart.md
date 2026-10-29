# Quickstart: validar o captcha

Pré-requisitos: `nvm use`, `npm ci`, `cp .env.example .env`, `docker compose up -d` (Postgres). Contratos em [contracts/captcha-api.md](./contracts/captcha-api.md); variáveis em [data-model.md](./data-model.md).

## 1. Automático (sem rede)

```sh
npm run lint && npm run typecheck && npm test
npm run test:int                      # recusa por captcha não gasta limites nem teto
npm run test:e2e -w @cruzadinha/web   # widget interceptado pelo Playwright
```

Esperado: tudo verde; nenhum teste chama `challenges.cloudflare.com`.

## 2. Interruptor desligado (padrão no desenvolvimento)

Com `CAPTCHA_ENABLED=false` (ou ausente), `npm run dev` nos dois workspaces:

- `curl -s localhost:3000/api/auth/registration` mostra `"captchaRequired":false`.
- `/cadastro` e `/esqueci-a-senha` funcionam como antes, sem pedir o script da Cloudflare (aba Rede do navegador).

## 3. Interruptor ligado com as chaves de teste da Cloudflare (manual)

No `.env` local (valores públicos de teste da documentação, nunca chaves de produção):

```text
CAPTCHA_ENABLED=true
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
REGISTRATION_ENABLED=true
```

- `/cadastro`: o botão fica desabilitado por instantes e libera sozinho; o envio é **recusado** com `400 captcha-failed`, por desenho: a chave de teste devolve `hostname: example.com` e nenhuma `action` (ver `research.md`, D3), e a API exige as duas. O caminho feliz é coberto pelo verificador falso nos testes.
- `curl -s -X POST localhost:3000/api/auth/forgot-password -H 'content-type: application/json' -d '{"email":"a@b.co"}'` responde `400 captcha-failed`.
- Conferido em 2026-10-29: a chave de teste devolve `hostname: example.com` e nenhuma `action`. Para ver o caminho feliz de verdade é preciso um widget real da Cloudflare, no ambiente de produção ou de homologação.
- Troque a site key por `3x00000000000000000000FF`: o desafio aparece e é operável só por teclado, nos dois temas e com o tema mudando com o formulário aberto.
- Bloqueie `challenges.cloudflare.com` nas ferramentas do navegador: aparece o aviso com "Tentar de novo" em até 10 s.
- Teto: com a chave de teste secreta que sempre falha (`2x0000000000000000000000000000000AA`), dispare dezenas de `curl` em paralelo com `captchaToken` qualquer: a maioria responde `400 captcha-failed` na hora, sem esperar a Cloudflare (SC-009).
- Com `TURNSTILE_SECRET_KEY` vazia e `CAPTCHA_ENABLED=true`, a API recusa subir com a mensagem do campo que falta.

## 4. Produção (ordem)

1. Render: definir `CAPTCHA_ENABLED=false` antes de publicar a versão que traz a feature.
2. Publicar API, `shared` e site (podem sair juntos).
3. Cloudflare: criar o widget com o domínio do site; Render: `TURNSTILE_SECRET_KEY`; Pages/GitHub: variável `VITE_TURNSTILE_SITE_KEY`; republicar o site.
4. Render: `CAPTCHA_ENABLED=true` e reiniciar. Emergência: voltar a `false` e reiniciar.

Detalhes finais vão para `docs/deploy.md` na implementação.
