# Cruzadinha: design

Data: 2026-10-12
Status: revisado após a feature 001 (fonte viável)

## 1. Objetivo

Um site de palavras cruzadas que reúne puzzles de sites existentes numa interface limpa e fácil de usar. Cada site de origem tem uma UI/UX própria que o autor considera ruim, e este projeto entrega uma experiência única de jogo.

- **Uso:** projeto de portfólio, site pequeno, aberto a quem tem o endereço e fora dos buscadores. Joga-se sem conta (o progresso fica no navegador) ou com conta (o progresso fica salvo entre dispositivos), feature 013.
- **Foco:** a experiência de jogar (tabuleiro, teclado, dicas, navegação) e a qualidade do código.
- **Sucesso:** o usuário entra, escolhe uma cruzada e uma data, joga numa interface agradável em claro ou escuro, e o progresso fica salvo entre dispositivos.

### Fora do escopo da v1

Estatísticas, streaks, ranking entre amigos, temas visuais extras e outras fontes (Cruzadas Clube, G1, Coquetel). A arquitetura deixa esses itens como extensões, sem reescrita.

## 2. Fonte de puzzles

A v1 usava só o **O Globo**; a feature 014 acrescentou a **Cruzada Online** (abaixo). O jogo do O Globo é um widget da fornecedora **Agilmente**, que consome:

- Base: `https://oglobo-api.agilmenteapp.com/api/`
- Rota: `games/crossword/{nível}/{YYYY-MM-DD}`
- Nível: só `daily`. O código do widget também cita `mini`, `express`, `expert` e `thematic`, mas a fonte não os publica (respondem `NOT-AVAILABLE`).
- A resposta lista também as datas disponíveis (`dates`, cada uma com `inTheFuture` e `status`), o que permite navegar pelo histórico.
- Formato: o puzzle vem no padrão aberto **ipuz v2** (`ipuzData`: grade, solução e dicas `Across`/`Down`), mais `fromIpuz` com a resposta e a posição de cada palavra.
- Autenticação: header `x-access-token` com um token anônimo no formato `ANONYMOUS-<32 hexadecimais>-ANONYMOUS`. O servidor aceita qualquer valor nesse formato, então o token é gerado localmente; ele identifica o visitante, não o autentica. A `x-key` não foi necessária. Sem o token a API responde HTTP 200 com `{"error":"NO-USER"}`, por isso a recusa é detectada pelo corpo, não pelo status.

### Cruzada Online (feature 014)

A segunda fonte é a **Cruzada Online**, publicada pelo jornal Público. A biblioteca abre com a seção "Hoje", um cartão por fonte com a situação do jogador e um toque para jogar, e o calendário troca de fonte por abas (feature 015). O calendário abre na cruzada padrão escolhida nas configurações (a primeira da lista, O Globo, se ninguém escolheu); a aba trocada vale só durante a visita. Com "Ir direto ao jogo" ligado, abrir o endereço raiz leva à cruzada de hoje da cruzada padrão, ou mostra o calendário com o motivo (concluída, sem cruzada hoje, fonte fora do ar) (feature 021). A tela do jogo mostra a fonte junto da data, e a atribuição de cada puzzle mostra "Cruzada Online".

- Arquivo por dia: `https://static.publico.pt/s3/files/widgets/crosswords/prd/AAAAMMDD.xml`, sem login nem token.
- Formato: XML do Crossword Compiler (células com coluna, linha, letra e número, ou bloco; palavras com o intervalo de células; dicas ligadas à palavra). Os metadados vêm vazios, e algumas dicas trazem um link de notícia, que não é guardado.
- Uma data sem arquivo responde 403 da CDN. O arquivo do dia seguinte já está publicado na véspera, então o adaptador nunca pede data futura.
- Histórico: há arquivos desde pelo menos 2024. Detalhes em `specs/014-adaptador-publico/findings.md`.

### Cruzadas Brasil (feature 029)

