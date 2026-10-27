# Feature Specification: PWA e modo offline

**Feature Branch**: `feat/041-pwa-modo-offline`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "PWA e modo offline: instalar no celular e jogar cruzadas já baixadas sem rede, com fila de salvamento offline para contas (ref. issue #90)"

## Contexto

Hoje o site precisa de rede para abrir qualquer tela e para carregar uma cruzada. Quem joga no celular, no metrô ou em viagem perde a partida quando o sinal cai ou nem consegue começar. Esta feature faz o site poder ser instalado como aplicativo e permite jogar sem rede as cruzadas que o aparelho já guardou. Visitantes já guardam o progresso só no aparelho; contas passam a ter o progresso feito sem rede enviado ao servidor quando a conexão volta.

## Clarifications

### Session 2026-10-26

- Q: O que acontece com o progresso pendente de uma conta cuja sessão expirou enquanto estava sem rede? → A: As pendências continuam guardadas no aparelho, ligadas à conta que as gerou, e são enviadas quando essa mesma conta entrar de novo neste aparelho; enquanto isso a pessoa joga como visitante e vê um aviso de que há progresso esperando ela entrar; se outra conta entrar, as pendências da primeira são descartadas com aviso. [LOW CONFIDENCE]
  - Motivo: usabilidade (nenhuma letra se perde quando a sessão expira sozinha) sem ferir segurança (nunca enviado com a sessão de outra pessoa; descartado quando outra conta usa o aparelho). Muda dado guardado no aparelho, por isso a revisar.
- Q: Quando uma conta abre sem rede uma cruzada guardada, qual progresso aparece no tabuleiro? → A: O último progresso conhecido dessa conta para a cruzada (o confirmado pelo servidor mais o pendente), guardado no aparelho ligado à conta e apagado ao sair da conta. [LOW CONFIDENCE]
  - Motivo: usabilidade (sem isso a conta veria tabuleiro vazio e regrediria o próprio progresso); segurança: só o necessário para jogar, ligado à conta e apagado no logout (FR-017). Guarda dado de conta no aparelho, por isso a revisar.
- Q: Com rede, uma cruzada já guardada abre da cópia no aparelho ou espera o servidor? → A: Da cópia no aparelho, na hora; o servidor só é consultado para cruzadas não guardadas (o progresso da conta continua vindo do servidor quando ele responde).
  - Motivo: usabilidade (o conteúdo de uma cruzada salva não muda, e não esperar o servidor gratuito acordar nem a rede instável); padrão: o servidor nunca altera uma cruzada já salva.
- Q: Quando uma nova versão do site chega, como ela passa a valer? → A: Só na próxima abertura do site, sem aviso nem botão; nunca no meio de uma partida.
  - Motivo: mais simples e fácil de desfazer (critério 4), sem passos extras para a pessoa (usabilidade).
- Q: Ao sair da conta, as cruzadas guardadas no aparelho também são apagadas? → A: Não: as cruzadas guardadas (conteúdo público, igual para todos) ficam; são apagados as pendências, o último progresso conhecido e qualquer resposta com dados da conta. [LOW CONFIDENCE]
  - Motivo: privacidade (só o dado da pessoa é apagado; a cruzada não é dado pessoal) e usabilidade (o aparelho continua jogável sem rede). Decide o que a próxima pessoa no aparelho vê (quais cruzadas estão disponíveis sem rede), por isso a revisar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jogar sem rede uma cruzada já aberta (Priority: P1)

Uma pessoa abriu a cruzada de hoje com rede. Depois fica sem sinal, fecha e abre o site de novo e continua a partida: o site abre, a cruzada aparece e ela segue preenchendo, com relógio, ajudas e conclusão funcionando.

**Why this priority**: É o ganho central; sem ele, instalar o site não muda nada na hora em que a rede falha.

**Independent Test**: Abrir uma cruzada com rede, desligar a rede, recarregar o site e jogar até concluir.

**Acceptance Scenarios**:

1. **Given** uma cruzada aberta antes com rede, **When** a pessoa abre o site sem rede e escolhe essa cruzada, **Then** a cruzada carrega e pode ser jogada e concluída.
2. **Given** a pessoa sem rede, **When** abre o site, **Then** a tela inicial aparece (não a tela de erro do navegador) e avisa que está sem conexão.
3. **Given** a pessoa sem rede, **When** tenta abrir uma cruzada que o aparelho não guardou, **Then** vê uma mensagem clara de que essa cruzada só abre com rede, sem travar o resto do site.
4. **Given** uma partida sem rede, **When** a rede volta, **Then** o aviso de "sem conexão" some sozinho e a partida não é interrompida.

