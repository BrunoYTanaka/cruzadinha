# Feature Specification: Copiar a dica com tamanho e letras e fechar os ajustes ao clicar fora

**Feature Branch**: `feat/032-copiar-dica`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/44" ([Feature]: adicionar ajuda configurável para copiar a dica com letras e tamanho da palavra)

## Contexto

Para pedir ajuda com uma palavra (a um amigo, a uma busca, a uma ferramenta), a pessoa hoje monta à mão um resumo da dica com o tamanho da palavra e as letras que já descobriu, olhando a grade inteira. Esta feature acrescenta uma ajuda opcional que faz isso com um duplo clique na dica. Na mesma tela de ajustes, a janela de ajustes passa a fechar ao clicar fora dela.

O ator é o jogador, visitante ou com conta. A ajuda vem desativada: quem não a ligar não percebe diferença no jogo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copiar a dica com o tamanho e as letras já preenchidas (Priority: P1)

Com a opção ligada, a pessoa dá dois cliques seguidos numa dica e o texto "dica (tamanho): letras" vai para a área de transferência, pronto para colar em outro lugar.

**Why this priority**: É o valor da feature. Sem ela não há o que ativar.

**Independent Test**: Ligar a opção nos ajustes, preencher "A" e "R" na primeira e na última célula de uma palavra de 5 letras cuja dica é "Ter opinião", dar dois cliques na dica e colar o texto; deve vir "Ter opinião (5): A___R".

**Acceptance Scenarios**:

1. **Given** a opção ligada e uma palavra de 5 letras com dica "Ter opinião" e as letras A (1ª célula) e R (5ª célula) preenchidas, **When** a pessoa dá dois cliques na dica, **Then** o texto copiado é exatamente `Ter opinião (5): A___R`.
2. **Given** a opção ligada e uma palavra sem nenhuma letra preenchida, **When** a pessoa dá dois cliques na dica, **Then** o texto copiado traz a dica, o tamanho e só espaços vazios (por exemplo `Ter opinião (5): _____`).
3. **Given** a opção ligada e uma palavra totalmente preenchida, **When** a pessoa dá dois cliques na dica, **Then** o texto copiado traz todas as letras (por exemplo `Ter opinião (5): ACHAR`).
4. **Given** a opção ligada, **When** a pessoa dá dois cliques na dica, **Then** ela recebe um aviso curto e não bloqueante de que a dica foi copiada, anunciado também a quem usa leitor de tela.
5. **Given** a opção ligada, **When** a pessoa dá dois cliques numa dica de outra palavra (horizontal ou vertical), **Then** o texto copiado é o dessa palavra, com as letras que ela tem na grade no momento, inclusive as que vêm do cruzamento com palavras vizinhas.
6. **Given** a opção ligada e a pessoa jogando como visitante, **When** dá dois cliques na dica, **Then** a cópia funciona igual à de quem tem conta.

---

### User Story 2 - Ligar e desligar a opção nos ajustes (Priority: P1)

Os ajustes ganham uma opção para ativar a cópia da dica. Ela vem desativada e a escolha é guardada como os demais ajustes.

**Why this priority**: Sem a opção, o comportamento novo mudaria o jogo de todo mundo; ela é a condição de entrega da US1.

**Independent Test**: Abrir os ajustes de uma instalação nova e ver a opção desligada; com ela desligada, dois cliques numa dica não copiam nada.

**Acceptance Scenarios**:

1. **Given** uma pessoa sem ajustes salvos, **When** abre a janela de ajustes, **Then** a opção de copiar a dica aparece desligada.
2. **Given** a opção desligada, **When** a pessoa dá dois cliques numa dica, **Then** nada é copiado e nenhum aviso aparece; um clique simples continua selecionando a palavra como hoje.
3. **Given** a opção ligada, **When** a pessoa recarrega o site ou o abre noutra aba, **Then** a opção continua ligada.
4. **Given** uma pessoa com conta que ligou a opção num aparelho, **When** entra em outro aparelho, **Then** a opção vem ligada, pelas mesmas regras de sincronização dos outros ajustes.
5. **Given** a pessoa usa "Restaurar padrões", **When** confirma, **Then** a opção volta a desligada.

---

