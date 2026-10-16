# Contrato: repasse `/api/*` (Pages Function ↔ API)

## Navegador → site

O navegador fala só com `https://<projeto>.pages.dev`. Os pedidos para `/api/*` são atendidos pela Function `apps/web/functions/api/[[path]].ts`. Todo o resto é arquivo estático ou o `index.html` (SPA).

## Function → API

| Item | Regra |
|---|---|
| URL | `API_ORIGIN` + `pathname` + `search` do pedido original. `API_ORIGIN` é uma origem `https:` sem caminho. |
| Método e corpo | iguais aos do pedido. O corpo é repassado como stream. |
| Cabeçalhos repassados | todos os do pedido, menos `host` e qualquer `x-cruzadinha-*` vindo do navegador |
| Cabeçalhos acrescentados | `x-cruzadinha-proxy-secret: <PROXY_SECRET>` e `x-cruzadinha-client-ip: <CF-Connecting-IP>` |
| Redirecionamento | `redirect: 'manual'`: um 3xx da API volta ao navegador como veio |

## API → Function → navegador

| Resposta da API | O que o navegador recebe |
|---|---|
| qualquer resposta que não seja `text/html` | a mesma: status, corpo e cabeçalhos, inclusive `Set-Cookie`, `Retry-After` e `Date` |
| `content-type: text/html` (página de "acordando" do provedor) | `503`, `Retry-After: 5`, corpo `{"error":"service-unavailable","message":"O servidor está acordando. Tente de novo em instantes."}` |
| falha de conexão ou exceção no `fetch` | igual à linha anterior |
| Function sem `API_ORIGIN` ou sem `PROXY_SECRET` | `503`, mesmo corpo, sem chamar a API, com um `console.error` sem valores |

## API: verificação do repasse

Vale só quando `PROXY_SECRET` está definido. Sem ele, nada desta seção se aplica.

| Pedido | Resultado |
|---|---|
| `GET /api/health`, com ou sem cabeçalho | atendido normalmente (health check do provedor) |
| qualquer outro, com `x-cruzadinha-proxy-secret` igual ao segredo | atendido. `clientAddress` = `x-cruzadinha-client-ip`, se for IP válido; senão `request.ip` |
| qualquer outro, sem o cabeçalho ou com valor diferente | `403` `{"error":"forbidden","message":"Acesso negado."}`. Nada chega às rotas. Log em `info` sem o valor recebido. |

- A comparação é em tempo constante (SHA-256 dos dois lados e `timingSafeEqual`).
- `clientAddress` é o valor que as rotas de cadastro, login, convites e busca na fonte passam ao limitador (antes, `request.ip`).
- O `403` não é documentado em cada rota. O plugin de documentação só existe fora de produção, onde `PROXY_SECRET` normalmente não está definido.