A terceira fonte é a **Cruzadas Brasil** (`cruzadasbrasil`), com uma cruzada diária (nível "Diário") por data em `https://cruzadasbrasil.com.br/palavras-cruzadas/AAAAMMDD`. Não há API: a página é do Next.js e leva o estado do jogo (`dadosJogo`: `id`, `nivel`, `dimensoes`, `dicas`, `posicoes_num` e `gabarito`) em literais `self.__next_f.push([1,"..."])`. O adaptador concatena os literais, lê o objeto, valida com Zod e calcula palavras, números e tamanhos a partir da grade, conferindo contra as dicas, as posições e o gabarito. Histórico real: desde 2026-07-13; 404 é `unavailable` e uma data futura nunca é pedida (a página responde "Em breve"). 403 (bloqueio) é `source-down`. A atribuição é "Cruzadas Brasil". Detalhes e pendências com a fonte em [specs/029-adaptador-cruzadas-brasil/findings.md](../specs/029-adaptador-cruzadas-brasil/findings.md).

### Cruzadas Clube (feature 030)

A quarta fonte é o **Cruzadas Clube** (`cruzadasclube.com.br`), com cruzadas clássicas brasileiras numeradas, uma grade 12 x 8 **sem nenhum bloco**, em que palavras vizinhas ficam coladas na mesma linha ou coluna e uma barra marca o limite entre elas. O tabuleiro desenha essa barra (uma sombra interna na cor `--bar`), digitar e as teclas Home, End, Delete e Tab respeitam o limite de cada palavra, e a seta anda uma célula (a palavra ativa passa a ser a da nova célula).

- Cada edição tem uma página (`/jogo/i/id/<id>/cruzadas-classicas-<n>/`) com a data ("postado em DD/MM/AAAA"), o autor e o link "Anterior", e um arquivo ofuscado `/jogos/CC<n>.js` cuja variável `CrosswordPuzzleData` guarda o XML. A numeração das dicas não vem no arquivo: é derivada pela ordem de leitura.
- A data vem da página, não do número da edição. Não há busca por data: o calendário só mostra os dias que a coleta salvou, e um dia passado sem edição aparece como "sem cruzada".
- Células soltas entre duas barras (uma letra sem palavra horizontal) existem na edição real; a regra de `shared` as aceita entre duas palavras.
- O `robots.txt` da fonte permite `User-agent: *` e declara `ai-train=no, use=reference`; o projeto não treina modelos, não redistribui e usa um `User-Agent` identificável com pausa de 2 s (risco aceito, princípio VIII).
- Achados do spike em `specs/030-clube-terceira-fonte/findings.md`.

### Viabilidade (resolvida)

A feature 001 confirmou o acesso sem login: veredito **viável** em 2026-10-12, com o puzzle diário completo (grade, dicas e solução). Detalhes em `specs/001-viabilidade-fonte/decision.md`.

### Janela de histórico

A resposta lista só **31 datas passadas** em `dates`, mais 6 futuras. Mesmo assim, a feature 003 confirmou que uma data fora da lista ainda responde: 2026-09-01 veio completa (`specs/003-adaptador-oglobo/findings.md`). Então `dates` é só a janela que o widget mostra. O limite real do histórico ainda não é conhecido, e a coleta diária (seção 4, Cache) continua sendo a garantia de que nenhum puzzle se perde.

A API é não oficial e de terceiros, e pode mudar sem aviso. Por isso toda a integração fica isolada em um adaptador (seção 4) e coberta por testes de contrato.

## 3. Stack

Monorepo em **npm workspaces**, tudo em **TypeScript**.

```
cruzadinha/
  apps/
    api/          Fastify + Drizzle + Postgres
    web/          React + Vite + React Router + TanStack Query
  packages/
    shared/       tipos e schemas Zod (puzzle, progresso, API)
  docker-compose.yml
  docs/
```

| Camada    | Escolha                                                                                     |
| --------- | ------------------------------------------------------------------------------------------- |
| Back      | Fastify, Drizzle ORM, Zod, `@fastify/cookie`, `@node-rs/argon2`                             |
| Front     | React, Vite, React Router, TanStack Query, CSS com variáveis                                |
| Banco     | Postgres                                                                                    |
| Testes    | Vitest, Testing Library, Playwright (poucos caminhos)                                       |
| Qualidade | Prettier, ESLint, `tsconfig.base.json`, `.editorconfig`, Husky, lint-staged, GitHub Actions |

### Padrão de código

