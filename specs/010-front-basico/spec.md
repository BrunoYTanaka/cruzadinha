# Feature Specification: Front básico do Cruzadinha

**Feature Branch**: `feat/010-front-basico`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "Front básico do Cruzadinha: login e cadastro com convite, biblioteca em calendário mensal, tela de jogo com tabuleiro, dicas, teclado na tela, cronômetro e ajudas, janela de conclusão com modo leitura e jogar de novo, e modal de convite aberto pelo código Konami. Referências visuais em `docs/mockups/`."

## Clarifications

### Session 2026-10-14

- Q: Quando a sessão expira no meio de uma partida, o que o site deve fazer? → A: Continua jogando; aviso que não bloqueia com botão que abre o login numa janela sobre o jogo; ao entrar, as letras guardadas são enviadas sem sair da tela.
- Q: Quando a pessoa completa a grade e o servidor está inacessível, o que o site deve fazer? → A: Abre a janela de conclusão na hora com o tempo da pessoa e o aviso "Vamos registrar quando a conexão voltar"; tabuleiro em modo leitura; melhor tempo e registro no servidor valem quando o envio for confirmado.
- Q: Quando a pessoa escolhe "Jogar de novo" sem conexão, o que o site deve fazer? → A: Não reinicia; mostra "Sem conexão. Tente de novo quando voltar" e mantém o modo leitura.
- Q: Se a cruzada for concluída em outro aparelho enquanto a pessoa joga neste, o que este aparelho deve fazer? → A: Continua jogando; aviso que não bloqueia com "Ver como ficou" para ir ao modo leitura se a pessoa quiser.
- Q: Quando a pessoa corrige uma letra marcada em vermelho, o que acontece com a marca? → A: Vira roxa ("com ajuda") e fica assim até uma nova verificação.
- Q: Em telas maiores (tablet e computador), o tabuleiro deve crescer ou ficar no tamanho do celular? → A: Cresce o máximo possível: o maior tamanho de célula que cabe na largura (descontando a coluna de dicas) e na altura da janela, com teto de 110 px por célula no computador; nunca menor que no celular. Também no computador a tela de jogo cabe na altura da janela, sem rolagem vertical.
- Q: Quem tem prioridade de espaço no computador, o tabuleiro ou as dicas? → A: O tabuleiro. Ele fica sozinho na coluna da esquerda, com todo o espaço que a altura da janela permitir; a dica ativa, a lista de dicas e a fonte ficam na coluna ao lado.
- Q: Como a biblioteca sabe que a fonte está fora do ar, para mostrar o aviso? → A: Só depois que uma busca de dia falhar por fonte fora do ar; o aviso fica guardado no aparelho por 10 minutos e some quando outra busca funcionar ou o tempo passar.

## Contexto

O backend já entrega conta, convites, puzzles, progresso e biblioteca (features 004 a 009). O site hoje tem só uma página de status. Esta feature entrega a experiência de jogar, de ponta a ponta, para o autor e os amigos convidados. As referências visuais estão em `docs/mockups/` (`game.html`, `library.html`, `finish.html`) e valem como guia de layout, cores e comportamento; textos, tempos e datas dos mockups são inventados.

Fora do escopo desta feature: recuperação de senha, "sair de todos os aparelhos", estatísticas, ranking, outras fontes de puzzle, outros níveis além do diário, sincronização das ajudas entre aparelhos e qualquer mudança no servidor.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Entrar e criar conta com convite (Priority: P1)

Uma pessoa convidada cria a conta com o código do convite, ou volta e entra com e-mail e senha. Sem sessão válida, nenhuma outra tela fica acessível.

**Why this priority**: sem conta e sessão o site é privado e inacessível; é a porta de entrada de tudo.

**Independent Test**: com um convite válido, criar a conta, sair e entrar de novo, chegando à biblioteca nas duas vezes.

**Acceptance Scenarios**:

