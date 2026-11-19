# Feature Specification: Casa com grade densa (estilo O Globo)

**Feature Branch**: `feat/065-cruzada-densa`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "Cruzada gerada (fonte casa) no estilo do O Globo: trocar a grade de "palavras cruzadas livres" (feature 064, sources/generated/layout.ts) por uma grade densa estilo americano, como a do O Globo (11 x 11 com ~32 palavras, quase toda letra cruzada por duas palavras, poucos blocos, molde simétrico). O código preenche um molde de blocos com busca com retrocesso sobre uma lista de palavras pt-BR guardada no repositório, formada pela interseção do dicionário Hunspell pt_BR do LibreOffice (VERO, LGPL/MPL) com uma lista de frequência de uso; a frequência ajusta a dificuldade (fácil = palavras mais comuns). O modelo de linguagem passa a só escrever as dicas das palavras já escolhidas (1 chamada por tentativa, mantendo o limite de 3 chamadas por fonte e dia, a lista de bloqueio, a não repetição em 30 dias, o tamanho 9 a 15 e a dificuldade do /admin). Motivo: o dono achou a cruzada atual feia, esparsa, com muitos blocos e letras sem cruzamento."

## Clarifications

### Session 2026-11-17

- Q: Na grade da Casa, a pessoa digita as letras sem acento nem cedilha (MAE em vez de MÃE), como nas cruzadas de banca? → A: Sim; a grade guarda letras sem acento nem cedilha e a dica pode citar a forma acentuada.
- Q: Nomes próprios conhecidos (BRASIL, PELE, AMAZONAS) podem ser respostas na Casa? → A: Não; só palavras comuns do dicionário, sem lista de nomes próprios.
- Q: As respostas podem ser formas flexionadas (plurais, femininos, verbos conjugados) ou só a forma básica? → A: Qualquer forma flexionada, desde que esteja na faixa de frequência da dificuldade.
- Q: A regra de não repetir respostas dos últimos 30 dias vale também para palavras curtas? → A: Só para respostas de 5 letras ou mais; as de 3 e 4 letras podem repetir entre dias.

### Session 2026-11-19

- Q: O pedido de novo só das dicas que falharam gasta uma das 3 chamadas do dia ou fica fora do limite? → A: Gasta uma das 3; no máximo um reparo por grade, e sem chamada sobrando a tentativa falha.
- Q: Quando a palavra não rende dica boa (verbo conjugado como "tragam"), a dica pode citar o verbo em outra forma, ou a palavra é trocada? → A: A palavra é trocada: o código troca só ela e as vizinhas que a cruzam, travando o resto da grade, e pede dica só das palavras novas; a dica nunca traz a palavra em nenhuma forma.

## Contexto

A feature 064 criou a fonte Casa: o modelo devolve palavras e dicas, e o sistema encaixa as palavras numa grade de "palavras cruzadas livres". O resultado numa 11 x 11 tem cerca de 14 a 16 palavras, muitas casas pretas e muitas letras que pertencem a uma palavra só. A cruzada do O Globo, na mesma 11 x 11, tem cerca de 32 palavras, poucas casas pretas em desenho simétrico, e quase toda letra pertence a uma horizontal e a uma vertical. Esta feature troca só a forma da grade da Casa e de onde vêm as palavras; o resto da 064 (rotina, limites, painel, visibilidade, atribuição) continua valendo.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Jogar uma Casa densa como a do O Globo (Priority: P1)

Quem abre a Casa encontra uma grade cheia: casas pretas poucas e em desenho simétrico, toda casa branca faz parte de uma palavra horizontal e de uma vertical, e o número de palavras fica perto do de uma cruzada de jornal do mesmo tamanho. O jogo funciona como em qualquer outra fonte.

**Why this priority**: é o motivo da feature; a grade esparsa atual foi considerada feia.

