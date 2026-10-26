# Feature Specification: Ajudas zeradas ao jogar de novo

**Feature Branch**: `fix/reset-helps-on-play-again`

**Created**: 2026-10-26

**Status**: Implemented (visitor two-tab case)

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/86" ([Bug]: ajudas não são reiniciadas ao clicar em "Jogar novamente")

## Contexto

Ao concluir uma cruzada, a pessoa fecha a janela de conclusão com "Ver o tabuleiro" e, no modo leitura, pode escolher "Jogar de novo" (o mesmo botão aparece ao reabrir uma cruzada já concluída). O tabuleiro volta vazio e o tempo recomeça, mas, segundo o relato, as ajudas (revelar letra, revelar palavra, verificar) continuam contadas como na partida anterior, e o contador de ajudas restantes não volta ao limite definido nos ajustes (letras e palavras).

O ator é o jogador, visitante ou com conta. As ajudas ficam só no aparelho. Ainda não foi verificado se o defeito ocorre só como visitante, só com conta ou nos dois casos, nem qual é a causa (a hipótese do relato é que o reinício não limpa o que está guardado no aparelho; a leitura do código e testes de componente não reproduziram o defeito, então ele pode depender de condições do navegador real, como duas abas abertas, ou de uma versão antiga do site). A spec descreve o comportamento correto e cobre os dois tipos de jogador.

Esta spec não muda uma regra documentada: as specs 010 (FR-023, "do zero") e 021 (limites de ajuda) já pressupõem uma partida nova sem ajudas gastas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nova partida começa com o limite completo de ajudas (Priority: P1)

Depois de usar ajudas e concluir a cruzada, a pessoa escolhe "Jogar de novo" e vê todas as ajudas disponíveis de novo, como em uma partida nunca jogada.

**Why this priority**: É o defeito relatado. Sem isso a pessoa joga a segunda partida com menos ajudas do que os ajustes prometem.

**Independent Test**: Usar uma ajuda de letra e uma de palavra, concluir, escolher "Jogar de novo" e conferir que os contadores mostram o limite completo dos ajustes e que as marcas de ajuda sumiram.

**Acceptance Scenarios**:

1. **Given** uma cruzada concluída com ajudas de letra e de palavra usadas e a janela de conclusão fechada com "Ver o tabuleiro", **When** a pessoa escolhe "Jogar de novo" no modo leitura, **Then** os contadores de letras e de palavras mostram o limite completo dos ajustes.
2. **Given** uma cruzada concluída reaberta mais tarde, com ajudas guardadas no aparelho, **When** a pessoa escolhe "Jogar de novo", **Then** o resultado é o mesmo do cenário 1.
3. **Given** células marcadas como ajudadas ou erradas na partida anterior, **When** a pessoa joga de novo, **Then** nenhuma marca nem célula travada por ajuda permanece no tabuleiro.
4. **Given** um limite de ajudas "sem limite" nos ajustes, **When** a pessoa joga de novo, **Then** continua sem limite.
5. **Given** a pessoa jogando como visitante, **When** joga de novo, **Then** vale o mesmo comportamento de quem tem conta.

---

### User Story 2 - O reinício das ajudas sobrevive a recarregar a página (Priority: P1)

Depois de jogar de novo, recarregar a página, sair e voltar ou abrir a mesma cruzada em outra aba não faz as ajudas da partida anterior reaparecerem.

**Why this priority**: Um contador que volta ao limite só na tela, mas reaparece gasto após recarregar, seria o mesmo defeito.

**Independent Test**: Usar ajudas, concluir, jogar de novo, recarregar a página e conferir que os contadores continuam no limite completo.

**Acceptance Scenarios**:

1. **Given** uma partida recém-reiniciada sem ajudas usadas, **When** a pessoa recarrega a página, **Then** os contadores continuam no limite completo e sem marcas.
2. **Given** uma partida recém-reiniciada, **When** a pessoa usa uma ajuda e recarrega, **Then** só essa ajuda aparece como usada (a da partida anterior não volta).
3. **Given** a mesma cruzada aberta em duas abas do mesmo aparelho (visitante ou conta), **When** a pessoa joga de novo em uma delas, **Then** a outra aba, ao continuar jogando ou ao recarregar, não devolve as ajudas nem as letras da partida anterior.

---

### User Story 3 - Reinício que falha não perde nem mistura nada (Priority: P2)

Se "Jogar de novo" não puder ser concluído (por exemplo, sem conexão, no caso de quem tem conta), nada muda: as ajudas continuam como estavam e o modo leitura segue na tela.

**Why this priority**: Evita um estado pela metade (tabuleiro antigo com ajudas zeradas, ou o contrário).