1. **Given** uma pessoa sem conta e com um convite válido, **When** informa o código, o e-mail e uma senha de pelo menos 8 caracteres, **Then** a conta é criada e ela chega à biblioteca já logada.
2. **Given** um código de convite inexistente, usado, expirado ou revogado, **When** tenta criar a conta, **Then** vê a mesma mensagem "convite inválido", sem saber qual foi o motivo.
3. **Given** e-mail ou senha incorretos, **When** tenta entrar, **Then** vê uma mensagem genérica que não revela se o e-mail existe.
4. **Given** muitas tentativas seguidas, **When** o servidor recusa por limite, **Then** a pessoa vê quanto tempo esperar.
5. **Given** a sessão expirou enquanto a pessoa joga, **When** o servidor responde que falta sessão, **Then** ela continua jogando, vê um aviso que não bloqueia ("Sua sessão expirou. Entre de novo para salvar") com um botão que abre o login numa janela por cima do jogo e, ao entrar, as letras guardadas são enviadas sem sair da tela. A janela de login traz o e-mail da conta da partida, somente leitura; para entrar com outra conta, a pessoa sai do jogo.
6. **Given** a sessão expirou fora do tabuleiro (na biblioteca, por exemplo), **When** a próxima ação falha por falta de sessão, **Then** a pessoa é levada ao login e, depois de entrar, volta ao ponto em que estava.
7. **Given** uma pessoa logada, **When** escolhe "Sair", **Then** a sessão termina e ela volta ao login.

---

### User Story 2 - Escolher um dia na biblioteca (Priority: P1)

A pessoa vê um calendário mensal com a situação de cada dia e escolhe qual cruzada jogar. Há um atalho para a cruzada de hoje.

**Why this priority**: é como se chega a qualquer cruzada.

**Independent Test**: abrir a biblioteca e abrir a cruzada de hoje, uma já concluída (em modo leitura) e uma de um dia passado ainda não guardado.

**Acceptance Scenarios**:

1. **Given** cruzadas guardadas, **When** a biblioteca abre, **Then** o mês atual aparece com a situação de cada dia, como no FR-004.
2. **Given** um dia futuro, **When** a pessoa o vê, **Then** ele aparece esmaecido e sem ação.
3. **Given** um dia passado que ainda não está guardado, **When** a pessoa o escolhe, **Then** o site busca a cruzada, mostra que está buscando e abre o jogo quando chega.
4. **Given** essa busca, **When** a fonte não tem cruzada para o dia, **Then** o dia passa a "sem cruzada neste dia"; se a fonte está fora do ar, a pessoa vê que não foi possível buscar agora e pode tentar depois; se o limite de buscas foi atingido, vê quanto tempo esperar.
5. **Given** o botão do mês anterior ou seguinte, **When** a pessoa o usa, **Then** o calendário muda de mês sem recarregar tudo.
6. **Given** uma busca de dia falhou recentemente porque a fonte está fora do ar, **When** a pessoa abre a biblioteca, **Then** continua vendo e jogando o que já está guardado, com um aviso de que novas cruzadas não podem ser buscadas agora; o aviso fica guardado no aparelho por alguns minutos e some quando outra busca funcionar ou o tempo passar.
7. **Given** o botão "Jogar a de hoje", **When** a pessoa o usa, **Then** abre a cruzada de hoje (Brasília).

---

### User Story 3 - Jogar uma cruzada (Priority: P1)

A pessoa joga no tabuleiro com teclado do computador ou teclado na tela, vê as dicas, o tempo, e o progresso é salvo sozinho.

**Why this priority**: é o produto; todo o resto serve a este momento.

**Independent Test**: abrir uma cruzada, preencher letras por teclado e por toque, fechar e reabrir em outro aparelho, e ver as letras no lugar.

**Acceptance Scenarios**:

1. **Given** uma cruzada aberta, **When** a pessoa seleciona uma célula, **Then** a célula e a palavra ativa na direção atual ficam destacadas e a dica ativa aparece acima do tabuleiro.
2. **Given** uma célula já selecionada, **When** ela é escolhida de novo, **Then** a direção alterna.
3. **Given** uma letra A a Z ou Ç (acentuadas viram a letra simples), **When** é digitada, **Then** preenche a célula e avança para a próxima da palavra; apagar volta uma célula.
4. **Given** as setas, Tab e Shift+Tab, **When** usados, **Then** a seleção se move entre células e entre palavras.
5. **Given** a lista de dicas, **When** a pessoa escolhe uma dica, **Then** a palavra correspondente é selecionada.
6. **Given** uma célula de bloco, **When** a pessoa tenta selecioná-la, **Then** nada acontece.
7. **Given** uma palavra completada, **When** a última letra entra, **Then** o cursor fica nela.
8. **Given** o celular, **When** a pessoa joga, **Then** usa um teclado próprio na tela (com Ç e apagar) e uma barra acima dele mostra a palavra ativa em tamanho legível.
9. **Given** letras digitadas, **When** a pessoa para de digitar, sai da página ou fecha a aba, **Then** o progresso é salvo; se o salvamento falhar, as letras ficam guardadas no aparelho e o envio é repetido.
10. **Given** uma cruzada em andamento aberta em outro aparelho, **When** a pessoa a abre, **Then** as letras e o tempo continuam de onde pararam; se houver conflito, vale o salvamento mais recente.
11. **Given** o tempo correndo, **When** a aba perde o foco ou a pessoa usa "Pausar", **Then** o tempo para e o tabuleiro fica coberto até ela retomar.
12. **Given** a grade completa mas errada, **When** a última letra entra, **Then** nada é anunciado.
13. **Given** qualquer cruzada, **When** ela é exibida, **Then** a atribuição à fonte aparece junto dela.
14. **Given** a mesma cruzada foi concluída em outro aparelho enquanto a pessoa ainda joga neste, **When** o servidor recusar novos salvamentos por já estar concluída, **Then** este aparelho continua jogando normalmente, com um aviso que não bloqueia ("Esta cruzada já foi concluída em outro aparelho") e o botão "Ver como ficou", que leva ao modo leitura com o progresso do servidor; nada muda sozinho na tela.

---

### User Story 4 - Usar as ajudas (Priority: P2)

A pessoa pode pedir ajuda: revelar uma letra, revelar uma palavra ou verificar o que digitou. Cada célula afetada fica marcada.

**Why this priority**: torna o jogo acessível a quem trava, mas o jogo funciona sem ela.

**Independent Test**: usar cada ajuda em uma cruzada, conferir marcas e contadores, esgotar o limite de letras e ver o botão desabilitado.

**Acceptance Scenarios**:

1. **Given** uma célula selecionada, **When** a pessoa usa "Letra", **Then** a letra certa aparece, a célula ganha uma marca roxa no canto superior direito e o contador de letras sobe (por exemplo "1/4").
2. **Given** uma palavra ativa, **When** a pessoa usa "Palavra", **Then** todas as letras certas da palavra aparecem, as células ganham a marca roxa e o contador de palavras sobe.
3. **Given** letras digitadas, **When** a pessoa usa "Verificar", **Then** cada letra errada ganha uma marca vermelha no canto superior direito e as certas conferidas ficam com a marca roxa; verificar não tem limite de uso.
4. **Given** o limite de uma ajuda atingido (4 letras ou 2 palavras por cruzada, valores iniciais), **When** a pessoa olha o botão, **Then** ele aparece desabilitado e explica que o limite acabou.
5. **Given** uma letra marcada em vermelho, **When** a pessoa a corrige, **Then** a marca vira roxa ("com ajuda") e fica assim, sem voltar a vermelho até uma nova verificação.
6. **Given** a legenda do tabuleiro, **When** a página abre, **Then** ela está escondida; um botão "?" no canto da tela a abre e fecha, e ela explica vazia, palavra ativa, selecionada, com ajuda e errada na verificação.
7. **Given** o uso de ajuda, **When** a pessoa recarrega a página no mesmo aparelho, **Then** contadores e marcas continuam; em outro aparelho eles começam do zero.
8. **Given** os limites, **When** o operador quer mudá-los, **Then** troca os valores por configuração, sem alterar o código.