- **Prettier:** `semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `tabWidth: 2`.
- **ESLint** com configuração flat, `typescript-eslint`, `eslint-config-prettier`. O front acrescenta `eslint-plugin-react-hooks` e `eslint-plugin-jsx-a11y`.
- Configuração base na raiz, estendida por cada pacote. `tsconfig.base.json` com `strict: true`.
- **Husky + lint-staged:** o pré-commit formata e confere só os arquivos alterados. O pré-push roda `typecheck` e os testes rápidos.
- **Scripts na raiz:** `npm run lint`, `format`, `typecheck` e `test`, que rodam em todos os workspaces (`--workspaces --if-present`).
- **CI (GitHub Actions):** `npm ci`, lint, typecheck e testes a cada push.

## 4. Back (`apps/api`)

Camadas por módulo: rota → serviço (regra de negócio) → repositório (SQL). Rotas não têm lógica, e serviços não conhecem HTTP.

```
apps/api/src/
  server.ts          cria o app, plugins e rotas
  config.ts          variáveis de ambiente validadas com Zod
  db/                conexão, schema e migrações (Drizzle)
  modules/
    auth/            cadastro, login, logout, sessão
    puzzles/         rotas e cache (o formato interno fica em packages/shared)
    progress/        salvar e ler o progresso
    health/          saúde, versão e commit no ar
    library/         biblioteca: puzzles guardados com a situação de quem pede
    rate-limit/      limites de tentativas guardados no banco
    settings/        configurações da conta
  docs/              documentação OpenAPI, só fora de produção
  http/              guarda do repasse (segredo e endereço de quem acessa)
  sources/
    types.ts         interface PuzzleSource
    oglobo/          única parte que conhece a Agilmente: pedido, token,
                     schema da resposta, conversão ipuz, fixtures e source:check
    cruzadaonline/   única parte que conhece o XML do Público: pedido, leitura
                     segura do XML, schema, conversão, fixtures e
                     source:check:cruzadaonline
    cruzadasbrasil/  única parte que conhece a página da Cruzadas Brasil: pedido,
                     leitura dos dados do jogo, schema, conversão, fixtures e
                     source:check:cruzadasbrasil
    clube/           única parte que conhece o Cruzadas Clube: página da edição,
                     leitura do arquivo do jogo na sandbox (QuickJS/WebAssembly),
                     schema, conversão, fixtures e source:check:clube
  cli.ts             users create; puzzles collect
```

### Fonte de puzzles

`puzzles` conhece apenas a interface `PuzzleSource`. O adaptador `oglobo` gera o token anônimo (guardado em memória, e trocado por um novo se a fonte o recusar), busca o puzzle e converte o ipuz para o **formato interno**. O adaptador `cruzadaonline` lê o XML do Crossword Compiler (recusa DOCTYPE e corpos grandes) e o converte para o mesmo formato. O adaptador `cruzadasbrasil` lê o estado do Next.js embutido no HTML e o converte da mesma forma. O adaptador `clube` não tem busca por data: lê a lista de edições e segue o link "Anterior" (`listRecent`), pede o arquivo do jogo só das datas ainda não salvas e roda esse script, que é código de terceiros, numa sandbox sem rede nem arquivos. O serviço recebe a lista de adaptadores; as rotas por data e a biblioteca aceitam a fonte, com O Globo como padrão. Adicionar uma fonte é escrever outro adaptador e incluí-lo na lista, sem tocar no resto.

### Formato interno de puzzle (`packages/shared`)

Próximo do ipuz, mas só com o que o jogo usa:

- **Grade:** dimensões e células (posição, bloco ou letra esperada).
- **Palavras:** posição inicial, direção, número e tamanho.
- **Dicas:** texto associado a cada palavra.
- **Metadados:** fonte, nível e data.
- A resposta correta fica em campo separado e vai ao navegador junto do puzzle, para quem tem sessão e para o visitante, para o front controlar as dicas (features 007 e 013).

### Modelo de dados (Postgres)

As colunas, os valores permitidos e os relacionamentos de cada tabela estão nas data definitions, com um diagrama por data definition em `entity-relationship-diagrams/`.

| Tabela                | Para que serve                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users`               | Contas ([DDE-001](data-definitions/DDE-001-banco-auth-convites.md))                                                                                    |
| `sessions`            | Sessões abertas no login, guardadas só como hash ([DDE-001](data-definitions/DDE-001-banco-auth-convites.md))                                          |
| `invites`             | Convites do cadastro antigo, sem uso desde a feature 013 e removidos no lançamento B ([DDE-001](data-definitions/DDE-001-banco-auth-convites.md))      |
| `rate_limit_attempts` | Tentativas sujeitas a limite: login, cadastro, busca na fonte e gravação de configurações ([DDE-001](data-definitions/DDE-001-banco-auth-convites.md)) |
| `puzzles`             | Um puzzle por fonte, nível e data, com a parte pública e a solução separadas ([DDE-002](data-definitions/DDE-002-coleta-puzzles.md))                   |
| `progress`            | Progresso de cada conta em cada puzzle ([DDE-003](data-definitions/DDE-003-progresso-usuario-puzzle.md))                                               |
| `user_settings`       | Configurações da conta ([DDE-004](data-definitions/DDE-004-configuracoes-usuario.md))                                                                  |

