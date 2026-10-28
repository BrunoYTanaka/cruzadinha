# Feature Specification: Verificação automática opcional

**Feature Branch**: `feat/047-verificacao-automatica`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/101" — nova opção nos ajustes para marcar o erro assim que a letra é digitada, com os controles de ajuda do jogo reunidos num menu "Ajudas" (origem: #90).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o erro assim que a letra é digitada (Priority: P1)

Hoje a pessoa só descobre uma letra errada ao acionar "Verificar". Quem prefere um jogo mais guiado liga a opção "Verificar ao digitar" e, a partir daí, cada letra errada fica marcada em vermelho (a mesma marca da verificação manual) no instante em que é digitada. Quem não liga continua jogando como hoje.

**Why this priority**: É o objetivo da feature. Sem a marca imediata, a opção não existe.

**Independent Test**: Ligar a opção nos ajustes, digitar uma letra diferente da solução e ver a casa marcada como errada na hora; digitar a letra certa e ver a marca sumir.

**Acceptance Scenarios**:

1. **Given** a opção ligada e uma casa vazia, **When** a pessoa digita uma letra diferente da solução, **Then** a casa fica marcada como errada na hora, sem acionar "Verificar".
2. **Given** uma casa marcada como errada pela verificação automática, **When** a pessoa digita a letra certa ou apaga a casa, **Then** a marca some na hora.
3. **Given** a opção ligada, **When** a pessoa digita a letra certa, **Then** a casa não recebe marca nenhuma.
4. **Given** a opção desligada (padrão), **When** a pessoa digita qualquer letra, **Then** nenhuma marca aparece até acionar "Verificar", como hoje.
5. **Given** uma solução com letra acentuada, **When** a pessoa digita a letra sem acento, **Then** a casa conta como certa (mesma regra de comparação do resto do jogo).

---

### User Story 2 - Ligar e desligar nos ajustes e no jogo (Priority: P2)

A opção aparece nos ajustes, ao lado das demais, e também como interruptor dentro do jogo, no menu "Ajudas". Os dois controlam o mesmo valor: ligar num lado aparece no outro, sem dois estados. A faixa de ferramentas passa de seis controles soltos para `Letra`, `Palavra` e um botão "Ajudas" com menu que reúne "Verificar", "Verificar ao digitar" e os controles do rascunho (lápis, confirmar, descartar). Um ponto no botão "Ajudas" indica que a verificação automática está ligada.

**Why this priority**: A opção precisa ser alcançável, mas a verificação automática (P1) já funciona só com o interruptor dos ajustes. O menu também evita que a faixa passe de sete controles, o que quebraria o layout no celular.

**Independent Test**: Abrir o menu "Ajudas" no jogo, ligar "Verificar ao digitar", abrir os ajustes e ver a opção ligada; desligar nos ajustes, voltar ao jogo e ver o interruptor desligado.

**Acceptance Scenarios**:

1. **Given** a tela do jogo, **When** a pessoa aciona "Ajudas", **Then** abre um menu com "Verificar", o grupo "Automática" (interruptor "Verificar ao digitar") e o grupo "Rascunho" (interruptor "Lápis", "Confirmar rascunho", "Descartar rascunho").
2. **Given** o menu aberto, **When** a pessoa aciona "Verificar", **Then** acontece o mesmo que o botão "Verificar" de hoje e o menu fecha.
3. **Given** o menu aberto, **When** a pessoa liga "Verificar ao digitar", **Then** a opção dos ajustes passa a ligada e o botão "Ajudas" mostra o ponto indicador; o inverso vale ao desligar.
4. **Given** a palavra ativa sem rascunho (ou a partida pausada), **When** o menu abre, **Then** "Confirmar rascunho" e "Descartar rascunho" aparecem desabilitados e não agem, como os botões de hoje.
5. **Given** o menu aberto, **When** a pessoa aperta Esc, clica fora ou aciona um item que faz sua ação, **Then** o menu fecha, o foco volta ao botão "Ajudas" e a seleção do tabuleiro não muda.
6. **Given** o menu aberto, **When** a pessoa usa as setas, **Then** o foco percorre os itens habilitados, e a leitura de tela anuncia o menu, o estado dos interruptores e os itens desabilitados.
7. **Given** a tela de ajustes, **When** a pessoa liga "Verificar ao digitar", **Then** a opção vale no jogo seguinte e em outros aparelhos da conta, como as demais opções.

