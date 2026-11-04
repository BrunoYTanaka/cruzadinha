# Feature Specification: Calendário mais enxuto

**Feature Branch**: `feat/061-calendario-enxuto`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: https://github.com/BrunoYTanaka/cruzadinha/issues/146 — "calendário mais enxuto: remover 'Hoje' e esconder o filtro de data atrás de um ícone"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Calendário sem a seção "Hoje" (Priority: P1)

Hoje, acima das abas de fonte, a tela do calendário tem a seção "Hoje" com um cartão por fonte. Ela repete o que o calendário já mostra (o dia de hoje na grade) e empurra a grade para baixo. A seção sai: a tela abre direto nas abas de fonte e na grade do mês.

**Why this priority**: É a maior redução de informação e funciona sozinha, sem depender do ícone.

**Independent Test**: Abrir o calendário e conferir que não há seção "Hoje" nem cartões por fonte, que a grade do mês aparece logo abaixo das abas e que o dia de hoje continua abrindo pela grade.

**Acceptance Scenarios**:

1. **Given** o calendário aberto, **When** a tela carrega, **Then** não existe a seção "Hoje" nem cartão de fonte algum.
2. **Given** o calendário aberto, **When** a pessoa procura o dia de hoje, **Then** ele está na grade do mês atual e abre como qualquer outro dia.
3. **Given** a tela sem a seção "Hoje", **When** um leitor de tela lista os títulos, **Then** há exatamente um título de nível 1, "Escolha um dia", visualmente escondido.

---

### User Story 2 - Filtro de data atrás de um ícone (Priority: P1)

O filtro de data (seletor de mês e campo de data) deixa de ficar sob o título do mês. Em seu lugar há um botão com ícone de calendário, na ponta oposta às abas de fonte. Ao tocar, abre um painel que flutua sobre o conteúdo com o seletor de mês e o campo de data. Tocar no botão de novo, apertar Esc ou tocar fora fecha o painel.

**Why this priority**: É o outro pedido central da issue; sem ele o filtro some junto com a seção "Hoje".

**Independent Test**: Abrir o calendário, conferir que o filtro não aparece, tocar no ícone, escolher um mês e uma data e conferir que a grade acompanha; fechar por cada um dos três caminhos.

**Acceptance Scenarios**:

1. **Given** o calendário aberto, **When** a tela carrega, **Then** o filtro de data não está visível e o ícone de calendário está na ponta oposta às abas de fonte.
2. **Given** o painel fechado, **When** a pessoa toca no ícone, **Then** o painel abre com o seletor de mês e o campo de data, sem empurrar a grade nem nenhum outro conteúdo.
3. **Given** o painel aberto, **When** a pessoa toca no ícone de novo, aperta Esc ou toca fora do painel, **Then** o painel fecha.
4. **Given** o painel fechado com Esc, **When** ele fecha, **Then** o foco do teclado volta ao botão do ícone.
5. **Given** o painel aberto, **When** a pessoa escolhe um mês ou informa uma data, **Then** as regras são as de hoje: o mês escolhido aparece, uma data válida mostra o mês e leva o foco ao dia (se for um link), e uma data fora do período, futura ou inválida mantém o mês e mostra a mensagem de sempre.
6. **Given** o painel fechado ou aberto, **When** a pessoa troca de fonte ou de mês, **Then** o ícone continua no mesmo lugar e o painel (se aberto) segue funcionando.

---

### User Story 3 - Mesmo ícone no seletor de dia do x1 (Priority: P2)

O seletor de dia do x1 usa o mesmo calendário e as mesmas abas de fonte. Ele ganha o mesmo ícone e o mesmo painel, com o mesmo comportamento, para que as duas telas sejam iguais.

**Why this priority**: Mantém a consistência, mas só importa depois que o calendário principal estiver pronto.

**Independent Test**: Abrir o seletor de dia em `/x1/novo`, conferir o ícone na ponta oposta às abas, abrir o painel, escolher uma data e conferir que o mês acompanha, sem escolher o dia sozinho.

**Acceptance Scenarios**:

1. **Given** o seletor de dia do x1 aberto, **When** a tela carrega, **Then** o filtro de data está escondido atrás do mesmo ícone e a seção "Hoje" continua sem existir.
2. **Given** o painel aberto no x1, **When** a pessoa informa uma data válida, **Then** o mês é mostrado e o foco vai ao dia (se for um dia que pode ser escolhido); nenhum dia é escolhido sozinho.

---

### Edge Cases