As configurações (tema, limites de ajuda, modo de riscar, cruzada padrão, ir direto ao jogo, tamanho do tabuleiro e largura do calendário) ficam no aparelho (`localStorage`, chave `cruzadinha:settings`) para todos e, para quem tem conta, também em `user_settings` (feature 021).

### Cache

O puzzle é o mesmo para todos, então fica uma vez só na tabela `puzzles`, compartilhada; só o `progress` é por usuário. Um puzzle guardado não é buscado de novo.

**Coleta diária:** um comando da API (`cli.ts puzzles collect`) busca o puzzle do dia (nível `daily`, o único publicado) e grava no banco. Ele roda por agendamento (seção 9), sem depender de a API estar acordada.

- Grava com upsert em `(source, level, date)`, então rodar duas vezes não muda nada.
- Roda duas vezes por dia, para tolerar atraso ou falha do agendamento.
- Além do dia, busca as datas passadas que faltam dentro de uma janela de dias configurável (`COLLECT_HISTORY_DAYS`, padrão 31, máximo 365), com pausa entre os pedidos. O limite real de histórico da fonte é desconhecido, então a janela se ajusta sem mudar código.
- Pede no máximo um puzzle por nível e data, com pausa entre pedidos, e para ao receber sinal de limite de uso.
- Grava só o formato interno (dados e solução), não a resposta bruta da fonte, para guardar apenas o necessário para jogar.

**Busca sob demanda:** se alguém pedir uma data que não está no banco, não é futura e a fonte ainda tiver, a API busca na hora e grava, como fallback da coleta. Cada ida à fonte conta num limite persistido por endereço (30 por hora), com ou sem conta, para ninguém martelar a fonte (feature 013).

### Endpoints (visão geral)

- `GET /api/health` (aberta; versão e commit no ar)
- `POST /api/auth/register` (aberta, só com o cadastro ligado), `GET /api/auth/registration` (aberta; diz se o cadastro está aberto), `POST /api/auth/login` (aberta), `POST /api/auth/logout` (aberta; sem sessão também responde 204), `GET /api/auth/me` (sessão)
- `GET /api/puzzles?source=&level=&date=`, `GET /api/puzzles/:id` (visitante ou conta)
- `GET /api/library?source=` (visitante ou conta; até 366 puzzles já guardados da fonte, do mais recente ao mais antigo, com a situação de quem pede — não iniciado, em andamento ou concluído — e os tempos; sem conta, todos vêm não iniciados; só lê o que está guardado, nunca consulta a fonte)
- `GET /api/progress/:puzzleId`, `PUT /api/progress/:puzzleId` (salvar e concluir), `POST /api/progress/:puzzleId/reset` (jogar de novo do zero, mantendo o melhor tempo) (sessão)
- `GET /api/settings`, `PUT /api/settings` (sessão; configurações da conta; vale a mudança mais recente pelo `savedAt` do aparelho; 120 gravações por hora por endereço; feature 021)

Fora de produção, a API também serve a documentação OpenAPI em `/api/docs/`.

## 5. Front (`apps/web`)

```
apps/web/src/
  app/            rotas, layout, quem está usando (visitante ou conta), provedor de tema
  features/
    auth/         login e cadastro
    library/      "Hoje" com um cartão por fonte e o calendário mensal com abas de fonte
    game/         tela do jogo: tabuleiro, dicas, teclado, cronômetro, ajudas, conclusão
    guest/        progresso do visitante no navegador (IndexedDB) e biblioteca do visitante
  game-logic/     lógica pura do tabuleiro, sem React (reducer testável)
  api/            cliente HTTP único, com tipos de packages/shared
  themes/         tokens claro e escuro
  components/     peças genéricas (botão, modal)
```

