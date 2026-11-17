# Feature Specification: Casa (cruzada diária gerada)

**Feature Branch**: `feat/064-cruzada-gerada-ia`

**Created**: 2026-11-17

**Status**: Draft

**Updated**: 2026-11-17 (tamanho e dificuldade configuráveis no painel)

**Input**: User description: "Quero implementar geração de cruzada 11x11 com tema geral utilizando deepseek, ela vai diário e caso os créditos dele acabem deve apenas para." e, depois: "Deixa o tamanho configurável e o pedido da dificuldade, fácil, médio e difícil"

## Clarifications

### Session 2026-11-17

- Q: Quem escolhe o tamanho e a dificuldade, e quantas cruzadas por dia? → A: O administrador, numa tela em `/admin`, com os valores guardados no banco; continua uma cruzada por dia.
- Q: Que faixa de tamanho? → A: Grade quadrada de 9 x 9 a 15 x 15, padrão 11 x 11.
- Q: Nome da fonte e aviso de IA? → A: "Casa" (id `casa`); sem aviso de IA nem nome do modelo para o jogador.
- Q: Uma fonte gerada ou várias, uma por modelo? → A: Desenho para várias (cada uma com nome, modelo, chave, configuração e limite próprios); esta entrega só tem Casa, com a DeepSeek.
- Q: Como corrigir uma cruzada gerada com erro? → A: O admin vê a cruzada do dia em `/admin` e pode descartá-la enquanto nenhuma conta a jogou e nenhum x1 a usa; a próxima coleta gera outra, dentro do limite de chamadas do dia.
- Q: Conteúdo impróprio? → A: O pedido evita temas sensíveis e uma lista de bloqueio no sistema descarta palavras e dicas impróprias.
- Q: Palavras repetidas entre dias? → A: Respostas usadas pela mesma fonte nos últimos 30 dias não podem voltar.
- Q: Palavras inventadas pelo modelo? → A: Risco aceito; o pedido exige palavras de dicionário, sem verificação por dicionário no sistema.
- Q: Rodando localmente, a coleta chama a DeepSeek só com a chave ou também precisa de um interruptor? → A: Chave + interruptor `GENERATION_ENABLED`, ligado por padrão só em produção; desligado, a fonte gerada é pulada quieta ("geração desligada").
- Q: Rodando localmente, o `db:seed` deixa a Casa pronta para ver no site? → A: Sim: cria a cruzada de exemplo de hoje (de um fixture inventado, sem chamar o modelo), deixa a Casa visível no banco local e torna a conta de teste admin.
- Q: Escondida do calendário, a Casa continua sendo gerada? → A: Sim; esconder só muda o que o público vê, a geração diária (e o gasto de crédito) continua. Para parar de gastar, o caminho é tirar a chave ou desligar `GENERATION_ENABLED`.
- Q: Horário em que a cruzada do dia aparece? → A: Na primeira coleta do dia (00h01 de Brasília, já agendada), como as outras fontes sem busca sob demanda.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jogar a cruzada gerada do dia (Priority: P1)

Além das quatro fontes externas, o site passa a ter uma fonte própria: uma cruzada quadrada (9 x 9 a 15 x 15, padrão 11 x 11) de conhecimentos gerais, em português do Brasil, criada uma vez por dia pelo modelo de linguagem da DeepSeek. Quem abre o site (visitante ou conta) escolhe essa fonte nas abas como escolhe as outras e joga a cruzada do dia com todas as funções normais do jogo (progresso, ajudas, relógio, conclusão, recorde, estatísticas, x1, cópia offline).

**Why this priority**: É o valor da feature: uma cruzada nova por dia que não depende de nenhuma fonte de terceiros.

**Independent Test**: Gerar a cruzada de um dia com um gerador simulado, abrir o site nessa fonte e nesse dia, e resolver a cruzada até a conclusão.

**Acceptance Scenarios**:

