# Research: Configurações do usuário

**Feature**: 021-configuracoes-usuario | **Date**: 2026-10-21

Documentação consultada pelo Context7 (constituição, Fluxo de Desenvolvimento): Drizzle ORM (`onConflictDoUpdate` com `setWhere`), React Router 7 (`redirect`/`replace` num loader no modo data) e Fastify 5 (opção de rota `bodyLimit`). A View Transitions API e `prefers-reduced-motion` são APIs do navegador, não bibliotecas; seguem o MDN.

## R1. Um conjunto único de configurações, validado campo a campo

- **Decision**: o servidor relê o `jsonb` com `parseStoredSettings`, que devolve só os campos válidos, sem padrões (ver R7). `packages/shared/src/settings/` define `settingsSchema` com oito campos: `theme` (`auto` | `light` | `dark`), `helpLetters` e `helpWords` (inteiro 0 a 99 ou `null` = sem limite), `strikeMode` (`solved` | `filled`), `defaultSource` (texto no formato de identificador de fonte, `^[a-z0-9-]{1,40}$`), `directToGame` (booleano), `boardCellSize` (30 a 110 ou `null` = tamanho padrão) e `libraryWidth` (720 a 1600 ou `null`). A leitura tolerante (`parseSettings`) aplica `.catch(padrão)` em cada campo, então um campo inválido volta ao padrão sem derrubar os outros (FR-018), e chaves desconhecidas são descartadas.
- **Rationale**: um só objeto simplifica a sincronização (um `PUT`, um `savedAt`) e "Restaurar padrões". Validar campo a campo cumpre FR-018 e a convivência entre versões (FR-025).
- **Alternatives considered**: uma chave por configuração (como hoje): obriga várias gravações e vários `savedAt`; um registro por configuração no banco: mais linhas e mais idas ao servidor sem ganho.

## R2. `defaultSource` não é o enum de fontes

- **Decision**: `defaultSource` é validado só pelo formato no `shared` e no servidor. O site resolve o valor com `puzzleSourceIdSchema`: se não conhece a fonte, usa a primeira (`DEFAULT_SOURCE`, feature 015) **sem regravar** o valor (FR-012b).
- **Rationale**: o site e a API são publicados em momentos diferentes (feature 012). Com o enum, um site com uma terceira fonte teria o `PUT` recusado por uma API antiga, e uma API mais nova devolveria um valor que o site antigo não aceita.
- **Alternatives considered**: enum estrito nos dois lados: quebra a regra de compatibilidade entre versões (`docs/versionamento.md`).

## R3. Pedido tolerante a campos novos

- **Decision**: `saveSettingsRequestSchema` é `{ settings, savedAt }`. `settings` usa `z.object` com os oito campos obrigatórios e descarta chaves desconhecidas. Valor inválido num campo conhecido responde `400 invalid-input` com o nome do campo, como o progresso.
- **Rationale**: uma feature futura que acrescente uma configuração não pode ter o `PUT` recusado pela API anterior. Os pedidos do projeto são estritos (feature 012), mas aqui a tolerância é a regra de compatibilidade; o campo novo só se perde até a API ser atualizada.
- **Alternatives considered**: `z.strictObject`: recusaria o site mais novo; guardar o corpo bruto: guardaria dado não validado (princípio I).

## R4. Guarda na conta: tabela `user_settings`

- **Decision**: tabela nova `user_settings` com `user_id` (chave primária, FK para `users`, `ON DELETE CASCADE`), `settings jsonb` (relido pelo Zod), `saved_at timestamptz` e as colunas `timestamps`, com o gatilho `user_settings_set_updated_at` (convenção conferida por `conventions.int.test.ts`). Migração `0005` gerada pelo `drizzle-kit`, com o gatilho escrito à mão como nas anteriores.
- **Rationale**: uma linha por pessoa; a exclusão em cascata cumpre FR-026; `jsonb` aceita campos novos sem migração.
- **Alternatives considered**: colunas por configuração: cada configuração nova viraria migração; guardar em `users`: mistura identidade e preferência.