- **Estado:** o estado da partida vive no `game-logic` (reducer). O restante vem do TanStack Query, sem biblioteca global de estado.
- **Visual:** CSS com variáveis, sem biblioteca de UI pronta. Os componentes não têm cores nem medidas fixas e leem tokens. O tema padrão tem dois conjuntos de valores, claro e escuro. Um tema novo no futuro é um novo arquivo de tokens.
- **Responsivo:** o jogo precisa funcionar bem no celular, com teclado próprio na tela.

### Modo claro e escuro

- Padrão: segue `prefers-color-scheme`, sem piscar branco ao carregar.
- A escolha fica na modal de configurações, aberta pela engrenagem do cabeçalho (com tooltip "Configurações"): um botão único com ícone alterna claro → escuro → automático. O ícone gira até o do tema novo e a página troca num círculo que cresce a partir do botão (View Transition, 450 ms); quem pede menos movimento ao aparelho vê a troca sem animação, e a animação não bloqueia cliques (feature 021). O botão tem sempre a largura do rótulo mais largo (Automático), então alternar o tema não mexe na linha. O balão de qualquer botão de ícone fica inteiro dentro da janela: centralizado no botão quando cabe, deslocado na horizontal só o que precisar quando não cabe, como no caso da engrenagem sozinha à direita do cabeçalho enquanto a sessão carrega (feature 024).
- A escolha é aplicada na hora e guardada nas configurações (`cruzadinha:settings`; para quem tem conta, também na conta); um script no `index.html` a aplica antes da primeira pintura.
- Critério de aceite: nos dois modos, bloco, célula selecionada, palavra ativa e letra preenchida têm contraste claro entre si.

### Botões e links (feature 023)

Quatro tipos de botão, definidos uma vez (`Button` e `buttonClass()` em `components/`):

- **Principal**: fundo na cor de destaque. É a ação mais importante do bloco, e há no máximo um por formulário ou modal.
- **Secundário**: fundo `--control` e contorno `--control-line`. É o padrão para as demais ações, inclusive as pílulas de ajuda, o botão de tema e os passos − e +.
- **Discreto**: só o contorno `--control-line`, sem fundo. Serve para ações de baixa ênfase ("Sair", "Restaurar padrões", fechar um aviso) e continua com cara de botão.
- **Ícone**: sem fundo nem contorno em repouso. Inclui a engrenagem, o fechar das modais, os botões da barra do jogo e as setas da barra da dica.

O contorno dos botões de texto tem pelo menos 3:1 contra o fundo em volta, nos dois temas. Um botão com forma própria (pílula, círculo da legenda, quadrado do − e +) muda só medidas e forma; cores e estados vêm sempre do tipo.

Estados:

- **Mouse por cima**: uma camada translúcida (`--hover-overlay`) por cima do fundo. Só aparece em aparelhos com mouse, para não ficar presa depois de um toque.
- **Pressionado**: uma camada mais forte (`--press-overlay`), também no toque.
- **Foco pelo teclado**: o contorno de 3 px de sempre, inteiro em qualquer estado.
- **Desativado**: opacidade 0,6 e cursor de indisponível, sem reagir ao mouse.
- Nenhum estado muda tamanho ou posição. Quem pede menos movimento vê a troca sem transição.
- Com cores forçadas, todo botão mostra o contorno, porque tem borda de 1 px (transparente nos de ícone).

Link × botão:

- **Link de texto**: sublinhado na cor de destaque. O sublinhado engrossa com o mouse e ao pressionar, e o link nunca ganha fundo nem contorno.
- **Botões**: nunca sublinhados. Fora o principal, não usam a cor de destaque no texto.
- **Link com papel de botão** ("Entrar" do cabeçalho do visitante, voltar da barra do jogo, atalho da modal de conclusão): usa a aparência do tipo inteira.
- **Cartões "Hoje" e dias do calendário**: continuam cartões. Ganham borda de destaque com o mouse e a camada de pressionado.
- **Controles com estado próprio** (abas das fontes, cruzada padrão, chave liga/desliga, linhas da lista de dicas): mantêm o selecionado e somam as camadas de mouse e pressionado. Na lista de dicas, o mouse por cima só aparece na dica sem destaque.
- **Fora desta linguagem**: o tabuleiro e a alça de redimensionar. O teclado na tela só ganha o pressionado.