1. **Given** a cruzada gerada de hoje salva, **When** a pessoa escolhe a fonte gerada no calendário ou no jogo, **Then** vê a grade no tamanho com que foi gerada (11 x 11 por padrão), com dicas em português, e pode jogá-la até concluir.
2. **Given** a cruzada gerada aberta, **When** a pessoa olha a atribuição, **Then** ela mostra o nome da fonte (Casa) e a dificuldade (Fácil, Médio ou Difícil), sem mencionar modelo, IA ou geração automática.
3. **Given** a cruzada gerada concluída por uma conta, **When** a pessoa abre as estatísticas, **Then** a fonte gerada aparece como as demais.
4. **Given** um dia sem cruzada gerada salva (antes do início da feature, ou dia em que a geração parou), **When** a pessoa abre esse dia na fonte gerada, **Then** vê o mesmo aviso de dia sem cruzada das outras fontes, e o site nunca pede a geração naquele momento.

---

### User Story 2 - Geração diária automática e validada (Priority: P1)

Todo dia a rotina de coleta que já existe também gera a cruzada do dia da fonte gerada, no tamanho e na dificuldade configurados no painel (história 4). O modelo devolve só uma lista de palavras com dicas, tratada como dado não confiável: cada item inválido é descartado, e o próprio sistema monta a grade no tamanho configurado com as palavras que sobraram, de modo que os cruzamentos são sempre coerentes. Se não sobrarem palavras suficientes para montar a grade, a tentativa falha e a rotina tenta de novo até o limite de chamadas do dia; se nenhuma tentativa der certo, aquele dia fica sem cruzada gerada e a falha é relatada como a de qualquer outra fonte.

**Why this priority**: Sem geração confiável não existe a história 1; uma cruzada incoerente salva estraga o dia de quem joga.

**Independent Test**: Rodar a coleta com um gerador simulado que devolve primeiro uma lista inválida (formato errado ou poucas palavras válidas) e depois uma válida, e conferir que só a segunda vira cruzada; repetir com um gerador que só devolve listas inválidas e conferir que nada é salvo e a falha aparece no relatório.

**Acceptance Scenarios**:

1. **Given** nenhuma cruzada gerada para hoje e o painel em 11 x 11, Médio, **When** a coleta diária roda, **Then** uma cruzada 11 x 11 válida, de dificuldade Médio, é salva para hoje.
2. **Given** a cruzada gerada de hoje já salva, **When** a coleta roda de novo no mesmo dia, **Then** nada é gerado e nenhum crédito é gasto.
3. **Given** um modelo que devolve uma lista em que alguns itens são inválidos (resposta com número, dica com a própria resposta, termo bloqueado), **When** a coleta valida a lista, **Then** só esses itens são descartados e a grade é montada com os demais; nenhuma cruzada salva tem cruzamento incoerente.
4. **Given** um modelo que falha em todas as tentativas permitidas, **When** a coleta termina, **Then** nada é salvo para a fonte gerada, as outras fontes são coletadas normalmente e o relatório mostra a falha da fonte gerada.

---

### User Story 3 - Parar quietamente quando os créditos acabam (Priority: P2)

Quando a conta da DeepSeek fica sem saldo, a geração simplesmente para: a coleta não tenta de novo, não falha, não abre aviso de fonte quebrada e não afeta as outras fontes. Quando o saldo volta, a geração recomeça sozinha na próxima coleta diária, só para o dia corrente.

**Why this priority**: Pedido explícito; evita alarme falso e qualquer gasto extra, mas a geração do dia a dia (história 2) vem antes.

**Independent Test**: Rodar a coleta com um gerador simulado que responde "saldo insuficiente" e conferir que o resultado da coleta é sucesso, que houve uma única chamada ao gerador, que nada foi salvo e que o relatório registra apenas "sem créditos".

**Acceptance Scenarios**:

1. **Given** a DeepSeek responde que o saldo é insuficiente, **When** a coleta tenta gerar, **Then** ela para a geração na primeira resposta, sem novas tentativas, registra "sem créditos" no relatório e termina com sucesso se as outras fontes deram certo.
2. **Given** a geração parou por falta de créditos, **When** a rotina diária verifica falhas para abrir avisos de fonte quebrada, **Then** nenhum aviso é aberto para a fonte gerada.
3. **Given** os créditos foram recarregados após três dias sem geração, **When** a próxima coleta roda, **Then** só a cruzada do dia corrente é gerada; os três dias perdidos ficam sem cruzada.
4. **Given** a chave da DeepSeek não está configurada, **When** a coleta roda, **Then** a fonte gerada é pulada do mesmo jeito quieto, sem falhar a coleta.
5. **Given** a geração desligada (padrão fora de produção) ou as 3 chamadas do dia já usadas, **When** a coleta roda, **Then** nenhuma chamada é feita, o relatório registra "geração desligada" ou "limite do dia" e a coleta não falha.

---

### User Story 4 - Administrador escolhe tamanho e dificuldade (Priority: P2)

Em `/admin`, junto do painel de fontes, o administrador vê o tamanho da grade (de 9 a 15, quadrada) e a dificuldade (Fácil, Médio, Difícil) usados na geração e pode trocá-los. A mudança vale a partir da próxima geração; cruzadas já salvas não mudam.

**Why this priority**: Dá controle sobre o jogo sem novo deploy, mas a geração com o padrão (11 x 11, Médio) já entrega valor sozinha.

**Independent Test**: Como admin, trocar para 13 x 13, Difícil; rodar a coleta com gerador simulado num dia sem cruzada e conferir que a cruzada salva tem 13 x 13 e dificuldade Difícil, e que o pedido ao modelo pediu dificuldade Difícil.

**Acceptance Scenarios**:

1. **Given** um admin em `/admin`, **When** a página carrega, **Then** vê o tamanho e a dificuldade atuais (padrão 11 e Médio, se nunca mudaram).
2. **Given** um admin, **When** salva 13 e Difícil, **Then** a página confirma, e a próxima geração usa 13 x 13 e Difícil.
3. **Given** um admin, **When** tenta salvar um tamanho fora de 9 a 15 ou uma dificuldade desconhecida, **Then** o servidor recusa e nada muda.
4. **Given** a cruzada de hoje já gerada em 11 x 11, **When** o admin muda para 9 x 9, **Then** a cruzada de hoje continua 11 x 11; só a de amanhã sai 9 x 9.
5. **Given** uma pessoa que não é admin, **When** tenta ler ou mudar essa configuração, **Then** recebe a mesma resposta de rota inexistente do painel de fontes.

---

### User Story 5 - Administrador revisa e descarta a cruzada do dia (Priority: P3)

Sem revisão humana, o modelo pode errar uma dica ou a grafia de uma palavra, e o jogador culparia o site. Em `/admin`, o administrador vê a cruzada gerada de hoje de cada fonte gerada (respostas e dicas) e pode descartá-la enquanto nenhuma conta a jogou e nenhum x1 a usa. A próxima coleta gera outra, se ainda houver chamadas no limite do dia; o admin pode rodar a coleta na hora pelo GitHub.

**Why this priority**: Corrige o pior caso de qualidade sem mexer no banco à mão, mas a geração e a validação (histórias 1 e 2) já evitam a maior parte dos erros.

**Independent Test**: Gerar a cruzada de hoje com gerador simulado, abrir `/admin`, conferir respostas e dicas, descartar e conferir que o dia fica sem cruzada; rodar a coleta e conferir que uma nova é salva.

**Acceptance Scenarios**:

1. **Given** a cruzada de hoje gerada, **When** o admin abre `/admin`, **Then** vê, para cada fonte gerada, as respostas e dicas da cruzada de hoje e se ela pode ser descartada.
2. **Given** nenhuma conta jogou e nenhum x1 usa a cruzada, **When** o admin confirma o descarte, **Then** a cruzada sai, o dia fica sem cruzada e a próxima coleta tenta gerar outra.
3. **Given** uma conta já tem progresso na cruzada ou um x1 a usa, **When** o admin tenta descartar, **Then** o sistema recusa, explica o motivo e nada muda.
4. **Given** as 3 chamadas do dia já foram usadas, **When** o admin descarta, **Then** o painel avisa que o dia ficará sem cruzada, e a coleta seguinte não chama o modelo.
5. **Given** uma pessoa que não é admin, **When** tenta ver ou descartar, **Then** recebe a resposta de rota inexistente.

---

### Edge Cases

- O modelo devolve texto fora do formato esperado, cortado ou com campos a mais: o resultado é descartado e conta como uma tentativa.
- O modelo devolve palavra com acento ou cedilha: a solução guarda a letra com acento e o jogo compara sem acento, como nas outras fontes.
- O modelo devolve palavra repetida, palavra com menos de 3 letras ou mais letras que o lado da grade, número, sigla com ponto ou dica vazia: o item é descartado.
- A dica contém a própria resposta: o item é descartado.
- A dica contém marcação (HTML, links) ou texto muito longo: o item é descartado; dicas são só texto.
- O serviço da DeepSeek demora demais ou fica fora do ar: a tentativa conta como falha comum (não "sem créditos") e segue o limite de tentativas.
- O limite de tentativas impede gastar créditos sem fim num dia ruim; a coleta nunca faz mais chamadas que esse limite por dia.
- Duas coletas rodando ao mesmo tempo no mesmo dia: só uma cruzada fica salva para aquele dia.
- Pedido de um dia passado sem cruzada gerada: o site não gera nada sob demanda; mostra o aviso de dia sem cruzada.
- O administrador esconde a fonte gerada no painel de fontes: ela some das abas e do calendário como qualquer outra fonte, mas a geração diária continua e gasta crédito normalmente; as cruzadas geradas enquanto escondida aparecem quando a fonte voltar a ser visível. Isso permite revisar a primeira cruzada antes de liberar a fonte.
- O administrador muda a configuração enquanto a coleta está gerando: a geração em andamento usa a configuração lida no início; a nova vale na próxima.
- Grade grande (15 x 15) com poucas palavras válidas: se a montagem não chega ao mínimo de palavras para aquele tamanho, a tentativa falha como qualquer outra.
- Visitante que já começou a cruzada descartada: o progresso dele fica preso à cruzada antiga no aparelho, que pode continuar abrindo pela cópia offline; ao abrir o dia de novo com internet, recebe a cruzada nova. Aceito: o descarte é raro e o visitante não tem dados no servidor.
- O modelo devolve uma resposta usada pela mesma fonte nos últimos 30 dias, uma palavra da lista de bloqueio ou uma dica com termo bloqueado: o item é descartado; se sobrarem poucas palavras, a tentativa falha.
- Coleta rodando na máquina de um desenvolvedor com a chave no ambiente e o interruptor desligado (padrão): nenhuma chamada, relatório "Pulado em <hoje>: geração desligada", exit 0. Com o interruptor ligado, gera de verdade, gasta crédito real e conta o limite de 3 chamadas só no banco local.
- Duas fontes geradas no mesmo dia: cada uma tem o próprio limite de chamadas, a própria chave e a própria configuração; "sem créditos" de uma não afeta a outra.
- Cruzadas de tamanhos diferentes em dias diferentes: calendário, jogo, impressão e estatísticas tratam cada uma pelo próprio tamanho, como já fazem com as outras fontes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST ter uma quinta fonte de cruzadas, própria do site, chamada Casa, cujas cruzadas são geradas pelo modelo de linguagem da DeepSeek. O sistema MUST permitir acrescentar depois outras fontes geradas, cada uma com nome, modelo, chave, configuração (FR-017) e limite de chamadas (FR-008) próprios, sem mudar as regras de geração.
- **FR-002**: Cada cruzada gerada MUST ter grade quadrada no tamanho configurado (FR-017), com casas brancas e pretas, palavras horizontais e verticais numeradas e uma dica em português do Brasil por palavra.
- **FR-003**: O tema MUST ser conhecimentos gerais, sem tema específico por dia. O pedido ao modelo MUST incluir a dificuldade configurada, que muda o vocabulário e o estilo das dicas (Fácil: palavras do dia a dia e dicas diretas; Médio: vocabulário geral e dicas de conhecimento comum; Difícil: palavras menos frequentes e dicas indiretas).
- **FR-004**: O sistema MUST manter no máximo uma cruzada salva por dia para cada fonte gerada (uma cruzada descartada pelo admin pode ser substituída no mesmo dia, FR-025), gerada dentro da rotina diária de coleta que já existe e só para o dia corrente; dias passados nunca são gerados.
- **FR-005**: O sistema MUST NOT gerar uma cruzada a pedido de uma pessoa (abrir um dia, calendário, x1 ou qualquer rota pública); só a rotina de coleta gera.
- **FR-006**: O modelo MUST fornecer só palavras e dicas; a grade MUST ser montada pelo sistema. Cada item MUST ser validado e, se inválido, descartado sozinho: resposta só com letras (acento e cedilha permitidos), de 3 letras até o lado da grade, sem repetir outra resposta da lista (comparação sem acento); dica não vazia, só texto, de até 120 caracteres e sem conter a resposta. A grade montada MUST ter o tamanho configurado, letras iguais em toda casa onde uma horizontal cruza uma vertical e um mínimo de palavras proporcional ao tamanho, todas ligadas entre si; se a montagem não alcançar o mínimo, a tentativa falha.
- **FR-007**: A cruzada salva MUST seguir o mesmo formato interno das outras fontes (parte pública e solução separadas) e passar pela mesma verificação de coerência entre puzzle e solução.
- **FR-008**: O sistema MUST limitar as tentativas de geração a no máximo 3 chamadas ao modelo por fonte gerada e por dia, somando todas as execuções da coleta no dia (inclusive após um descarte); se a execução gastar as chamadas que restavam sem resultado válido, o dia fica sem cruzada gerada e a falha é relatada como falha da fonte; se o limite já estiver esgotado quando a execução começa, a fonte é pulada do modo quieto de FR-009 ("limite do dia"), sem chamada.
- **FR-009**: Quando o provedor da fonte gerada (DeepSeek, para a Casa) responder que o saldo é insuficiente, o sistema MUST parar a geração daquele dia na hora, sem novas tentativas, registrar "sem créditos" no relatório da coleta e MUST NOT tratar isso como falha da coleta nem abrir aviso de fonte quebrada.
- **FR-010**: Sem a chave do provedor da fonte gerada configurada, ou com a geração desligada, o sistema MUST pular a fonte gerada do mesmo modo quieto que FR-009, sem nenhuma chamada ao modelo. A geração MUST ter um interruptor próprio, ligado por padrão só em produção e desligado nos outros ambientes, para que uma chave no ambiente local não gaste crédito sem querer; a rotina agendada MUST ligá-lo explicitamente.
- **FR-011**: Uma falha da fonte gerada MUST NOT impedir a coleta das outras fontes, como já vale entre as fontes atuais.
- **FR-012**: A cruzada gerada MUST mostrar na atribuição o nome da fonte e a dificuldade com que foi gerada. A atribuição e qualquer texto visto pelo jogador (abas, landing, impressão, compartilhamento) MUST NOT citar IA, modelo, provedor ou geração automática; essas informações ficam só no `/admin` e nos relatórios da coleta.
- **FR-013**: A fonte gerada MUST funcionar em todas as partes do site que já tratam fontes: abas, calendário, jogo, progresso de visitante e conta, estatísticas, importação, x1, cópia offline, impressão e o painel de visibilidade de fontes.
- **FR-014**: A chave de cada provedor de fonte gerada (DeepSeek, para a Casa) MUST ficar só no cofre de segredos de onde a coleta roda; MUST NOT aparecer no repositório, em logs, relatórios, issues ou fixtures, e o site MUST NOT ter acesso a ela.
- **FR-015**: Erros e relatórios da geração MUST NOT conter a solução da cruzada nem o texto bruto devolvido pelo modelo.
- **FR-016**: Os testes automáticos MUST usar um gerador simulado e nunca chamar a DeepSeek.
- **FR-017**: O sistema MUST guardar, para cada fonte gerada, uma configuração de geração com tamanho da grade (inteiro de 9 a 15, padrão 11) e dificuldade (Fácil, Médio ou Difícil, padrão Médio).
- **FR-018**: Só administradores MUST poder ler e mudar a configuração de geração, em `/admin`; para quem não é admin, as rotas MUST responder como rota inexistente, igual ao painel de fontes.
- **FR-019**: O servidor MUST recusar configuração fora da faixa ou com dificuldade desconhecida, sem mudar nada.
- **FR-020**: A geração MUST ler a configuração uma vez no início e usá-la até o fim; mudanças MUST NOT alterar cruzadas já salvas.
- **FR-021**: O pedido ao modelo MUST excluir temas sensíveis (política partidária, religião, violência, sexo, tragédias, doenças graves) e linguagem ofensiva. O sistema MUST manter uma lista de termos bloqueados e MUST descartar toda palavra cuja resposta ou dica contenha um termo dela (comparação sem acento e sem diferença de maiúsculas).
- **FR-022**: Uma resposta usada por uma cruzada da mesma fonte gerada nos últimos 30 dias MUST NOT aparecer na cruzada nova (comparação sem acento). O pedido MUST informar essas respostas ao modelo, e a validação MUST descartar as que vierem mesmo assim.
- **FR-023**: O pedido MUST exigir palavras que existam no dicionário da língua portuguesa ou nomes próprios conhecidos, sem siglas, abreviações ou palavras inventadas.
- **FR-024**: Em `/admin`, o administrador MUST ver, para cada fonte gerada, as respostas e dicas da cruzada de hoje (ou que não há cruzada) e quantas chamadas do dia restam.
- **FR-025**: O administrador MUST poder descartar a cruzada gerada de hoje, com confirmação, só enquanto nenhuma conta tem progresso nela e nenhum x1 a usa; senão o sistema MUST recusar sem mudar nada. Só a cruzada do dia corrente pode ser descartada. Depois do descarte, a próxima coleta MUST tentar gerar outra, respeitando FR-008.
- **FR-026**: As rotas de revisão e descarte MUST seguir FR-018 (só admin; rota inexistente para os demais).
- **FR-027**: A visibilidade da fonte gerada (painel de fontes) MUST NOT afetar a geração: escondida, a coleta gera do mesmo jeito.
- **FR-028**: No ambiente de desenvolvimento, o preparo do banco de exemplo MUST criar a cruzada de hoje da Casa a partir de dados inventados (sem chamar o modelo), deixar a Casa visível e dar papel de admin à conta de teste quando o seed a cria (uma conta que já existe nunca é alterada; use `users set-admin`). Nada disso vale fora do desenvolvimento.

