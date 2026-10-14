# Pesquisa: Front básico do Cruzadinha

**Feature**: [spec.md](./spec.md) | **Plano**: [plan.md](./plan.md)

Nenhum item ficou como "NEEDS CLARIFICATION". Cada decisão abaixo tem o motivo e as alternativas descartadas. As consultas à documentação atual (React Router 7 e Vite 8) estão em R1 e R7.

## R1. Roteamento: React Router 7 em modo de dados

- **Decisão**: pacote `react-router` (v7), `createBrowserRouter` + `RouterProvider`. Rotas: `/login`, `/cadastro`, `/` (biblioteca), `/dia/:date` (busca um dia passado e redireciona), `/jogo/:puzzleId`. A guarda de sessão é um `loader` da rota-pai que garante a consulta `GET /api/auth/me` pelo TanStack Query e, sem sessão, redireciona a `/login` levando o endereço de origem na query `?next=` (decidido na implementação: sobrevive a recarregar e a abrir o link em outra aba); depois de entrar, o login volta a ele. O jogo é carregado sob demanda (`lazy`).
- **Motivo**: a documentação atual confirma que, na v7, `react-router-dom` só reexporta `react-router`, e que o modo de dados traz `loader`, `redirect` e `state` nos links. O design já escolheu React Router.
- **Descartado**: modo declarativo (`BrowserRouter`), porque a guarda e o redirecionamento ficariam espalhados nos componentes; modo framework (SSR), porque o site é estático.

## R2. Estado de servidor: TanStack Query, sem estado global

- **Decisão**: consultas para sessão, biblioteca, cruzada e progresso; mutações para login, cadastro, saída, convite e reinício. Resposta 401 em qualquer chamada limpa a sessão em cache e leva ao login com retorno. O estado da partida não passa pelo TanStack Query (R3).
- **Motivo**: constituição V (sem biblioteca de estado global extra) e `docs/design.md` seção 5.
- **Descartado**: Redux, Zustand e contexto global para dados de servidor.

## R3. Estado da partida: reducer puro em `game-logic/`

- **Decisão**: `createGame({ puzzle, solution, limits })` devolve o estado inicial e um reducer `(state, action) => state`, sem React nem relógio. Ações: selecionar célula, alternar direção, digitar letra, apagar, mover por seta, palavra seguinte e anterior, selecionar palavra pela dica, revelar letra, revelar palavra, verificar, hidratar do servidor e reiniciar. O hook `useGame` só liga reducer, relógio e salvamento. O reducer tem a solução e, depois de cada ação de edição, avalia `isSolved(state, solution)`: se a grade ficou certa, passa na mesma transição a `mode: 'completed'` e `completion: 'pending'` (ver R18); `confirmCompletion`, `markElsewhere` e `viewServerProgress` entram como ações para o que vem do servidor.
- **Motivo**: constituição V; testes de reducer não precisam de DOM, rede nem tempo.
- **Descartado**: manter regras em componentes ou em ganchos; guardar a conclusão no estado (pode ficar inconsistente com as letras).

## R4. Fonte: Roboto servida pelo próprio site

- **Decisão**: `@fontsource/roboto` (pesos 400, 500, 700, subconjunto latino) e `@fontsource/roboto-mono` (500, só para o código do convite), importados no CSS e empacotados pelo Vite, com `font-display: swap` e pilha de reserva de sistema.
- **Motivo**: nenhuma requisição a terceiros (privacidade e simplicidade de CSP), funciona sem internet depois de carregado, versão fixada no `package-lock.json`.
- **Descartado**: Google Fonts por CDN (terceiro, rastreia o acesso); fonte variável única (arquivo maior sem ganho para três pesos).

## R5. Tema sem flash e preferência no aparelho