## 6. Regras

### Jogo

1. Uma célula fica selecionada por vez, e a palavra ativa na direção atual fica destacada.
2. Clicar numa célula já selecionada alterna a direção.
3. Digitar uma letra a preenche e avança para a próxima célula da palavra. Apagar (Backspace) volta uma célula. Delete apaga a letra da célula sem mover o cursor.
4. As setas movem a seleção. Home e End levam à primeira e à última célula da palavra ativa. Tab e Shift+Tab pulam para a próxima ou anterior palavra, dando a volta na lista sem sair do tabuleiro. Esc e depois Tab (ou Shift+Tab) saem do tabuleiro, como diz a descrição da grade para leitor de tela.
5. Clicar numa dica seleciona a palavra correspondente.
6. Só entram letras A a Z e "Ç". Letras acentuadas são convertidas para a letra simples.
7. Células de bloco não são selecionáveis.
8. Ao completar uma palavra, o cursor **fica na última letra**.
9. Grade completa e correta marca o jogo como concluído. Grade completa e errada não mostra aviso.
10. **Ajudas (v1 do front):** revelar letra (limite 4 por cruzada), revelar palavra (limite 2) e verificar (sem limite); `VITE_HELP_LETTER_LIMIT` e `VITE_HELP_WORD_LIMIT` (lidos no build) são o padrão, e a pessoa escolhe outro número (0 a 99) ou "sem limite" para cada uma nas configurações. Mudar o limite com a partida aberta vale na hora; baixar abaixo do já usado só esgota a ajuda (feature 021). A célula revelada fica travada e ganha um cantinho roxo; a verificação marca as certas de roxo e as erradas de vermelho. O uso de ajuda e as marcas ficam só no aparelho (`localStorage` por usuário e cruzada), sem enviar ao servidor; o melhor tempo conta normalmente com ajuda.
11. A solução da fonte pode trazer letras acentuadas (Ã, É). A comparação e as ajudas usam a letra simples, a mesma que o jogador digita.
12. Uma dica da lista fica marcada como resolvida só quando a palavra está **certa** (completa e com as letras da solução, pela mesma comparação da conclusão); completa e errada, ela fica normal. A dica resolvida fica riscada (feature 019), com o fundo de sucesso do tema (`--ok-tint`) e um visto (✓) verde (`--ok`) no fim da linha (feature 017), e o texto continua na cor normal, sem ficar apagado; a dica ativa e resolvida mantém o fundo da palavra ativa e o visto. Toda dica reserva à direita o espaço do visto, então resolver ou desfazer não muda a quebra de linha nem a altura da lista. O risco e o visto são decorativos: o leitor de tela ouve ", resolvida". A marca sai só das letras e da solução: não conta como ajuda, não é salvo e não aparece no tabuleiro nem na barra da dica ativa. A regra fica em `game-logic/clue-strike.ts` com um modo (`StrikeMode`). Nas configurações, desligar "Riscar a dica só quando acerta" passa ao modo "ao preencher": a dica completa, certa ou errada, fica só riscada, sem fundo de sucesso e sem visto, e o leitor de tela ouve ", preenchida" (feature 021).
13. A barra da dica ativa fica sempre numa linha, com a altura de sempre: a dica que não cabe termina em reticências, com o número e a direção inteiros, e o tabuleiro não se move ao trocar de palavra. No computador, o texto fica alinhado à esquerda e no centro ótico da barra: o meio das minúsculas (do topo do "x" à linha de base) fica no meio da altura dela e na altura das setas anterior e próxima, com o número e a dica na mesma linha de base (feature 019). O leitor de tela ouve a dica inteira, e ela aparece completa na lista de dicas ou na barra de letras acima do teclado do celular (feature 017).
14. No computador, a barra da dica ativa (e a faixa de modo leitura, que ocupa o lugar dela) tem a largura do tabuleiro: a dica nunca alarga a coluna nem empurra as colunas de dicas. Num tabuleiro com menos de 320 px (poucas colunas e a alça perto do mínimo), a barra fica com 320 px, centralizada sobre ele, para caberem as setas, o número e a direção. Com o mouse parado meio segundo sobre uma dica cortada, um balão logo acima da barra mostra a dica inteira, por cima da faixa de ferramentas, sem cobrir o tabuleiro e sem mover nada (feature 019); se não couber acima na janela (página rolada), ele abre abaixo da barra. Na janela estreita sem teclado na tela, em que a barra fica abaixo do tabuleiro, o balão abre abaixo dela; ele some quando o mouse sai da barra e do balão, com Esc ou ao trocar de palavra. Não aparece com toque nem quando a dica cabe, e é só visual (o leitor de tela já ouve a dica inteira) (feature 018).