---

### User Story 5 - Concluir e rever (Priority: P2)

Ao acertar a grade inteira, a pessoa vê o resultado. Depois pode rever a cruzada em modo leitura ou jogá-la de novo do zero.

**Why this priority**: fecha o ciclo de jogo e guarda o melhor tempo.

**Independent Test**: completar uma cruzada corretamente, ver a janela, fechar, ver o modo leitura e jogar de novo.

**Acceptance Scenarios**:

1. **Given** a grade completa e correta, **When** a última letra entra, **Then** abre uma janela com o tempo, o melhor tempo e as ajudas usadas, com o foco no botão principal.
2. **Given** a janela aberta, **When** a pessoa usa Esc ou "Ver o tabuleiro", **Then** ela fecha e o tabuleiro fica em modo leitura, sem seleção nem teclado, com uma faixa "Concluída em mm:ss".
3. **Given** o modo leitura, **When** a pessoa escolhe "Jogar de novo", **Then** o tabuleiro volta vazio, o tempo recomeça e o melhor tempo anterior é mantido.
4. **Given** um novo tempo melhor que o recorde, **When** a cruzada conclui, **Then** a janela mostra o novo recorde.
5. **Given** uma cruzada já concluída, **When** a pessoa a abre pela biblioteca, **Then** ela abre direto em modo leitura.
6. **Given** o modo leitura e o servidor inacessível, **When** a pessoa escolhe "Jogar de novo", **Then** o site não reinicia, mostra "Sem conexão. Tente de novo quando voltar" e mantém o modo leitura na tela; ao voltar a rede, a pessoa tenta de novo.
7. **Given** a conclusão com ajudas, **When** o resultado é calculado, **Then** o tempo conta normalmente para o melhor tempo.
8. **Given** a grade completa e correta e o servidor inacessível, **When** a última letra entra, **Then** a janela abre na hora com o tempo da pessoa e o aviso "Vamos registrar quando a conexão voltar", o tabuleiro vai para o modo leitura, e o melhor tempo e a conclusão no servidor passam a valer quando o envio for confirmado.

---

### User Story 6 - Claro, escuro e acessibilidade (Priority: P2)

A pessoa escolhe entre tema automático, claro e escuro, e o site funciona com teclado e leitor de tela.

**Why this priority**: exigência da constituição e parte da qualidade do produto; vale para todas as telas.

**Independent Test**: alternar os três temas em cada tela e percorrer o fluxo principal só com teclado.

**Acceptance Scenarios**:

1. **Given** o tema automático, **When** a página abre, **Then** segue a preferência do sistema, sem piscar branco ao carregar.
2. **Given** o botão de tema, **When** a pessoa troca, **Then** a escolha é aplicada na hora e lembrada neste aparelho.
3. **Given** os dois temas, **When** o tabuleiro é exibido, **Then** os estados do tabuleiro seguem o FR-026 nos dois temas (a selecionada difere só pela cor de fundo).
4. **Given** só o teclado, **When** a pessoa percorre login, biblioteca, jogo, janelas e menus, **Then** alcança tudo, vê sempre onde está o foco e consegue fechar janelas com Esc.
5. **Given** um leitor de tela, **When** a pessoa navega o tabuleiro, **Then** cada célula é descrita (linha, coluna, letra ou vazia, e se tem ajuda) e a dica ativa é anunciada ao mudar.
6. **Given** a preferência de reduzir movimento, **When** a página anima algo, **Then** a animação é suprimida.

---

### User Story 7 - Criar convite pelo código Konami (Priority: P3)

Uma pessoa logada digita a sequência ↑ ↑ ↓ ↓ ← → ← → B A e recebe um convite para mandar a um amigo.

