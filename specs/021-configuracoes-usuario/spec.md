# Feature Specification: Configurações do usuário

**Feature Branch**: `feat/021-configuracoes-usuario`

**Created**: 2026-10-21

**Status**: Draft

## Clarifications

### Session 2026-10-21

- Q: No primeiro login num aparelho com configurações locais, qual vence? → A: As do aparelho sobem para a conta só se a conta nunca salvou configurações; caso contrário, vencem as da conta.
- Q: Ao sair da conta, quais configurações valem no aparelho? → A: As da conta continuam no aparelho, como configurações de visitante.
- Q: O botão de tema do cabeçalho continua? → A: Não; o tema vai para dentro da modal e a engrenagem ocupa o lugar do botão.
- Q: Os limites de ajuda têm opção sem limite? → A: Sim, cada limite (letras e palavras) pode ser "sem limite", de forma independente (FR-008a, FR-008b).
- Q: Como escolher o tema na modal? → A: Por ícones (sol, lua, automático), com uma animação de transição ao trocar (FR-007a a FR-007d). _Substituída pela resposta seguinte sobre o controle de tema: botão único._
- Q: As configurações estão preparadas para mais cruzadas? → A: Sim: opções vindas da lista de fontes, botões até 3 e lista acima disso, cruzada padrão desconhecida aceita pelo servidor e tratada como padrão pelo site, aviso com o nome da cruzada (FR-012 a FR-012b, FR-013).
- Q: Como deve ser o controle de tema na modal e o que deve se animar na troca? → A: Um único botão com ícone que alterna claro → escuro → automático a cada clique; o ícone se transforma no do novo tema e a tela troca com a animação a partir do botão.

**Input**: User description: "Quero poder salvar configurações do usuário, por exemplo o tema que ele escolheu, quantidade máxima de ajuda (padrão 4 e 2), se ele quer que ao preencher uma palavra riscar a dica apenas quando acerta ou não, qual é a cruzada padrão dele, ao entrar qual calendário vai aparecer primeiro e uma opção se marcado em vez de ir para o calendário vai direto para o jogo que ele escolheu como padrão. Para o frontend, criar no header com ícone de engrenagem o settings, ao clicar abre a modal para poder configurar, não esquecer de colocar o tooltip. A configuração de riscar ao acertar, quando estiver desligada, deve apenas riscar e não colocar o fundo verde com o check. localStorage pode ser para todos, mas quem estiver logado precisa salvar; cruzada padrão é melhor (uma escolha só para fonte padrão e calendário inicial). Fora: verificar automaticamente, teclado na tela e opções de calendário."

## Contexto

Hoje algumas escolhas já ficam guardadas no aparelho, cada uma num lugar: o tema (botão no cabeçalho), a fonte da aba do calendário (feature 015), o tamanho do tabuleiro e a largura do calendário (feature 011). Os limites de ajuda (4 letras e 2 palavras por cruzada) são fixos na publicação do site, e a dica da lista só fica riscada, com fundo de sucesso e visto, quando a palavra está certa (features 016, 017 e 019); a feature 016 deixou essa regra isolada justamente para virar preferência.

Esta feature junta essas escolhas num único conjunto de **configurações**, aberto por uma engrenagem no cabeçalho, e acrescenta: limites de ajuda escolhidos pela pessoa, o modo de riscar a dica, a cruzada padrão e a opção de ir direto ao jogo ao entrar. As configurações ficam no aparelho para todos; para quem tem conta elas também ficam salvas na conta, valendo em outro aparelho.

Esta feature acrescenta um segundo modo de riscar ao FR-006 da feature 016 e torna configurável o limite de ajudas da feature 010; os padrões continuam os de hoje, então quem não abrir as configurações não percebe mudança.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir as configurações e mudar o jogo (Priority: P1)

A pessoa clica na engrenagem do cabeçalho (o tooltip "Configurações" diz o que ela faz), a modal abre e ela ajusta o tema, os limites de ajuda e o modo de riscar. Cada mudança vale na hora, sem botão de salvar e sem recarregar, e continua valendo nas próximas visitas neste aparelho.

**Why this priority**: É a entrada de todas as configurações e entrega sozinha as preferências de jogo pedidas (tema, ajudas e riscar).