- **Decisão**: três modos (automático, claro, escuro). Um script inline mínimo no `index.html` lê a chave de tema do `localStorage` e define `data-theme` na raiz antes da primeira pintura; sem escolha salva, os tokens seguem `prefers-color-scheme`. Os tokens vivem em CSS (`themes/`), com os dois conjuntos de valores; componentes só leem variáveis. `color-scheme` acompanha o tema para controles nativos.
- **Motivo**: FR-025 e critério do design (sem piscar branco). O design previa gravar a escolha no perfil (`PATCH /api/me/preferences`), mas essa rota não existe e a spec exclui mudança de backend; fica só no aparelho.
- **Descartado**: ler o tema só depois do React montar (causa o flash); biblioteca de tema.

## R6. Salvamento do progresso

- **Decisão**: o hook agenda `PUT /api/progress/:puzzleId` 1,5 s depois da última mudança e também ao ocultar a aba ou sair da página (`visibilitychange` e `pagehide`, com `fetch` `keepalive`). O corpo leva `savedAt` do relógio do aparelho no momento da mudança. Em falha de rede ou 5xx, o corpo mais recente vai para uma fila local (por usuário e cruzada) e o envio é repetido com espera crescente (1 s até 30 s) e ao voltar a conexão. Ao abrir a cruzada, se a fila local tiver `savedAt` mais novo que o do servidor, ela é reenviada antes de seguir; o servidor já ignora salvamentos mais velhos.
- **Motivo**: FR-015 e regra 10 do design; o servidor já é idempotente e resolve conflito pelo `savedAt`.
- **Descartado**: salvar a cada tecla (muitas chamadas); `sendBeacon` (só faz POST e não envia o cookie de forma confiável para `PUT`).

**Ajuste (relógio do aparelho)**: o servidor recusa `savedAt` mais de 5 minutos no futuro (`400`). O cliente guarda o desvio entre o cabeçalho `Date` das respostas e o próprio relógio (`getServerClockOffsetMs()`) e envia `savedAt` = relógio + desvio; num `400` por `savedAt`, repete uma vez com a hora do cabeçalho `Date`.

## R7. Limites de ajuda configuráveis

- **Decisão**: `VITE_HELP_LETTER_LIMIT` (padrão 4) e `VITE_HELP_WORD_LIMIT` (padrão 2), validadas por Zod em `config.ts` (inteiros de 0 a 99; inválido aborta a inicialização com mensagem clara). `vite.config.ts` aponta `envDir` para a raiz para que o `.env` único seja lido; só variáveis com prefixo `VITE_` chegam ao navegador. Entram no `.env.example` com os valores padrão.
- **Fato da documentação**: o Vite substitui `import.meta.env.*` de forma estática no build. Logo, "configurável" significa por build, não em tempo de execução. Isso combina com o front estático da constituição (portabilidade) e é suficiente para o uso privado; alterar os limites exige gerar o site de novo.
- **Descartado**: arquivo `config.json` carregado em tempo de execução (uma requisição a mais e um estado de espera sem necessidade); mandar os limites pela API (decisão do autor: sem mudança no backend).

## R8. Relógio, pausa e aba oculta

- **Decisão**: `clock.ts` acumula o tempo decorrido com `performance.now()` e para ao ocultar a aba (`visibilitychange`), ao usar "Pausar" e quando a cruzada fica concluída. O valor inicial vem de `elapsedMs` do progresso. Pausar cobre o tabuleiro e o torna `inert` (sem foco nem leitura por tecnologia assistiva) para não dar para pensar sem o tempo correr. O tempo salvo respeita o máximo de 7 dias do servidor.
- **Motivo**: regra 11 do design e suposição da spec sobre "Pausar". Só `visibilitychange`, porque `blur` da janela dispara por motivos que não são o usuário sair (DevTools, seletor do navegador).
- **Descartado**: `setInterval` contando segundos (deriva e congela em segundo plano).

## R9. Ajudas: semântica exata