**Independent Test**: gerar a cruzada de um dia com o modelo simulado e conferir, na cruzada salva, simetria, cruzamento de toda casa branca, proporção de casas pretas e número de palavras; abrir no site e resolver até a conclusão.

**Acceptance Scenarios**:

1. **Given** a configuração 11 x 11, **When** a coleta gera a Casa do dia, **Then** a cruzada salva tem grade 11 x 11, desenho de casas pretas simétrico por rotação de meia volta, toda casa branca em uma horizontal e uma vertical de 3 letras ou mais, e todas as palavras ligadas entre si.
2. **Given** qualquer tamanho de 9 a 15, **When** a coleta gera a Casa, **Then** a proporção de casas pretas fica dentro do limite de FR-004.
3. **Given** a cruzada gerada, **When** a pessoa joga no site, **Then** progresso, ajudas, relógio, conclusão, x1, offline e impressão funcionam como nas outras fontes.

---

### User Story 2 - Palavras reais na dificuldade escolhida (Priority: P1)

Toda resposta da Casa é uma palavra que existe no dicionário de português e cujo uso é comum o bastante para a dificuldade configurada: Fácil usa só palavras muito comuns, Difícil admite palavras menos usadas.

**Why this priority**: numa grade densa toda letra pertence a duas palavras; uma palavra estranha ou inventada trava o jogador em dois lugares.

**Independent Test**: gerar cruzadas com a mesma semente em Fácil e em Difícil e conferir que toda resposta está na lista de palavras do sistema e que a de Fácil só usa palavras da faixa mais comum.

**Acceptance Scenarios**:

1. **Given** dificuldade Fácil, **When** a cruzada é gerada, **Then** toda resposta está na faixa mais comum da lista de palavras, salvo quando a faixa não fecha a grade no tempo (FR-006).
2. **Given** qualquer dificuldade, **When** a cruzada é gerada, **Then** nenhuma resposta está fora da lista de palavras, na lista de bloqueio, e nenhuma resposta de 5 letras ou mais está entre as respostas da Casa dos últimos 30 dias.

---

### User Story 3 - Dicas escritas pelo modelo para a grade pronta (Priority: P2)

Com a grade já preenchida, o modelo recebe a lista de respostas e escreve uma dica por resposta, no estilo da dificuldade. A dica nunca contém a resposta nem termos bloqueados.

**Why this priority**: sem dica a cruzada não existe, mas a grade densa (história 1) é o ganho visível.

**Independent Test**: com o modelo simulado devolvendo dicas válidas, uma dica com a resposta, uma dica faltando e uma dica bloqueada, conferir que só o primeiro caso salva a cruzada.

**Acceptance Scenarios**:

1. **Given** uma grade preenchida, **When** o modelo devolve uma dica válida para cada resposta, **Then** a cruzada é salva com essas dicas.
2. **Given** uma grade preenchida, **When** falta a dica de uma resposta ou alguma dica é inválida, **Then** o sistema troca essas respostas e as vizinhas que as cruzam, mantendo o resto da grade e as dicas já aprovadas, e pede dica só das palavras novas, gastando mais uma das 3 chamadas do dia.
3. **Given** o reparo ainda deixar uma dica faltando ou inválida, ou não haver chamada do dia sobrando, **Then** a tentativa falha e a seguinte usa outra grade.
4. **Given** o limite de chamadas do dia esgotado, **When** a coleta roda, **Then** a Casa é pulada sem chamada, como na 064.

---

### User Story 4 - Admin revê a cruzada densa (Priority: P3)

Em `/admin`, o administrador continua vendo respostas e dicas da Casa de hoje, as chamadas restantes, e pode descartar a cruzada nas mesmas condições da 064. Tamanho e dificuldade continuam configuráveis.

**Why this priority**: o painel já existe; só precisa continuar correto com mais palavras.

**Independent Test**: abrir `/admin` com uma Casa densa salva e conferir a lista completa de horizontais e verticais e o descarte.

**Acceptance Scenarios**:

1. **Given** uma Casa densa de hoje, **When** o admin abre `/admin`, **Then** vê todas as respostas e dicas, separadas em horizontais e verticais.

### Edge Cases

- O preenchimento não acha solução para um desenho: o sistema tenta outro desenho ou outra ordem, sem chamar o modelo; só chama o modelo com a grade completa.
- Nenhum preenchimento dentro do tempo limite: a tentativa do dia falha como falha da fonte, sem gastar chamada ao modelo.
- Uma resposta recebe dica com a própria resposta (comum em verbos conjugados): o reparo troca a palavra e as vizinhas; se a região não fechar com outras palavras, pede de novo a dica das mesmas palavras; se falhar de novo, a tentativa falha e a seguinte usa outra grade.
- Palavras com acento ou cedilha: a grade guarda a letra sem acento (A, C, E…), como nas cruzadas impressas de banca; a dica é escrita para a palavra com acento.
- Lista de palavras pequena demais para Fácil em 15 x 15: o preenchimento pode usar a faixa seguinte; se não achar, falha como acima.
- Cruzadas da Casa já salvas no formato livre continuam como estão e jogáveis.
- Nomes próprios, siglas e palavras estrangeiras não entram (a lista vem do dicionário de palavras comuns).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A grade da Casa MUST ser quadrada no tamanho configurado (9 a 15) e MUST ter casas pretas em desenho simétrico por rotação de meia volta.
- **FR-002**: Toda casa branca MUST pertencer a exatamente uma palavra horizontal e uma vertical, cada uma com 3 letras ou mais; todas as casas brancas MUST estar ligadas entre si.
- **FR-003**: Toda casa de cruzamento MUST ter a mesma letra nas duas palavras, por construção.
- **FR-004**: A proporção de casas pretas MUST ficar em no máximo 25% da grade.
- **FR-005**: Toda resposta MUST vir de uma lista de palavras de português guardada no sistema, feita só de palavras do dicionário que também aparecem numa lista de frequência de uso, em qualquer forma flexionada (plural, feminino, verbo conjugado) que esteja na faixa de frequência da dificuldade (FR-006); a lista MUST excluir nomes próprios, siglas, abreviações, palavras estrangeiras e os termos da lista de bloqueio.
- **FR-006**: A dificuldade MUST limitar as respostas por faixa de frequência: Fácil só a faixa mais comum, Médio até a intermediária, Difícil a lista inteira. Se a faixa da dificuldade não fechar a grade em metade do tempo limite, o preenchimento MAY alargar para a faixa seguinte (uma de cada vez), e só nesse caso.
- **FR-007**: As respostas MUST ser guardadas na grade sem acento e sem cedilha; a dica MAY citar a forma com acento.
- **FR-008**: Uma resposta de 5 letras ou mais usada pela Casa nos últimos 30 dias MUST NOT aparecer de novo; respostas de 3 e 4 letras MAY repetir entre dias. Nenhuma resposta MUST repetir dentro da mesma cruzada. As respostas a evitar MUST ser filtradas pelo sistema, sem ir no pedido ao modelo.
- **FR-009**: O preenchimento da grade MUST acontecer antes de qualquer chamada ao modelo e MUST NOT gastar chamada; se não achar grade completa dentro de um tempo limite, a tentativa falha como falha da fonte.
- **FR-010**: O modelo MUST receber só as respostas já escolhidas (com a forma acentuada, quando houver) e a dificuldade, e MUST devolver uma dica por resposta. Cada dica MUST seguir as regras da 064 (só texto, até 120 caracteres, sem conter a resposta, sem termo bloqueado); faltando dica ou havendo dica inválida, o sistema MUST fazer um reparo por grade: troca essas respostas e as vizinhas que as cruzam por outras palavras da lista, mantendo o resto da grade, e pede dica só das palavras novas; se a região não fechar, pede de novo a dica das mesmas respostas. Se o reparo também falhar, a tentativa falha. O pedido MUST dizer que a dica não pode conter a palavra em nenhuma forma (conjugada, infinitivo, plural, feminino).
- **FR-011**: Cada tentativa MUST fazer no máximo duas chamadas ao modelo (o pedido das dicas e, se preciso, um reparo), e cada uma gasta uma das 3 chamadas do dia; o limite de 3 chamadas por fonte e por dia, o "sem créditos", o interruptor, a falta de chave e os textos de relatório da 064 continuam valendo sem mudança.
- **FR-012**: A cruzada salva MUST seguir o formato interno das outras fontes e passar pela mesma verificação de coerência; o jogador MUST NOT ver menção a IA, modelo ou provedor.
- **FR-013**: Cruzadas da Casa salvas antes desta mudança MUST continuar jogáveis sem alteração.
- **FR-014**: O painel `/admin` MUST continuar mostrando respostas, dicas e chamadas restantes, e o descarte MUST seguir as regras da 064.
- **FR-015**: A origem e a licença da lista de palavras e da lista de frequência MUST estar registradas no repositório, com a atribuição que as licenças pedem.
- **FR-016**: Os testes automáticos MUST usar o modelo simulado e uma lista de palavras reduzida e inventada; MUST NOT chamar o provedor.

