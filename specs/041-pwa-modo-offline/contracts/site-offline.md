# Contract: site instalável e offline (041)

A API **não muda** (mesmas rotas, schemas e OpenAPI). O contrato desta feature é o que o site publica
e o que a pessoa vê.

## Arquivos publicados (`apps/web/dist`)

| Arquivo | Origem | Cabeçalho (`public/_headers`) |
|---|---|---|
| `/sw.js` (+ `workbox-*.js`) | `vite-plugin-pwa` `generateSW` | `Cache-Control: no-cache` |
| `/manifest.webmanifest` | `vite-plugin-pwa` `manifest` | `Cache-Control: no-cache` |
| `/pwa-192.png`, `/pwa-512.png`, `/pwa-maskable-512.png`, `/apple-touch-icon.png` | `public/` | padrão |
| todos | | `X-Robots-Tag: noindex, nofollow` (regra `/*` existente) |

Manifesto: `name: "Cruzadinha"`, `short_name: "Cruzadinha"`, `lang: "pt-BR"`, `start_url: "/"`,
`scope: "/"`, `display: "standalone"`, cores de `docs/design.md`, os três ícones.

## Service worker

- Precache: casca do build (`js`, `css`, `html`, `svg`, `png`, `woff2`).
- Navegação: qualquer rota do site responde `index.html` do precache; `/api/*` nunca é interceptado
  nem guardado (`navigateFallbackDenylist: [/^\/api\//]`, sem `runtimeCaching`).
- Atualização: sem `skipWaiting`/`clientsClaim`; versão nova vale na próxima abertura (todas as abas
  fechadas).
- Registrado só no build de produção (`vite preview` e Pages); `npm run dev` sem service worker.

## Textos e estados da interface

| Situação | O que aparece | Onde |
|---|---|---|
| Sem rede | "Sem conexão" (`role="status"`, some sozinho) | `AppLayout` |
| Cruzada não guardada, sem rede | "Esta cruzada só abre com conexão." + link para o calendário | jogo e `/dia/:date` |
| Tela que precisa do servidor, sem rede | "Esta tela precisa de conexão." | login, cadastro, recuperar e redefinir senha, verificar e-mail, status |
| Calendário sem rede | só os dias guardados + "Sem conexão: mostrando só as cruzadas guardadas." | `LibraryPage` |
| Dia/card guardado | ícone + texto acessível "Disponível sem rede" | `DayCell`, `TodayCards` |
| Conta com pendência | estado `offline` do `SaveStatus` (existente) | jogo |
| Pendência de conta, pessoa visitante | ~~"Há progresso esperando você entrar." + link Entrar~~ (removido na feature 051) | `AppLayout` |
| Sair com pendência | `Dialog`: "Há progresso ainda não enviado. Sair agora descarta esse progresso." [Sair mesmo assim] [Cancelar] | cabeçalho |
| Outra conta entrou | "O progresso não enviado da conta anterior foi descartado." | `AppLayout` (uma vez) |
| Instalação possível | botão "Instalar" (`Button` `quiet`) | cabeçalho; ausente se instalado ou sem `beforeinstallprompt` |
| Download de hoje | ~~botão "Baixar as cruzadas de hoje" (desabilitado sem rede) → "Guardadas: N. Falharam: <fontes>."~~ (removido na feature 051) | seção "Hoje" |
| Falha ao guardar | "Não foi possível guardar para jogar sem rede." (só no resumo do download; ao abrir, silencioso) | seção "Hoje" |

## Rotas

Sem rotas novas. Mudança de carregamento: `/jogo/:puzzleId` com cópia guardada não espera o servidor
nem a sessão (usa o último usuário conhecido); sem cópia, igual a hoje.
