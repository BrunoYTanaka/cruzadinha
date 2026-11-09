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

## Conferência tela a tela com o artefato (T036)

Método: o artefato (`docs/mockups/design-system.html`, `showScreen(id)`, tema e largura) e o site local lado a lado,
em claro e escuro, 1280 e 390 px, para calendário, entrar, criar conta, esqueci a senha, Sua conta
(visitante e conta), estatísticas (com números e vazio), x1 (lista, vazio, novo), Administração,
status e 404.

Divergências encontradas e resolvidas:

- Botão principal azul no site, amarelo (`--sel`) no artefato (FR-003): `Button` primary agora usa
  `--sel`/`--sel-ink`; os diálogos `classic` do tabuleiro trocam duas variáveis para o azul de antes.
- Títulos em Roboto: páginas, painéis e diálogos novos usam `--font-title` (Fraunces) a 28/19/22 px.
- Campos e painéis com contorno de 1 px: campos, painéis da conta, cartão de login, tabela e cartões de
  estatística, lista de x1 e linhas do Admin passaram a 2 px com `--edge` e raio de 6 px.
- Calendário: abas coladas ao painel (contorno de 2 px, aba ativa com faixa amarela de 4 px), filtro
  escolhido preenchido (`--chip-on`, `--chip-on-ink`, derivados de `--ink`/`--bg` e `--word`/`--ink`),
  dia com contorno de 2 px e "hoje" com `--edge`; o `h1` só de leitor de tela saiu do fluxo do grid.
- Sua conta: cartão de identidade (círculo com iniciais, e-mail, "Conectada neste aparelho", Sair em
  largura total).
- Administração: nome da fonte em Fraunces, caixa de seleção amarela, alça com caixa de 44 px.

Divergências mantidas de propósito (segunda conferência, todas as telas da aba Telas):

- Entrar, Criar conta, Esqueci a senha e Nova senha agora têm a chamada e a cruzada de enfeite; o
  texto do erro de login segue o do site (`E-mail ou senha incorretos.`), e a tela "Nova senha" com
  link válido foi conferida (o formulário abre com qualquer token de 43 caracteres) e confere.
- Administração: a frase sobre os cartões de "Hoje" não existe (a 061 os removeu) e o texto das
  instruções do teclado é o do site; "Arrastando" foi capturada com o mouse e confere (linha levantada com sombra e marca amarela de destino).
- Sua conta e Administração: o espaço reservado para o aviso (`min-height`) continua, porque a
  ausência de salto de layout é um requisito testado.
- Diálogo de conclusão e de compartilhar: passaram ao estilo novo (X, título em Fraunces, botão principal amarelo), como no artefato, por decisão posterior; a folha de dicas continua no estilo antigo.
- Contador do x1 no cabeçalho: fica ao lado do texto e some quando está vazio (`display: none`), para o botão não ficar largo.
- Menu Ajudas: alinha à borda direita do botão, como o artefato; a diferença na captura vem da faixa de ferramentas, que quebra de linha para visitante (aviso "Progresso só neste aparelho").
- Terceira conferência: sessão expirada, teclado na tela, "x1 não abriu", "Nova senha", arrastando e
  modo leitura conferem com o artefato (claro e escuro); 768 px e escuro a 390 px não têm estouro
  horizontal. A faixa do modo leitura ganhou botão principal amarelo e o link novo, e o erro "servidor
  não respondeu" usa as letras ZZZ. A faixa do modo leitura continua dentro da coluna do tabuleiro
  (no artefato ocupa a largura toda acima da barra de ferramentas); mover mexeria no layout do jogo.
- Quarta conferência (todas as telas alcançáveis, claro e escuro, 1280 e 390 px): a engrenagem do
  cabeçalho ganhou o contorno (`quiet icon`), as caixas do menu Ajudas vêm antes do texto e a tela de
  Status virou painel com nome e selo por linha.
- Por decisão posterior, ficaram iguais ao artefato: "Visitante" só para leitor de tela (feature 013
  continua valendo para quem usa leitor), "Sessão expirada" saiu da faixa de ferramentas (a faixa de
  aviso já diz), a tela de Status saiu do layout (sem cabeçalho), a faixa do modo leitura ocupa a
  largura toda acima das ferramentas, e os formulários não reservam mais o espaço do aviso de
  lentidão (FR-009 da 059 mudou: o aviso empurra o que fica abaixo do botão; a tela de espera segue
  reservando).
- Também igualados nesta rodada: dica ativa amarela em negrito; Letra, Palavra e Desistir como botão pequeno de 36 px e Ajudas com contorno forte e seta (desfaz o visual `Pill` da 051 e o "Tentar de novo" de "x1 não abriu"); caixas e botões de opção amarelos em todo o site; Configurações com 560 px, interruptor de 46 x 28, passos de 36 px, fontes em duas colunas e rodapé só com "Restaurar padrões" para a conta; erro de login marca os dois campos; convite de x1 como página, sem "Agora não" (a pessoa sai pelo cabeçalho); desafio recusado sem botão; tabela do resultado alinhada à direita com o tempo vencedor em verde; cadastro enviado com o título "Criar conta" e aviso verde; importar com botão amarelo e erro em caixa, sem trocar para "Tentar de novo"; "Esta tela precisa de conexão." sem as casas; um único aviso sem conexão no calendário; textos dos atalhos.
- Botões dos diálogos no tamanho pequeno, folha de dicas no estilo novo com duas colunas (o `classic` do `Dialog` saiu) e o quadrado da marca de volta no celular (some só até 370 px).
- Última conferência: diálogo de conclusão com as estatísticas em linhas e o selo "Novo recorde", "Sair mesmo assim" amarelo, aviso de progresso descartado em azul (info), letras OFFLINE nos erros sem conexão. Conferidos também recorde, empate (texto certo quando a diferença é zero), "Sair agora?", descarte, erro de 90 s (agora aparece; o `whenServerReady` não rejeitava) e as telas de fluxo no escuro a 1280 px. Captcha conferido com as chaves de teste do Turnstile (claro e escuro, 1280 e 390 px): com `1x…AA` o widget fica invisível (modo `interaction-only` da 049) e com `3x…FF` aparece a caixa da Cloudflare entre o e-mail e o botão, no lugar da caixa desenhada no artefato; o desenho da caixa é da Cloudflare (iframe) e não pode seguir o artefato. O envio com chave de teste é recusado (`captcha-failed`), como registrado no quickstart da 049.
- Diferente de propósito: o convite de x1 diz quem desafiou e qual cruzada (o artefato só diz "Leia as regras e escolha como responder ao desafio."), porque é o que a pessoa precisa para decidir. "Reenviar link" mostra a contagem antes de liberar. As telas de captcha mantêm o texto de apoio e "Já tem conta?", que o artefato omite.
- Mantido: a cruzada concluída não tem palavra ativa, então não há barra de dica no modo leitura; o
  botão "Tamanho padrão" desabilitado, como na seção de componentes do artefato.
- Não conferidas: recorde, avisos de progresso descartado, importar com sucesso e "servidor não
  respondeu" na tela (com `/api/health` bloqueado a espera passou de 99 s sem mostrar o erro; não
  investigado, o código desse laço não mudou na 062).
- Textos de apoio a 14 px (o artefato usa 15 px): valor herdado, sem efeito em contraste ou toque.