- Tela estreita (celular): o ícone fica na mesma linha das abas ou logo acima delas, sem cortar nem sobrepor as abas; o painel cabe na largura da janela.
- Esc com o foco dentro do painel fecha só o painel, nunca o diálogo ou a página que o contém (x1).
- Uma mensagem de erro de data some quando o painel fecha: ao reabrir, o painel não mostra erro antigo.
- Um clique que começa dentro do painel e termina fora (seleção de texto no campo) não fecha o painel.
- Painel aberto e janela redimensionada: o painel continua inteiro na janela.
- Sem a seção "Hoje" a fonte padrão e a fonte vinda de uma partida continuam abrindo a aba certa (FR-015).
- Tab sai do painel sem fechá-lo: os campos são de formulário, não itens de menu; o painel fecha só pelos três caminhos de FR-008.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tela do calendário MUST NOT mostrar a seção "Hoje" nem os cartões de fonte.
- **FR-002**: A tela do calendário MUST ter um título de nível 1 visualmente escondido, "Escolha um dia", e nenhum outro título de nível 1.
- **FR-003**: O filtro de data MUST sair de baixo do título do mês e ficar escondido atrás de um botão com ícone de calendário, posicionado na ponta oposta às abas de fonte.
- **FR-004**: O botão MUST ter nome acessível, indicar se o painel está aberto ou fechado e ter área de toque de 46 px com desenho de 24 px.
- **FR-005**: Ao ativar o botão, o sistema MUST abrir um painel com o seletor de mês e o campo de data, com largura de pelo menos 300 px e campos de 44 px de altura, desde que caiba na janela.
- **FR-006**: O painel MUST flutuar sobre o conteúdo e não deslocar nenhum elemento ao abrir ou fechar.
- **FR-007**: O botão MUST reservar seu espaço o tempo todo, para que nada se mova com o painel aberto ou fechado.
- **FR-008**: O painel MUST fechar ao ativar o botão de novo, ao apertar Esc e ao tocar fora dele.
- **FR-009**: Ao fechar com Esc, o foco MUST voltar ao botão.
- **FR-010**: As regras do filtro MUST ficar como estão: meses oferecidos, validação da data (inválida, futura, fora do período), mensagens de erro, foco no dia e o fato de nada abrir sozinho.
- **FR-011**: A grade do mês, a navegação entre meses, os dias, os status, a legenda, o filtro de status e o redimensionamento MUST ficar como estão.
- **FR-012**: O seletor de dia do x1 MUST mostrar o mesmo botão e o mesmo painel, com o mesmo comportamento, e MUST NOT mostrar a seção "Hoje".
- **FR-013**: O painel MUST ser operável só por teclado (abrir, percorrer os campos, fechar) e passar nas verificações de acessibilidade automáticas do projeto.
- **FR-014**: Os testes que procuram a seção "Hoje" MUST ser atualizados ou removidos para refletir a nova tela.
- **FR-015**: A aba aberta ao chegar ao calendário (fonte padrão, ou a do jogo ao voltar dele) MUST ser a mesma de antes da mudança.
- **FR-016**: Uma mensagem de erro de data MUST sumir quando o painel fecha.

### Key Entities *(include if feature involves data)*

Nenhuma. A mudança é só de apresentação; nenhum dado, tabela ou contrato de API muda.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ao abrir o calendário, a grade do mês começa mais alto na tela do que hoje, e nenhum cartão "Hoje" aparece, em desktop e celular.
- **SC-002**: Abrir e fechar o painel move 0 px de qualquer outro elemento da tela (medido pelo teste de ausência de saltos).
- **SC-003**: Quem usava o filtro de data chega ao mesmo resultado (mês ou dia) em no máximo um toque a mais que hoje (o do ícone).
- **SC-004**: 100% dos caminhos de fechamento (ícone, Esc, toque fora) fecham o painel, e Esc devolve o foco ao botão.
- **SC-005**: O calendário e o seletor de dia do x1 mostram o mesmo ícone e o mesmo painel, sem diferença de comportamento.
- **SC-006**: A verificação de acessibilidade automática não encontra violação na tela com o painel fechado nem aberto.

## Assumptions

- O mockup aprovado em conversa (`mockup-calendario.html`, não anexado à issue) é a referência visual; as medidas numéricas da issue (ícone de 46 px, desenho de 24 px, painel de pelo menos 300 px, campos de 44 px) valem onde o mockup não estiver à mão.
- "Ponta oposta às abas" quer dizer o lado direito da linha das abas em leitura da esquerda para a direita.
- O botão e o painel ficam só no site; nenhuma mudança na API, no esquema compartilhado ou no armazenamento.
- A feature 054 (pular para uma data) continua válida em suas regras; só muda onde o filtro aparece. A seção "Hoje" nasceu na feature 048 e sai aqui.
- A mudança é só do site, então se encaixa em "feat" do `apps/web` para o versionamento.