---

### User Story 3 - Convivência com limites, rascunho e telas pequenas (Priority: P3)

A verificação automática é independente dos limites de ajuda: não gasta "Letra" nem "Palavra" e não tem contador, pois "Verificar" já é ilimitado. Ela não interfere no lápis, na conclusão nem no progresso salvo. No celular (teclado na tela) o menu abre como painel preso à borda de baixo, por cima do teclado, com itens grandes o bastante para o toque.

**Why this priority**: Evita surpresas (gastar ajuda sem querer, marcar rascunho) e mantém o jogo usável no celular, mas depende de P1 e P2.

**Independent Test**: Com a opção ligada, digitar errado com o lápis ligado e ver que nada é marcado; abrir o jogo no celular e ver a faixa com três controles, sem quebra de linha, e o menu como painel de baixo.

**Acceptance Scenarios**:

1. **Given** limites de ajuda esgotados, **When** a pessoa liga e usa a verificação automática, **Then** ela continua funcionando e os contadores de "Letra" e "Palavra" não mudam.
2. **Given** a opção ligada e o lápis ligado, **When** a pessoa digita uma letra errada, **Then** ela vai para o rascunho sem marca; ao confirmar o rascunho, as casas errôneas que passam a valer são marcadas.
3. **Given** a opção ligada, **When** a pessoa liga o interruptor no meio da partida, **Then** as letras erradas já escritas são marcadas na hora.
4. **Given** a opção ligada e depois desligada, **When** a pessoa desliga, **Then** as marcas vermelhas que só existiam por causa da verificação automática somem; marcas de uma verificação manual feita antes permanecem até serem editadas, como hoje.
5. **Given** o tabuleiro com teclado na tela, **When** a tela carrega, **Then** a faixa mostra `Letra`, `Palavra` e `Ajudas` na mesma linha, e o menu abre como painel preso à borda de baixo com itens de pelo menos 48 px de altura.
6. **Given** o menu aberto e fechado 10 vezes seguidas, **When** a pessoa alterna "Verificar ao digitar" e digita, **Then** a faixa de ferramentas não muda de tamanho nem desloca o tabuleiro (medido por `e2e/sem-saltos.spec.ts`).

---

### Edge Cases