**Independent Test**: Como visitante, abrir a engrenagem, trocar o tema para escuro, o limite de letras para 6 e desligar "riscar só quando acerta"; jogar uma palavra errada e ver a dica riscada sem fundo verde; recarregar e conferir que tudo continua.

**Acceptance Scenarios**:

1. **Given** qualquer tela com cabeçalho (calendário ou jogo), **When** a pessoa passa o mouse ou chega com o teclado na engrenagem, **Then** aparece o tooltip "Configurações", que também é o nome lido pelo leitor de tela.
2. **Given** a engrenagem, **When** a pessoa a ativa (clique, Enter ou Espaço), **Then** a modal de configurações abre com o foco dentro dela; Esc ou o botão de fechar a fecham e o foco volta para a engrenagem.
3. **Given** a modal aberta, **When** a pessoa muda qualquer opção, **Then** a mudança vale na hora na tela por trás e fica guardada, sem botão "Salvar".
4. **Given** "riscar só quando acerta" ligado (padrão), **When** uma palavra fica completa e certa, **Then** a dica fica como hoje: riscada, com fundo de sucesso e visto; uma palavra completa e errada fica sem marca.
5. **Given** "riscar só quando acerta" desligado, **When** uma palavra fica completa, certa ou errada, **Then** a dica fica só riscada, sem fundo de sucesso e sem visto; ao apagar uma letra o risco some.
6. **Given** "riscar só quando acerta" desligado, **When** o leitor de tela chega numa dica riscada, **Then** ele ouve que a palavra está preenchida, não que está resolvida.
7. **Given** o limite de letras mudado de 4 para 6, **When** a pessoa usa ajudas numa cruzada, **Then** ela pode revelar até 6 letras naquela cruzada; o mesmo vale para o limite de palavras.
7a. **Given** o limite de letras em "sem limite", **When** a pessoa revela letras numa cruzada, **Then** a ajuda de letra nunca se esgota e o contador mostra que não há limite; a ajuda de palavra continua com o próprio limite.
8. **Given** uma partida aberta com 3 letras já reveladas, **When** a pessoa reduz o limite de letras para 2, **Then** as letras já reveladas continuam e a ajuda de letra fica esgotada; nada é desfeito.
9. **Given** a modal com "Restaurar padrões", **When** a pessoa aciona o botão (sem diálogo de confirmação), **Then** todas as configurações voltam ao padrão na hora.
10. **Given** a modal aberta no tema claro (botão com o sol), **When** a pessoa clica no botão de tema, **Then** o sol se transforma em lua, a tela passa ao tema escuro numa animação que parte do botão e a pessoa pode continuar mexendo na modal durante a animação; um novo clique leva a automático e o seguinte de volta a claro.
11. **Given** o aparelho configurado para reduzir movimento, **When** a pessoa troca o tema, **Then** o tema muda sem a animação.

---

### User Story 2 - Cruzada padrão e ir direto ao jogo (Priority: P2)

A pessoa escolhe a cruzada padrão (O Globo ou Cruzada Online). O calendário abre nessa aba. Se ela marcar "Ir direto ao jogo", ao entrar no site ela cai direto na cruzada de hoje dessa fonte, em vez do calendário.

**Why this priority**: Atalho para quem joga todo dia a mesma cruzada; depende da modal da história 1.

**Independent Test**: Escolher Cruzada Online como padrão e marcar "Ir direto ao jogo"; abrir o endereço raiz do site e cair no jogo de hoje da Cruzada Online; voltar ao calendário pelo link do cabeçalho e ver a aba Cruzada Online selecionada.

**Acceptance Scenarios**:

