# Research: Aviso de versão nova no calendário

Fontes: código instalado de `vite-plugin-pwa` 2.0.0 (`dist/client/build/register.js`), `dist/sw.js` gerado pelo build atual, documentação do vite-plugin-pwa (Periodic SW updates, Prompt for new content) e `apps/web/src/app/reload-after-deploy.ts`.

## R1. Como aplicar a versão nova sob demanda

- **Decision**: Manter `registerType: 'prompt'` e chamar a função devolvida por `registerSW` (`updateSW`) quando a pessoa toca em "Atualizar".
- **Rationale**: `updateSW` só envia `messageSkipWaiting()` ao SW esperando. O `dist/sw.js` gerado já atende a mensagem `SKIP_WAITING` com `self.skipWaiting()`. Nenhuma opção do Workbox muda, então quem não toca em "Atualizar" segue a FR-007 da 041.
- **Alternatives considered**: `registerType: 'autoUpdate'` ou `skipWaiting: true` (atualiza sozinho e recarrega abas no meio do jogo: viola FR-007/FR-008); `useRegisterSW` de `virtual:pwa-register/react` (registraria o SW dentro de um componente; o registro precisa existir desde `main.tsx`, antes de qualquer tela).

## R2. Recarregar só a aba que pediu (FR-008) — risco principal

- **Finding**: No modo `prompt`, quando `onNeedRefresh` é chamado, o plugin adiciona um ouvinte `controlling` que faz `window.location.reload()` se `event.isUpdate`. Ao ativar o SW novo, **todas** as abas controladas recebem `controllerchange` (independe de `clientsClaim`). Sem nada a mais, tocar "Atualizar" no calendário recarregaria também a aba com o jogo.
- **Decision**: Passar `onNeedReload`. Quando presente, o plugin chama esse callback no lugar do `reload()`. O store recarrega só se esta aba pediu a atualização (`requested === true`); nas outras não faz nada.
- **Rationale**: Usa a API pública do plugin; uma linha de guarda resolve FR-008.
- **Alternatives considered**: Ouvir `controllerchange` por conta própria e não usar o callback (duplicaria o que o plugin já faz e o reload do plugin continuaria lá).

## R3. Abas antigas depois que o SW novo assume

- **Finding**: Com o SW novo ativo, `cleanupOutdatedCaches` apaga o precache antigo. Uma aba antiga (ex.: jogo aberto) continua funcionando com o que já carregou; se depois navegar para uma tela carregada sob demanda cujo arquivo não existe mais, o Vite dispara `vite:preloadError` e `installReloadAfterDeploy` recarrega a página uma vez (feature 012).
- **Decision**: Aceitar. Essa recarga acontece numa navegação, nunca no meio de uma partida (o código do tabuleiro já está carregado). É o mesmo comportamento de hoje para uma aba aberta antes de um deploy sem SW.
- **Alternatives considered**: Avisar as outras abas por `BroadcastChannel` para mostrar algo (fora do escopo: o aviso é só no calendário).

## R4. Procurar versão nova enquanto o site fica aberto (FR-010)

- **Decision**: Em `onRegisteredSW(url, registration)`, ouvir `visibilitychange` em `win.document` e chamar `registration.update()` quando `win.document.visibilityState === 'visible'`, se não houver `installing` e `win.navigator.onLine` for verdadeiro (tudo lido de `win`, para os testes passarem um objeto falso). O registro inicial já checa ao abrir.
- **Rationale**: O app instalado volta do segundo plano muitas vezes por dia; isso basta para SC-004 sem timer. A documentação do plugin sugere intervalo periódico; a volta à aba cobre o caso real com menos pedidos.
- **Alternatives considered**: `setInterval` de 1 h (pede mesmo com a aba escondida; não acrescenta nada para quem não volta ao site).

## R5. Versão já esperando ao abrir a página

- **Finding**: Ao registrar, o `workbox-window` dispara `waiting` se já houver um SW esperando (`wasWaitingBeforeRegister`), e o plugin chama `onNeedRefresh`. O aviso aparece também depois de "Fechar" + recarregar (US2 cenário 3).
- **Finding**: Se outra versão chega com uma já esperando, o navegador descarta a antiga e deixa só a mais nova esperando; `updateSW` aplica a que estiver esperando (edge case "Duas versões seguidas").
- **Decision**: Nenhum código extra.

## R6. "Atualizando…" e a recarga de segurança (FR-004, FR-005)

- **Decision**: Ao tocar, o store passa a `updating`, marca `requested`, chama `updateSW()` e agenda `location.reload()` em 10 s. O `Notice` ganha `action.pending` (repassado ao `Button pending`, que já desativa e põe `aria-busy`); o rótulo vira "Atualizando…".
- **Rationale**: Se o SW esperando sumiu (outra aba já atualizou, ou o navegador o descartou), não há `controlling` e a página ficaria presa; recarregar entrega a versão ativa.
- **Alternatives considered**: Sem recarga de segurança (risco de botão preso).

## R7. Progresso pendente (FR-009)

- **Finding**: Fila de saves (`localStorage`), banco local (`cruzadinha-offline`, `cruzadinha-visitante`) e rascunho sobrevivem a recarregar; o SW não toca neles. `drainOutboxes` roda em toda abertura.
- **Decision**: Nada a fazer além de não limpar nada no fluxo de atualização.

## R8. Onde mora o estado

- **Decision**: Store de módulo em `features/offline/hooks/useAppUpdate/` com `useSyncExternalStore`, igual a `useInstallPrompt`. `installAppUpdate(register)` recebe `registerSW` por injeção (testável sem o módulo virtual). "Fechar" grava no store de módulo, então vale até o próximo carregamento mesmo saindo e voltando ao calendário.
- **Alternatives considered**: Contexto React no `app/` (página não pode importar `app/`); `sessionStorage` (sobreviveria ao recarregar, contra US2 cenário 3).