- Casa já revelada por ajuda (roxa) ou bloqueada: nunca recebe a marca vermelha da verificação automática.
- Partida concluída (tabuleiro somente leitura): as ajudas ficam ocultas, como hoje, e o botão "Ajudas" também; a opção continua nos ajustes e não há marcas novas.
- Partida pausada (tabuleiro coberto): o botão "Ajudas" abre o menu e o interruptor funciona; abrir ou fechar o menu não retoma o relógio.
- Menu aberto e a pessoa digita letras: as teclas não chegam ao tabuleiro enquanto o menu está aberto; só navegação do menu (setas, Esc, Enter, Espaço, Home, End).
- Menu aberto e abre-se o diálogo de ajustes (ou o de atalhos, ou o de conclusão): o menu fecha antes; nunca dois ao mesmo tempo. Com um diálogo aberto, o botão "Ajudas" não abre o menu.
- Pessoa convidada, com conta ou offline: a opção se comporta como as outras configurações (no aparelho para todos; na conta para quem tem uma, conforme a regra "o mais recente vence; ao entrar, a conta vence"). Nada novo exige rede.
- Versão mais velha do site lendo uma conta com a opção nova: ignora a chave desconhecida sem erro (resposta tolerante); versão nova lendo uma conta sem a chave usa o padrão "desligada".
- Letra digitada sobre casa já marcada: a marca é recalculada para a letra nova.
- Troca de direção, selecionar outra casa ou rolar: nenhuma marca da verificação automática aparece ou some por isso, só por mudança do conteúdo da casa.
- Tema escuro, movimento reduzido e zoom de 200%: o botão, o ponto indicador e o menu continuam legíveis e sem rolagem horizontal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Os ajustes MUST ter uma opção "Verificar ao digitar", desligada por padrão, que vale para o aparelho e, para quem tem conta, é guardada também na conta com as demais configurações.
- **FR-002**: Com a opção ligada, toda letra digitada numa casa MUST ser comparada com a solução na hora (mesma comparação sem acento do resto do jogo); se diferente, a casa MUST ficar com a marca de errada usada pela verificação manual; se igual ou se a casa for esvaziada, MUST ficar sem a marca.
- **FR-003**: A verificação automática MUST NOT marcar casas reveladas por ajuda, casas bloqueadas, casas vazias nem letras do rascunho; ao confirmar o rascunho, as letras que passam a valer MUST ser avaliadas como qualquer letra digitada.
- **FR-004**: Ao ligar a opção, as letras erradas já escritas MUST ser marcadas na hora; ao desligar, as marcas que existiam só por causa da opção MUST sumir, e as de verificação manual MUST seguir a regra de hoje.
- **FR-005**: A verificação automática MUST ser independente dos limites de ajuda: MUST NOT gastar "Letra" nem "Palavra", MUST NOT ter contador e MUST funcionar com os limites esgotados.
- **FR-006**: A verificação automática MUST NOT mudar as regras de conclusão, o cronômetro, o progresso salvo nem o envio ao servidor; o que é gravado como ajuda usada não muda.
- **FR-007**: A tela do jogo MUST ter, na faixa de ferramentas, os botões `Letra` e `Palavra` (com contador, como hoje) e um botão "Ajudas" com menu; o menu MUST conter "Verificar", o interruptor "Verificar ao digitar" (grupo "Automática") e, no grupo "Rascunho", o interruptor "Lápis", "Confirmar rascunho" e "Descartar rascunho".
- **FR-008**: O interruptor "Verificar ao digitar" do menu e a opção dos ajustes MUST ler e gravar o mesmo valor; ligar ou desligar num lado MUST aparecer no outro sem recarregar.
- **FR-009**: O botão "Ajudas" MUST mostrar um ponto indicador (com equivalente para leitor de tela) enquanto a verificação automática estiver ligada.
- **FR-010**: Os itens do rascunho MUST manter a regra atual: "Confirmar rascunho" e "Descartar rascunho" só agem quando a palavra ativa tem rascunho e a partida não está pausada; fora disso ficam desabilitados e sem efeito. "Verificar" e "Lápis" também ficam desabilitados com a partida pausada; "Verificar ao digitar" nunca.
- **FR-011**: O menu MUST ser acessível: botão com `aria-haspopup="menu"` e estado de aberto, itens com papel de item de menu (interruptores como `menuitemcheckbox`), navegação por setas, Home e End, Esc para fechar devolvendo o foco ao botão, clique fora para fechar, itens desabilitados anunciados como tal e uso só com teclado.
- **FR-012**: Enquanto o menu estiver aberto, as teclas MUST NOT chegar ao tabuleiro; abrir ou fechar o menu MUST NOT alterar seleção, direção, letras, rascunho, ajudas usadas, relógio nem progresso salvo; o menu MUST NOT abrir sobre outro diálogo e MUST fechar quando um diálogo abrir.
- **FR-013**: Com teclado na tela, a faixa MUST caber em uma linha com `Letra`, `Palavra` e `Ajudas`, e o menu MUST abrir como painel preso à borda de baixo, por cima do teclado, com itens de pelo menos 48 px de altura; sem teclado na tela, MUST abrir ancorado ao botão, sem sair da janela.
- **FR-014**: Nada nesta feature MUST deslocar o layout do tabuleiro, da barra de dica ou da faixa ao digitar, abrir o menu ou alternar a opção.
- **FR-015**: A chave nova do esquema de configurações MUST ser opcional na leitura de contas antigas (padrão "desligada") e ignorada por versões antigas do site; a API MUST continuar compatível com a versão anterior do site, e o conteúdo e o padrão da chave MUST entrar na definição de dados das configurações (DDE-004), sem migração, pois o banco guarda `jsonb`.

