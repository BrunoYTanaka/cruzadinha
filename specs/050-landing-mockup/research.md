# Research: Landing page alinhada ao mockup

Decisões tomadas ao ler o mockup (artefato `5SdYtHc7FbzT2JibcmHLc4`) e o código atual de `features/landing` e `shared/themes`.

## R1 — Cores e temas

- **Decisão**: reutilizar os tokens do site; definir só `--grid-line`, `--band` e `--band-ink` no CSS da landing, sem cor fixa: `--grid-line: color-mix(in srgb, var(--ink) 7%, transparent)`, `--band: light-dark(var(--ink), var(--surface))` e `--band-ink: light-dark(var(--surface), var(--ink))` (no claro a faixa é a tinta `#1c1f24` com texto branco, no escuro é a superfície `#1a1c20` com texto `#eceef2`, os valores do mockup).
- **Achado**: os valores do mockup coincidem com os do site: `--bg #f6f7f9`/`#121316`, `--surface`, `--ink`, `--mute`, `--line`, `--accent #1a56c4`/`#8db4ff`, `--word #cfe0ff`, `--sel #ffd23f`, `--sel-ink`, `--ok`, `--ok-tint`. Divergências pequenas: `--word` escuro (mockup `#263a5e`, site `#27406e`) e `--sel` escuro (`#f2c230` × `#e8b93a`), imperceptíveis; vale o token do site para o tema não divergir do resto.
- **Por que `light-dark()`**: `light.css` e `dark.css` já declaram `color-scheme` nos mesmos seletores que trocam o tema, então `light-dark()` acompanha a preferência e a escolha manual sem repetir os seletores. Suporte: navegadores de 2024 em diante (alinhado ao `Vite 8` do projeto); sem suporte a declaração é descartada e o valor cai no padrão do site (`--band` herda `--surface`).
- **Alternativas**: copiar os blocos `@media (prefers-color-scheme: dark)` e `[data-theme]` (duplica regra de tema); novos tokens em `light.css`/`dark.css` (alarga o contrato de `ui-contracts.md` por três valores usados em um lugar só).

## R2 — Letras

- **Decisão**: nenhuma dependência nova.
- **Achado**: `shared/themes/fonts.css` já importa Roboto 400/500/700, Roboto Mono 500 e Fraunces variável (600 a 800, latim). O mockup usa exatamente esses pesos (Fraunces 600 e 800, Roboto 400/500/700, Roboto Mono 500). O link do Google Fonts do mockup **não** entra (FR-013, SC-008).
- **Licenças**: as três são SIL OFL 1.1 (distribuição pelo próprio site permitida); já estavam no projeto desde a 048 e a 010.
- **Sem salto**: `font-display: swap` já está nas declarações e o tamanho do título é reservado em unidades de container (R4). Mesmo assim, num CPU lento a troca de fonte deslocou o título e o cabeçalho (CI: 0,108), então `prerender-plugin.ts` pré-carrega Fraunces e Roboto 400, 500 e 700 no `index.html`.

## R3 — Botões da landing

- **Decisão**: `LandingButton/landingButtonClass({ variant, size })`, mesmo padrão do `buttonClass` do site, aplicado a `Link`, `a` e `button`.
- **Achado**: o mockup define `.btn` (amarelo, borda 2 px na cor da tinta, sombra 4 px, `translate(-2px,-2px)` no hover, `translate(3px,3px)` ao pressionar), `.btn.quiet` (só borda `--line`, borda `--ink` no hover) e `.btn.small`.
- **Regras do projeto respeitadas**: botão não usa a cor de link e não tem sublinhado (`text-decoration: none`); alvo de toque mínimo `--tap` (44 px; o mockup tem ~48 px, o `small` ~38 px, então o pequeno ganha `min-height: var(--tap)`); estilos escolhidos com `background-color` para a sobreposição de hover/pressionado do site continuar valendo onde existir; foco visível pelo `:focus-visible` global do site.
- **Hover só com ponteiro**: `@media (hover: hover)`, para o toque não "prender" o estado deslocado.
- **Alternativa rejeitada**: variante `landing` em `shared/components/Button` (exposta a todas as páginas e às quatro variantes documentadas).