## R5. Regra de gravação: vence a mais recente

- **Decision**: a regra pura `decideSettingsSave(current, request, now)` em `settings.service.ts`: `savedAt` mais de 5 minutos no futuro → `400 invalid-input` (mesma tolerância do progresso; `savedAtTooFar` sai de `progress.service.ts` para `src/lib/saved-at.ts`); `savedAt` anterior ao guardado → não muda nada e devolve o estado atual (FR-022); senão grava. No banco, o `upsert` usa `onConflictDoUpdate` com `setWhere: saved_at < excluded.saved_at`, para que dois pedidos simultâneos também respeitem a ordem.
- **Rationale**: é o mesmo modelo do progresso (feature 008), já conhecido e testado; o `setWhere` fecha a corrida sem trava explícita.
- **Alternatives considered**: o servidor vence sempre: dois aparelhos se sobrescreveriam fora de ordem; mesclar campo a campo: complexo e sem pedido da spec.

## R6. Limite de tamanho e de frequência

- **Decision**: `bodyLimit: 4096` na rota `PUT /api/settings` (o corpo real tem uns 300 bytes). Um corpo maior cai no tratador de erros atual, que transforma qualquer 4xx do Fastify em `400 invalid-input`. Frequência: nova ação `SETTINGS_SAVE` no limitador persistido, chaveada por endereço (`NETWORK_ADDRESS`, `request.clientAddress`), 120 gravações por 60 minutos; acima disso `429 too-many-attempts` com `retry-after`. A migração `0005` amplia o `rate_limit_attempts_action_check`.
- **Rationale**: FR-024. O site agrupa as mudanças (R9), então uma pessoa normal fica muito abaixo do limite. A spec dizia "como as demais gravações", mas o `PUT` do progresso não tem limite de frequência; esta feature cria o primeiro limite para uma gravação autenticada.
- **Alternatives considered**: chavear por usuário: o limitador só conhece `EMAIL` e `NETWORK_ADDRESS`, e a spec pede endereço; sem limite de frequência: contraria FR-024.

## R7. Primeiro login e saída da conta

- **Decision**: depois do login e ao abrir o site já logado, o site faz `GET /api/settings`.
  - Resposta `settings: null` (conta nunca salvou): envia as configurações do aparelho (FR-020a).
  - Logo após o login, resposta com configurações: elas substituem as do aparelho, sem animação de tema (FR-020a).
  - Ao abrir o site já logado, vence o `savedAt` mais recente (FR-020c). Se o aparelho for mais novo, ele é enviado à conta. Isso cobre a mudança que estava na fila em memória quando a aba fechou.
  - A resposta pode ser parcial (campos inválidos omitidos pelo servidor) e o site completa com os próprios padrões, porque os padrões de ajuda vêm do build do site. Ao sair da conta nada é apagado: as configurações em vigor ficam no aparelho e passam a ser de visitante (FR-020b). A chave local é a mesma para visitante e conta.
- **Rationale**: decisões das Clarifications. Configurações não são progresso, então a separação da feature 013 (IndexedDB do visitante, `queryClient.clear()` no logout) não precisa valer aqui.
- **Alternatives considered**: guardar dois conjuntos no aparelho (visitante e conta): recusado nas Clarifications.

## R8. Armazenamento local e migração das chaves antigas

- **Decision**: chave única `cruzadinha:settings` com `{ v: 1, settings, savedAt }`, lida por `parseSettings`. Sem a chave nova, a primeira leitura monta o conjunto a partir das chaves antigas (`cruzadinha:theme`, `cruzadinha:source`, `cruzadinha:board-size`, `cruzadinha:library-width`; FR-017) e grava a chave nova. As antigas ficam no aparelho e deixam de ser escritas, para que uma aba aberta com o site anterior não quebre. Sem armazenamento (`lib/storage.ts` devolve `null`/`false`), o conjunto vive só em memória até a aba fechar. O script inline de `apps/web/index.html`, que aplica o tema antes do React para não haver troca visível, passa a ler a chave nova e, sem ela, a antiga.
- **Rationale**: reaproveita `readStorage`/`writeStorage`, que já engolem as exceções.
- **Alternatives considered**: apagar as chaves antigas: uma aba antiga perderia as escolhas; manter as chaves separadas: obrigaria a sincronizar quatro valores.

