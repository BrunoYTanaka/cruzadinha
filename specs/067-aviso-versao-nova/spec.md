# Feature Specification: Aviso de versão nova no calendário

**Feature Branch**: `feat/067-aviso-versao-nova`

**Created**: 2026-11-19

**Status**: Draft

**Input**: User description: "Aviso de versão nova do site (PWA). Hoje, depois de um deploy, a versão nova só é aplicada quando todas as abas do site fecham (feature 041, FR-007), e no PWA instalado/celular isso pode levar dias. Mudança: quando houver uma versão nova esperando, mostrar um aviso não bloqueante SOMENTE na tela do calendário (/calendario), usando o componente de aviso existente (variante informação): texto "Saiu uma versão nova do Cruzadinha.", botão "Atualizar" (aplica a versão nova e recarrega a página) e botão "Fechar" (esconde o aviso até o próximo carregamento). Depois do clique em Atualizar, o botão fica em espera ("Atualizando…") até recarregar. O jogo, o x1 e as demais telas não mostram o aviso; nunca recarregar no meio de um jogo; sem atualização automática. Quem não passa pelo calendário continua recebendo a versão nova ao fechar todas as abas, como hoje. O progresso pendente não pode se perder ao atualizar. Referência visual: docs/mockups/design-system.html, Componentes → Aviso ("Com ação e Fechar, e a ação em espera depois do clique"); o design system também passou a centralizar o aviso na vertical, como o componente já faz."

## Contexto

A feature 041 (FR-007) decidiu que uma versão nova do site só vale na próxima abertura, com todas as abas e janelas fechadas, sem aviso nem ação da pessoa, para nunca interromper uma partida. No aplicativo instalado e no celular o site quase nunca é fechado de verdade, então uma correção publicada pode levar dias para chegar. Esta feature mantém a regra de nunca interromper uma partida, mas dá à pessoa, numa tela sem jogo, a opção de aplicar a versão nova na hora. A FR-007 da 041 passa a ter esta exceção (ver FR-011).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Atualizar pelo calendário (Priority: P1)

Uma versão nova do site foi publicada e já chegou ao aparelho, mas ainda não vale porque o site está aberto. A pessoa abre o calendário e vê, no topo do conteúdo, o aviso "Saiu uma versão nova do Cruzadinha." com os botões "Atualizar" e "Fechar". Ao tocar em "Atualizar", o botão passa a "Atualizando…" e fica em espera; a página recarrega já na versão nova, no mesmo calendário, e o aviso some.

**Why this priority**: É o motivo da feature: fazer a correção publicada chegar a quem usa o aplicativo instalado sem esperar dias.

**Independent Test**: Abrir o site, publicar (ou simular) uma versão nova, ir ao calendário, tocar em "Atualizar" e conferir que a página recarrega na versão nova.

**Acceptance Scenarios**:

1. **Given** uma versão nova esperando no aparelho, **When** a pessoa abre o calendário, **Then** vê o aviso de informação "Saiu uma versão nova do Cruzadinha." com "Atualizar" e "Fechar", no topo do conteúdo, sem cobrir nada.
2. **Given** o aviso no calendário, **When** a pessoa toca em "Atualizar", **Then** o botão mostra "Atualizando…" em espera, não aceita outro toque, e a página recarrega na versão nova, no mesmo endereço.
3. **Given** a página recarregada depois de "Atualizar", **When** o calendário aparece, **Then** o aviso não aparece (não há mais versão esperando).
4. **Given** o calendário já aberto, **When** uma versão nova termina de chegar ao aparelho, **Then** o aviso aparece sem recarregar a página e sem tirar o foco de onde ele está.
5. **Given** nenhuma versão nova esperando, **When** a pessoa abre o calendário, **Then** nenhum aviso de versão aparece e nada na tela muda em relação a hoje.
6. **Given** uma pessoa visitante ou com conta, **When** há versão nova esperando, **Then** o aviso aparece igual para as duas.

---

### User Story 2 - Dispensar o aviso (Priority: P2)

A pessoa não quer atualizar agora. Toca em "Fechar" e o aviso some; ela continua usando o site na versão atual.

**Why this priority**: A atualização é sempre escolha da pessoa; sem como dispensar, o aviso vira incômodo.

**Independent Test**: Com versão nova esperando, abrir o calendário, tocar em "Fechar", navegar para outra tela e voltar ao calendário.

**Acceptance Scenarios**:

1. **Given** o aviso no calendário, **When** a pessoa toca em "Fechar", **Then** o aviso some e nada recarrega.
2. **Given** o aviso fechado, **When** a pessoa sai do calendário e volta (sem recarregar a página), **Then** o aviso continua fechado.
3. **Given** o aviso fechado, **When** a página é recarregada e a versão nova ainda está esperando, **Then** o aviso aparece de novo no calendário.

---

### User Story 3 - Nada muda fora do calendário (Priority: P1)

Com uma versão nova esperando, a pessoa joga, abre um x1 ou qualquer outra tela. Nada aparece e nada recarrega. Se ela não passar pelo calendário, a versão nova vale quando todas as abas forem fechadas e abertas de novo, como hoje.

**Why this priority**: É a garantia herdada da 041: nunca interromper uma partida. Falhar nisto é pior que não ter a feature.

**Independent Test**: Com versão nova esperando, abrir o jogo, o x1, a landing, Estatísticas, Conta e Configurações e conferir que nenhum aviso de versão aparece e nada recarrega.

**Acceptance Scenarios**:

1. **Given** uma versão nova esperando, **When** a pessoa está no jogo ou num x1, **Then** nenhum aviso de versão aparece, o tabuleiro não se move e a página não recarrega.
2. **Given** uma versão nova esperando, **When** a pessoa está em qualquer tela que não seja o calendário, **Then** nenhum aviso de versão aparece.
3. **Given** uma versão nova esperando e a pessoa nunca tocou em "Atualizar", **When** todas as abas são fechadas e o site é aberto de novo, **Then** a versão nova vale, como hoje.
4. **Given** uma versão nova esperando, **When** passa qualquer tempo sem a pessoa tocar em "Atualizar", **Then** o site nunca se atualiza nem recarrega sozinho.

---

### Edge Cases

- **Outra aba aberta no jogo**: a pessoa toca em "Atualizar" no calendário enquanto outra aba tem uma partida. Só a aba do calendário recarrega; a outra aba não recarrega sozinha e a partida continua. A versão nova passa a valer nela no próximo carregamento dela.
- **Progresso pendente**: há salvamentos de conta ainda na fila local (sem rede ou esperando envio). Atualizar não apaga a fila; ela é enviada depois do recarregamento, como em qualquer abertura do site.
- **Sem rede**: a versão nova já está no aparelho; "Atualizar" funciona sem rede e o calendário reabre com o que está guardado.
- **Duas versões seguidas**: uma versão mais nova chega enquanto outra já esperava. Um único aviso; "Atualizar" aplica a mais recente.
- **Aviso fechado e versão ainda mais nova**: o aviso continua fechado até o próximo carregamento da página.
- **Toque duplo em "Atualizar"**: o segundo toque não faz nada (botão em espera).
- **Atualização que não termina**: se a página não recarregar em até 10 segundos depois do toque, a página recarrega mesmo assim; nunca fica presa em "Atualizando…".
- **Navegador sem suporte a aplicativo instalado/funcionamento sem rede**: não há versão esperando, então o aviso nunca aparece; nada muda.
- **Site aberto por muito tempo sem nova abertura**: o site procura versão nova quando abre e quando a pessoa volta para a aba depois de deixá-la em segundo plano, para o aviso não depender só de fechar e abrir o site.
- **Tela estreita (390 px)**: o texto fica acima e os dois botões juntos na linha de baixo, alinhados à direita, sem rolagem lateral.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Quando houver uma versão nova do site esperando no aparelho, o calendário (`/calendario`) MUST mostrar no topo do conteúdo um aviso de informação com o texto "Saiu uma versão nova do Cruzadinha.", um botão "Atualizar" e um botão "Fechar".
- **FR-002**: O aviso MUST usar o componente de aviso do design system (variante informação, com símbolo, ação e "Fechar"), conforme `docs/mockups/design-system.html`, Componentes → Aviso.
- **FR-003**: O aviso MUST aparecer somente no calendário. O jogo, o x1, a landing e todas as outras telas MUST NOT mostrá-lo.
- **FR-004**: Ao tocar em "Atualizar", o site MUST aplicar a versão nova e recarregar a página no mesmo endereço; até recarregar, o botão MUST mostrar "Atualizando…" em espera e ignorar novos toques.
- **FR-005**: Se a página não recarregar em até 10 segundos depois do toque em "Atualizar", o site MUST recarregar a página mesmo assim.
- **FR-006**: Ao tocar em "Fechar", o aviso MUST sumir sem recarregar nada e MUST continuar escondido até o próximo carregamento da página, mesmo saindo e voltando ao calendário.
- **FR-007**: O site MUST NOT aplicar a versão nova nem recarregar a página sem o toque da pessoa em "Atualizar".
- **FR-008**: Tocar em "Atualizar" numa aba MUST NOT recarregar outras abas ou janelas abertas do site.
- **FR-009**: Atualizar MUST NOT apagar progresso: o que está guardado no aparelho, a fila de salvamentos pendentes, o rascunho e a partida de visitante continuam iguais depois do recarregamento.
- **FR-010**: O site MUST procurar versão nova ao abrir e sempre que a aba volta a ficar visível; se uma versão nova chegar com o calendário aberto, o aviso MUST aparecer sem recarregar a página e sem mover o foco.
- **FR-011**: A FR-007 da feature 041 continua valendo para quem não toca em "Atualizar": a versão nova vale na próxima abertura do site com todas as abas fechadas. A spec da 041 MUST registrar a exceção desta feature.
- **FR-012**: O aviso MUST ser anunciado a leitores de tela de forma educada (sem interromper) e MUST NOT tomar o foco ao aparecer.
- **FR-013**: Em telas estreitas (até 390 px) o aviso MUST caber sem rolagem lateral, com os dois botões juntos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com uma versão nova esperando, uma pessoa no calendário passa a usar a versão nova com um toque, em menos de 5 segundos.
- **SC-002**: Em 100% das telas que não são o calendário, nenhum aviso de versão aparece e nenhuma recarga acontece com versão nova esperando.
- **SC-003**: Zero perda de progresso ao atualizar: tudo que estava guardado ou na fila antes do toque continua lá depois.
- **SC-004**: Uma versão nova publicada chega, em até um dia, a quem abre o calendário nesse período, mesmo sem fechar o aplicativo instalado.
- **SC-005**: O calendário sem versão nova esperando fica idêntico ao de hoje.

## Assumptions

- "Versão nova esperando" é a versão já baixada pelo aparelho que, pela regra da 041, só valeria na próxima abertura. O aviso não baixa nada novo.
- Fechar o aviso vale só para o carregamento atual da página; não é guardado no aparelho nem na conta.
- O aviso aparece para visitantes e contas; não há configuração para desligá-lo.
- O texto é fixo, sem número de versão nem lista de novidades.
- Fora do escopo: aviso em outras telas, atualização automática ao navegar e notas de versão.
- Depende do funcionamento sem rede e do aplicativo instalado da 041 e do componente de aviso da 062.
