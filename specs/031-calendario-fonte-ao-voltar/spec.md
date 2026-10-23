# Feature Specification: Calendário volta na fonte do jogo

**Feature Branch**: `fix/031-calendario-fonte-ao-voltar`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/71" ([Bug]: ao voltar de uma cruzada, o calendário abre na fonte padrão)

## Contexto

A feature 021 fez o calendário abrir na cruzada padrão das configurações e deixou de lembrar a aba escolhida (FR-012 e o cenário 6 da história 2). A intenção era que a cruzada padrão decidisse a aba **ao abrir o site**; porém a regra também vale ao voltar de um jogo. Quem escolhe a aba Cruzada Online, abre uma cruzada e volta à biblioteca encontra o calendário na aba O Globo, e precisa trocar de aba de novo. Como esta feature muda uma regra documentada da feature 021, ela segue o fluxo de feature (spec primeiro), embora nasça de um bug.

## User Scenarios & Testing *(mandatory)*

O ator é o jogador, visitante ou com conta.

### User Story 1 - Voltar do jogo para o calendário da mesma fonte (Priority: P1)

A pessoa abre uma cruzada de uma fonte que não é a padrão e, ao voltar à biblioteca, o calendário aparece na aba da fonte daquele jogo.

**Why this priority**: É o defeito relatado. Sem isso, quem joga uma fonte que não é a padrão perde a aba a cada cruzada.

**Independent Test**: Com a cruzada padrão em O Globo, abrir a biblioteca, escolher a aba Cruzada Online, abrir um jogo e voltar; o calendário mostra a aba Cruzada Online selecionada.

**Acceptance Scenarios**:

1. **Given** a cruzada padrão O Globo e um jogo aberto de Cruzada Online, **When** a pessoa volta à biblioteca pelo link "Voltar à biblioteca" da barra do jogo, **Then** o calendário abre na aba Cruzada Online.
2. **Given** o mesmo jogo aberto, **When** a pessoa volta pelo botão "Voltar" do navegador, **Then** o calendário abre na aba Cruzada Online.
3. **Given** o mesmo jogo aberto, **When** a pessoa volta pelo link "Voltar à biblioteca" do diálogo de conclusão, do modo leitura, ou pelo link do cabeçalho, **Then** o calendário abre na aba Cruzada Online.
4. **Given** um jogo aberto de uma fonte por um atalho que não passou pelo calendário (cartão "Hoje", dia aberto por link direto, "Ir direto ao jogo"), **When** a pessoa volta à biblioteca, **Then** o calendário abre na aba da fonte desse jogo.
5. **Given** a pessoa voltou ao calendário na aba da fonte do jogo, **When** troca de aba, **Then** a troca funciona como hoje e não altera a cruzada padrão das configurações.

---

### User Story 2 - A cruzada padrão continua valendo ao abrir o site (Priority: P1)

A cruzada padrão decide a aba só quando a pessoa chega ao site, como a feature 021 definiu.

**Why this priority**: É o que a feature 021 entregou e precisa continuar valendo; a correção não pode trocar uma regra por outra.

**Independent Test**: Jogar uma cruzada de Cruzada Online, voltar (aba Cruzada Online), recarregar a página ou abrir o site de novo; o calendário abre na cruzada padrão.

**Acceptance Scenarios**:

1. **Given** a cruzada padrão O Globo, **When** a pessoa abre o endereço do site (nova visita, recarga da página ou nova aba), **Then** o calendário abre na aba O Globo, qualquer que tenha sido a última aba ou o último jogo.
2. **Given** a pessoa voltou de um jogo de Cruzada Online e o calendário mostra essa aba, **When** ela muda a cruzada padrão nas configurações, **Then** a aba mostrada não muda sozinha; a nova padrão vale na próxima abertura do site.
3. **Given** a pessoa está no calendário sem ter vindo de um jogo (por exemplo, pelo link do cabeçalho a partir de outra página do site, como o login), **When** o calendário abre, **Then** ele abre na cruzada padrão.