---

### User Story 2 - Instalar o site no celular (Priority: P1)

A pessoa pode adicionar o Cruzadinha à tela inicial do celular e abri-lo como um aplicativo, em tela cheia, com nome e ícone próprios.

**Why this priority**: É o que o pedido chama de "instalar no celular" e dá acesso de um toque, mesmo sem rede.

**Independent Test**: Num celular (ou emulador), instalar a partir do navegador e abrir pelo ícone.

**Acceptance Scenarios**:

1. **Given** um navegador que permite instalar, **When** a pessoa usa a instalação do navegador ou o botão "Instalar" do site, **Then** o site é instalado e abre sem a barra do navegador.
2. **Given** o site já instalado ou aberto como aplicativo, **When** a pessoa usa o site, **Then** o botão "Instalar" não aparece.
3. **Given** um navegador que não oferece instalação direta, **When** a pessoa procura o botão, **Then** ele não aparece (sem botão que não funciona).
4. **Given** o site instalado, **When** sai uma nova versão, **Then** o aplicativo passa a usar a nova versão na próxima abertura (com todas as abas e janelas do site fechadas; recarregar não basta), sem a pessoa precisar reinstalar.

---

### User Story 3 - Progresso de conta feito sem rede chega ao servidor (Priority: P2)

Quem tem conta joga sem rede e o progresso fica numa fila no aparelho. Quando a rede volta, o site envia o que ficou pendente, sem a pessoa fazer nada. O mesmo vale para a conclusão e o "Jogar de novo" feitos sem rede.

**Why this priority**: Sem isso, contas perderiam o progresso offline ou teriam de deixar a tela aberta até a rede voltar; visitantes já têm o equivalente local.

**Independent Test**: Entrar com uma conta, desligar a rede, preencher letras, religar a rede e conferir o progresso no servidor (e em outro aparelho).

**Acceptance Scenarios**:

1. **Given** uma conta jogando sem rede, **When** a pessoa preenche letras, **Then** o jogo continua sem erro e mostra que há progresso aguardando envio.
2. **Given** progresso pendente, **When** a rede volta (com o site aberto, ou na próxima abertura), **Then** o site envia o pendente em ordem e o aviso de pendência some.
3. **Given** que o servidor tem um progresso mais novo ou já concluído vindo de outro aparelho, **When** o pendente chega, **Then** vale a regra de salvamento de hoje (nunca apaga conclusão nem regride o progresso) e a pessoa vê o resultado real, sem mensagem de erro assustadora.
4. **Given** várias gravações pendentes da mesma cruzada, **When** são enviadas, **Then** só a mais recente por cruzada vai ao servidor.
5. **Given** que o servidor recusa o envio por excesso de pedidos, **When** a fila tenta enviar, **Then** ela espera e tenta de novo, como o salvamento de hoje.
6. **Given** pendências e uma sessão que acabou enquanto estava sem rede, **When** a rede volta, **Then** o progresso pendente não é enviado em nome de outra pessoa nem se perde sem aviso: fica guardado até a mesma conta entrar de novo (ver FR-011).

---

### User Story 4 - Baixar cruzadas para a viagem (Priority: P3)

A pessoa pede para deixar no aparelho as cruzadas de hoje (uma por fonte) antes de ficar sem rede, sem precisar abrir uma por uma.

**Why this priority**: Melhora o uso planejado (viagem), mas as histórias 1 a 3 já entregam o modo offline com o que a pessoa abriu.

**Independent Test**: Tocar em "Baixar para jogar sem rede", desligar a rede e abrir cada cruzada de hoje.

**Acceptance Scenarios**:

1. **Given** rede e o calendário aberto, **When** a pessoa toca em "Baixar as cruzadas de hoje", **Then** as cruzadas disponíveis de hoje ficam guardadas e o site informa quais foram guardadas e quais falharam.
2. **Given** cruzadas guardadas, **When** a pessoa vê o calendário ou a tela inicial, **Then** elas aparecem marcadas como disponíveis sem rede.
3. **Given** uma fonte que falha ao baixar, **When** o download roda, **Then** as outras ainda são guardadas.

---

### Edge Cases

