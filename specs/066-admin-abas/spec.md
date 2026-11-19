# Feature Specification: Administração em abas seguindo o design system

**Feature Branch**: `feat/066-admin-abas`

**Created**: 2026-11-19

**Status**: Draft

**Input**: User description: issue #179 "[Feature]: refazer /admin com abas seguindo o design system". A tela `/admin` empilha "Fontes de cruzadas" e "Fontes geradas" numa coluna só, sem moldura; a parte de fontes geradas (064) ficou fora do design system (062): grade num campo numérico comum, palavras em texto corrido, chamadas restantes e motivo do bloqueio como dica cinza, comando de descarte com crases literais, "Descartar" solto sem zona de perigo, botões de salvar diferentes nas duas partes e espaços vazios reservados para avisos. Objetivo: refazer `/admin` com abas coladas no painel, uma aba "Fontes" e uma por fonte gerada, usando só componentes do design system. O contrato visual é o mockup `docs/mockups/design-system.html` com o diff do issue (telas `admin*` e `admin-casa*`), aplicado no primeiro commit.

## Clarifications

### Session 2026-11-19

- Q: O resumo da "Cruzada de hoje" mostra "Dificuldade", mas a API da administração não informa a dificuldade da cruzada de hoje. De onde vem o valor? → A: A API passa a informar a dificuldade da cruzada de hoje num campo opcional (FR-024, FR-026).
- Q: O mockup escreve "Média", mas o rótulo que o jogador vê é "Médio". Qual vale? → A: "Médio"; o mockup é corrigido no mesmo PR.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abas na Administração (Priority: P1)

A pessoa administradora abre `/admin` e vê o título "Administração" seguido de abas coladas no painel, no mesmo padrão das abas de fonte do calendário: "Fontes" (legenda "ordem e visibilidade") e uma aba por fonte gerada (hoje "Casa", legenda "fonte gerada"). Cada aba mostra só a sua parte. A aba escolhida fica no endereço, para recarregar ou compartilhar o link e voltar à mesma aba. Trocar de aba não perde o que foi editado e não salvo em nenhuma delas.

**Why this priority**: É a estrutura da nova tela; as outras histórias vivem dentro dela.

**Independent Test**: Entrar como administrador, abrir `/admin`, conferir as abas, trocar com mouse e teclado, conferir o endereço e recarregar.

**Acceptance Scenarios**:

1. **Given** uma conta administradora, **When** abre `/admin`, **Then** vê um único título "Administração", as abas "Fontes" e uma por fonte gerada, e a aba "Fontes" escolhida.
2. **Given** `/admin?aba=casa`, **When** a página abre, **Then** a aba "Casa" está escolhida.
3. **Given** `/admin?aba=xyz` (valor desconhecido) ou um valor de fonte gerada que não existe, **When** a página abre, **Then** a aba "Fontes" está escolhida.
4. **Given** o foco numa aba, **When** a pessoa usa setas, Home e End, **Then** o foco e a escolha andam entre as abas como nas abas de fonte do calendário, e só a aba escolhida recebe foco com Tab.
5. **Given** a aba "Fontes" com uma ordem alterada e não salva, **When** a pessoa vai para "Casa", muda a grade e volta para "Fontes", **Then** a ordem alterada continua lá; voltando a "Casa", a grade alterada também continua.
6. **Given** a troca de aba, **When** a aba muda, **Then** o endereço passa a refletir a aba escolhida sem criar uma tela nova no histórico a cada troca.
7. **Given** uma tela de celular (390 px), **When** a página abre, **Then** as abas ficam numa linha só e rolam para o lado, como as de fonte, sem rolagem lateral da página.
8. **Given** o calendário, **When** suas abas de fonte aparecem, **Then** continuam visualmente e no comportamento iguais a antes.

---

### User Story 2 - Aba Fontes no padrão do design system (Priority: P1)

Na aba "Fontes" fica o que já existe para ordenar e esconder fontes (060), com a aparência do design system: título "Fontes de cruzadas", texto explicativo que não fala mais nos cartões de "Hoje", estado de cada fonte num selo ("✓ Visível" ou "Escondida") e botões com texto "Salvar" e "Descartar alterações".

**Why this priority**: Une as duas partes da tela num visual só; o comportamento já existe.

**Independent Test**: Abrir a aba "Fontes", esconder uma fonte, reordenar, conferir os selos e os botões, salvar e descartar.

