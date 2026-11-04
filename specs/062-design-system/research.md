# Research: Design system aplicado ao site

## D1 — Arraste: `@dnd-kit` (aprovado pela pessoa responsável)

- **Decisão**: `@dnd-kit/react` (`DragDropProvider`, `useSortable` de `@dnd-kit/react/sortable` com `handleRef`), `@dnd-kit/helpers` (`move`) e `@dnd-kit/dom` (`KeyboardSensor`, `PointerSensor`, `Accessibility`). Confirmado no Context7 (`/clauderic/dnd-kit`, `/websites/dndkit`).
- **Razão**: já traz Pointer Events, sensor de teclado, região viva e instruções para leitor de tela; a `handleRef` limita o arraste à alça. Menos código próprio para manter e testar do que um hook caseiro.
- **Configuração adotada**: `PointerSensor` iniciado só pela alça (`handleRef` do `useSortable`), no toque sem espera (5 px de movimento) e `touch-action: none` na alça. A `Accessibility` do dnd-kit é removida dos plugins e o `KeyboardSensor` não é usado: o teclado (Espaço pega, setas movem, Espaço solta, Esc cancela, perda de foco cancela) e os anúncios "posição N de M" são código próprio (`moveBy` e `sortable-announcements` puros, texto fixo ligado por `aria-describedby`). Motivo: o sensor de teclado do dnd-kit move por pixels e depende de layout, que o jsdom não calcula; assim a alternativa sem arrastar (WCAG 2.5.7) fica testável e não depende da biblioteca. Cancelar um arraste por ponteiro (`event.canceled`) restaura a ordem de antes.
- **Alternativas**: Pointer Events direto (menos peso, mas teclado, anúncios e cancelamento seriam código próprio); drag and drop nativo do HTML (não funciona no toque).
- **Custos medidos**: `@dnd-kit/*` 0.5.3 fixas, `peerDependencies` com React 19. O código da biblioteca vai num chunk próprio `dnd` (≈116 kB, carregado só em `/admin`, rota `lazy`); o chunk `vendor` caiu de ≈350 kB para ≈234 kB.
- **Limite de teste**: jsdom não simula o arraste por ponteiro; o teclado e os anúncios têm teste unitário e o ponteiro e o toque têm teste Playwright.

## D2 — Variante `ok` do `Notice`

- **Decisão**: entra, com símbolo "✓" e texto, usando `--ok`/`--ok-tint` que já existem.
- **Razão**: o artefato usa; sem cor nova; `role="status"`.
- **Alternativa**: ficar com `info | warning | error` e trocar o uso no artefato (rejeitada: perde o sinal de sucesso).

## D3 — `--edge` e `--focus`

- **Decisão**: acrescentar só `--edge` (`var(--ink)` no claro; `#868d99` no escuro, como no artefato). Manter `--focus` (já existe e é igual).
- **Razão**: conferido em `light.css`/`dark.css`. O contraste de `#868d99` contra o fundo escuro é testado na fatia 1.

## D4 — Sublinhado do `Link`

- **Decisão**: `background-image` linear amarelo (`--sel`) com `background-size` de 0 a 100% (3 px) em 280 ms, 5 px no `:active`; dentro de `@media (hover: hover)` e desligado em `prefers-reduced-motion`.
- **Razão**: não causa reflow e funciona em texto que quebra linha (`box-decoration-break: clone`).
- **Alternativa**: pseudo-elemento `::after` com `transform: scaleX` (quebra em links de várias linhas).

## D5 — Espaçamento e pontos de quebra

- **Decisão**: manter os valores do código onde há conflito com o artefato e registrar a diferença; ajustar o artefato (não o código) para 599/861 px se o código já estiver coberto por testes e2e. Resolver tela a tela na fatia 4.
- **Razão**: mudar o ponto de quebra desloca o layout de telas já estáveis (`sem-saltos.spec.ts`).

## D6 — Conferência renderizada

- **Decisão**: usar Playwright contra o site local (com conta de seed) para capturar cada tela nos dois temas em 390, 768 e 1280 px, comparando com a aba Telas.
- **Razão**: o artefato nunca foi conferido renderizado.

## Registro da implementação

- D3: `--edge` entrou (`var(--ink)` no claro; `#868d99` no escuro, 3:1 contra `--bg` e `--surface` testado). `--focus`, overlays, raios e `--tap` já batiam com o artefato.
- D5 (pontos de quebra): mantidos os do código (599/861 px nas abas e no calendário) onde já havia teste; os 480 px dos símbolos do calendário são da largura do próprio calendário (`@container (max-width: 479px)`), como no artefato; 560 px do cabeçalho viraram regra de janela.
- `Dialog`: o X de fechar agora é padrão (`closeButton` `true`); `ClueSheet` (folha de dicas, parte do tabuleiro) e o diálogo de resultado de `ImportOffer` (já tem "Fechar" no rodapé) o desligam com `closeButton={false}`. O foco inicial pula o X.
- `Tooltip`: sem a seta do artefato (o posicionamento atual não a calcula); contorno, fundo e sombra seguem o artefato.

## Conferência com a base (T002 e T037)

Base: commit `ae54bb8` (antes da feature) servido por um worktree; atual: esta branch. Capturas em
claro e escuro, 390, 768 e 1280 px, da landing (página inteira), do jogo de um visitante e do diálogo
de conclusão (1280), comparadas pixel a pixel (limite de 8 de diferença por canal).

- **Landing:** só a faixa do cabeçalho muda (texto dos botões em negrito; no celular o menu). O corpo
  da página é idêntico nos três tamanhos e nos dois temas.
- **Jogo:** o tabuleiro, a barra de dica, a lista de dicas e as ferramentas abaixo do cabeçalho são
  idênticos. Mudam o cabeçalho e o botão "Jogar de novo" da faixa de conclusão (ao redor do
  tabuleiro, que usa o `Button` novo pelo contrato).
- **Divergência encontrada e resolvida:** o `Dialog` novo (borda de 2 px, X, padding 20 px) alterava o
  diálogo de conclusão e a folha de dicas, que o FR-019 manda manter. `Dialog` ganhou `classic`
  (borda de 1 px, padding 24 px, sem X, botões com o peso de antes); `CompletionDialog` e
  `ClueSheet` o usam. Depois disso o diálogo de conclusão ficou idêntico.
- A primeira comparação saiu com a fonte errada na base (o Vite do worktree bloqueou os arquivos da
  Fraunces e da Roboto fora da raiz): liberado com `server.fs.strict: false` só no worktree.