- Espaço do aparelho insuficiente ou navegador que apaga os dados guardados: o site avisa no resumo do download que não conseguiu guardar; ao abrir uma cruzada a falha é silenciosa e o jogo continua funcionando com rede; cruzada já guardada que sumiu volta a depender de rede.
- Muitas cruzadas guardadas: o aparelho mantém só as mais recentes dentro de um limite (ver Suposições); a cruzada em andamento nunca é removida.
- Rede instável (conexão que existe mas não responde): o jogo não espera a rede para aceitar letras, como hoje; uma cruzada guardada abre da cópia no aparelho sem esperar a rede (FR-019); só a não guardada depende do carregamento com tempo limite.
- Duas abas abertas, uma delas enviando a fila: uma gravação pode ser enviada duas vezes, mas nunca sobrescreve uma mais nova (o servidor decide pelas regras de progresso).
- Aparelho compartilhado: ao sair da conta, as pendências e o progresso conhecido dessa conta são apagados; as cruzadas guardadas continuam disponíveis sem rede para quem usar o aparelho.
- Nova versão do site com a aba aberta (com ou sem rede): a versão antiga segue funcionando; a nova só vale na próxima abertura.
- Visitante: nada muda no progresso (já é local); o modo offline vale igual para ele, mas não há fila de envio.
- Telas que dependem do servidor (login, cadastro, recuperar senha, verificar e-mail e a página de estado do servidor): sem rede, mostram aviso claro de que precisam de conexão, sem tela quebrada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O site MUST abrir sem rede (tela inicial, calendário do que está guardado e jogo) depois de ter sido aberto com rede ao menos uma vez no aparelho.
- **FR-002**: O site MUST guardar no aparelho, automaticamente, cada cruzada aberta (parte pública e solução, como o jogo já recebe) para poder jogá-la sem rede.
- **FR-003**: Uma cruzada guardada MUST ser totalmente jogável sem rede: letras, relógio, ajudas, conclusão, "Jogar de novo" e configurações.
- **FR-004**: O site MUST mostrar de forma discreta e não bloqueante que está sem conexão, e remover o aviso sozinho quando a rede voltar.
- **FR-005**: Pedir sem rede algo que não está guardado MUST resultar em mensagem clara, não em erro genérico nem tela em branco; o restante do site continua usável.
- **FR-006**: O site MUST poder ser instalado como aplicativo, com nome, ícone e tela cheia próprios, e o botão "Instalar" MUST aparecer apenas quando a instalação é possível e ainda não foi feita.
- **FR-007**: Uma nova versão do site MUST chegar ao aparelho sem reinstalação e sem interromper uma partida em andamento; só passa a valer na próxima abertura do site (todas as abas e janelas fechadas e abertas de novo; recarregar a página não basta), sem aviso nem ação da pessoa.
- **FR-008**: Para contas, todo salvamento de progresso (letras, tempo, ajudas, conclusão, reinício) feito sem rede MUST entrar numa fila local, em ordem, e MUST ser enviado automaticamente quando a rede voltar, inclusive na próxima abertura do site.
- **FR-009**: A fila MUST enviar no máximo a gravação mais recente por cruzada e MUST obedecer às mesmas regras de salvamento do servidor de hoje (nunca regride nem apaga conclusão); respostas de recusa por excesso de pedidos MUST ser repetidas com espera.
- **FR-010**: O jogo MUST mostrar se há progresso aguardando envio e MUST nunca bloquear a pessoa por causa da fila.
- **FR-011**: O progresso pendente MUST pertencer à conta que o gerou: só é enviado com a sessão dessa conta; ao sair da conta com pendências, a pessoa MUST ser avisada de que elas serão descartadas; se a sessão expirar sem rede, as pendências MUST ficar guardadas e ser enviadas quando a mesma conta entrar de novo neste aparelho (a pessoa joga como visitante e vê aviso de que há progresso esperando ela entrar), e MUST ser descartadas com aviso se outra conta entrar; dados de visitante e de conta MUST NOT se misturar.
- **FR-012**: O progresso de visitante MUST continuar só no aparelho e MUST NOT ser enviado ao servidor em nenhuma situação.
- **FR-013**: O aparelho MUST guardar só o necessário para jogar, MUST manter um limite de cruzadas guardadas descartando as mais antigas não abertas por último, e MUST nunca descartar a cruzada em andamento ou com progresso pendente.
- **FR-014**: A pessoa MUST poder baixar de uma vez as cruzadas de hoje de todas as fontes, com resumo do que foi guardado e do que falhou, sem que a falha de uma fonte impeça as outras.
- **FR-015**: O calendário e a lista MUST indicar quais cruzadas estão disponíveis sem rede.
- **FR-016**: As regras já existentes MUST continuar valendo: o site não é indexado, cada cruzada exibe a atribuição à fonte, e nada do modo offline cria forma de exportar ou redistribuir o conteúdo.
- **FR-017**: Respostas que dependem de sessão ou de dados de uma pessoa (conta, progresso, configurações da conta) MUST NOT ser guardadas de forma que outra pessoa no mesmo aparelho as veja depois de sair da conta; ao sair, MUST ser apagados as pendências, o último progresso conhecido e qualquer resposta com dados da conta, enquanto as cruzadas guardadas (conteúdo público) permanecem. As configurações do aparelho (`cruzadinha:settings`) não são dado pessoal: permanecem, como hoje.
- **FR-018**: Uma conta que abre sem rede uma cruzada guardada MUST ver o último progresso conhecido dela (o confirmado pelo servidor mais o pendente), guardado no aparelho ligado à conta.
- **FR-019**: Uma cruzada guardada MUST abrir da cópia no aparelho mesmo com rede, sem esperar o servidor; o servidor só é consultado para cruzadas não guardadas e, para contas, para o progresso.