**Acceptance Scenarios**:

1. **Given** a aba "Fontes", **When** ela abre, **Then** o painel tem o título "Fontes de cruzadas" e o texto "A ordem vale para as abas do calendário; a primeira fonte visível abre por padrão. Uma fonte escondida some das listas para todos, mas guarda tudo e pode voltar."
2. **Given** uma fonte visível e outra escondida, **When** a lista aparece, **Then** a primeira tem o selo "✓ Visível" (estado ok) e a segunda o selo "Escondida" (estado neutro).
3. **Given** nenhuma alteração, **When** a lista aparece, **Then** "Salvar" (primário, com texto) está desligado e "Descartar alterações" não aparece.
4. **Given** uma alteração, **When** ela é feita, **Then** "Salvar" liga e aparece "Descartar alterações" (secundário, com texto).
5. **Given** a lista, **When** a pessoa arrasta pela alça, usa o teclado (Espaço pega, setas movem, Espaço solta, Esc cancela) ou ouve os anúncios do leitor de tela, **Then** tudo funciona como hoje (060).

---

### User Story 3 - Configuração da fonte gerada (Priority: P1)

Na aba de uma fonte gerada, o painel tem o nome da fonte como título e o texto "Fonte gerada. O jogador vê só o nome da fonte e a dificuldade." A seção "Configuração" usa o Contador do design system para o tamanho da grade (− `N × N` +) e opções para a dificuldade (Fácil, Médio, Difícil). "Salvar configuração" tem texto; "Descartar alterações" só aparece com alterações; o resultado de salvar aparece ao lado do botão, sem espaço vazio reservado embaixo.

**Why this priority**: É a parte que hoje está fora do design system e mais incomoda no uso.

**Independent Test**: Abrir a aba "Casa", usar o Contador até os limites, trocar a dificuldade, salvar e descartar.

**Acceptance Scenarios**:

1. **Given** a grade em 9, **When** a seção aparece, **Then** o botão de diminuir está desligado; em 15, o de aumentar está desligado.
2. **Given** a grade em 11, **When** a pessoa aperta "+", **Then** o Contador mostra `12 × 12`, "Salvar configuração" liga e aparece "Descartar alterações".
3. **Given** grade e dificuldade alteradas, **When** a pessoa aperta "Descartar alterações", **Then** os valores voltam aos salvos e o botão some.
4. **Given** alterações, **When** a pessoa salva com sucesso, **Then** aparece, na mesma linha do botão, o aviso "Salvo. Vale a partir da próxima cruzada gerada."; antes de salvar não existe área vazia reservada para ele.
5. **Given** uma falha ao salvar, **When** a resposta chega, **Then** o aviso de erro aparece no mesmo lugar e o rascunho continua.
6. **Given** um leitor de tela, **When** a pessoa usa o Contador, **Then** os botões se anunciam como "Diminuir a grade" e "Aumentar a grade" e o valor atual é lido.

---

### User Story 4 - Cruzada de hoje e descarte (Priority: P2)

Abaixo da configuração, separada por uma linha, a seção "Cruzada de hoje" mostra um resumo numérico (Grade, Dificuldade, Palavras, Chamadas restantes `n de 3`) e duas tabelas, Horizontais e Verticais, com `Nº`, `Resposta` e `Dica`. No fim, uma zona de perigo "Descartar a cruzada de hoje" explica o que acontece e tem o botão "Descartar". Quando a cruzada está em uso, um selo de alerta diz o motivo e "Descartar" fica desligado. Depois de descartar, o aviso traz o comando para gerar outra num campo só de leitura com botão "Copiar".

**Why this priority**: Revisar e descartar a cruzada é menos frequente que configurar, mas é o que hoje está mais difícil de ler.

**Independent Test**: Com uma cruzada gerada hoje, abrir a aba, conferir resumo e tabelas, descartar confirmando no diálogo e copiar o comando; repetir com a cruzada usada por uma conta e por um x1.

**Acceptance Scenarios**:

1. **Given** uma cruzada gerada hoje, **When** a seção aparece, **Then** mostra o resumo com Grade, Dificuldade, Palavras e Chamadas restantes (`n de 3`) e as tabelas Horizontais e Verticais com número, resposta e dica de cada palavra.
2. **Given** nenhuma cruzada hoje, **When** a seção aparece, **Then** mostra só o resumo de chamadas restantes e "Sem cruzada hoje.", sem tabelas nem zona de perigo.
3. **Given** chamadas restantes acima de zero, **When** a zona de perigo aparece, **Then** o texto diz "Ela sai do site para todos. A próxima coleta gera outra."; com zero chamadas, "Ela sai do site para todos. As chamadas de hoje acabaram: o dia ficará sem cruzada."
4. **Given** uma conta que já começou a cruzada, **When** a zona de perigo aparece, **Then** há um selo de alerta "Uma conta já começou esta cruzada." e "Descartar" está desligado; com um x1, o selo diz "Um x1 usa esta cruzada.".
5. **Given** "Descartar" ligado, **When** a pessoa o aperta, **Then** a confirmação abre no diálogo atual; cancelar não muda nada.
6. **Given** a confirmação, **When** o descarte dá certo, **Then** a seção passa ao estado sem cruzada e aparece o aviso "Cruzada descartada. A próxima coleta gera outra. Para gerar agora:" seguido do comando `gh workflow run collect.yml` num campo só de leitura (rótulo acessível "Comando para gerar agora") com o botão "Copiar"; o comando nunca aparece entre crases.
7. **Given** "Copiar", **When** a pessoa o aperta, **Then** o comando vai para a área de transferência, como no padrão "Código e link" do design system, e a tela confirma "Comando copiado."; se o navegador recusar, diz "Não foi possível copiar. Selecione o comando.".
8. **Given** nenhum descarte feito, **When** a aba aparece, **Then** não existe área vazia reservada para o aviso no fim do painel.
9. **Given** o descarte recusado porque a cruzada passou a ser usada entre abrir a tela e confirmar, **When** a resposta chega, **Then** a tela mostra o motivo do bloqueio como em 064 e nada é descartado.
10. **Given** zero chamadas restantes, **When** o descarte dá certo, **Then** o aviso diz "Cruzada descartada. As chamadas de hoje acabaram: o dia ficará sem cruzada.", sem campo de comando.

---

### Edge Cases

- **Nenhuma fonte gerada** (lista vazia): só existe a aba "Fontes"; `?aba=casa` abre "Fontes".
- **Muitas fontes geradas**: as abas continuam numa linha só e rolam para o lado (computador e celular); a aba escolhida pelo endereço fica à vista ao abrir.
- **Lista de fontes geradas indisponível** (falha da chamada que lista as fontes geradas): a aba "Fontes" funciona; as abas de fontes geradas não aparecem e um aviso de erro diz que as fontes geradas não puderam ser carregadas; um `?aba=` de fonte gerada abre "Fontes".
- **Aviso de salvar no celular**: em tela estreita o aviso ao lado do botão quebra para a linha de baixo e empurra a "Cruzada de hoje" uns 50 px. Isso é aceito: acontece só como resposta a um clique em "Salvar configuração", nunca enquanto se digita, e o aviso continua sem espaço reservado.
- **Aba trocada com o diálogo de descarte aberto**: não acontece; o diálogo é modal e precisa ser fechado antes.
- **Visitante e conta comum** em `/admin` (com ou sem `?aba=`): veem a página não encontrada, sem abas.
- **Sem rede**: a tela mostra o aviso de que precisa de conexão, como hoje.
- **Sessão encerrada** enquanto a tela está aberta: o comportamento atual (060/064) não muda.

## Requirements *(mandatory)*

### Functional Requirements

**Contrato visual**

- **FR-001**: O primeiro commit da feature MUST aplicar ao mockup `docs/mockups/design-system.html` exatamente o diff do issue #179 (telas `admin`, `admin-editando`, `admin-arrastando`, `admin-salvo`, `admin-erro`, `admin-casa`, `admin-casa-editando`, `admin-casa-salvo`, `admin-casa-bloqueada`, `admin-casa-descartada` no grupo "Administração"). A tela construída MUST seguir o mockup; qualquer divergência MUST mudar o mockup antes, no mesmo PR.
- **FR-002**: A tela MUST usar só componentes e padrões que já existem no design system (Aba de fonte, Painel, Selo de estado, Contador, Tabela, Resumo numérico, Zona de perigo, Aviso, Código e link, Diálogo, Botão).

**Abas**