- **Decisão**:
  - **Revelar letra** age na célula selecionada. Só é permitida se a célula não estiver já correta; só então consome 1 do limite. A célula revelada fica **travada** (não editável, pois está certa) e ganha a marca roxa.
  - **Revelar palavra** age na palavra ativa. Preenche e trava só as células ainda não corretas; consome 1 do limite apenas se mudar alguma célula. Todas as células da palavra com letra certa recebem a marca roxa.
  - **Verificar** age na grade inteira, sem limite. Letra errada recebe a marca vermelha; letra certa conferida recebe a roxa; célula vazia fica sem marca. Sem letras digitadas, não faz nada.
  - Ao corrigir uma célula vermelha, ela passa a roxa (a ajuda a afetou), mantendo a regra de que toda célula afetada por ajuda tem cantinho. A marca vermelha só existe entre uma verificação e a próxima edição da célula.
  - O botão de uma ajuda esgotada fica `aria-disabled` com o motivo no rótulo.
- **Motivo**: FR-017 a FR-020; as escolhas de travar e de cobrar só quando algo muda evitam gastar o limite sem efeito.
- **Descartado**: permitir editar célula revelada (apagaria a ajuda sem devolver o limite); cobrar o limite em ações sem efeito.

## R10. Sequência do Konami

- **Decisão**: um ouvinte de `keydown` no layout guarda as últimas 10 teclas (`ArrowUp`, `ArrowUp`, `ArrowDown`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `ArrowLeft`, `ArrowRight`, `b`, `a`, comparando `key` em minúsculas). Reinicia a cada tecla errada. Ignora eventos em `input`, `textarea` e `select`, com modificadores (Ctrl, Alt, Meta) e **dentro do tabuleiro** (rota `/jogo`). Ao completar, chama `POST /api/invites`.
- **Motivo**: dentro do tabuleiro as setas movem a seleção e B e A digitam letras; a spec foi ajustada para a sequência só valer nas outras telas. A proteção real continua no servidor (sessão e cota).
- **Descartado**: sequência valendo no jogo (abriria o convite no meio da partida e mexeria na grade); botão visível (o design quer que seja um segredo).

## R11. Janela de convite: contagem sem repetir a cota

- **Decisão**: depois do `201`, o front consulta `GET /api/invites` e mostra "N convites ativos" (status `active`) e, se houver, a validade do mais antigo. No `409 invite-quota-reached`, explica que o limite de convites ativos foi atingido e que abre vaga quando um for usado ou expirar, também com a validade do mais antigo. Não repete o número da cota, que é uma constante só da API (`INVITE_QUOTA = 3` em `invites.service.ts`).
- **Motivo**: evitar duas fontes da verdade; se a cota mudar, o front continua certo. Diverge do mockup, que mostrava "2 de 3".
- **Descartado**: exportar a cota em `shared` (mudaria a API sem necessidade agora).

## R12. Calendário da biblioteca

- **Decisão**: uma única consulta `GET /api/library` alimenta o calendário. `calendar.ts` (função pura) monta o mês com domingo como primeiro dia, usando a data de Brasília (`Intl.DateTimeFormat` com `America/Sao_Paulo`) e devolve, por dia, um estado: `completed`, `in_progress`, `not_started`, `future`, `fetchable` (passado não guardado) ou `none` (sem cruzada neste dia, aprendido numa tentativa e lembrado em `sessionStorage`). Dia `fetchable` leva a `/dia/:date`, que chama `GET /api/puzzles?level=daily&date=` e redireciona para `/jogo/:id` (com `replace`); erros 404, 502 e 429 aparecem nessa rota com o motivo e o caminho de volta. A navegação de meses vai até 12 meses antes de hoje; antes disso os botões ficam desabilitados.
- **Motivo**: o limite de histórico da fonte é desconhecido (feature 003 e 006); 12 meses acompanham o teto de 366 itens da biblioteca. O erro no destino mantém a biblioteca estável.
- **Descartado**: buscar o dia dentro do calendário (estados de carga e erro dentro de uma célula de 56 px); permitir qualquer mês passado (convida a rajadas de 404 e consome o limite de buscas).

