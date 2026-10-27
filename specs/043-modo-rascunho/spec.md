# Feature Specification: Modo rascunho (lápis) com letras provisórias

**Feature Branch**: `feat/043-modo-rascunho`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Modo rascunho (lápis) com letras provisórias (ref. issue #90)"

## Clarifications

### Session 2026-10-27

- Q: O que acontece com as letras provisórias de uma conta guardadas no aparelho quando a pessoa sai da conta, quando outra conta entra ou quando a sessão expira? → A: Elas seguem as regras de dono da feature 041. Saem com `clearAccountData` ao sair da conta e com `discardOtherAccounts` quando outra conta entra. Sessão expirada não apaga nada. O visitante nunca vê as provisórias de uma conta, e a conta nunca vê as do visitante. [LOW CONFIDENCE]
  - Motivo: segurança e privacidade (em aparelho compartilhado, ninguém vê o raciocínio de outra conta). É a regra de dono que já existe. Marcado porque define quem vê quais dados guardados.
- Q: Com o lápis ligado, o que acontece ao digitar numa casa que já tem letra definitiva? → A: A letra digitada é ignorada, a definitiva fica, e o cursor avança para a próxima casa como numa digitação normal.
  - Motivo: usabilidade (quem digita uma palavra em rascunho não é interrompido pelas casas já certas e não precisa mexer no cursor).
- Q: Com o lápis desligado, o que acontece ao apagar uma casa que tem só uma letra provisória? → A: A provisória sai, como sairia uma definitiva. O apagar do lápis desligado limpa a casa, qualquer que seja o tipo de letra, e depois segue o comportamento atual.
  - Motivo: usabilidade (apagar remove a letra que aparece na tela; não é preciso ligar o lápis só para apagar).
- Q: Quanto tempo as letras provisórias ficam guardadas no aparelho? → A: Enquanto o progresso daquela cruzada existir no aparelho. Para a conta, elas saem quando a cópia da cruzada sai do armazenamento offline (limite de 60). Uma cruzada com provisórias conta como "em andamento" e não é descartada por esse limite. Para o visitante, elas duram o mesmo que o registro de progresso da cruzada. [LOW CONFIDENCE]
  - Motivo: segurança e privacidade (guardar o mínimo, sem acúmulo sem fim) e o padrão da feature 041. Marcado porque muda os dados guardados e a regra de descarte.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Anotar uma letra provisória (Priority: P1)

Quem joga ainda não tem certeza de uma palavra. Liga o modo lápis, digita uma letra numa casa e ela aparece em aspecto de rascunho (mais clara, distinta da letra definitiva). A letra provisória não conta como resposta: não entra na verificação, não completa a cruzada e não risca a pista.

**Why this priority**: É o núcleo do pedido; sem ele não há valor.

**Independent Test**: Ligar o lápis, digitar uma letra numa casa vazia e ver a letra em aspecto de rascunho; desligar o lápis e confirmar que a casa continua sem resposta definitiva.

**Acceptance Scenarios**:

1. **Given** uma cruzada aberta com o lápis desligado, **When** a pessoa liga o lápis e digita "A" numa casa vazia, **Then** a casa mostra "A" em aspecto de rascunho e a resposta definitiva da casa continua vazia.
2. **Given** o lápis ligado e uma casa com letra provisória, **When** a pessoa digita outra letra na mesma casa, **Then** a letra provisória é substituída.
3. **Given** o lápis ligado e uma casa com letra provisória, **When** a pessoa apaga a casa, **Then** a letra provisória some.
4. **Given** uma palavra inteira preenchida só com letras provisórias iguais à solução, **When** a pessoa observa o jogo, **Then** a cruzada não é dada como concluída e a pista não é riscada.
5. **Given** o lápis ligado, **When** a pessoa usa o teclado do jogo, o teclado do aparelho ou o teclado da tela, **Then** o comportamento é o mesmo nos três.

---

### User Story 2 - Confirmar ou descartar rascunhos (Priority: P2)

Depois de pensar, a pessoa decide: transforma em definitivas as letras provisórias de uma palavra, ou as descarta de uma vez, sem apagar casa por casa.

**Why this priority**: Torna o lápis útil de fato; sem isso, cada rascunho teria de ser redigitado ou apagado à mão.

**Independent Test**: Preencher letras provisórias numa palavra, confirmar e ver as letras virarem definitivas; repetir e descartar e ver tudo sumir.

**Acceptance Scenarios**:

1. **Given** letras provisórias na palavra selecionada, **When** a pessoa escolhe "confirmar rascunho", **Then** essas letras viram respostas definitivas, passam a contar na verificação e na conclusão, e o aspecto de rascunho some.
2. **Given** letras provisórias na palavra selecionada, **When** a pessoa escolhe "descartar rascunho", **Then** todas as provisórias da palavra somem e as definitivas ficam como estavam.
3. **Given** uma casa com letra definitiva, **When** a pessoa digita com o lápis ligado, **Then** a letra definitiva não é alterada, a casa não recebe provisória (a definitiva tem prioridade) e o cursor avança para a próxima casa como numa digitação normal.
4. **Given** uma casa revelada por ajuda (bloqueada), **When** a pessoa tenta anotar nela, **Then** nada muda.
5. **Given** uma palavra cruzada por casas que têm provisórias, **When** a pessoa confirma o rascunho de uma palavra, **Then** só as casas daquela palavra são confirmadas.

---

### User Story 3 - Rascunho que sobrevive e não atrapalha (Priority: P3)

A pessoa fecha a aba ou volta outro dia e encontra as letras provisórias onde deixou. O lápis não interfere em nada do resto: relógio, ajudas, cópia da pista, conclusão e "Jogar de novo".

**Why this priority**: Evita perder o raciocínio, mas o jogo funciona sem isso.

**Independent Test**: Anotar provisórias, recarregar a página e ver as provisórias de volta; concluir a cruzada e confirmar que nenhuma provisória sobra.

**Acceptance Scenarios**:

1. **Given** letras provisórias numa cruzada, **When** a pessoa recarrega ou reabre a cruzada no mesmo aparelho, **Then** as provisórias reaparecem e o lápis volta ao estado em que estava.
2. **Given** letras provisórias e uma palavra concluída com letras definitivas, **When** a cruzada é concluída, **Then** as provisórias que sobraram são descartadas e o modo leitura mostra só as definitivas.
3. **Given** letras provisórias, **When** a pessoa usa "Jogar de novo" ou reinicia a cruzada, **Then** as provisórias também somem.
4. **Given** uma ajuda (letra, palavra ou verificação) sobre casas com letra provisória, **When** a ajuda age, **Then** a ajuda vale como hoje e a provisória daquela casa é removida quando a casa recebe a letra revelada.
5. **Given** a pessoa em conta ou como visitante, **When** joga com o lápis, **Then** o rascunho funciona igual nos dois casos.

---

### Edge Cases

- Letra com acento: a provisória aceita as mesmas letras que a definitiva (A–Z e Ç) e segue a mesma comparação sem acento.
- Cruzada concluída (modo leitura): o lápis fica indisponível.
- Cruzada pausada ou diálogo de ajustes aberto: nada é digitado, como hoje; ligar o lápis, confirmar e descartar também ficam bloqueados.
- Falha de rede ou de salvamento: o lápis nunca bloqueia o jogo; os avisos continuam sem bloquear.
- Duas abas da mesma cruzada: as letras provisórias de uma aba não alteram a progressão definitiva da outra. As provisórias valem por última escrita (a última aba a alterar vence); uma aba antiga pode regravar provisórias depois que a outra concluiu ou reiniciou, e isso é aceito: ao abrir uma cruzada concluída as provisórias são apagadas e o modo leitura nunca as mostra.
- Tela estreita ou teclado na tela: o botão do lápis continua alcançável e nada pula de lugar ao digitar.
- Usuário só de teclado ou leitor de tela: o estado do lápis e as letras provisórias são anunciados.
- Aparelho compartilhado: ao sair da conta ou quando outra conta entra, as provisórias da conta anterior são apagadas. Sessão expirada não apaga nada.
- Armazenamento offline cheio: uma cruzada com provisórias não é descartada. As provisórias só saem junto com a cópia da cruzada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O jogo MUST oferecer um controle para ligar e desligar o modo lápis, visível no estado ligado. Não há atalho de teclado nesta versão; o controle é alcançável pelo teclado como qualquer botão (FR-014).
- **FR-002**: Com o lápis ligado, digitar uma letra numa casa livre MUST gravar uma letra provisória, sem alterar a resposta definitiva.
- **FR-003**: A letra provisória MUST ter aspecto claramente distinto da definitiva, sem depender só de cor (também por forma, peso ou tamanho).
- **FR-004**: Letras provisórias MUST NOT contar para verificação, conclusão, melhor tempo, risco de pista ou limite de ajudas. O relógio corre como hoje, com o lápis ligado ou não; digitar rascunho não o inicia nem o altera de outro modo, e as provisórias não mudam o tempo final nem o melhor tempo.
- **FR-005**: Apagar com o lápis ligado MUST remover só a letra provisória da casa; numa casa com letra definitiva a definitiva fica e o cursor segue como hoje. Apagar com o lápis desligado MUST remover a letra que estiver na casa, definitiva ou provisória, e manter o resto do comportamento atual.
- **FR-006**: Casas com letra definitiva ou bloqueadas por ajuda MUST NOT receber letra provisória. Digitar nelas com o lápis ligado MUST ignorar a letra e avançar o cursor como numa digitação normal.
- **FR-007**: A pessoa MUST poder confirmar as provisórias da palavra selecionada (viram definitivas) e descartá-las de uma vez.
- **FR-008**: Ao digitar uma letra definitiva numa casa que tem provisória, a provisória MUST ser removida da casa.
- **FR-009**: Letras provisórias MUST persistir no mesmo aparelho entre recargas, para visitante e para conta, guardadas por dono e por cruzada em chave própria do aparelho (não fazem parte do registro de progresso).
- **FR-010**: Letras provisórias MUST NOT ser enviadas ao servidor nem mudar o contrato de salvamento da conta; trocar de aparelho não as leva.
- **FR-011**: Ao concluir a cruzada, ao reiniciar ou ao usar "Jogar de novo", as provisórias MUST ser descartadas.
- **FR-012**: O lápis MUST funcionar com teclado físico, teclado na tela e toque/clique, nos layouts de celular e de computador.
- **FR-013**: Ligar o lápis, digitar ou confirmar MUST NOT deslocar o layout nem a seleção de forma inesperada.
- **FR-014**: O estado do lápis (ligado/desligado) e as ações de confirmar e descartar MUST ser acessíveis a leitores de tela e operáveis só pelo teclado.
- **FR-015**: Cópia da pista MUST seguir copiando apenas letras definitivas.
- **FR-016**: O estado do lápis MUST lembrar o último valor no aparelho (ligado ou desligado) ao abrir outra cruzada.
- **FR-017**: As letras provisórias de uma conta MUST seguir as regras de dono da feature 041. Saem ao sair da conta e quando outra conta entra no aparelho. Ficam quando a sessão expira. Nunca aparecem para o visitante nem para outra conta. As do visitante nunca aparecem para uma conta.
- **FR-018**: As letras provisórias MUST durar só enquanto existir no aparelho o progresso daquela cruzada. Uma cruzada com provisórias conta como em andamento e MUST NOT ser descartada pelo limite do armazenamento offline. Quando a cópia da cruzada sai desse armazenamento, as provisórias saem junto. Para o visitante, escrever uma provisória MUST garantir que exista o registro de progresso em andamento da cruzada (mesmo sem letra definitiva); ao abrir uma cruzada de visitante sem registro de progresso, as provisórias órfãs são apagadas. Para a conta, as provisórias saem apenas nos casos listados (conclusão, reinício, "Jogar de novo", sair da conta, outra conta entrar e cópia removida do armazenamento offline); se a cópia nunca foi guardada ou o progresso foi reiniciado em outro aparelho, a chave pode sobrar, o que é aceito por ser pequena e só do aparelho.

### Key Entities

- **Letra provisória**: letra anotada numa casa livre que ainda não é resposta. Pertence a uma cruzada e a uma pessoa (visitante ou conta) no aparelho e aceita as mesmas letras da definitiva. Dura o mesmo que o progresso daquela cruzada no aparelho e segue as regras de dono da feature 041.
- **Estado do lápis**: preferência de ligado/desligado por aparelho.
- **Progresso da cruzada**: não muda; as provisórias ficam em chave própria no aparelho, por dono e cruzada, e duram o mesmo que ele. No servidor só há as definitivas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quem joga liga o lápis e anota uma letra provisória em até 2 interações (ligar e digitar).
- **SC-002**: Em 100% dos testes, uma cruzada preenchida só com provisórias corretas não é dada como concluída nem risca pistas.
- **SC-003**: Confirmar ou descartar o rascunho de uma palavra inteira leva 1 ação, em vez de uma por casa.
- **SC-004**: Após recarregar a página, 100% das letras provisórias anotadas reaparecem no mesmo aparelho.
- **SC-005**: Nenhuma letra provisória aparece nos dados salvos na conta nem no resultado final da cruzada.
- **SC-006**: O uso do lápis não adiciona nenhum deslocamento de layout medido durante a digitação e passa na verificação de acessibilidade automatizada já usada nas telas do jogo.

## Assumptions

- O aspecto e o texto da interface seguem o português e o desenho atuais do jogo (`docs/design.md`); o texto exato dos controles fica para o plano.
- Só a letra provisória é pedida: uma casa guarda no máximo uma, sem várias anotações pequenas por casa.
- Rascunho fica no aparelho, tanto para visitante (no armazenamento local do visitante) quanto para conta; não há sincronização entre aparelhos. Isso evita mudar a API e o contrato de salvamento, que seguem compatíveis com a versão anterior do site.
- A preferência ligado/desligado do lápis é do aparelho e não faz parte dos ajustes sincronizados da conta.
- Confirmar rascunho age sobre a palavra selecionada; confirmar a cruzada inteira fica fora desta versão.
- Ajudas, verificação e limites continuam como estão; o lápis apenas respeita a prioridade das letras definitivas e das casas reveladas.
- Fora de escopo: verificação automática opcional, dica de primeira letra e demais itens da issue #90.
- Depende do jogo atual (reducer, teclado, armazenamento do visitante) e do offline da feature 041 para guardar o rascunho no aparelho.