## R4 — Título em dez casas (topo)

- **Decisão**: grade de 10 colunas com `container-type: inline-size` e fonte em `cqw`, como no mockup (`8.2cqw`), largura máxima 820 px.
- **Achado**: com casas quadradas (`aspect-ratio: 1`), a altura é reservada pela largura, sem salto de layout. A numeração 1, 2, 3 nas casas 1, 5 e 7 é decoração (`aria-hidden`).
- **Acessibilidade**: o título visível das casas é decoração; o `h1` real traz o texto "Cruzadinha" escondido da tela mais a frase visível ("Palavras cruzadas todo dia, sem cadastro e sem pressa."), então leitor de tela e buscador leem "Cruzadinha: Palavras cruzadas …" num único `h1`. O `role="img"` do mockup não é usado (o `h1` é o rótulo).
- **Animação**: `drop` (transform + opacity) e `flash` (`background-color`), só em `prefers-reduced-motion: no-preference`. Sem movimento reduzido as casas já nascem na cor final.
- **360 px**: `10` colunas com `gap: 3px` cabem em 360 − 32 = 328 px (casas de ~31 px, fonte 8.2cqw ≈ 27 px); os números das casas usam `max(9px, 1.8cqw)`.

## R5 — Grade do fundo e letras flutuantes

- **Decisão**: pseudo-elemento `::before` com duas `linear-gradient` e máscara, como no mockup; três `span aria-hidden` flutuantes (`transform`) que somem abaixo de 820 px e com movimento reduzido.
- **Achado**: o pseudo-elemento do mockup usa `inset: -40px -100vw 0`, o que cria rolagem horizontal quando há barra de rolagem vertical (`100vw` inclui a barra). Aqui o fundo fica em um contêiner de largura total com `overflow-x: clip` e `position: relative`, sem usar `100vw`.
- **Sem foco**: os elementos decorativos não recebem foco nem eventos (`pointer-events: none`).

## R6 — Faixa final de largura total

- **Decisão**: `LandingContent` deixa de ter `max-width`; cada seção ganha um miolo `.inner` (`max-width: 1080px`, gutter como o `.wrap` atual) e a `FinalBand` é o único bloco de largura total.
- **Achado**: `.main` do `AppLayout` não limita largura (`flex: 1; min-width: 0`), então a faixa pode ir de borda a borda sem `100vw` nem margem negativa. O rodapé do mockup não entra (FR-019).

## R7 — Escopo do CSS

- **Decisão**: todo o estilo novo fica em módulos CSS da landing; nenhum seletor global novo e nenhum token novo em `shared/themes`.
- **Achado**: `router.tsx` importa a landing de forma estática (ela precisa estar no primeiro HTML pré-gerado), então o CSS dela vai no bundle principal e é baixado por todas as rotas. O custo é o CSS da landing; as letras não mudam (R2). A verificação da 048 de "toda classe do HTML pré-gerado existe no CSS" continua valendo e cobre as classes novas. O tamanho do CSS é medido antes (T001) e depois (T017) e o aumento é relatado no PR; não há limite.
- **FR-014 verificável**: o teste de CSS das outras páginas não muda; `git diff` fora de `features/landing`, e2e e docs deve ser vazio (critério de revisão).

## R8 — Entrada animada ao rolar

