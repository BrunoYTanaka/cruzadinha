# Feature Specification: Migrar progresso de visitante para a conta

**Feature Branch**: `feat/057-migrar-progresso-visitante`

**Created**: 2026-10-30

**Status**: Implemented

**Input**: User description: https://github.com/BrunoYTanaka/cruzadinha/issues/92 — "Ao criar conta ou entrar, oferecer importar o progresso salvo no IndexedDB (`cruzadinha-visitante`). Regra de conflito quando a conta já tem progresso na mesma cruzada: vale o `savedAt` mais novo, e cruzada concluída não é sobrescrita. Exige endpoint de importação na API e tela de confirmação no site. Depois de importar, o progresso local do visitante é apagado." (origem: #90)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Levar meu progresso de visitante para a conta (Priority: P1)

Uma pessoa jogou como visitante e tem cruzadas em andamento ou concluídas guardadas no aparelho. Ao criar a conta ou entrar numa conta existente, o site pergunta se ela quer importar esse progresso. Ela vê um resumo (quantas cruzadas, quantas concluídas, quantas em andamento) e confirma. O progresso passa para a conta e o que estava no aparelho como visitante é apagado.

**Why this priority**: É o pedido central; sem isso quem se cadastra perde o que já jogou.

**Independent Test**: Como visitante, deixar uma cruzada em andamento e outra concluída, entrar numa conta sem progresso, aceitar a importação e conferir que as duas aparecem na conta e que o aparelho não guarda mais progresso de visitante.

**Acceptance Scenarios**:

1. **Given** um visitante com progresso no aparelho, **When** ele entra numa conta e ainda não decidiu sobre a importação, **Then** o site mostra uma tela de confirmação com o resumo do que seria importado.
2. **Given** a tela de confirmação, **When** a pessoa confirma, **Then** o progresso entra na conta, o progresso local de visitante é apagado e ela vê uma mensagem de sucesso com a contagem.
3. **Given** um visitante que acabou de criar a conta e confirmou o e-mail, **When** entra pela primeira vez, **Then** a mesma oferta aparece.
4. **Given** um aparelho sem nenhum progresso de visitante, **When** a pessoa entra, **Then** nenhuma oferta aparece.

---

### User Story 2 - Conflito com o que a conta já tem (Priority: P1)

A conta pode já ter progresso na mesma cruzada (jogada em outro aparelho). A importação nunca piora a conta: vale o salvamento mais novo (`savedAt`), e uma cruzada já concluída na conta nunca é sobrescrita.

**Why this priority**: Sem a regra, a importação poderia apagar trabalho da conta; faz parte do pedido.

**Independent Test**: Preparar contas com progresso mais novo, mais antigo e concluído na mesma cruzada, importar e conferir cada resultado.

**Acceptance Scenarios**:

1. **Given** a conta com progresso em andamento mais antigo que o do aparelho, **When** importa, **Then** o progresso do aparelho passa a ser o da conta.
2. **Given** a conta com progresso em andamento mais novo que o do aparelho, **When** importa, **Then** a conta mantém o seu e o do aparelho é descartado.
3. **Given** a conta com a cruzada concluída, **When** importa progresso do aparelho dessa cruzada (em andamento ou concluído), **Then** a conta não muda.
4. **Given** a conta com progresso em andamento e o aparelho com a cruzada concluída e mais nova, **When** importa, **Then** a conta passa a tê-la concluída, com o tempo e o recorde corretos.
5. **Given** cruzadas que a conta não tem, **When** importa, **Then** todas entram como estavam no aparelho.
6. **Given** o resumo final, **When** a importação termina, **Then** a pessoa vê quantas foram importadas e quantas foram mantidas como estavam na conta.

---

### User Story 3 - Recusar ou adiar a importação (Priority: P2)

A pessoa pode dizer "agora não" ou descartar o progresso de visitante sem importar. Adiar mantém o progresso no aparelho e a oferta volta na próxima carga do site; descartar apaga o progresso local só depois de uma confirmação clara de que ele será perdido.