**Independent Test**: Com conta e sem conexão, escolher "Jogar de novo" e conferir o aviso de falta de conexão e que contadores e marcas ficaram como estavam.

**Acceptance Scenarios**:

1. **Given** uma conta sem conexão no modo leitura, **When** a pessoa escolhe "Jogar de novo", **Then** o site mostra o aviso já existente e mantém tabuleiro, contadores e marcas como estavam.

---

### Edge Cases

- Ajuda usada, conclusão, "Jogar de novo" e nova conclusão: a segunda partida conta só as ajudas da segunda partida.
- Reduzir o limite nos ajustes antes de jogar de novo: a nova partida usa o limite vigente, não o de quando a primeira partida começou.
- Ajudas de outras cruzadas do mesmo aparelho não são alteradas.
- Ajudas guardadas pelo visitante e pela conta não se misturam; reiniciar uma não altera a outra.
- Duas abas do visitante na mesma cruzada: o reinício feito em uma não é desfeito pelo salvamento da outra, que ainda guarda o jogo anterior. Isso refina a regra "o salvamento mais recente vence entre abas" da feature 013, que continua valendo dentro do mesmo jogo.
- Melhor tempo e recorde continuam mantidos ao jogar de novo (regra existente).
- Um salvamento ainda pendente da partida anterior não pode devolver as ajudas depois do reinício.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ao jogar de novo, o sistema MUST zerar o uso de ajudas de letra e de palavra da cruzada, de modo que os contadores mostrem o limite completo dos ajustes vigentes (inclusive "sem limite").
- **FR-002**: Ao jogar de novo, o sistema MUST remover as marcas de ajuda (letra revelada, errada) e as células travadas por ajuda.
- **FR-003**: O reinício das ajudas MUST valer para visitante e para conta, tanto logo depois de concluir (janela fechada com "Ver o tabuleiro") quanto ao reabrir uma cruzada já concluída em modo leitura.
- **FR-004**: O estado de ajudas reiniciado MUST persistir: depois de recarregar a página ou reabrir a cruzada no mesmo aparelho, as ajudas da partida anterior MUST NOT reaparecer.
- **FR-005**: Se o reinício não puder ser concluído, o sistema MUST NOT alterar as ajudas, as marcas nem o tabuleiro.
- **FR-006**: O reinício MUST afetar apenas a cruzada reiniciada: ajudas de outras cruzadas e os ajustes da pessoa MUST permanecer como estavam.
- **FR-009**: Depois de um reinício, o salvamento de uma aba aberta antes dele MUST NOT sobrescrever o jogo novo (letras, tempo ou ajudas); a aba antiga mostra o jogo novo ao recarregar.
- **FR-007**: O melhor tempo e o recorde MUST continuar mantidos, e as regras de "Jogar de novo" das specs 010 e 013 (conta exige o servidor; visitante reinicia no aparelho) MUST continuar valendo.
- **FR-008**: O comportamento MUST ter testes automatizados cobrindo visitante e conta. Se o defeito for reproduzido, o teste de regressão MUST falhar sem a correção; se não for reproduzível, os testes ficam como proteção, a não reprodução é registrada e a pessoa que relatou é consultada antes de fechar a questão.

### Key Entities

- **Ajudas de uma cruzada**: contadores de letras e de palavras usados, marcas de células ajudadas ou erradas e células travadas, guardados no aparelho por pessoa (ou visitante) e por cruzada.
- **Limites de ajuda**: valores dos ajustes (um número ou "sem limite", um para letras e outro para palavras) contra os quais o contador restante é calculado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos reinícios por "Jogar de novo" (conclusão e modo leitura, visitante e conta), os contadores mostram o limite completo dos ajustes logo após o reinício.
- **SC-002**: Em 100% dos casos, recarregar a página depois do reinício mantém os contadores no limite completo.
- **SC-003**: A jogada seguinte ao reinício consome exatamente 1 ajuda do limite por uso, sem desconto de partidas anteriores.
- **SC-004**: Se o defeito for reproduzido, o teste de regressão falha antes da correção e passa depois dela; se não, os testes de proteção passam e o resultado da investigação fica registrado.

## Assumptions

- O caso de duas abas do visitante foi o único que reproduziu (ver `research.md` §5) e, por mudar a regra de salvamento entre abas da feature 013, foi tratado aqui como parte desta correção por decisão da pessoa responsável.

- A causa ainda não está confirmada; a investigação e a correção são tarefas do plano, e a spec só fixa o comportamento esperado.
- O defeito está no site; não se espera mudança no servidor nem no banco.
- "Jogar de novo" e "Jogar novamente" são o mesmo botão; o texto atual do site não muda.
- Esta correção não muda o formato dos ajustes nem exige migração.