- **FR-003**: `/admin` MUST mostrar um único título de página "Administração" seguido de abas coladas no painel: "Fontes" (legenda "ordem e visibilidade") e uma aba por fonte gerada, na ordem da lista de fontes geradas, com o nome da fonte e a legenda "fonte gerada".
- **FR-004**: As abas MUST seguir o padrão acessível de abas (lista de abas, aba, painel), com setas, Home e End movendo entre elas e só a aba escolhida no ciclo do Tab, com o mesmo comportamento das abas de fonte do calendário.
- **FR-005**: As abas da Administração e as abas de fonte do calendário MUST usar uma única peça de abas compartilhada; o calendário MUST continuar visualmente e no comportamento igual.
- **FR-006**: A aba escolhida MUST ficar no endereço como `?aba=<id>` (`fontes` para "Fontes", o identificador da fonte para uma fonte gerada). Sem `aba` ou com valor que não corresponde a uma aba existente, a tela MUST abrir "Fontes". Trocar de aba MUST atualizar o endereço substituindo a entrada atual do histórico.
- **FR-007**: Trocar de aba MUST preservar o rascunho não salvo de todas as abas enquanto a página estiver aberta; os painéis inativos ficam ocultos, não desmontados.
- **FR-008**: Em tela estreita as abas MUST ficar numa linha só com rolagem lateral própria, sem rolagem lateral da página, como as abas de fonte.

**Aba Fontes**

- **FR-009**: O painel "Fontes" MUST ter o título de seção "Fontes de cruzadas" e o texto do mockup, sem menção aos cartões de "Hoje".
- **FR-010**: Cada fonte MUST mostrar o estado num selo: "✓ Visível" (estado ok) ou "Escondida" (estado neutro).
- **FR-011**: As ações MUST ser botões com texto: "Salvar" (primário, desligado sem alterações) e "Descartar alterações" (secundário, presente só com alterações).
- **FR-012**: Ordenar por arrasto, ordenar por teclado, os anúncios ao leitor de tela, a regra de pelo menos uma fonte visível e os avisos de resultado MUST continuar como em 060.

**Aba de fonte gerada**

- **FR-013**: O painel MUST ter o nome da fonte como título de seção e o texto "Fonte gerada. O jogador vê só o nome da fonte e a dificuldade."
- **FR-014**: A seção "Configuração" MUST ter o tamanho da grade num Contador (− `N × N` +, rótulo "Tamanho da grade", dica "9 a 15, quadrada (N × N)"), com diminuir desligado em 9 e aumentar desligado em 15, e a dificuldade como escolha única entre Fácil, Médio e Difícil, com os mesmos rótulos que o jogador vê na atribuição.
- **FR-015**: "Salvar configuração" MUST ser primário com texto, desligado sem alterações; "Descartar alterações" MUST aparecer só com alterações e voltar aos valores salvos.
- **FR-016**: O aviso de resultado de salvar MUST aparecer na mesma linha dos botões (quebrando para baixo quando não couber) e MUST NOT reservar espaço vazio quando não há aviso.
- **FR-017**: A seção "Cruzada de hoje" MUST ficar separada da configuração por uma linha e, com cruzada, mostrar o resumo (Grade, Dificuldade, Palavras, Chamadas restantes `n de 3`) e duas tabelas, "Horizontais" e "Verticais", com colunas `Nº`, `Resposta` e `Dica`.
- **FR-018**: Sem cruzada hoje, a seção MUST mostrar só o resumo de chamadas restantes e "Sem cruzada hoje.".
- **FR-019**: Com cruzada, a seção MUST terminar numa zona de perigo "Descartar a cruzada de hoje" com o texto do que acontece (que muda quando as chamadas de hoje acabaram) e o botão "Descartar". Quando a cruzada está em uso, MUST aparecer um selo de alerta com o motivo ("Uma conta já começou esta cruzada." ou "Um x1 usa esta cruzada.") e "Descartar" MUST ficar desligado.
- **FR-020**: A confirmação do descarte MUST continuar no diálogo atual (064).
- **FR-021**: Depois de um descarte com chamadas restantes, o aviso MUST trazer o comando para gerar agora num campo só de leitura, com rótulo acessível e botão "Copiar", no padrão "Código e link"; sem chamadas restantes, o aviso MUST dizer que o dia ficará sem cruzada, sem comando. Nenhum texto MUST conter crases literais.
- **FR-022**: O aviso de descarte MUST aparecer só quando existe, sem área vazia reservada no fim do painel.

**Regras que continuam**