### Key Entities

- **Fonte gerada**: a quinta fonte do site, própria, chamada Casa; a atribuição mostra só o nome e a dificuldade. Participa da visibilidade de fontes como as outras.
- **Cruzada gerada do dia**: uma por dia, mesmo formato e mesmo armazenamento das cruzadas das outras fontes (fonte, nível diário, data, parte pública, solução).
- **Configuração de geração**: um registro por fonte gerada, com tamanho da grade (9 a 15) e dificuldade (Fácil, Médio, Difícil), mudado só por administradores.
- **Chamadas do dia**: quantas chamadas ao modelo cada fonte gerada já fez no dia; limite de 3.
- **Lista de bloqueio**: termos que não podem aparecer em resposta nem dica; mantida no código.
- **Resultado da geração**: desfecho de uma coleta para a fonte gerada: salva, já existia, sem créditos, sem chave, geração desligada, limite do dia, chave recusada ou falha após as tentativas. Aparece só no relatório da coleta, sem conteúdo da cruzada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em dias com crédito disponível e serviço no ar, ao menos 95% dos dias têm uma cruzada gerada jogável.
- **SC-002**: 100% das cruzadas geradas salvas passam na validação: tamanho configurado, cruzamentos coerentes e uma dica por palavra.
- **SC-003**: Nenhuma fonte gerada faz mais de 3 chamadas ao modelo no mesmo dia, mesmo com descarte e várias execuções da coleta.
- **SC-004**: Com saldo insuficiente, 100% das coletas terminam com sucesso (se as outras fontes deram certo), com no máximo 1 chamada ao modelo e nenhum aviso de fonte quebrada aberto.
- **SC-005**: Uma pessoa resolve a cruzada gerada do início ao fim com as mesmas funções de jogo das outras fontes, sem nenhuma tela ou aviso diferente além da atribuição.
- **SC-006**: Depois de o admin mudar tamanho ou dificuldade, 100% das gerações seguintes usam os valores novos, e nenhuma cruzada já salva muda.
- **SC-007**: Nenhuma cruzada gerada salva tem resposta usada pela mesma fonte nos 30 dias anteriores nem termo da lista de bloqueio.
- **SC-008**: O admin descarta uma cruzada com erro em menos de 1 minuto, sem acesso ao banco.

