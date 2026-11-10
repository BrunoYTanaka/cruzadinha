# Research: feature 063

## D1 - Cabeçalho da landing

**Decision**: o `AppLayout` omite os atalhos quando `pathname === '/'`; o HTML pré-gerado usa `HeaderStart landing`.
**Rationale**: o `AppLayout` já serve a landing; o pré-gerado precisa do mesmo começo (048) para o conteúdo não se mover.
**Alternatives**: layout separado só para a landing (duplica sessão, "Entrar", instalar); descartado.

## D2 - Estatísticas e x1 junto das configurações

**Decision**: só CSS em `app/AppLayout.module.css`: tirar o que puxa `.statsLink`, `.duelLink` e `.menu` para antes do `.spacer` (hoje `.spacer` tem `order: 1`, `.tail` `order: 2` e os links ficam com `order: 0`), dando a eles o mesmo `order` de `.tail`. O DOM já é marca, Calendário, `.spacer`, Estatísticas, x1, Menu, `.tail`; `HeaderStart.tsx` não muda.
**Rationale**: com isso a ordem visual volta a coincidir com a do DOM, e o foco segue a tela (hoje diverge: Tab vai a Estatísticas depois de Calendário, mas na tela elas estão antes do espaçador por `order`). O menu de até 560 px não muda.
**Alternatives**: mover o `.spacer` ou os links no DOM (desnecessário, o DOM já está certo); descartado.

## D3 - Balão só com foco de teclado

**Decision**: `:focus-visible` no `onFocus` do `Tooltip`; erro de seletor cai no comportamento antigo.
**Rationale**: o navegador já separa foco por teclado de foco por clique e do foco devolvido por diálogo.
**Alternatives**: rastrear a última interação por ponteiro (estado global, frágil); descartado.

## D4 - Espera na landing

**Decision**: `PlayLink` mostra `LoadingState` e navega quando `whenServerReady` resolve; o balão "Abrindo…" da feature 059 sai da landing.
**Rationale**: o pedido é a tela de espera completa; dois avisos ao mesmo tempo repetiriam a mensagem. `LoadingState` é a única tela de espera (059).
**Alternatives**: navegar já e deixar o roteador esperar (a landing seguiria na tela sem retorno); manter o balão e acrescentar a tela (duplica). Ambos descartados.
**Risco**: a landing é pré-gerada num `StaticRouter`, então o estado fica local ao clique, como já é.

## D5 - Esmaecer sob o título das dicas

**Decision**: pseudo-elemento com gradiente de `var(--bg)` a transparente, ~12 px, sem eventos de ponteiro.
**Rationale**: usa o token do tema (claro, escuro, alto contraste) e não ocupa espaço.
**Alternatives**: `mask-image` na lista inteira (esmaece também o fim da lista); descartado.

## D6 - Aviso do visitante no jogo

**Decision**: remover texto, link e anúncio de `SaveStatus` e a prop `guest`.
**Rationale**: pedido explícito. O visitante deixa de ser avisado no jogo; o "Entrar" do cabeçalho e a oferta de importar o progresso ao entrar (057) continuam. O aviso das configurações fala só das configurações.

## Divergências na implementação

- **D4 (espera na landing)**: a tela de espera ficou no `AppLayout`, não no `PlayLink`. Com o servidor dormindo, enquanto a navegação que sai de `/` está pendente (`useNavigation`), o `main` mostra `LoadingState level={1}` no lugar da landing; os loaders já esperam o servidor e o erro de 90 s já é o da rota. Cobre "Jogar", "Ver o calendário" e "Entrar" sem código por botão; o `PlayLink` virou um link simples (sem "Abrindo…", balão nem CSS próprio). Com o servidor acordado, a landing fica até o destino abrir, sem tela de espera.
- **"Entrar" com o servidor dormindo**: a landing não acorda o servidor, então a sessão ficava desconhecida e nem "Entrar" nem a conta apareciam. Na landing, sem resposta da sessão, vale o último usuário deste aparelho (círculo) e, sem ele, "Entrar".
- **Voltar durante a espera (US4, cenário 5)**: a URL só muda quando a navegação termina, então "voltar" leva à entrada anterior do histórico (que pode ser outro site), cancelando a espera sem erro. Voltar à própria landing exigiria criar uma entrada de histórico no clique; não feito.
- **T023**: o login sem `next` → `/calendario` ficou em `pages/login/LoginPage.test.tsx` (já testa o `LoginForm` na página); não foi criado `LoginForm.test.tsx`.
- **D5 (esmaecido)**: o fundo do título e do esmaecido é `var(--clue-heading-bg, var(--bg))`; a folha de dicas do celular (`ClueSheet`) define `--clue-heading-bg: var(--surface)`, a cor do painel.
- **Altura do cabeçalho**: sem "Calendário", o cabeçalho pré-gerado da landing tinha 60 px e crescia para 62 px quando "Entrar" (44 px) entrava, movendo o conteúdo. O `min-height` passou a `calc(var(--tap) + 18px)`, a altura que as telas de dentro já tinham.
- **T032** (e2e de rolagem das dicas) não foi escrito: o esmaecido é `position: absolute` sob o título fixo, coberto por teste de CSS; `sem-saltos.spec.ts` segue verde.