- **Decisão**: opcional, em `@supports (animation-timeline: view())` **e** `prefers-reduced-motion: no-preference`, aplicada por seção (`.wrap > section` em `LandingContent.module.css`, T005) e não item a item como no mockup; assim os módulos dos componentes não repetem a regra.
- **Achado**: o mockup usa `animation: rise linear both` com `view()` e o estado "antes" com `opacity: .35`. Aplicar a regra só nesses dois casos mantém o conteúdo legível sem a animação (FR-016). **Correção na implementação**: o axe do navegador real mede o contraste com as seções fora da tela ainda no estado "antes", e `opacity: .35` reprovou (contraste 2.02 no tema escuro). A entrada ficou só com `transform` (sem opacidade), então o contraste é sempre o inteiro.
- **Cuidado**: `transform` na animação de entrada cria contexto de empilhamento; cartões e linhas não têm elementos `position: fixed` dentro, então não há efeito colateral.

## R9 — Mini cruzada

- **Decisão**: manter `domain/game` (reducer) e acrescentar:
  1. `mini-state.ts` puro: `START_STATE` = estado inicial com `C`, `O`, `S` em 1-horizontal e seleção em (0,3), obtido por `game.reducer` (`select` + três `type`), e `solvedWords(state, solution)` comparando com `plainLetter`.
  2. "Limpar" volta a `START_STATE` (não ao tabuleiro vazio), como no mockup; usa um redutor local que trata uma ação `'clear'` antes de repassar ao `game.reducer`.
  3. Tab/Shift+Tab: `nextWord`/`previousWord` do reducer, **sem armadilha de teclado**: na última palavra, Tab segue o comportamento padrão do navegador (sai da grade); o mesmo para Shift+Tab na primeira. O mockup cicla para sempre (armadilha, WCAG 2.1.2); aqui sai.
  4. Dicas em `<ul>` com `<button>` por item (`selectWord`), então o teclado e o leitor de tela alcançam o que o mockup só atende com mouse.
  5. Mensagem de vitória sempre presente na área de status (`role="status"`): "N de 6 palavras certas." e, completa, "Resolvida! Amanhã tem outra." com o convite a jogar; o botão Limpar fica sempre disponível.
- **Achado**: o `finish` do reducer já passa o estado a `completed` quando a grade está certa e trava a seleção; a contagem parcial sai de `solvedWords`, não do reducer.
- **Amostra**: mesma forma de grade da 048 (blocos em (1,1), (1,3), (3,1), (3,3)), então `SAMPLE_PUZZLE` muda só as respostas, os textos de dica e `SAMPLE_SOLUTION`.

## R10 — Textos e pré-render

- **Decisão**: o texto novo entra pelos mesmos componentes que o pré-render já renderiza; nada muda em `prerender-plugin.ts`.
- **Achado**: `check-build-output.mjs` confere o texto da chamada e a unicidade de `h1`/`main`; acrescenta-se a conferência dos novos rótulos ("Como funciona", "Experimente", "Fontes") e da frase de destaque.
- **E2E**: os testes que procuram "Jogue sem conta", o `h1` "Cruzadinha" e "Ver o calendário" mudam para os novos textos.

## R11 — Cabeçalho

- **Decisão**: manter o cabeçalho do site (`HeaderStart` + ações). O logo "C" e "Jogar hoje" do topo do mockup não entram (Assumptions da spec).

## Medições (implementação)

- **R7, CSS**: `dist/assets/index-*.css` passou de 29 403 bytes (antes) para 35 974 bytes (depois), +6 571 bytes sem compressão. É o CSS da landing no bundle principal; relatado, sem limite.
- **R7, contenção**: fora de `features/landing`, o `git diff` contra `main` toca só `app/router.test.tsx` e `landing-entry.test.tsx` (textos de teste); nenhum arquivo de `shared/`, `app/` ou `pages/` de código.
- **Aceito de propósito (T018)**: o cabeçalho do site é mantido (sem o logo "C" e o "Jogar hoje" do mockup); `--word` e `--sel` do tema escuro são os do site (`#27406e`, `#e8b93a`), não os do mockup; Tab sai da grade nas pontas (o mockup cicla); a entrada ao rolar é por seção e só com `transform`; a letra solta "A" fica em `right: 9%` para não cair sobre o texto de apoio.