### Progresso

10. O progresso é salvo automaticamente (com debounce) e ao sair da página. Se o salvamento falhar, as letras ficam guardadas localmente e o envio é repetido. O salvamento que dá certo não aparece na tela (sem "Salvando…" nem "Salvo"), para a faixa de ferramentas não pular; só os avisos de problema aparecem (sem conexão, sessão expirada, concluída em outro aparelho, não salvo). O visitante vê o texto fixo "Progresso só neste aparelho" e o link para entrar (feature 017).
11. O cronômetro corre com a aba ativa e pausa ao trocar de aba. A modal de configurações aberta também o suspende, sem a capa de pausa e sem desfazer uma pausa feita pelo jogador (feature 021).
12. Um puzzle concluído abre em modo leitura, com a opção de jogar de novo do zero. O melhor tempo é guardado.
13. Cada usuário só enxerga o próprio progresso.

### Conta e sessão

14. Senha com no mínimo 8 caracteres, hash argon2. E-mail único.
15. Sessão no servidor, com cookie `HttpOnly` e `SameSite=Lax`, validade de 30 dias.
16. Limite de tentativas de login (por exemplo 5 em 15 minutos).
17. Mensagens de erro de login e cadastro são genéricas e não revelam se um e-mail existe.

### Cadastro e visitante (feature 013, no lugar dos convites)

18. Quem não tem conta joga como visitante: abre o calendário direto, joga e conclui. Letras, tempo, ajudas, conclusão e recorde ficam só no navegador (IndexedDB) e nunca vão ao servidor.
19. Entrar numa conta não leva o progresso do visitante: ele fica guardado no navegador e volta ao sair da conta.
20. O cadastro pede só e-mail e senha e fica atrás da chave `REGISTRATION_ENABLED`, desligada por padrão. Com ela desligada, o site não oferece "Criar conta" e a API recusa qualquer cadastro (`403 registration-closed`).
21. O site pergunta à API se o cadastro está aberto (`GET /api/auth/registration`); sem resposta, trata como fechado.
22. Com o cadastro fechado, o autor cria contas pela linha de comando (`users create --email`), que pede a senha sem eco e não tem limite de tentativas.
23. O e-mail já cadastrado recebe a mesma mensagem genérica de falha; o limite por endereço reduz o uso disso para descobrir contas.
24. Os convites (código, cota, Konami) deixaram de existir. A tabela `invites` sai num lançamento seguinte, por migração.
25. Uma sessão vencida ou encerrada vira visitante: fora do tabuleiro, com o aviso "Sua sessão terminou"; no tabuleiro, o jogo da conta continua e o login abre por cima (feature 010).
26. O cadastro tem limite de tentativas por IP.
27. A CLI (`users create`, `puzzles collect`) é do autor.

### Puzzles

28. Datas futuras, ou sem puzzle na fonte, aparecem como indisponíveis.
29. Se a fonte estiver fora do ar, o site continua mostrando o que já está em cache e avisa que não consegue buscar novos.
30. A resposta correta vai ao navegador junto do puzzle, para visitantes e para quem está logado; o front controla as dicas (features 007 e 013).

## 7. Tratamento de erros

| Situação                          | Comportamento                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| Fonte fora do ar ou formato mudou | API responde 502. O front diz que não conseguiu buscar o puzzle e oferece os que estão em cache |
| Puzzle não existe na data         | 404, mostrado como indisponível                                                                 |
| Falha ao salvar progresso         | Letras guardadas localmente e envio repetido                                                    |
| Sessão expirada                   | Fora do tabuleiro, segue como visitante com aviso; no tabuleiro, login por cima do jogo         |
| Login ou cadastro inválido        | Mensagem genérica                                                                               |