- **FR-023**: Visitante e conta comum MUST ver a página não encontrada em `/admin` com qualquer `aba`; sem rede, MUST ver o aviso de que a página precisa de conexão.
- **FR-024**: A única mudança na API MUST ser um campo opcional com a dificuldade da cruzada de hoje na resposta que lista as fontes geradas para a administração (sem rota nova, sem mudança de dados guardados). O site MUST mostrar "—" no cartão Dificuldade quando o campo faltar (API anterior) ou não puder ser determinado.
- **FR-025**: A tela MUST continuar sem violações automáticas de acessibilidade nos temas claro e escuro, no computador e no celular (390 px), e MUST ter um único título de página.
- **FR-026**: O cartão Dificuldade do resumo MUST mostrar a dificuldade com que a cruzada de hoje foi gerada, não a configuração atual (que pode ter mudado depois).

### Key Entities

- **Aba da Administração**: identificador usado no endereço (`fontes` ou o identificador de uma fonte gerada), nome visível e legenda. A lista vem da aba fixa "Fontes" mais as fontes geradas que a API já informa.
- **Cruzada de hoje de uma fonte gerada**: o que a administração já recebia (grade, palavras, se pode descartar e por quê) mais a dificuldade com que foi gerada (FR-026), que pode faltar.
- **Rascunho por aba**: alterações não salvas de cada aba (ordem e visibilidade das fontes; grade e dificuldade de cada fonte gerada), vivas só enquanto a página está aberta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: As telas `admin*` e `admin-casa*` construídas batem com o mockup nos dois temas, no computador e a 390 px, conferidas lado a lado; nenhuma divergência sem o mockup alterado no mesmo PR.
- **SC-002**: 100% dos elementos apontados no issue (campo numérico, texto corrido de palavras, dicas cinza de chamadas e bloqueio, crases literais, "Descartar" solto, botões de salvar diferentes, espaços vazios reservados) deixam de existir na tela.
- **SC-003**: Um link `/admin?aba=<fonte gerada>` abre direto essa aba em 100% das vezes; qualquer outro valor abre "Fontes".
- **SC-004**: Ida e volta entre abas, quantas vezes for, não perde nenhuma alteração não salva.
- **SC-005**: Todas as ações da tela (trocar aba, ordenar, ajustar grade e dificuldade, salvar, descartar, copiar) podem ser feitas só pelo teclado.
- **SC-006**: Na aba de fonte gerada, sem aviso na tela, a distância entre "Salvar configuração" e a "Cruzada de hoje" é a mesma de qualquer outra separação de seção (nenhum espaço reservado vazio).
- **SC-007**: As abas de fonte do calendário ficam iguais antes e depois (mesma aparência e mesmos testes passando).

## Assumptions

- A aba "Fontes" mantém, como no mockup, a área reservada para o aviso abaixo dos botões (060); só a aba de fonte gerada deixa de reservar espaço.
- O diff do mockup no issue #179 é a fonte de verdade para textos (exceto "Média", que vira "Médio" no mockup, ver Clarifications), ordem e estados; textos já existentes que o mockup não mostra (erros de salvar, anúncios do arrasto, textos do diálogo de descarte) continuam os atuais de 060 e 064.
- O identificador da aba "Fontes" no endereço é `fontes`; as fontes geradas usam seu identificador de fonte (`casa`). Trocar de aba substitui a entrada do histórico, para o botão Voltar sair da Administração em vez de passear entre abas.
- Pendência do mockup, decidida aqui: no celular, o aviso de salvar quebra a linha e desloca a "Cruzada de hoje" uns 50 px; o deslocamento é aceito porque só acontece depois de um clique, e a regra de não deslocar o layout vale para o jogo enquanto se digita.
- Pendência do mockup, decidida aqui: com muitas fontes geradas, as abas rolam para o lado também no computador, como as de fonte; não há menu de excesso.
- Se a lista de fontes geradas falhar, a aba "Fontes" continua utilizável, as abas geradas não aparecem e um aviso de erro com "tentar de novo" fica logo abaixo do painel; hoje a seção gerada já mostra erro sem derrubar a tela.
- O Contador e o campo de código com "Copiar" já existem no site (configurações e link do x1); a feature reaproveita o padrão, sem criar componente novo no design system.
- O rascunho vive só na página aberta; recarregar ou sair perde o que não foi salvo, como hoje.
- Fora de escopo: mudar regras de visibilidade, geração, descarte ou limites de chamadas; mudar a API além do campo de FR-024; mudar dados guardados; link para `/admin` no cabeçalho.