**Why this priority**: Dá controle e evita importar sem querer, mas a importação já é útil sem isso.

**Independent Test**: Escolher "Agora não", recarregar, entrar de novo e ver a oferta outra vez (recarregar a página basta); escolher "Descartar", confirmar, e ver que o aparelho fica sem progresso de visitante e a conta sem mudança.

**Acceptance Scenarios**:

1. **Given** a tela de confirmação, **When** a pessoa escolhe "Agora não", **Then** nada muda no aparelho nem na conta e a oferta reaparece na próxima carga do site.
2. **Given** a tela de confirmação, **When** a pessoa escolhe descartar e confirma o aviso de perda, **Then** o progresso local de visitante é apagado e a conta não muda.
3. **Given** a pessoa que já adiou, **When** ela sai da conta e volta a jogar como visitante, **Then** o progresso continua no aparelho como antes.

---

### User Story 4 - Falha ou interrupção sem perder nada (Priority: P2)

Se a rede cair, a sessão acabar ou a API recusar, o progresso do aparelho continua intacto e a pessoa pode tentar de novo. O progresso local só é apagado depois que a conta confirmou o recebimento.

**Why this priority**: Evita perda de dados, mas é uma proteção sobre o fluxo principal.

**Independent Test**: Simular falha de rede na confirmação, ver o aviso, conferir que o progresso local segue lá e que tentar de novo conclui a importação.

**Acceptance Scenarios**:

1. **Given** a confirmação, **When** a requisição falha, **Then** a pessoa vê um aviso com "Tentar de novo" e o progresso local não é tocado.
2. **Given** uma importação que a conta recebeu mas cuja resposta se perdeu, **When** a pessoa tenta de novo, **Then** o resultado é o mesmo, sem duplicar nem piorar nada.
3. **Given** que algumas cruzadas do aparelho não existem mais na base ou são inválidas, **When** importa, **Then** as válidas entram, as outras são contadas como não importadas e a pessoa é informada; só as importadas ou comprovadamente já cobertas pela conta saem do aparelho.

---

### Edge Cases