## R13. Tabuleiro e teclado

- **Decisão**: o tabuleiro é `role="grid"` com uma única parada de tabulação (foco móvel entre células) e escuta `keydown` no próprio grid; cada célula tem `aria-label` com linha, coluna, letra ou "vazia", palavra e ajuda. Uma região `aria-live="polite"` anuncia a dica ativa e os resultados das ajudas e da conclusão. As células não são `input`, então o teclado do sistema não abre no celular; o teclado na tela (A a Z, Ç, apagar) aparece quando o ponteiro é grosseiro (`(pointer: coarse)`) ou a largura é pequena, e um teclado físico também funciona. Letras acentuadas viram a letra simples antes de entrar no reducer. As células do tabuleiro têm 44 px no computador e 30 px no celular.
- **Motivo**: FR-009, FR-013 e FR-027; padrão de grid do WAI-ARIA.
- **Descartado**: um `input` oculto por célula (abre o teclado do sistema e atrapalha o teclado próprio); um único `input` oculto para toda a grade (compromete a leitura por célula).

**Ajuste (celular)**: a tecla "Dicas" do teclado abre o `ClueSheet`, uma folha que reaproveita `ClueList`; é o caminho para escolher uma dica no celular, onde a lista lateral não cabe.

## R14. Estratégia de testes

- **Decisão**:
  - **Unitário**: reducer e navegação, ajudas, conclusão, calendário, detector do Konami, fila de salvamento (relógio falso), relógio, armazenamento seguro, configuração, tema.
  - **Contraste dos tokens**: um teste lê `light.css` e `dark.css`, calcula a razão WCAG e exige 4,5:1 para texto e para a letra de cada estado do tabuleiro, e 3:1 para controles, foco e marcas de ajuda, nos dois temas. Os pares de estado do tabuleiro entre si só são registrados, com lista explícita de exceções (decisão do autor, ver `plan.md`).
  - **Componente**: Testing Library com `user-event` e `vitest-axe` em cada tela (regras de ARIA, nomes, rótulos); contraste real não se mede no jsdom.
  - **Ponta a ponta (Playwright)**: dois caminhos contra a API e um Postgres reais, usando a cruzada de amostra 5 × 5 do seed (sem a fonte real): (1) cadastro com convite criado pela CLI, jogo, conclusão, modo leitura e jogar de novo; (2) login, ajudas, recarga mantendo letras e ajudas, `@axe-core/playwright` nos dois temas (inclui contraste real). Roda por `npm run test:e2e` em job próprio da CI, fora do pré-push.
- **Motivo**: constituição V e VII; SC-006 e SC-007 exigem medição, não só intenção.
- **Descartado**: capturas de tela comparadas (frágeis); testes de componente contra a API real.

## R15. CSS e acessibilidade transversal

- **Decisão**: CSS Modules por componente + variáveis de tema; sem CSS-in-JS nem biblioteca de UI. `:focus-visible` com contorno de token em todos os controles; regra global de `prefers-reduced-motion` que zera animações e transições; alvos de toque de 44 px fora do tabuleiro; textos de status com ícone ou palavra além da cor; diálogos com `role="dialog"`, `aria-modal`, foco inicial no botão principal, `Esc` fecha e o foco volta ao elemento de origem. Elementos nativos (`button`, `dialog` quando possível) antes de `div` com ARIA.
- **Motivo**: constituição (sem biblioteca de UI pronta) e FR-027.
- **Descartado**: Tailwind e bibliotecas de componentes (proibido pela constituição).

## R17. Sessão expirada no meio da partida