## 8. Testes

- **`game-logic` (Vitest):** seleção, digitação, direção, avanço, conclusão. É a parte com mais regras.
- **Conversão de formato:** testes com respostas reais da Agilmente salvas como fixtures. Se o formato mudar, o teste quebra e avisa.
- **Cadastro e autenticação:** integração com Postgres real em container, cobrindo a chave de cadastro, sessão opcional, `users create` e limite de tentativas.
- **Progresso:** integração do salvamento e da leitura.
- **Ponta a ponta (Playwright):** os caminhos principais: cadastro sem convite, abrir um puzzle, digitar e conferir o progresso salvo; e o visitante, que joga e conclui sem nada no servidor.
- **Teste real contra a Agilmente:** fica fora da rotina automática, para a suíte não depender da internet. Roda sob demanda.

## 9. Infra e implantação

Meta: custo zero, sem prazo de expiração.

| Peça            | Opção                                                                      |
| --------------- | -------------------------------------------------------------------------- |
| Front estático  | Cloudflare Pages                                                           |
| API (container) | Render (plano free, Virgínia; dorme após 15 min, acorda em cerca de 1 min) |
| Banco           | Neon (Postgres)                                                            |
| Coleta diária   | GitHub Actions agendado (`schedule`)                                       |

- **Mesmo domínio:** o front repassa `/api/*` para a API, para o cookie `HttpOnly` funcionar e dispensar CORS. No Cloudflare Pages isso é uma Pages Function (`apps/web/functions`), porque o `_redirects` não repassa para hosts externos. A Function manda um segredo do repasse e o IP real de quem acessa; com `PROXY_SECRET`, a API recusa pedidos que não vieram do site (exceto `/api/health`) e conta os limites de tentativas por esse IP. Em desenvolvimento, o Vite faz o proxy.
- **Região:** API no Render em Virgínia e banco no Neon em `us-east-1`, juntos e o mais perto do Brasil que o Render oferece.
- **Versões e publicação:** a API e o site têm versões próprias, mantidas pela release-please a partir dos Conventional Commits; aceitar o pedido de lançamento publica só as partes com versão nova, depois da CI verde. Detalhes em [docs/versionamento.md](versionamento.md); roteiro em [docs/deploy.md](deploy.md).
- **Desenvolvimento local:** `docker compose` para Postgres e API, mais o Vite.
- **Portabilidade para AWS:** a API roda num Dockerfile, a configuração é só por variáveis de ambiente, o Postgres é padrão (migrações Drizzle) e o front é estático (S3 + CloudFront). A migração é troca de deploy, sem mudar código de aplicação. A AWS não foi escolhida porque o plano grátis dura 6 meses.
- **Cold start:** a primeira tela mostra "Acordando o servidor" depois de 2 s de espera e desiste com "Tentar de novo" aos 90 s; depois de carregada, a partida nunca é coberta pela espera.
- **Coleta diária:** um workflow agendado do GitHub Actions roda `puzzles collect` duas vezes por dia e grava direto no Neon, com a `DATABASE_URL` guardada nos segredos da CI. Não depende do Render acordado e reusa o adaptador e o repositório da API. O workflow roda às 00:01 e às 08:00 de Brasília, não aplica migrações (a API as aplica ao subir) e é ignorado, com um aviso, enquanto o segredo não existe; avisa quando falha. Em repositório público, o GitHub desativa agendamentos depois de 60 dias sem commits, o que precisa ser acompanhado. O cron do Render foi descartado por ser pago.

## 10. Ordem sugerida da implementação (para o plano)

1. **Teste de viabilidade da Agilmente** (obter token e buscar um puzzle real). Concluído: viável.
2. Monorepo, ferramentas de qualidade, Docker Compose e CI.
3. `packages/shared` (formato interno) e adaptador `oglobo` com fixtures.
4. Banco, `auth` e `invites`.
5. `puzzles` (com a coleta diária e o workflow agendado), `library` e `progress`.
6. `game-logic` e tela do jogo, com temas claro e escuro.
7. Biblioteca, convites pelo easter egg e acabamento.
8. Implantação. Concluído (feature 012).