## R9. Estado no site e sincronização

- **Decision**: `features/settings/settings-store.ts` é um armazenamento em módulo com `subscribe`/`getSnapshot`, lido por `useSettings()` via `useSyncExternalStore` do React, como o tema já é um estado de módulo. Ouve o evento `storage` da chave para refletir mudanças de outras abas (FR-019); uma aba nunca escreve sem antes ter o `savedAt` mais recente, então não desfaz a outra. Para a conta, uma fila de envio própria (`settings-sync.ts`) agrupa mudanças por 800 ms, envia só a última versão, tenta de novo com espera crescente em erro de rede ou 5xx e respeita o `retry-after` do 429. Falha vira aviso não bloqueante dentro da modal (FR-023). O `GET` é uma consulta TanStack Query (`queryKeys.settings(userId)`).
- **Rationale**: o princípio V proíbe biblioteca de estado global extra, não um armazenamento simples; o estado do servidor continua no TanStack Query. A espera reaproveita a ideia da fila do progresso (feature 010).
- **Alternatives considered**: Context do React: re-renderiza a árvore toda e não lê outras abas; guardar as configurações só no cache do TanStack Query: o `queryClient.clear()` do logout as apagaria.

## R10. Troca de tema animada

- **Decision**: `themes/theme-transition.ts` aplica o tema dentro de `document.startViewTransition` quando ela existe e o aparelho não pede redução de movimento. A animação revela a página nova num círculo que parte do centro do botão (`clip-path: circle()` em `::view-transition-new(root)`, 450 ms; posição em variáveis CSS). Um clique durante a animação chama `skipTransition()` na anterior antes de iniciar a nova, sem animações empilhadas. Sem suporte ou com movimento reduzido, o tema é aplicado na hora. Trocas que não vêm da modal (abertura, outra aba, conta, restaurar padrões, aparelho no modo automático) chamam `applyTheme` direto, sem animação (FR-007c). O ícone do botão tem uma animação CSS (`@keyframes` de giro e escala, 450 ms) ao montar, desligada por `@media (prefers-reduced-motion: reduce)`.
- **Rationale**: a View Transition revela a própria página no tema novo, o que a cópia de cor do mockup só imitava, e não exige biblioteca.
- **Alternatives considered**: sobreposição de cor (como no mockup): não mostra o tema novo durante o círculo; transição CSS em todas as cores: cada componente anima num ritmo e a página "pisca".

## R11. Botão único de tema

- **Decision**: `themes/ThemeButton.tsx` substitui `ThemeToggle` e só existe dentro da modal (FR-007). A ordem passa a ser claro → escuro → automático → claro: `nextTheme` muda de ordem. O nome acessível e o tooltip dizem o tema atual e o próximo; uma região viva anuncia "Tema escuro". O `ThemeToggle` sai do cabeçalho e do código.
- **Rationale**: decisão das Clarifications (opção B).
- **Alternatives considered**: grupo de três ícones: recusado na clarificação.

## R12. Limites de ajuda vivos e "sem limite"

- **Decision**: `GameLimits` passa a ser `{ letters: number | null; words: number | null }`, com `null` = sem limite (`canRevealLetter`/`canRevealWord` devolvem `true`). As ações de ajuda do reducer recebem os limites no próprio pedido, em vez de lê-los do `GameContext` criado no começo da partida, então mudar o limite com a partida aberta vale na hora (FR-008) e reduzi-lo não desfaz nada (FR-009). `HelpButtons` mostra "Sem limite" no lugar de "2/4". `config.helpLimits` (variáveis `VITE_HELP_*`) continua sendo o padrão.
- **Rationale**: o princípio V pede a regra no `game-logic` com teste; passar os limites no pedido mantém o reducer puro.
- **Alternatives considered**: recriar o jogo quando o limite muda: perderia o estado em memória; `Infinity`: não passa pelo JSON nem pelo Zod.