**Why this priority**: é a forma de crescer o grupo, mas é secreta e não bloqueia o jogo.

**Independent Test**: digitar a sequência logado e ver o código; repetir até atingir a cota e ver a explicação.

**Acceptance Scenarios**:

1. **Given** uma pessoa logada, **When** digita a sequência, **Then** abre uma janela com o código do convite, a validade, o uso único e quantos convites ativos ela tem, e um botão para copiar.
2. **Given** a janela fechada, **When** a pessoa precisa do código de novo, **Then** ele não aparece outra vez; só criando outro.
3. **Given** 3 convites ativos, **When** a pessoa digita a sequência, **Then** a janela explica que a cota acabou e quando abre vaga, sem erro técnico.
4. **Given** uma pessoa sem sessão, **When** digita a sequência, **Then** nada acontece.
5. **Given** a pessoa está no tabuleiro, **When** digita as teclas da sequência, **Then** elas valem como jogo normal (as setas movem a seleção, B e A digitam letras) e nenhum convite abre; a sequência só é reconhecida nas outras telas.

---

### Edge Cases

- A cruzada de um dia só é considerada indisponível depois de uma tentativa de busca; a pessoa vê o motivo.
- Conclusão sem conexão: a janela de conclusão abre na hora com o tempo da pessoa e o aviso de registro pendente; o tabuleiro vai ao modo leitura e o envio é repetido até ser confirmado; se o servidor já tinha a cruzada como concluída, o site trata como concluída, sem erro.
- "Jogar de novo" sem conexão: o site avisa "Sem conexão. Tente de novo quando voltar" e mantém o modo leitura; não existe reinício local.
- Falha de rede ao salvar: o progresso fica no aparelho e o envio é repetido; a pessoa pode seguir jogando.
- Sessão expirada no meio da partida: o jogo continua, as letras ficam no aparelho e o login abre numa janela por cima do tabuleiro; fechar a janela sem entrar mantém o aviso e o jogo.
- Conclusão registrada no servidor com recusa por já estar concluído (a própria conclusão deste aparelho, enviada de novo): o site trata como concluída, sem mostrar erro.
- Cruzada concluída em outro aparelho enquanto se joga neste: o jogo continua, aparece o aviso "Esta cruzada já foi concluída em outro aparelho" com "Ver como ficou"; a pessoa só vai ao modo leitura se escolher.
- Dois aparelhos jogando a mesma cruzada: vale o salvamento mais recente (e, se um deles concluir, vale a conclusão, sem tirar o outro do jogo).
- Tela pequena: grade de 11 × 11 cabe na largura do celular com células menores; o toque na célula é impreciso, então a seleção também funciona pelas dicas, pelas setas e pela barra da palavra ativa.
- A fonte demora ou falha ao buscar um dia: o site mostra carregando e depois o erro, sem travar o resto.
- Armazenamento do aparelho indisponível ou limpo: o jogo funciona, mas as ajudas e as letras ainda não enviadas podem ser perdidas.
- Cruzada com grade de tamanho diferente de 11 × 11: o tabuleiro se adapta ao tamanho que vier.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O site MUST exigir sessão válida para todas as telas, exceto login e cadastro, e, quando a sessão expirar fora do tabuleiro, MUST levar a pessoa ao login e de volta ao ponto em que estava. Com o tabuleiro aberto, vale FR-032.
- **FR-002**: O cadastro MUST pedir código do convite, e-mail e senha (mínimo 8 caracteres), e MUST mostrar a mesma mensagem para qualquer convite inválido.
- **FR-003**: Login e cadastro MUST mostrar mensagens genéricas de erro e, quando houver limite de tentativas, o tempo de espera.
- **FR-004**: A biblioteca MUST mostrar um calendário mensal com a situação de cada dia (concluído com tempo, em andamento, não iniciado, indisponível, ou passado ainda não guardado), sempre por texto e não só por cor.
- **FR-005**: A biblioteca MUST permitir navegar entre meses e abrir a cruzada de hoje com um atalho.
- **FR-006**: Escolher um dia passado não guardado MUST buscar a cruzada, mostrar o andamento e tratar sem cruzada, fonte fora do ar e limite de buscas com mensagens próprias.
- **FR-007**: A biblioteca MUST continuar mostrando as cruzadas guardadas quando a fonte estiver fora do ar. Como a lista da biblioteca vem só do que está guardado e não consulta a fonte, o aviso "novas cruzadas não podem ser buscadas agora" MUST aparecer só depois que uma busca de dia falhar por fonte fora do ar, ficar guardado no aparelho por 10 minutos (valor fixo) e sumir quando outra busca funcionar ou o tempo passar.
- **FR-008**: Só o nível diário MUST ser oferecido, sem seletor de nível.
- **FR-009**: O tabuleiro MUST seguir as regras de jogo 1 a 9 do design (`docs/design.md`, seção 6): uma célula selecionada, direção alternável, avanço e retorno de letra, setas, Tab, dica clicável, apenas A a Z e Ç, blocos não selecionáveis, cursor na última letra e nenhum aviso para grade errada.
- **FR-010**: O tabuleiro MUST adaptar-se ao tamanho da grade recebido, com células de pelo menos 30 px de largura no celular. Em telas maiores MUST usar o maior tamanho de célula que caiba, ao mesmo tempo, na largura (descontada a lista de dicas) e na altura disponíveis, sem rolagem vertical da página no computador (o celular rola por causa do teclado) e com teto de 110 px por célula. No computador o tabuleiro MUST ter prioridade de espaço: a dica ativa, a lista de dicas e a atribuição à fonte ficam numa coluna ao lado, para o tabuleiro poder usar quase toda a altura da janela.
- **FR-011**: A tela de jogo MUST mostrar, entre o cabeçalho e o tabuleiro, uma faixa com o tempo, "Pausar", "Outro dia" e os botões de ajuda com seus contadores.
- **FR-012**: A tela de jogo MUST mostrar a dica ativa acima do tabuleiro e a lista de dicas de horizontais e verticais, com a ativa destacada e as já preenchidas distintas.
- **FR-013**: No celular o jogo MUST oferecer teclado na tela com A a Z, Ç e apagar, e uma barra com a palavra ativa em tamanho legível.
- **FR-014**: O tempo MUST correr com a aba ativa, parar ao perder o foco ou ao usar "Pausar", e ao pausar o tabuleiro MUST ficar coberto.
- **FR-015**: O progresso MUST ser salvo automaticamente, ao sair da página e ao fechar a aba; em falha, as letras MUST ficar guardadas no aparelho e o envio MUST ser repetido; o salvamento mais recente MUST prevalecer.
- **FR-016**: A cruzada MUST exibir a atribuição à sua fonte.
- **FR-017**: O site MUST oferecer três ajudas: revelar letra, revelar palavra e verificar. Revelar letra e palavra MUST ter limite por cruzada (valores iniciais: 4 letras e 2 palavras); verificar MUST ser ilimitado. Os limites MUST ser configuráveis sem alterar o código.
- **FR-018**: Cada célula afetada por uma ajuda MUST ter um cantinho colorido no canto superior direito: roxo para revelada, para conferida e certa ou para corrigida depois de marcada em vermelho, e vermelho para errada na verificação; ao corrigir uma letra vermelha, a marca MUST virar roxa e só voltar a vermelho numa nova verificação que a ache errada.
- **FR-019**: Uma ajuda esgotada MUST aparecer desabilitada e indicar o motivo; o estado MUST ser anunciado a leitores de tela.
- **FR-020**: O uso de ajuda e as células marcadas MUST ficar apenas no aparelho, por usuário e cruzada, sem envio ao servidor.
- **FR-021**: A legenda do tabuleiro MUST começar escondida e abrir e fechar por um botão "?" no canto da tela; MUST fechar com Esc.
- **FR-022**: Ao completar a grade com todas as letras certas, o site MUST abrir uma janela com tempo, melhor tempo e ajudas usadas, tratando-a como diálogo acessível (foco, Esc e retorno do foco). A janela MUST abrir na hora, mesmo sem conexão: nesse caso mostra o tempo da pessoa e o aviso "Vamos registrar quando a conexão voltar", e o melhor tempo e o registro no servidor valem quando o envio for confirmado (FR-032).
- **FR-023**: Depois da conclusão o tabuleiro MUST ficar em modo leitura, com opção de jogar de novo do zero mantendo o melhor tempo; uma cruzada já concluída MUST abrir em modo leitura. "Jogar de novo" MUST exigir o servidor (ele guarda o melhor tempo): sem conexão, o site MUST avisar e manter o modo leitura, sem reiniciar localmente.
- **FR-024**: A conclusão MUST contar para o melhor tempo mesmo com ajuda.
- **FR-025**: O site MUST oferecer tema automático, claro e escuro, aplicados na hora, lembrados neste aparelho e sem flash branco ao carregar.
- **FR-026**: No tabuleiro, bloco, célula vazia, palavra ativa, selecionada e letra preenchida MUST ser distinguíveis entre si nos dois temas pela paleta aprovada nos mockups; a selecionada MUST diferir só pela cor de fundo, sem contorno nem borda. A letra MUST manter 4,5:1 sobre o fundo de cada estado. A diferença de luminosidade entre os próprios estados (por exemplo selecionada contra palavra ativa no tema claro) não é exigida em 3:1: é uma exceção assumida pelo autor.
- **FR-027**: O site MUST atender ao nível "básico sólido" de acessibilidade: contraste de pelo menos 4,5:1 para texto e 3:1 para controles (botões, campos, foco e marcas de ajuda; os estados do próprio tabuleiro seguem a exceção de FR-026), teclado completo com foco sempre visível, respeito à preferência de reduzir movimento, rótulos corretos em formulários e botões, alvos de toque de pelo menos 44 px fora do tabuleiro, tabuleiro descrito célula a célula para leitor de tela e dica ativa anunciada.
- **FR-028**: O site MUST usar a fonte Roboto.
- **FR-029**: A sequência ↑ ↑ ↓ ↓ ← → ← → B A, com sessão válida, fora de campos de texto e fora do tabuleiro, MUST abrir uma janela de convite; o código MUST aparecer uma única vez com botão de copiar, e a cota cheia MUST ser explicada sem erro técnico.
- **FR-030**: Todos os textos visíveis MUST estar em português do Brasil.
- **FR-031**: O site MUST mostrar estados de carregamento e de erro compreensíveis para fonte fora do ar, cruzada indisponível, sessão expirada e falha ao salvar.
- **FR-032**: Depois que o jogo carrega, nada MUST impedir a pessoa de jogar: falha de rede, erro ao salvar e sessão expirada MUST aparecer como avisos que não bloqueiam e nunca tirar o tabuleiro da tela. Com a sessão expirada, o site MUST manter o jogo, guardar as letras no aparelho e oferecer o login numa janela por cima do tabuleiro; ao entrar, MUST enviar o que ficou guardado sem sair da tela. A janela de login MUST prender o e-mail à conta da partida (somente leitura), para as letras guardadas nunca irem ao progresso de outra pessoa.