1. **Given** a cruzada padrão Cruzada Online, **When** a pessoa abre o calendário, **Then** a aba Cruzada Online está selecionada.
2. **Given** "Ir direto ao jogo" desligado (padrão), **When** a pessoa abre o endereço raiz, **Then** vê o calendário, como hoje.
3. **Given** "Ir direto ao jogo" ligado e a cruzada de hoje da fonte padrão disponível e não concluída, **When** a pessoa abre o endereço raiz, **Then** cai direto no jogo dessa cruzada.
4. **Given** "Ir direto ao jogo" ligado e a cruzada de hoje já concluída, ou sem cruzada hoje, ou com a fonte fora do ar, **When** a pessoa abre o endereço raiz, **Then** vê o calendário com um aviso curto explicando por que não foi ao jogo.
5. **Given** "Ir direto ao jogo" ligado, **When** a pessoa entra por um link direto (um dia do calendário, a página de login, uma cruzada específica) ou volta ao calendário pelo cabeçalho, **Then** o atalho não age; ele só vale ao abrir o endereço raiz.
6. **Given** a pessoa mudou a aba do calendário sem mexer nas configurações, **When** volta mais tarde, **Then** o calendário abre na cruzada padrão, não na última aba vista. [Ver Assumptions.]

---

### User Story 3 - Configurações salvas na conta (Priority: P3)

Quem tem conta muda as configurações num aparelho e, ao entrar em outro aparelho, encontra as mesmas configurações.

**Why this priority**: Pedido explícito ("quem estiver logado precisa salvar"), mas o site já entrega valor com as configurações só no aparelho (histórias 1 e 2).

**Independent Test**: Logado no navegador A, mudar o tema e o limite de ajudas; entrar com a mesma conta no navegador B (sem dados locais) e ver as mesmas configurações.

**Acceptance Scenarios**:

1. **Given** uma pessoa logada, **When** ela muda uma configuração, **Then** a mudança vale na hora, fica no aparelho e é salva na conta.
2. **Given** a mesma conta em outro aparelho, **When** a pessoa entra, **Then** as configurações da conta passam a valer ali.
3. **Given** a rede fora do ar ou um erro do servidor ao salvar, **When** a pessoa muda uma configuração, **Then** a mudança vale no aparelho, aparece um aviso que não bloqueia nada e o envio é tentado de novo depois.
4. **Given** dois aparelhos com mudanças em momentos diferentes, **When** ambos salvam, **Then** vale a mudança mais recente; uma mudança mais antiga que chega depois é ignorada.
5. **Given** um visitante, **When** ele muda configurações, **Then** nada é enviado ao servidor e a modal mostra que as configurações ficam só neste aparelho, com link para entrar.
6. **Given** uma pessoa que faz login num aparelho que já tem configurações locais, **When** o login termina, **Then** se a conta nunca salvou configurações, as do aparelho passam a ser as da conta; se a conta já tem configurações, elas substituem as do aparelho.
7. **Given** uma pessoa logada, **When** ela sai da conta, **Then** as configurações da conta continuam valendo no aparelho, agora como configurações de visitante (só no aparelho). Configurações são preferências, não progresso, então isso não contraria a separação da feature 013.
8. **Given** uma pessoa logada que mudou uma configuração e fechou a aba antes de a mudança chegar à conta, **When** ela abre o site de novo, já logada, **Then** a mudança do aparelho continua valendo e é enviada à conta, porque é mais recente que a da conta (FR-020c).

---

### Edge Cases

- **Armazenamento do aparelho indisponível** (modo privado, dados bloqueados): o site abre com os padrões, a modal funciona e as mudanças valem até fechar a aba; nenhuma tela quebra. Para quem tem conta, as configurações da conta ainda valem.
- **Valor inválido ou desconhecido guardado** (editado à mão, versão antiga ou mais nova do site): cada configuração inválida volta ao padrão sozinha; as válidas continuam.
- **Escolhas antigas**: o tema, a fonte do calendário, o tamanho do tabuleiro e a largura do calendário já escolhidos antes desta feature continuam valendo depois dela, sem a pessoa refazer nada.
- **Várias abas abertas**: uma mudança numa aba passa a valer nas outras abas abertas do mesmo aparelho, e uma aba antiga não desfaz a mudança ao salvar outra coisa.
- **Modal aberta durante a partida**: o relógio pausa enquanto a modal está aberta e volta ao fechar, como na pausa que já existe; nada da partida se perde.
- **Partida em modo leitura** (concluída): mudar o modo de riscar muda a aparência das dicas na hora; não muda tempo, conclusão nem recorde.
- **Fonte padrão que deixar de existir** (removida numa versão futura) **ou ainda desconhecida** (site e API em versões diferentes): cai na primeira fonte disponível, e o valor guardado na conta continua até a pessoa escolher outra (FR-012b).
- **Mais de 3 fontes**: a escolha da cruzada padrão vira lista de opções (FR-012a); o calendário segue o limite de 1 a 3 abas da feature 015, que fica para uma feature própria quando a quarta fonte chegar.
- **Cliques seguidos no botão de tema**: cada clique avança um tema; o tema final é o do último clique, sem animações empilhadas nem tela ou ícone presos num estado intermediário.
- **Automático e o tema do aparelho**: em "automático" a tela segue o aparelho, mas o botão mostra o ícone de automático, não o sol ou a lua; se o aparelho mudar de claro para escuro, a tela troca sem animação e o ícone não muda.
- **Celular de 360 px**: a modal cabe na largura, rola por dentro e não causa rolagem lateral da página.
- **Sessão que expira** enquanto a pessoa muda configurações: a mudança fica no aparelho e o aviso de sessão segue a regra existente (feature 013).