### Key Entities *(include if feature involves data)*

- **Configuração "verificar ao digitar"**: valor liga/desliga (padrão desligado) no registro único de configurações da pessoa; mesmas regras de armazenamento e sincronização das demais opções. Não cria tabela, coluna nem campo no progresso.
- **Marca de erro automática**: o estado visual "errada" de uma casa, derivado da comparação com a solução enquanto a opção está ligada. É a mesma marca da verificação manual; não é gravada à parte.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com a opção ligada, 100% das letras erradas digitadas em casas livres ficam marcadas antes da próxima tecla, sem nenhuma ação extra, e 0% das letras certas recebem marca.
- **SC-002**: A pessoa liga ou desliga a opção em no máximo 2 ações de dentro do jogo (abrir "Ajudas" e acionar o interruptor) e em no máximo 3 pelos ajustes (abrir os ajustes, acionar o interruptor, fechar).
- **SC-003**: Com a opção ligada, o número de "Letra" e "Palavra" usados e a conclusão da cruzada são idênticos aos de uma partida igual com a opção desligada.
- **SC-004**: A faixa de ferramentas do jogo tem 3 controles visíveis no celular, em uma linha, e abrir o menu 10 vezes seguidas não desloca o tabuleiro nem altera o tempo de partida.
- **SC-005**: O menu e o botão passam na verificação automática de acessibilidade do projeto nos dois temas e são operáveis só com teclado.
- **SC-006**: Uma conta que nunca viu a opção abre o jogo sem erro, com a opção desligada, e uma versão anterior do site continua carregando as configurações de uma conta que a tem ligada.

## Assumptions

- **Limites de ajuda (decisão da issue)**: a verificação automática é independente dos limites de "Letra" e "Palavra", porque "Verificar" já é ilimitado e a opção é uma escolha de estilo de jogo, não uma ajuda que se gasta. Não é criado limite novo.
- **Painel no celular (decisão da issue)**: o comportamento exigido é o painel preso à borda de baixo; reaproveitar o componente de diálogo existente ou criar um componente novo é decisão do plano, desde que cumpra FR-011 a FR-013.
- **Atalho de teclado (decisão da issue)**: esta feature não cria atalho para ligar e desligar, pois as teclas do tabuleiro são letras e a tabela de atalhos (feature 046) cobre só o tabuleiro; o menu é alcançável pelo teclado. Se vier a existir, entra na tabela única de atalhos em outra feature.
- A marca de erro é a mesma da verificação manual (vermelho); não há cor, som ou animação nova.
- A conclusão continua sendo decidida pelo site como hoje: a cruzada só conta como resolvida com todas as casas iguais à solução.
- As regras do jogo em `domain/game` mudam o mínimo para suportar a marca automática; o restante é composição da tela, um componente novo para o menu e estilos.
- O texto fica em português, como o resto do site. O comportamento sem teclado na tela segue o mesmo critério já usado para o teclado da tela (feature 046).
- A feature é do site e do esquema compartilhado de configurações; não há rota, tabela ou migração nova na API.
- Ao entregar, atualizam-se `docs/data-definitions` (DDE-004) e, se o diagrama citar o conteúdo da configuração, `docs/entity-relationship-diagrams`, como pedido na issue.