### Key Entities

- **Sessão**: conta logada no aparelho; decide o que a pessoa pode ver.
- **Convite**: código de uso único criado por uma pessoa logada; aparece uma vez.
- **Cruzada**: o puzzle de um dia, com grade, dicas e a fonte de origem.
- **Progresso**: letras, tempo e situação (em andamento ou concluída), mais o melhor tempo da pessoa naquela cruzada; guardado no servidor.
- **Ajuda usada**: contagem por tipo e células marcadas; existe só no aparelho, por usuário e cruzada.
- **Preferência de tema**: automático, claro ou escuro; existe só no aparelho.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Uma pessoa com um convite válido cria a conta e chega à primeira cruzada em menos de 3 minutos.
- **SC-002**: A partir da biblioteca, abrir qualquer cruzada já guardada leva no máximo 2 interações (dia e, se houver, confirmação).
- **SC-003**: Cada letra digitada aparece no tabuleiro sem atraso perceptível (em até 100 ms) em um celular de gama média.
- **SC-004**: Depois de fechar a página no meio de uma cruzada, em 100% dos casos a pessoa reabre e encontra as letras e o tempo do último salvamento, em qualquer aparelho com acesso à rede.
- **SC-005**: Nenhuma letra digitada é perdida quando uma falha de rede ocorre e depois some, desde que o aparelho continue com a página aberta ou o armazenamento local disponível.
- **SC-006**: Todo o fluxo principal (entrar, escolher um dia, jogar, usar cada ajuda, concluir, jogar de novo, criar convite) pode ser feito só com teclado, e a verificação automatizada de acessibilidade das telas principais não aponta violações críticas.
- **SC-007**: Em todas as telas e nos dois temas, texto (incluindo a letra sobre cada estado do tabuleiro) atinge pelo menos 4,5:1 de contraste e controles e marcas de ajuda pelo menos 3:1; os estados do tabuleiro entre si seguem a paleta aprovada, com exceção documentada.
- **SC-008**: A grade de 11 × 11 cabe na largura de 360 px sem rolagem horizontal da página.
- **SC-009**: 100% das cruzadas exibidas trazem a atribuição à fonte.
- **SC-010**: Em um teste com cinco pessoas que nunca viram o site, pelo menos quatro completam uma cruzada de 11 × 11 do começo ao fim sem ajuda externa.