- Várias contas no mesmo aparelho: o progresso de visitante é oferecido a quem entrar, mas nunca é importado sem confirmação; uma conta nunca recebe o progresso de outra conta.
- Progresso de visitante de uma cruzada cuja data é futura ou cujo `savedAt` está no futuro além da tolerância das regras de salvamento: é recusado como inválido e não importado.
- Uma cruzada aberta em outra aba como visitante durante a importação: se a aba salvar depois de o site ler o registro, o registro novo é mantido no aparelho (só se apaga o que ainda é o que foi enviado) e nunca sobrescreve a conta sem nova confirmação.
- O aparelho tem muitas cruzadas (por exemplo, um ano de jogo): a importação aceita o volume e informa o resultado, sem travar o jogo.
- A sessão termina durante a oferta: a pessoa volta a ser visitante, nada é importado nem apagado.
- Rascunho (lápis) e relógio: o rascunho nunca é importado; o rascunho de visitante de uma cruzada importada (ou descartada) é apagado junto com o registro dela, porque sem o registro ele seria descartado ao abrir.
- Ajudas já usadas: a conta não guarda ajudas hoje (nem no salvamento normal), então elas não são importadas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O site MUST oferecer a importação quando uma pessoa cria a conta (primeira entrada) ou entra e o aparelho tem progresso de visitante.
- **FR-002**: O site MUST NOT oferecer nada quando não há progresso de visitante no aparelho.
- **FR-003**: A oferta MUST mostrar um resumo (total de cruzadas, concluídas, em andamento) antes de qualquer envio, e nada MUST ser enviado sem confirmação explícita.
- **FR-004**: Ao confirmar, o site MUST enviar à conta o progresso de visitante, e a conta MUST aplicá-lo por cruzada com a regra de conflito abaixo.
- **FR-005**: Regra de conflito: quando a conta já tem progresso na mesma cruzada, vale o `savedAt` mais novo; uma cruzada concluída na conta MUST NOT ser sobrescrita; se vence o progresso do aparelho, valem as mesmas regras de conclusão, tempo e recorde do salvamento normal.
- **FR-006**: A importação MUST ser idempotente: repetir o mesmo envio não duplica nem altera o resultado.
- **FR-007**: A importação MUST pertencer sempre à conta da sessão; a conta de destino nunca vem do conteúdo enviado.
- **FR-008**: Cada item inválido (cruzada inexistente, formato, `savedAt` fora da tolerância) MUST ser recusado sozinho, sem impedir os demais, e a resposta MUST dizer quantos foram importados, mantidos e recusados.
- **FR-009**: O progresso local de visitante MUST ser apagado somente depois da confirmação de recebimento pela conta, e só o dos itens importados ou já cobertos pela conta; os recusados ficam no aparelho.
- **FR-010**: Em qualquer falha (rede, sessão, API) o progresso local MUST ficar intacto e a pessoa MUST poder tentar de novo.
- **FR-011**: "Agora não" MUST manter tudo como está e permitir nova oferta na próxima carga do site; descartar MUST pedir confirmação do risco de perda antes de apagar o progresso local.
- **FR-012**: O site MUST apagar o registro local só se ele ainda for o que foi enviado; um salvamento mais novo feito em outra aba durante a importação MUST ficar no aparelho e MUST NOT sobrescrever a conta sem nova confirmação.
- **FR-013**: A importação MUST respeitar um limite de uso por conta (o mesmo de salvamento, 1800 por hora, contado por pedido) e um tamanho máximo de 100 cruzadas por pedido, respondendo `429` com `Retry-After` ou `400` quando excedido; o site envia em lotes e espera o `Retry-After`.
- **FR-014**: Os dados de visitante e de conta MUST continuar sem se misturar fora desta importação explícita; rascunho e configurações do aparelho não são importados (o rascunho só é apagado junto com o registro da cruzada, ver Edge Cases).
- **FR-015**: A tela de oferta MUST ser acessível por teclado e leitor de tela, e a importação não pode bloquear o jogo nem a navegação.

### Key Entities

- **Progresso de visitante**: registro local de uma cruzada (cruzada, grade, tempo, situação, `savedAt`, conclusão, recorde, ajudas, geração do jogo).
- **Progresso da conta**: registro por conta e cruzada, o destino da importação.
- **Pedido de importação**: conjunto de progressos de visitante enviado de uma vez pela conta da sessão.
- **Resultado da importação**: contagem de importados, mantidos (conta venceu) e recusados, com o motivo geral dos recusados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa com progresso de visitante conclui a importação em no máximo 2 toques/cliques depois de entrar.
- **SC-002**: Em 100% dos casos de teste de conflito, a conta nunca fica com menos progresso do que tinha, e cruzada concluída nunca é sobrescrita.
- **SC-003**: Em 100% das falhas simuladas, o progresso do aparelho continua inteiro até a conta confirmar o recebimento.
- **SC-004**: Importar um aparelho com 366 dias por fonte termina em até 10 segundos em uma conexão comum e sem travar a tela.
- **SC-005**: Repetir uma importação já concluída não altera nenhum dado da conta.
- **SC-006**: Depois de uma importação completa, o aparelho não guarda mais progresso de visitante dos itens importados.

## Assumptions

- A oferta aparece a cada carga do site com conta e progresso local pendente, até a pessoa importar ou descartar; não há tela nova de configurações.
- Só o progresso (grade, tempo, situação, conclusão, recorde) é importado; rascunho, configurações e fila offline ficam como estão.
- A solução continua sem passar pelo aparelho: o site já só guarda o que o visitante digitou, e a API valida o formato como no salvamento normal.
- A decisão de conclusão continua do site, como no resto do produto; a API checa formato e as mesmas regras de `decideSave`.
- Registro de contas, e-mail e sessão existentes são reaproveitados, sem alteração de contrato para versões anteriores do site.
- Limites definidos em `research.md` (Decisões 2 e 5): 100 itens por pedido e um uso do limite de salvamento por pedido.
