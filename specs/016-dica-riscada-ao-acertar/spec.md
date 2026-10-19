# Feature Specification: Dica riscada só ao acertar a palavra

**Feature Branch**: `feat/016-dica-riscada-ao-acertar`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Queria no jogo, a dica fosse riscado apenas se o usuário acertou a palavra e isso no futuro vai ser configurável pelo usuário."

## Contexto

Hoje a lista de dicas risca e apaga uma dica assim que todas as células da palavra têm letra, esteja a palavra certa ou errada (feature 010, FR-012; feature 011, FR-023: "Uma dica já preenchida continua riscada e apagada, número incluído"). Com isso, uma palavra errada parece resolvida e o jogador deixa de olhar para ela.

Esta feature muda a regra: a dica só fica riscada quando a palavra está **certa**. Ela muda só o site; a solução já chega ao navegador junto do puzzle (features 007 e 013) e a API não muda. No futuro o jogador poderá escolher a regra (por exemplo "ao preencher", "ao acertar" ou "nunca"); essa escolha não faz parte desta feature, mas a regra deve ficar isolada para que a preferência entre sem reescrever as telas.

Esta feature substitui a última frase de FR-023 da feature 011 e o trecho "as já preenchidas distintas" de FR-012 da feature 010.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Riscar a dica só quando a palavra está certa (Priority: P1)

O jogador preenche uma palavra. Se todas as letras batem com a solução, a dica dela fica riscada e apagada na lista. Se alguma letra está errada, a dica continua normal, como uma palavra ainda por resolver.

**Why this priority**: É o pedido inteiro: a lista passa a mostrar o que falta resolver de verdade.

**Independent Test**: Num puzzle de teste, preencher uma palavra com as letras certas e outra com uma letra errada, e conferir que só a primeira dica fica riscada, na lista do computador e na lista do celular.

**Acceptance Scenarios**:

1. **Given** a palavra 1 horizontal com todas as letras certas, **When** o jogador digita a última letra, **Then** a dica "1." de Horizontais fica riscada e apagada.
2. **Given** a palavra 1 horizontal toda preenchida com uma letra errada, **When** o jogador olha a lista, **Then** a dica "1." aparece normal, sem risco.
3. **Given** uma dica riscada, **When** o jogador apaga ou troca uma letra da palavra e ela deixa de estar certa, **Then** o risco some na hora.
4. **Given** uma palavra errada, **When** o jogador corrige a letra errada (diretamente ou numa palavra que cruza com ela), **Then** a dica fica riscada na hora.
5. **Given** a solução com letra acentuada (por exemplo "É") e o jogador digitou "E", **When** a palavra fica completa, **Then** ela conta como certa e a dica fica riscada, pela mesma comparação da conclusão.
6. **Given** uma palavra revelada pela ajuda "revelar palavra" ou completada com letras reveladas, **When** ela fica completa, **Then** a dica fica riscada, já que as letras reveladas estão certas.
7. **Given** um puzzle concluído aberto em modo leitura, **When** o jogador olha a lista, **Then** todas as dicas aparecem riscadas.
8. **Given** um leitor de tela, **When** o foco chega numa dica riscada, **Then** ele ouve que a palavra está resolvida (e não apenas "preenchida"); uma dica completa mas errada não anuncia nada a mais.

---

### Edge Cases

- Palavra completa e errada que cruza com uma certa: só a certa fica riscada; a cruzada continua normal até ser corrigida.
- Grade completa e errada: as dicas certas ficam riscadas e as erradas não. Isso mostra ao jogador quais palavras estão erradas; é o efeito esperado da nova regra e não conta como uso de ajuda.
- A ajuda "verificar" continua igual: as marcas dela no tabuleiro não mudam o risco das dicas, que depende só das letras.
- Progresso retomado (de outro aparelho ou do navegador do visitante): ao abrir o jogo, o risco é calculado a partir das letras guardadas e da solução, sem dado novo salvo.
- Barra da dica ativa (acima do tabuleiro): continua sem risco, como hoje.
- O tabuleiro não muda: células de palavras certas não ganham cor nem marca.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Uma dica da lista MUST aparecer riscada e apagada (número incluído, como na feature 011) se e somente se todas as células da palavra têm letra e cada letra é igual à letra da solução, comparadas pela letra simples (sem acento), a mesma comparação usada para decidir a conclusão.
- **FR-002**: Uma palavra completa com ao menos uma letra diferente da solução MUST aparecer como uma dica não resolvida, sem nenhuma marca visual de "preenchida".
- **FR-003**: O estado de cada dica MUST ser atualizado a cada mudança de letra (digitar, apagar, Delete, ajudas), tanto no computador quanto na lista do celular.
- **FR-004**: O texto lido pelo leitor de tela numa dica riscada MUST dizer que a palavra está resolvida (o nome da dica termina com ", resolvida", no lugar do ", preenchida" de hoje).
- **FR-005**: Para quem tem conta e para visitante, a regra MUST ser a mesma e MUST NOT salvar nem enviar dado novo: o estado vem só das letras e da solução já carregadas.
- **FR-006**: A decisão "esta dica fica riscada?" MUST ficar numa regra única, com o modo atual ("ao acertar") como único valor desta feature, de forma que uma futura preferência do jogador ("ao preencher", "ao acertar", "nunca") troque só o modo, sem mudar as telas.
- **FR-007**: O risco da dica MUST NOT contar como uso de ajuda nem mudar tempo, conclusão ou recorde.

### Key Entities

- **Situação da dica**: para cada palavra, se ela está resolvida (completa e certa) ou não; derivada das letras do jogador e da solução, nunca guardada.
- **Modo de riscar**: a regra que decide quando a dica fica riscada; nesta feature, sempre "ao acertar".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos casos testados, uma dica fica riscada exatamente quando a palavra está certa, incluindo letras acentuadas, letras reveladas e correções em palavras que se cruzam.
- **SC-002**: O risco aparece ou some no mesmo instante em que a letra muda, sem atraso perceptível, mesmo no maior tabuleiro suportado.
- **SC-003**: Teste automático de acessibilidade da tela do jogo sem violações nos dois temas, com o anúncio "resolvida" nas dicas riscadas.
- **SC-004**: Nenhuma mudança na API nem nos dados salvos de progresso.

## Assumptions

- A solução já está no navegador durante o jogo para conta e visitante (features 007 e 013), então a comparação não precisa de nova ida ao servidor.
- Mostrar quais palavras estão certas é aceito como parte do jogo, e não como ajuda limitada; quem não quiser essa informação terá a preferência futura.
- A preferência do jogador (escolher o modo, onde ela fica e se vai com a conta) é uma feature futura; esta feature só deixa a regra isolada.
- Os textos e o estilo do risco seguem os da feature 011 (cor apagada e linha fina); só muda quando ele aparece.
- Fora do escopo: a tela de preferências, marcar palavras certas no tabuleiro, mudanças na ajuda "verificar".