## Assumptions

- O backend das features 001 a 009 está disponível e não muda nesta feature; o uso de ajuda fica só no aparelho, por decisão do autor, e vale a opção de levá-lo ao servidor em uma feature futura.
- Só o nível diário existe na fonte, então a biblioteca não tem seletor de nível.
- A janela de coleta padrão cobre os últimos 31 dias; dias mais antigos aparecem como "buscar" e a fonte decide se existem. O limite real do histórico da fonte é desconhecido e a interface tolera qualquer valor.
- "Pausar" é manual e cobre o tabuleiro enquanto o tempo está parado, para não dar para pensar sem o tempo correr; ao voltar, o jogo retoma de onde parou.
- A janela de conclusão só abre uma vez por conclusão; reabrir uma cruzada concluída vai direto ao modo leitura.
- A janela de conclusão mostra "0 ajudas" quando a cruzada foi concluída em outro aparelho, porque o uso de ajuda não viaja entre aparelhos.
- A sequência do Konami só é reconhecida fora de campos de texto e fora do tabuleiro, porque lá as setas e as letras B e A têm outro significado; para criar um convite no meio de uma partida, a pessoa volta à biblioteca.
- Exceção assumida de contraste: no tabuleiro, palavra ativa, selecionada, célula vazia e bloco não atingem 3:1 entre si em todos os pares (a medição está em `contracts/ui-contracts.md`); o autor aprovou a paleta dos mockups, em que a selecionada difere só pelo fundo. O texto e os controles seguem os mínimos.
- A janela de login por cima do jogo (sessão expirada) aceita só a conta da partida; trocar de conta exige sair do jogo.
- O aviso de fonte fora do ar na biblioteca dura 10 minutos fixos; não há configuração para isso.
- Células menores que 44 px no tabuleiro do celular são uma exceção assumida; a seleção também funciona pelas dicas, pelas setas e pela barra da palavra ativa.
- O dia de hoje e as datas seguem o horário de Brasília.
- O site continua privado e restrito a convidados; não há versão pública.
- O tom visual, as telas e os comportamentos dos mockups em `docs/mockups/` valem como referência; divergências de detalhe são decididas no plano.
- Uma pessoa joga uma cruzada por vez por aparelho; abrir várias abas da mesma cruzada não é um caso suportado.
