# Research: Sessão só depois de o servidor acordar

## 1. Como o `viewerLoader` espera o servidor

- **Decision**: `whenServerReady(signal)` em `api/server-wake.ts`: resolve na hora se `isServerReady()`, senão assina `subscribeServerReady` e resolve ao `markReady`; rejeita com `AbortError` se o `signal` abortar (e remove a assinatura). O `viewerLoader` e o `directPlayLoader` fazem `await whenServerReady(request.signal)` e depois `ensureQueryData` (o `directPlayLoader` também consulta a sessão, em paralelo, e seu `catch` descartaria o atalho "Ir direto ao jogo" se o pedido falhasse com a API dormindo). Nenhum outro `ensureQueryData`/`fetchQuery` existe fora de testes.
- **Rationale**: o laço de `/api/health` já roda no `serverReadyLoader` (pai); um segundo `waitForServer` dobraria os pedidos de saúde e o limite de 90 s ficaria duplicado. Se o pai estourar o limite, a rota cai no `errorElement` do pai (feature 012) e o filho fica sem efeito.
- **Alternatives**: (a) `viewerLoader` chamar `waitForServer` (segundo laço, rejeitado); (b) mover o pedido da sessão para dentro do `serverReadyLoader` (faria `/login` e `/cadastro` falharem por causa da sessão, e mistura duas responsabilidades); (c) trocar o loader por `useQuery` nas telas (perde a garantia de "sessão consultada antes da tela" da feature 013).
- **A verificar (tarefa T006)**: que o `signal` do loader aborta quando o pai rejeita ou a navegação muda, para a assinatura não ficar pendurada; se não abortar, a assinatura é inofensiva (um callback até o próximo `markReady`) e nenhum pedido sai, pois a rota já foi trocada.
- **Testes**: os que montam `viewerLoader`/`directPlayLoader` sem o portão pai (`viewer.test.tsx`, `direct-play.test.ts`) passam a chamar `serverIsReady()` (helper em `src/test/render.tsx`: `waitForServer` com `fetch` que devolve saúde 200), senão os loaders esperariam para sempre.

## 2. Cabeçalho no mesmo quadro do calendário

- **Estado atual**: `AppLayout` já usa `enabled: serverReady`, então não pede `/api/auth/me` antes da hora. No issue #63 o cabeçalho "Visitante | Entrar" aparece junto da tela de erro porque o pedido da sessão do loader tinha falhado e o do cabeçalho (depois da saúde) deu 401.
- **Decision**: corrigir o item 1 primeiro e medir (e2e do issue, 250 ms). Com o `viewerLoader` esperando, os dois pedidos saem juntos quando o servidor fica pronto e usam a mesma chave de cache (um só pedido). Se ainda houver quadro em que o cabeçalho mostra a identidade antes do calendário (o loader do calendário pode demorar mais que a sessão), o cabeçalho passa a mostrar a identidade só quando a rota atual terminou de carregar (estado de navegação ocioso e sem tela de espera), sem API instável do React Router.
- **Rationale**: evita código a mais se a medição já cumprir FR-004; a spec exige o resultado, não o mecanismo.
- **Alternatives**: ocultar a identidade por um sinalizador de módulo ligado ao fim do `hydrateFallback` (mais acoplamento); aceitar o intervalo curto (descumpre FR-004).

## 3. Produção (proxy da Cloudflare)

- **Decision**: não depende da medição. Se o proxy segurar `/api/auth/me` até acordar, a ordem nova continua válida, pois a sessão só sai depois da saúde. Anotar a medição em `quickstart.md` se for feita depois do deploy.

## 4. Teste de regressão

- **Decision**: unitário em `viewer.test.tsx`: `GET /api/health` responde 503 duas vezes e depois 200; `GET /api/auth/me` responde 503 enquanto a saúde não deu 200 e 401 depois; asserção: nenhum `alert`, nenhuma chamada a `/api/auth/me` antes da saúde 200 e o calendário/visitante aparece no fim. Falha hoje. E2E com `page.route` reproduz a tabela do issue.

## 5. Resultados da implementação

- **Causa extra encontrada em T007**: o cabeçalho (`AppLayout`), `useSettingsSync` e `SettingsDialog` usam `useViewer` → `useSessionQuery`, que não tinha o portão do servidor pronto. Só o `useQuery` do próprio `AppLayout` tinha `enabled: serverReady`; os outros pediam `/api/auth/me` no primeiro render, com a API dormindo. Correção: o portão passou para `useSessionQuery` (e o `AppLayout` o usa). `LoginPage` e `RegisterPage` ganham o mesmo portão.
- **Testes**: `test/setup.ts` deixa o servidor pronto por padrão em cada teste; os da espera chamam `resetServerWake()`.
- **T007(d)**: o teste de sair da tela durante a espera passa; o `signal` do loader não foi inspecionado diretamente, mas nenhum pedido de sessão sai depois de a rota ser trocada.
- **T009/T010**: `e2e/espera-sessao.spec.ts` (API simulada no navegador, amostras a cada 250 ms) mostra o cabeçalho só com `Cruzadinha` durante a espera e a identidade no mesmo quadro do calendário; o ajuste no `AppLayout` (T010) não foi necessário.
- **Timeout de 90 s**: continua coberto por `RouteError.test.tsx`, `server-wake.test.ts` e pelo e2e da feature 012.
