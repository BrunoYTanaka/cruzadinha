# Feature Specification: Pular para uma data no calendário

**Feature Branch**: `feat/054-pular-para-data-calendario`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: https://github.com/BrunoYTanaka/cruzadinha/issues/106 — "Campo para ir direto a um mês ou dia, sem navegar mês a mês." (origem: #90)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ir direto a um mês (Priority: P1)

No calendário, logo abaixo do título do mês, há um seletor de mês e ano. Ao escolher, o calendário mostra aquele mês na hora, sem passar pelos meses do meio. Hoje, chegar a um mês de onze meses atrás exige onze toques em "Anterior".

**Why this priority**: É o ganho principal e funciona sozinho: quem quer voltar no tempo chega em um passo.

**Independent Test**: Abrir o calendário, escolher um mês de seis meses atrás e conferir que a grade mostra esse mês; escolher o mês atual e conferir que volta.

**Acceptance Scenarios**:

1. **Given** o calendário aberto no mês atual, **When** a pessoa escolhe outro mês dentro do período navegável, **Then** a grade e o título passam a mostrar esse mês.
2. **Given** um mês escolhido, **When** a pessoa usa "Anterior" ou "Próximo", **Then** a navegação segue a partir do mês escolhido.
3. **Given** o campo aberto, **When** a pessoa vê as opções, **Then** só aparecem meses do primeiro mês navegável até o mês atual (os mesmos limites de "Anterior" e "Próximo").
4. **Given** um mês escolhido, **When** a pessoa troca de fonte, **Then** o mês continua o mesmo.

---

### User Story 2 - Ir direto a um dia (Priority: P2)

Ao lado do seletor de mês, um segundo campo aceita uma data completa (dia, mês e ano), digitada ou escolhida. O calendário mostra o mês dessa data e destaca o dia; se o dia pode ser aberto, o foco do teclado fica nele, e a pessoa abre com Enter, como qualquer dia da grade.

**Why this priority**: Atende quem já sabe a data exata, mas o mês (US1) já resolve a maior parte.

**Independent Test**: Digitar uma data de três meses atrás e conferir que o calendário mostra o mês e o foco cai no dia.

**Acceptance Scenarios**:

1. **Given** uma data válida dentro do período navegável, **When** a pessoa a informa, **Then** o calendário mostra o mês da data e o foco vai para o dia.
2. **Given** a data de um dia sem cruzada, futuro ou que a fonte já disse não ter, **When** a pessoa a informa, **Then** o mês é mostrado e o dia aparece como já aparece na grade (apagado, com o texto de sempre); nenhuma cruzada é aberta sozinha.
3. **Given** uma data válida, **When** a pessoa a informa, **Then** o jogo não abre sozinho: abrir é sempre uma ação separada.

---

### User Story 3 - Datas que não servem (Priority: P3)

Uma data fora do período navegável, futura ou inválida (por exemplo 31 de fevereiro) não muda o calendário e mostra uma mensagem curta dizendo o que está errado e qual é o período aceito.

**Why this priority**: Evita confusão nos cantos; não muda o valor principal.

**Independent Test**: Informar uma data de dois anos atrás e uma de amanhã e conferir a mensagem e que o mês mostrado não muda.

**Acceptance Scenarios**:

1. **Given** uma data anterior ao primeiro mês navegável, **When** a pessoa a informa, **Then** o mês mostrado não muda e a mensagem diz o período aceito.
2. **Given** uma data posterior a hoje, **When** a pessoa a informa, **Then** o mesmo acontece.
3. **Given** uma data impossível, **When** a pessoa a informa, **Then** a mensagem diz que a data é inválida e o mês não muda.
4. **Given** a mensagem de erro exibida, **When** a pessoa corrige a data, **Then** a mensagem some.

---

### Edge Cases

- O campo respeita o dia de hoje em Brasília, o mesmo "hoje" da grade.
- Escolher o mês já exibido não muda nada e não move o foco.
- Biblioteca carregando ou com erro, ou fonte que a API recusa: o campo não aparece, como a grade.
- Com um filtro de status ativo (feature 053), o filtro continua marcado após o salto.
- Ao recarregar a página ou reabrir o calendário, o calendário volta ao mês atual (o mês escolhido não é guardado).
- Visitante e conta se comportam igual; nada é guardado nem pedido à API além do que a grade já pede.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O calendário MUST oferecer um campo para ir a um mês e ano, logo abaixo do título do mês, visível só quando a grade é exibida.
- **FR-002**: Escolher um mês MUST mostrar esse mês sem passar pelos intermediários, e "Anterior" e "Próximo" MUST seguir dele.
- **FR-003**: O campo MUST aceitar só meses entre o primeiro mês navegável e o mês atual, os mesmos limites de "Anterior" e "Próximo".
- **FR-004**: O calendário MUST aceitar também uma data completa; ao aceitá-la, MUST mostrar o mês da data e mover o foco para o dia.
- **FR-005**: Informar uma data MUST NOT abrir uma cruzada nem pedir nada à fonte; abrir continua sendo a ação já existente do dia.
- **FR-006**: Uma data inválida, futura ou fora do período MUST deixar o mês mostrado como está e MUST exibir mensagem curta, anunciada a leitores de tela, com o motivo e o período aceito.
- **FR-007**: O campo MUST ser operável só pelo teclado, ter nome acessível e anunciar o mês mostrado após o salto.
- **FR-008**: O salto MUST manter a fonte e o filtro de status escolhidos, e MUST NOT mudar a seção "Hoje", a legenda nem o modo offline.
- **FR-009**: O mês escolhido MUST NOT ser guardado: ao recarregar ou reabrir o calendário, ele abre no mês atual.
- **FR-010**: A mudança MUST ser só no site: nenhuma rota, esquema ou contrato da API muda, e o site continua aceito por uma API anterior.
- **FR-011**: O campo MUST caber na largura do calendário em tela estreita e MUST NOT deslocar a grade ao exibir ou apagar a mensagem de erro (altura reservada).

### Key Entities *(include if feature involves data)*

- **Mês exibido**: já existente; passa a poder ser trocado de uma vez, por escolha direta. Vive só na tela.
- **Data de destino**: mês e ano, ou data completa, informada pela pessoa; é validada contra o período navegável e não é salva.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A pessoa chega a qualquer mês do período navegável em até 3 toques ou teclas, contra até 12 hoje.
- **SC-002**: Informando uma data válida, o dia fica à vista e com foco sem rolagem manual em 100% dos casos testados.
- **SC-003**: 100% das datas inválidas, futuras ou fora do período deixam o mês como está e mostram mensagem.
- **SC-004**: Sem usar o campo, o calendário é idêntico ao de antes (sem regressão visual ou de comportamento).
- **SC-005**: O campo passa na verificação de acessibilidade automatizada e é usável só pelo teclado.

## Assumptions

- O período navegável é o já existente: de 12 meses antes do mês atual até o mês atual; este recurso não o amplia.
- A cruzada de um dia só abre pelas regras que a grade já tem (guardada ou buscável na fonte dentro da janela de 366 dias).
- O formato de data segue o que o navegador oferece para o idioma pt-BR; sem biblioteca nova.
- Não há atalho global de teclado para o campo nesta versão.
- O mês escolhido não vai para as configurações nem para o aparelho.