## Assumptions

- "Tema geral" significa conhecimentos gerais variados (vocabulário comum, geografia, ciência, cultura etc.), não um tema por dia.
- A dificuldade é um pedido ao modelo; o sistema não mede a dificuldade real da cruzada.
- O site continua com um nível só por dia; a dificuldade é um atributo da cruzada gerada, não um novo nível escolhido pelo jogador.
- Sem histórico de quem mudou a configuração nesta versão.
- A geração roda dentro da coleta diária já agendada (`puzzles collect`), e o dia corrente segue o mesmo fuso das outras fontes.
- Dias perdidos (sem créditos, sem chave ou com falha) não são recuperados depois, para não gastar créditos com dias passados.
- A fonte gerada se comporta como uma fonte sem busca sob demanda (como `clube`): o site nunca dispara geração.
- Palavras inventadas são um risco aceito: o sistema não confere as respostas num dicionário (precisaria de lista de palavras com licença); o pedido (FR-023), a revisão e o descarte (história 5) cobrem o caso.
- A coleta já roda às 00h01 e às 08h00 de Brasília; a cruzada do dia aparece depois da primeira execução, como nas fontes sem busca sob demanda. Se a primeira falhar, a segunda tenta de novo dentro do mesmo limite de chamadas.
- A lista de bloqueio é mantida no código e muda por commit; não há tela para editá-la.
- O nome exibido é "Casa" (id `casa`). Por decisão do dono do produto (2026-11-17), o jogador não é avisado de que a cruzada é gerada por IA.
- A cruzada gerada é conteúdo próprio do site, mas segue as mesmas regras das outras fontes (não aparece na landing, páginas sem indexação, sem exportação).
- A fonte gerada nasce escondida no painel de fontes; o administrador a liga depois da primeira cruzada gerada e do site novo no ar (plano, research R6).
- O texto devolvido pelo modelo é dado externo não confiável e entra só depois de validado.
- A coleta roda na CI agendada (`collect.yml`), então a chave da DeepSeek vai para os segredos da CI.