- **Decisão**: o `401` na rota `/jogo` não redireciona. O tratador do cliente marca a sessão como expirada (contexto em memória) e o `Notice` "Sua sessão expirou. Entre de novo para salvar" abre o `ReloginDialog` por cima do tabuleiro, com o e-mail da conta da partida somente leitura (assim as letras guardadas nunca vão ao progresso de outra pessoa). Ao entrar, o `save-queue` reenvia a fila local sem recarregar a página. Fora do jogo, o `401` continua redirecionando ao login com retorno.
- **Motivo**: FR-032 (nada impede a pessoa de jogar) e a regra de que a conta da partida não troca no meio dela.
- **Descartado**: redirecionar sempre ao login (tira o tabuleiro da frente); permitir outra conta na janela (misturaria progressos).

## R18. Conclusão sem esperar o servidor

- **Decisão**: no instante em que `isSolved` fica verdadeiro, o estado vai a `mode: 'completed'` com `completion: 'pending'` e a janela de conclusão abre com o tempo local. O envio `completed` tem prioridade na fila e é repetido até confirmar; só então `completion` vira `confirmed` e o quadro "Melhor tempo" deixa o "—". Um `200` repetido da própria conclusão (mesmas letras) é idempotente e não mostra aviso.
- **Motivo**: FR-022 e FR-032; sem rede a pessoa precisa ver o resultado.
- **Descartado**: esperar a confirmação para abrir a janela (silêncio sem rede).

## R19. Conclusão em outro aparelho

- **Decisão**: um `409 progress-completed` num salvamento `in_progress` para o reenvio, mantém as letras no aparelho e mostra o `Notice` "Esta cruzada já foi concluída em outro aparelho" com "Ver como ficou". O jogo segue editável; só quem escolhe o botão carrega `GET /api/progress/:id` e passa ao modo leitura.
- **Motivo**: spec (US3 cenário 14 e Edge Cases) e FR-032.
- **Descartado**: ir ao modo leitura sozinho (interrompe quem joga).

## R20. Aviso de fonte fora do ar na biblioteca

- **Decisão**: `GET /api/library` nunca toca a fonte, então o aviso só nasce de uma busca de dia: o `502` em `/dia/:date` grava `cruzadinha:source-down` (hora em ms); uma busca que funcione apaga a chave; a biblioteca mostra "Novas cruzadas não podem ser buscadas agora" enquanto a chave tiver menos de 10 minutos (constante fixa `SOURCE_DOWN_TTL_MS`, 600000 ms, em `features/library/source-down.ts`).
- **Descartado**: busca de teste em segundo plano ao abrir a biblioteca (gasta o limite de buscas); TTL configurável (sem necessidade).

## R21. Avisos e estado do salvamento

- **Decisão**: `components/Notice` é o único aviso que não bloqueia (informação, aviso, erro; ação opcional; `aria-live`). `SaveStatus` mostra na faixa de ferramentas "Salvando…", "Salvo" ou "Sem conexão, tentando de novo", sempre por texto, a partir do estado do `save-queue`. O texto visível não é uma região viva (um anúncio a cada salvamento encheria o leitor de tela de ruído durante o jogo); uma região `aria-live="polite"` visualmente oculta anuncia só a queda para sem conexão e a volta ("Conexão restabelecida").
- **Motivo**: FR-031 e FR-032 pedem estados visíveis sem bloquear; evita avisos improvisados em cada tela.

## R16. Cruzada em outro tamanho e atribuição

- **Decisão**: o tabuleiro lê `grid.width` e `grid.height` do puzzle e define o tamanho da célula por variável CSS conforme o espaço disponível: no celular, a largura (mínimo de 30 px, teto de 64 px); no computador, o menor entre o que cabe na largura (descontada a lista de dicas) e na altura da janela (mínimo de 30 px, teto de 110 px), sem rolagem vertical da página; a rolagem horizontal da página nunca aparece (SC-008). A atribuição (`puzzle.attribution`: fonte, título, autor, direitos) fica abaixo do título do jogo e no modo leitura.
- **Motivo**: FR-010, FR-016; o formato interno aceita grades de 1 a 30 de lado.
- **Descartado**: fixar 11 × 11.