## Requirements *(mandatory)*

### Functional Requirements

**Entrada e modal**

- **FR-001**: O cabeçalho MUST mostrar, em todas as telas que o têm, um botão com ícone de engrenagem que abre a modal de configurações.
- **FR-002**: A engrenagem MUST ter um tooltip "Configurações" que aparece ao passar o mouse e ao receber foco pelo teclado, some com Esc ou ao sair, e corresponde ao nome acessível do botão.
- **FR-003**: A modal MUST prender o foco enquanto aberta, fechar com Esc e pelo botão de fechar, devolver o foco à engrenagem ao fechar e funcionar em tema claro e escuro e em telas a partir de 360 px.
- **FR-004**: Toda mudança na modal MUST valer na hora na tela por trás e ser guardada sem uma ação de salvar.
- **FR-005**: A modal MUST ter "Restaurar padrões", que volta todas as configurações ao padrão.
- **FR-006**: Abrir a modal durante uma partida MUST pausar o relógio, que volta ao fechar.

**Configurações**

- **FR-007**: **Tema**: auto, claro ou escuro (padrão auto), escolhido só na modal. O botão de tema do cabeçalho MUST ser removido; a engrenagem ocupa o lugar dele.
- **FR-007a**: A escolha do tema MUST ser feita por **um único botão com ícone** na modal, que mostra o tema em vigor (sol para claro, lua para escuro, um ícone de "automático" para seguir o aparelho) e, a cada clique, Enter ou Espaço, passa ao próximo na ordem claro → escuro → automático → claro. O nome acessível e o tooltip MUST dizer o tema atual e o próximo (por exemplo "Tema: claro. Mudar para escuro"), e a troca MUST ser anunciada ao leitor de tela.
- **FR-007b**: A cada troca, o ícone MUST se transformar no do novo tema (por exemplo, o sol vira lua) e a tela MUST passar do tema antigo ao novo numa animação que parte do botão, ambos com duração entre 300 e 700 ms.
- **FR-007c**: A animação MUST NOT bloquear cliques nem teclado, MUST NOT mover nada de lugar e MUST acontecer só quando a pessoa troca o tema na modal; abrir o site, restaurar padrões, sincronizar de outra aba ou da conta e a mudança do tema do aparelho no modo automático trocam o tema sem animação.
- **FR-007d**: Quem pediu ao aparelho para reduzir movimento MUST ver a troca de tema e do ícone sem animação (instantânea ou num esmaecimento curto). Navegador sem suporte à animação MUST trocar o tema na hora, sem erro.
- **FR-008**: **Limite de ajudas**: um número de letras e um de palavras que a pessoa pode revelar por cruzada, inteiros de 0 a 99, com padrão igual aos limites atuais do site (4 e 2). O limite vale para todas as cruzadas, inclusive as já começadas.
- **FR-008a**: Cada um dos dois limites MUST ter também a opção **sem limite**, escolhida de forma independente (por exemplo, letras sem limite e palavras limitadas a 2). Sem limite, a ajuda correspondente nunca se esgota, e onde hoje aparece quantas ajudas restam MUST aparecer que não há limite, em vez de um número.
- **FR-008b**: Trocar de "sem limite" para um número MUST seguir FR-009: ajudas já usadas continuam, e a ajuda fica esgotada se o uso já passou do novo número. "Restaurar padrões" volta os dois limites a 4 e 2.
- **FR-009**: Reduzir um limite abaixo do já usado numa cruzada MUST NOT desfazer ajudas; a ajuda correspondente só fica esgotada.
- **FR-010**: **Riscar só quando acerta** (padrão ligado): ligado, a dica da lista fica como hoje (riscada, fundo de sucesso e visto quando a palavra está completa e certa). Desligado, a dica fica **só riscada** quando a palavra está completa, certa ou errada, sem fundo de sucesso e sem visto, e o texto para leitor de tela diz que está preenchida, não resolvida.
- **FR-011**: Mudar o modo de riscar MUST NOT mudar a altura nem a quebra de linha das dicas, nem mexer na barra da dica ativa, que nunca é riscada.
- **FR-012**: **Cruzada padrão**: uma das fontes disponíveis (padrão: a primeira, O Globo). Ela decide a aba com que o calendário abre. As opções vêm da lista de fontes do site, sem nome de fonte fixo na modal: uma fonte nova aparece sem mudar a tela.
- **FR-012a**: Com até 3 fontes, a escolha MUST ser botões lado a lado de opção única; com mais de 3, MUST ser uma lista de opções (uma por linha). Nos dois casos a escolha MUST caber em 360 px sem rolagem lateral e ser operável por teclado.
- **FR-012b**: A cruzada padrão salva na conta MUST ser aceita pelo servidor mesmo quando ele ainda não conhece aquela fonte (site mais novo que a API), e uma cruzada padrão recebida que o site não conhece (API mais nova que o site, ou fonte removida) MUST cair na primeira fonte disponível, sem apagar o valor guardado na conta.
- **FR-013**: **Ir direto ao jogo** (padrão desligado): ligado, abrir o endereço raiz do site MUST levar à cruzada de hoje da cruzada padrão quando ela existe (salva ou buscável) e não foi concluída; nos outros casos MUST mostrar o calendário com aviso curto do motivo, que cita o nome da cruzada (por exemplo "Cruzada Online: a cruzada de hoje já foi concluída.").
- **FR-014**: O atalho de FR-013 MUST valer só ao abrir o endereço raiz, nunca em links diretos nem na volta ao calendário pelo cabeçalho.
- **FR-015**: O tamanho do tabuleiro e a largura do calendário MUST continuar como hoje (ajustados pelas alças, com "Tamanho padrão"); passam a ser guardados junto com as demais configurações e voltam ao padrão em "Restaurar padrões".