### User Story 3 - Fechar a janela de ajustes ao clicar fora (Priority: P2)

A pessoa clica na área escurecida fora da janela de ajustes e a janela fecha, sem precisar procurar o botão de fechar.

**Why this priority**: Pedido junto no mesmo issue, vale para todos e é independente da ajuda de copiar.

**Independent Test**: Abrir os ajustes e clicar fora do painel; a janela fecha e o foco volta ao botão da engrenagem.

**Acceptance Scenarios**:

1. **Given** a janela de ajustes aberta, **When** a pessoa clica na área fora do painel, **Then** a janela fecha e o foco volta ao botão que a abriu.
2. **Given** a janela aberta, **When** a pessoa clica dentro do painel (em texto, controle ou espaço vazio), **Then** a janela continua aberta.
3. **Given** a pessoa começou a arrastar dentro do painel (por exemplo, selecionando texto) e soltou o mouse fora dele, **When** o botão é solto, **Then** a janela continua aberta.
4. **Given** a janela aberta, **When** a pessoa aperta Esc ou usa o botão de fechar, **Then** ela fecha como hoje.
5. **Given** outros diálogos do site (conclusão da cruzada, confirmações), **When** a pessoa clica fora deles, **Then** o comportamento deles não muda.

---

### Edge Cases

- **Dois cliques sobre uma letra ou célula do tabuleiro**: não copiam nada; o duplo clique vale só na dica.
- **Dois cliques na dica da barra da dica ativa** (acima do tabuleiro) e **na lista de dicas**: ambos copiam. No celular com teclado virtual vale a barra da dica ativa; a folha de dicas fecha ao primeiro clique, então o duplo clique não acontece nela. Nos botões anterior/próxima da barra, não.
- **Primeiro clique do duplo clique**: continua selecionando a palavra; o segundo dispara a cópia da palavra já selecionada. O duplo clique não deixa texto da dica selecionado na tela.
- **Letras acentuadas na grade**: o texto copiado traz as letras como estão na grade, sem remover acento.
- **Letras erradas**: a cópia mostra o que a pessoa digitou, certo ou errado; não consulta a solução e não conta como ajuda.
- **Célula vazia**: aparece como `_` (um por letra que falta), de modo que o número de posições sempre bate com o tamanho entre parênteses.
- **Área de transferência indisponível ou recusada** (navegador sem permissão, página sem contexto seguro): a pessoa vê um aviso curto e não bloqueante dizendo que não foi possível copiar; o jogo segue normal.
- **Modo leitura (cruzada já concluída)**: o duplo clique copia do mesmo jeito, pois só lê a grade.
- **Jogo pausado**: a grade fica coberta para não dar para pensar com o tempo parado, mas a lista de dicas continua clicável; por isso o duplo clique não copia nem avisa nada enquanto o jogo está pausado, para não revelar as letras por outro caminho.
- **Muitos cliques seguidos**: cada duplo clique copia de novo; nenhum acúmulo de avisos.
- **Janela de ajustes e a opção**: mudar a opção com a janela aberta vale já para o jogo ao fundo, sem recarregar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A janela de ajustes MUST ter uma opção para ativar e desativar a cópia da dica, com nome e explicação curta em português.
- **FR-002**: A opção MUST vir desativada por padrão, inclusive para quem já tem ajustes salvos de antes desta feature.
- **FR-003**: Com a opção desativada, o duplo clique numa dica MUST NOT copiar nem avisar nada e o clique simples MUST seguir selecionando a palavra.
- **FR-004**: Com a opção ativada, o duplo clique numa dica MUST copiar para a área de transferência o texto `<dica> (<tamanho>): <letras>`, em que `<dica>` é o texto original da dica, `<tamanho>` o número de letras da palavra e `<letras>` a sequência de uma posição por célula, com a letra preenchida ou `_` quando vazia, sem espaços entre elas.
- **FR-005**: O texto copiado MUST refletir a grade no momento do duplo clique, incluindo letras vindas do cruzamento com outras palavras, e MUST ter sempre tantas posições quanto o tamanho informado.
- **FR-006**: O duplo clique só MUST disparar a cópia na dica (lista de dicas e barra da dica ativa) e MUST NOT disparar em letras ou células do tabuleiro nem em botões de navegação.
- **FR-007**: Depois de copiar, o site MUST mostrar um aviso curto e não bloqueante e MUST anunciá-lo por região ativa para leitores de tela; se a cópia falhar, MUST mostrar um aviso curto de falha, também não bloqueante.
- **FR-008**: O duplo clique MUST NOT mudar a grade, o relógio, as ajudas contadas, o progresso salvo nem o limite de ajudas, e MUST NOT copiar nem avisar enquanto o jogo está pausado.
- **FR-009**: A escolha da opção MUST ser guardada no aparelho junto dos demais ajustes e, para quem tem conta, sincronizada com a conta pelas mesmas regras (mais recente vence; um site ou API mais antigo que ignora o campo novo não pode falhar).
- **FR-010**: "Restaurar padrões" MUST devolver a opção a desativada.
- **FR-011**: A janela de ajustes MUST fechar ao clicar na área fora do painel, devolvendo o foco ao botão de origem, e MUST continuar aberta quando o clique, ou o arrastar iniciado dentro dele, termina dentro do painel.
- **FR-012**: O comportamento de fechar ao clicar fora MUST valer só para a janela de ajustes; os demais diálogos MUST manter o comportamento atual.
- **FR-013**: A opção e o duplo clique MUST ser acessíveis: a opção operável por teclado, com rótulo e estado lidos por leitor de tela; a cópia por teclado fica fora do escopo (ver Assumptions).
- **FR-014**: O aviso de cópia MUST ter contraste suficiente nos temas claro e escuro e MUST NOT mudar o layout do jogo (sem saltos), seguindo a regra da feature 017.