## R13. Modo de riscar

- **Decision**: `StrikeMode` ganha `'filled'`; `isWordFilled` entra em `game-logic/clue-strike.ts`. `useGame` lê o modo das configurações (some a constante `STRIKE_MODE`) e devolve `struck` e `strikeMode`. Em `ClueList`/`ClueSheet`, o modo `solved` mantém `.done` (risco, `--ok-tint` e visto) e o modo `filled` usa uma classe nova `.struck` (só o risco, texto `--ink`). O texto oculto é ", resolvida" ou ", preenchida". O espaço do visto continua reservado nos dois modos (FR-011).
- **Rationale**: é o ponto de extensão deixado pela feature 016.
- **Alternatives considered**: um terceiro modo "nunca": não foi pedido.

## R14. Ir direto ao jogo sem passar pelo calendário

- **Decision**: um loader na rota `/` (`directPlayLoader`) roda só na primeira navegação do carregamento da página (marca de módulo) e só se `directToGame` estiver ligado. Ele lê a biblioteca da fonte padrão com `queryClient.ensureQueryData` (mesma chave de `useSourceLibraries`) e aplica `todayCard` (feature 015):
  - não iniciada ou em andamento → `replace('/jogo/<id>')`;
  - ainda não salva e fonte não marcada como fora do ar → `replace('/dia/<hoje>?fonte=<fonte>')`, que já busca e trata 404, 502 e 429;
  - concluída, sem cruzada ou fonte fora do ar → devolve o motivo, e a `LibraryPage` mostra um `Notice` com o nome da cruzada (`puzzleSourceNames`);
  - erro na leitura → calendário, sem aviso extra.

  O `replace` evita que o botão Voltar traga a pessoa de novo ao atalho. Links diretos e a volta pelo cabeçalho não passam pela marca (FR-014).
- **Rationale**: decidir no loader evita desenhar o calendário antes de sair dele (SC-007).
- **Alternatives considered**: `useEffect` na `LibraryPage`: o calendário apareceria por um instante.

## R15. A aba do calendário deixa de ser preferência

- **Decision**: a aba escolhida em `SourceTabs` fica só em memória durante a visita; o calendário abre sempre na cruzada padrão. `DayRoute` para de gravar `?fonte=` como preferência. `source-choice.ts` passa a ler e gravar `defaultSource` no conjunto de configurações.
- **Rationale**: cruzada padrão e calendário inicial são uma escolha só (Assumptions da spec).
- **Alternatives considered**: manter a última aba vista: contradiz a decisão do usuário.

## R16. Modal e relógio

- **Decision**: `features/settings/SettingsDialog.tsx` usa o `Dialog` existente e é aberto pela engrenagem (`SettingsButton.tsx`) em `AppLayout`, no lugar do `ThemeToggle`. O tooltip é um componente genérico novo, `components/Tooltip.tsx`: aparece no foco e no mouse, fecha com Esc sem engolir o evento, e só repete o nome acessível (`aria-hidden`). Um pequeno estado de módulo `settings-open` diz se a modal está aberta; `GamePage` pausa o relógio enquanto ela está aberta, sem mostrar a capa de pausa (FR-006). O relógio (`clock.ts`) já separa `hidden` (aba escondida) de `manual` (pausa do jogador). A modal ganha uma terceira flag, `suspended`, para não mostrar a capa e não desfazer, ao fechar, uma pausa feita pelo jogador.
- **Rationale**: não existe tooltip genérico (o balão da feature 018 é próprio da `ClueBar`). A modal fica no layout porque a engrenagem está em todas as telas.
- **Alternatives considered**: `title` nativo: não aparece no foco e é lido de forma inconsistente.