**Guarda no aparelho**

- **FR-016**: Todas as configurações MUST ficar guardadas no aparelho, para visitantes e para quem tem conta.
- **FR-017**: As escolhas feitas antes desta feature (tema, fonte do calendário, tamanho do tabuleiro, largura do calendário) MUST continuar valendo depois da atualização.
- **FR-018**: Uma configuração guardada inválida ou desconhecida MUST voltar ao padrão sem afetar as válidas; armazenamento indisponível MUST NOT impedir o uso do site.
- **FR-019**: Uma mudança feita numa aba MUST passar a valer nas outras abas abertas do mesmo aparelho.

**Guarda na conta**

- **FR-020**: Para quem tem conta, as configurações MUST também ser salvas na conta e valer nos outros aparelhos em que a pessoa entrar.
- **FR-020a**: No login, se a conta nunca salvou configurações, as do aparelho MUST ser salvas na conta; se a conta já tem configurações, elas MUST substituir as do aparelho.
- **FR-020b**: Ao sair da conta, as configurações em vigor MUST continuar valendo no aparelho, como configurações de visitante; nada é apagado.
- **FR-020c**: Ao abrir o site já logado (sem ser logo após o login), MUST valer a versão mais recente entre a do aparelho e a da conta: se a do aparelho for mais nova (por exemplo, uma mudança que não chegou à conta antes de fechar a aba), ela MUST ser enviada à conta, não descartada.
- **FR-021**: Cada pessoa MUST ler e alterar só as próprias configurações; visitantes MUST NOT enviar configurações ao servidor.
- **FR-022**: Entre duas mudanças da mesma conta, MUST valer a mais recente segundo o momento em que foi feita no aparelho.
- **FR-023**: Falha ao salvar na conta MUST ser um aviso não bloqueante, com nova tentativa depois; nunca impede jogar nem usar a modal.
- **FR-024**: Salvar configurações na conta MUST ter limite de tamanho e de frequência por endereço (valores em `research.md`, R6).
- **FR-025**: O site anterior a esta feature MUST continuar funcionando com a API nova, e o site novo MUST funcionar com a API anterior (configurações só no aparelho até a API ser atualizada).
- **FR-026**: Excluir uma conta MUST excluir as configurações dela.