### Key Entities

- **Cruzada guardada**: cópia local de uma cruzada (parte pública, solução e identificação da fonte e do dia), com data da última abertura, usada para jogar sem rede.
- **Gravação pendente**: o último estado de progresso de uma cruzada ainda não confirmado pelo servidor, ligado à conta que o gerou e com o momento em que foi feito; sobrevive à expiração da sessão e é apagada quando a pessoa sai da conta ou outra conta entra.
- **Progresso conhecido da conta**: o último progresso de uma cruzada guardada visto pela conta (servidor mais pendente), ligado à conta e apagado ao sair dela; usado para jogar sem rede.
- **Estado de conexão**: se o aparelho está com ou sem rede, que alimenta o aviso e o início do envio da fila.
- **Instalação**: se o site está instalado/aberto como aplicativo e se a instalação pode ser oferecida.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma cruzada aberta antes com rede abre e é concluída sem rede em 100% das tentativas, em celular e computador.
- **SC-002**: Com uma cruzada guardada, a pessoa vê o jogo pronto em até 2 segundos após abrir o site sem rede.
- **SC-003**: Depois de a rede voltar, 100% do progresso de conta feito offline aparece no servidor em até 2 minutos (cobre os até 90 s para o servidor gratuito acordar), sem ação da pessoa, e sem nunca apagar uma conclusão nem reduzir um progresso mais avançado.
- **SC-004**: Nenhuma letra digitada é perdida por causa da falta de rede, em nenhum ponto da partida.
- **SC-005**: Uma pessoa instala o site e o abre pelo ícone em até 3 toques a partir do navegador, nos navegadores que permitem instalar.
- **SC-006**: Baixar as cruzadas de hoje de todas as fontes termina com um resumo claro em até 30 segundos em rede comum.
- **SC-007**: A tela de erro padrão do navegador por falta de rede nunca aparece em páginas do site já visitadas.

## Assumptions

- O site continua sem exigir sessão; o modo offline vale para visitantes e contas, e só contas têm fila de envio.
- "Cruzadas já baixadas" significa as que a pessoa abriu antes ou baixou pelo botão da História 4; o limite de cruzadas guardadas é de 60, descartando as de abertura mais antiga.
- Entrar, cadastrar, recuperar senha, verificar e-mail e a página de estado do servidor continuam exigindo rede; só mostram aviso claro quando ela falta.
- A solução já viaja no payload da cruzada para visitantes e contas (princípio VI da constituição); guardá-la no aparelho não amplia essa exposição, e o cache guarda só o necessário para jogar (princípio VIII).
- Não há mudança nas regras de salvamento do servidor; a fila reaproveita os mesmos endpoints, e o contrato com o servidor não muda (compatível com a versão anterior da outra parte).
- Não há notificações push nem sincronização em segundo plano com o site fechado: o envio da fila acontece com o site aberto.
- O ícone e o nome do aplicativo seguem `docs/design.md`; novos arquivos de ícone são parte da feature.
- A coleta de cruzadas pelo servidor (`puzzles collect`) e as fontes não mudam.