### Key Entities

- **Lista de palavras**: palavras de português sem acento para a grade, cada uma com a forma acentuada e a faixa de frequência (comum, intermediária, rara). Fixa no repositório; muda só por atualização de código.
- **Desenho da grade**: posição das casas pretas para um tamanho, simétrico; pode ser escolhido de um conjunto ou montado pelo sistema.
- **Cruzada da Casa**: a mesma entidade da 064 (puzzle público e solução separados), agora densa.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Numa 11 x 11, a Casa tem pelo menos 28 palavras (O Globo tem cerca de 32; a 064 fica em 14 a 16).
- **SC-002**: 100% das casas brancas pertencem a duas palavras (hoje uma parte grande pertence a uma só).
- **SC-003**: Em 30 datas simuladas por tamanho (9, 11, 13, 15) e por dificuldade, o preenchimento acha grade completa em pelo menos 29, sem nenhuma chamada ao modelo.
- **SC-004**: O preenchimento leva no máximo 30 segundos por tentativa.
- **SC-005**: Numa revisão do dono em 7 cruzadas geradas, nenhuma resposta é considerada inventada ou desconhecida para a dificuldade.
- **SC-006**: O gasto de chamadas ao modelo por dia não aumenta em relação à 064 (no máximo 3, normalmente 1).

## Assumptions

- A exclusão de FR-005 vem do dicionário (que recusa a maior parte de nomes próprios, siglas e estrangeirismos) mais uma lista de exclusões revisada à mão: completa para as palavras de 3 e 4 letras e por amostra para as demais; o que escapar é tirado quando aparecer (revisão no `/admin` ou pelo dono).
- O dicionário de português é o pt_BR do LibreOffice (projeto VERO, licença LGPL/MPL) e a frequência vem de uma lista pública com licença compatível; a escolha exata da lista de frequência e as faixas ficam para o plano.
- Ignorar acentos na grade (confirmado na sessão de 2026-11-17) é o costume das cruzadas brasileiras impressas e torna o preenchimento denso viável.
- A lista de palavras fica no repositório (tamanho na ordem de dezenas de milhares de palavras, poucos MB no máximo) e entra só na coleta, nunca no site.
- O preenchimento roda na coleta, no GitHub Actions, onde o tempo de alguns segundos não pesa.
- O pedido de palavras ao modelo da 064 deixa de existir; a regra de "palavras de dicionário ou nomes próprios conhecidos" (FR-023 da 064) passa a ser garantida pela lista de palavras, e nomes próprios saem (confirmado na sessão de 2026-11-17).
- O tamanho 9 a 15 e as três dificuldades do `/admin` continuam com os mesmos valores salvos.