### Key Entities *(include if feature involves data)*

- **Ajuste "copiar dica"**: preferência verdadeiro/falso do jogador, parte do registro de ajustes (aparelho e conta). Padrão: falso.
- **Texto da dica copiada**: valor derivado e efêmero (dica original, tamanho, letras da grade); não é guardado nem enviado a lugar nenhum além da área de transferência.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quem liga a opção copia o resumo de qualquer palavra em um gesto (dois cliques), sem digitar nem contar casas, e o texto colado tem em 100% dos casos o formato `dica (n): letras` com exatamente `n` posições.
- **SC-002**: Com a opção desligada (padrão), 100% dos fluxos de jogo existentes se comportam como antes, sem aviso e sem cópia.
- **SC-003**: Em 100% dos testes de todos os temas e tamanhos de tela cobertos, o aviso de cópia aparece sem mover a barra de ferramentas nem o tabuleiro.
- **SC-004**: Em 100% das tentativas, clicar fora do painel de ajustes fecha a janela em um clique, e nenhum clique ou arrastar que termine dentro dele a fecha.
- **SC-005**: A opção e o aviso passam na verificação de acessibilidade automática usada no projeto, nos dois temas.

## Assumptions

- A cópia por teclado (atalho para quem não usa mouse) fica de fora desta feature: o issue pede o duplo clique. A pessoa que usa teclado ainda seleciona a palavra pela dica e lê a grade normalmente. Um atalho pode vir em feature própria.
- O formato é o do exemplo do issue: `Ter opinião (5): A___R`, com `_` por célula vazia e sem espaços entre as posições. Palavras de várias partes não têm separador especial, pois o formato interno da cruzada guarda só o tamanho.
- O texto das dicas é copiado como aparece na lista, sem o número ("10.") na frente.
- O nome da opção nos ajustes e os textos dos avisos são definidos no planejamento, em português, no tom dos outros ajustes. O aviso de falha só diz que não foi possível copiar.
- O campo novo entra no registro de ajustes compartilhado pelo site e pela API; a API de ajustes já descarta chaves desconhecidas, então um site novo com API antiga continua funcionando, apenas sem sincronizar a opção até a API ser atualizada. A ordem das versões é tratada no planejamento (regra de duas versões do projeto).
- Em telas de toque, vale o que o navegador entrega como duplo clique/toque duplo; não há gesto novo para o toque.
- Esta feature muda só o site e o registro de ajustes compartilhado; não há mudança de banco de dados, de fontes de cruzadas nem de progresso.
- A janela de ajustes é a única afetada pelo "fechar ao clicar fora"; transformar isso em regra para todos os diálogos fica fora do escopo.