---

### Edge Cases

- **Fonte do jogo desconhecida ou retirada** (endereço antigo ou mexido à mão): o calendário abre na cruzada padrão, sem erro.
- **Voltar com a fonte indisponível** (fonte fora do ar ou sem cruzadas): o calendário abre na aba dessa fonte mesmo assim, com o aviso que a aba já mostra hoje; a pessoa pode trocar de aba.
- **Mais de uma aba do navegador aberta**: voltar de um jogo numa aba não muda a aba mostrada nas outras.
- **Jogo sem fonte identificável** (a cruzada não carregou): o link de voltar leva ao calendário na cruzada padrão.
- **Mês exibido**: o mês que o calendário mostra ao voltar não muda nesta feature; só a aba (fonte).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ao voltar de um jogo para a biblioteca na mesma visita, o calendário MUST abrir na aba da fonte do jogo de onde a pessoa saiu, e não na cruzada padrão.
- **FR-002**: Isso MUST valer por todos os caminhos de volta: o link "Voltar à biblioteca" (barra do jogo, diálogo de conclusão, modo leitura, página de erro), o link do cabeçalho e o botão "Voltar" do navegador.
- **FR-003**: A fonte MUST ser a do jogo aberto, também quando o jogo foi aberto sem passar pelo calendário (cartão "Hoje", dia por link direto, "Ir direto ao jogo").
- **FR-004**: Ao abrir o site (nova visita, recarga, nova aba), o calendário MUST abrir na cruzada padrão das configurações (FR-012 da feature 021), sem lembrar a aba de visitas anteriores.
- **FR-005**: Trocar de aba no calendário MUST continuar valendo só durante a visita e MUST NOT alterar a cruzada padrão das configurações nem enviar nada à conta.
- **FR-006**: Quando a fonte do jogo não for reconhecida, o calendário MUST abrir na cruzada padrão, sem erro nem aviso.
- **FR-007**: A correção MUST NOT mudar o endereço de nenhuma tela existente de modo que um link salvo deixe de funcionar, e MUST NOT mudar o comportamento do atalho "Ir direto ao jogo" (feature 021, só age ao abrir o endereço raiz).
- **FR-008**: O progresso, o relógio e os dados do jogo MUST NOT ser afetados.

### Key Entities

Nenhuma entidade nova. A única informação envolvida é a fonte do jogo de onde a pessoa saiu, que dura só a visita e não é guardada no aparelho nem na conta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das voltas de um jogo à biblioteca (link ou botão do navegador), a aba selecionada é a da fonte do jogo, sem a pessoa tocar numa aba.
- **SC-002**: Em 100% das aberturas do site (visita nova, recarga, nova aba), a aba selecionada é a cruzada padrão das configurações.
- **SC-003**: Jogar uma cruzada de uma fonte que não é a padrão e voltar exige 0 toques extras para continuar na mesma fonte (antes: 1 toque na aba a cada volta).
- **SC-004**: Nenhuma configuração salva muda por causa de uma volta ou de uma troca de aba.

## Assumptions

- "Mesma visita" vai da abertura do site até fechar ou recarregar a página; a feature 021 já define a abertura como o momento em que a cruzada padrão vale.
- O botão "Voltar" do navegador conta como volta (FR-002), pois é o gesto mais comum, inclusive em telas pequenas.
- Voltar pelo link do cabeçalho a partir do jogo conta como volta do jogo; a partir de outras páginas (login) vale a cruzada padrão (história 2, cenário 3).
- A aba não vira preferência: nada é guardado entre visitas, em linha com o cenário 6 da feature 021 ("volta mais tarde" é nova visita).
- A feature muda só o site; a API e o formato dos dados ficam como estão, e um site novo continua funcionando com a API atual.
- A regra da feature 021 que esta feature ajusta: "o calendário abre sempre na cruzada padrão" passa a "abre na cruzada padrão ao abrir o site e na fonte do jogo ao voltar dele".