**Visitante**

- **FR-027**: Para visitante, a modal MUST dizer que as configurações ficam só neste aparelho, com link para entrar.

### Key Entities

- **Configurações**: o conjunto de escolhas de uma pessoa: tema, limite de letras, limite de palavras, riscar só quando acerta, cruzada padrão, ir direto ao jogo, tamanho do tabuleiro, largura do calendário. Cada uma tem um padrão. Guardada no aparelho; para quem tem conta, também na conta, com o momento da última mudança.
- **Modo de riscar**: "ao acertar" (riscado, fundo de sucesso e visto) ou "ao preencher" (só riscado).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa encontra e muda qualquer configuração em até 3 interações a partir de qualquer tela com cabeçalho (engrenagem, controle, valor).
- **SC-002**: 100% das mudanças valem na tela por trás em menos de 1 segundo, sem recarregar a página.
- **SC-003**: Depois de recarregar ou voltar ao site, 100% das configurações estão como a pessoa deixou neste aparelho.
- **SC-004**: Logado em outro aparelho, a pessoa vê as configurações da conta em até 5 segundos após entrar.
- **SC-005**: Quem não abre as configurações não percebe nenhuma mudança de comportamento em relação à versão anterior (mesmos padrões e as escolhas antigas preservadas).
- **SC-006**: A modal e a engrenagem passam na checagem automática de acessibilidade sem violações, nos temas claro e escuro, e a modal não causa rolagem lateral numa tela de 360 px.
- **SC-007**: Com "Ir direto ao jogo" ligado, abrir o endereço raiz leva ao jogo de hoje (ou ao calendário com o aviso) sem passar visualmente pelo calendário quando o jogo está disponível.
- **SC-008**: Falhas de rede ou do servidor ao salvar configurações nunca interrompem uma partida.
- **SC-009**: A troca de tema pela modal termina em menos de 1 segundo, com a animação visível em quem não pediu redução de movimento e nenhuma em quem pediu.

## Assumptions

- "Quem estiver logado precisa salvar" foi entendido como salvar na conta, além do aparelho, para valer em outros aparelhos.
- Cruzada padrão e calendário inicial são uma escolha só. A aba do calendário pode ser trocada à vontade durante a visita, mas não muda a cruzada padrão; o calendário reabre na padrão.
- Os limites de ajuda contam por cruzada, como hoje; o intervalo 0 a 99 é o mesmo aceito hoje na configuração do site, e os padrões vêm dela. Além do número, cada limite aceita "sem limite" (FR-008a).
- Usar ajuda, com ou sem limite, não muda tempo, conclusão nem recorde, como hoje.
- Ajudas já usadas continuam guardadas como hoje; esta feature só muda o limite.
- O tamanho do tabuleiro e a largura do calendário continuam sendo ajustados pelas alças (feature 011), não na modal; só a guarda muda.
- A prévia visual dos dois modos de riscar dentro da modal fica fora desta feature.
- Fora do escopo: verificar erros automaticamente, forçar teclado na tela, opções de calendário (primeiro dia da semana, esconder concluídos), pular células preenchidas, ir para a próxima palavra ao completar, mostrar/esconder relógio, pausar ao perder o foco, tamanho da letra das dicas, redução de movimento, exportar/importar configurações. Ficam como ideias futuras.
- O relógio pausado pela modal segue a mesma regra de tempo da pausa atual.
- "Animação legal de transição" foi entendida como a troca de tema (o ícone se transforma e o novo tema se espalha pela tela a partir do botão), não como animação ao abrir ou fechar a modal. A modal pode ter uma entrada discreta, mas isso não é requisito.
- A redução de movimento vale só para a animação de tema desta feature; o pedido de "redução de movimento" como configuração própria continua fora do escopo.
