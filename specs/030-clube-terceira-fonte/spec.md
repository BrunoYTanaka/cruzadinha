# Feature Specification: Cruzadas Clube como terceira fonte

**Feature Branch**: `feat/030-clube-terceira-fonte`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/64" ([Feature]: adicionar o Cruzadas Clube como terceira fonte de cruzadas)

## Clarifications

### Session 2026-10-23

- Q: As setas ficam presas ao limite da palavra? → A: Não. Digitar, Home, End, Delete e Tab/Shift+Tab respeitam o limite pelo comprimento da palavra; a seta muda de célula e a palavra ativa passa a ser a da nova célula na direção atual. Numa grade sem blocos, é a seta que atravessa palavras vizinhas (FR-017).
- Q: Como a coleta evita pedidos à toa numa edição já salva? → A: Pede primeiro só a página (que traz a data), consulta se a data já está salva e só então pede o script (FR-011).
- Q: Edição duplicada na mesma data? → A: Conta como já salva (`skipped`) no resultado da coleta; não há um tipo "duplicada".
- Q: O que a janela da coleta mede para esta fonte? → A: Dias, a partir da data da página de cada edição (`COLLECT_HISTORY_DAYS`); a coleta para na primeira edição mais antiga que a janela ou já salva.

## Observações da fonte (2026-10-22)

Feitas pelo autor antes da spec; servem de base para as suposições abaixo e não substituem a verificação sob demanda (FR-019).

- O Cruzadas Clube (`cruzadasclube.com.br`) publica "cruzadas clássicas" numeradas (por exemplo, a 689, "postada em 19/10/2026"). Cada edição tem a data de publicação na página e um link para a edição anterior.
- O jogo usa o aplicativo web do Crossword Compiler. A grade vem de um arquivo estático por edição (`/jogos/CCnnn.js`) cuja variável `CrosswordPuzzleData` guarda o XML do puzzle (formato "crossword-compiler-applet"), com solução, dicas por palavra e metadados.
- Esse arquivo é ofuscado (tabela de strings embaralhada, montada pelo navegador). Foi lido executando o script numa VM isolada, sem rede nem arquivos.
- A grade vista é 12 x 8, sem nenhum bloco. Palavras vizinhas ficam coladas na mesma linha (ou coluna), e o XML marca os limites com `left-bar` e `top-bar` nas células. Quase toda célula cruza uma palavra horizontal e uma vertical.
- Não existe lista de datas: a data vem da página de cada edição, e a navegação é pelo link para a anterior.

## User Scenarios & Testing *(mandatory)*

Os atores são o jogador (visitante ou com conta), que passa a ter uma terceira cruzada, e o autor do projeto, que mantém a coleta e confere a fonte. As features 003 e 014 definiram o formato interno de puzzle e a interface comum de fonte; esta feature acrescenta uma fonte cujas grades não cabem nas regras atuais, então o formato precisa aprender a representar palavras vizinhas coladas.

### User Story 1 - Jogar uma cruzada clássica no tabuleiro (Priority: P1)

A pessoa abre uma cruzada clássica do Cruzadas Clube e joga como as demais: digita, navega entre palavras, usa ajudas, o progresso é salvo e ela completa. No tabuleiro, vê uma barra entre duas palavras vizinhas da mesma direção, e a digitação e a navegação param no limite de cada palavra mesmo quando a célula seguinte está aberta.

**Why this priority**: Sem aceitar e desenhar palavras coladas, nenhuma cruzada clássica é jogável; é o núcleo técnico e de experiência da feature. Pode ser testada com um puzzle salvo, sem o adaptador.

**Independent Test**: Com um puzzle 12 x 8 reduzido e inventado, sem blocos e com palavras vizinhas coladas, validado e salvo, abrir o jogo, digitar uma palavra inteira e conferir que o cursor não passa para a palavra vizinha, que as barras aparecem e que a conclusão é detectada.

**Acceptance Scenarios**:

1. **Given** um puzzle em que duas palavras da mesma direção são vizinhas sem bloco entre elas, **When** ele é validado, **Then** é aceito; e um puzzle com a palavra seguida de célula aberta que não começa outra palavra da mesma direção continua recusado.
2. **Given** o jogador digita a última letra de uma palavra cuja célula seguinte está aberta e é o início de outra palavra, **When** a letra é aceita, **Then** o cursor não avança para a palavra vizinha.
3. **Given** o cursor está na primeira ou na última célula de uma palavra com vizinha colada, **When** o jogador usa seta, Home, End, Delete ou Tab, **Then** cada tecla respeita o limite da palavra (Home e End vão às pontas da palavra ativa, Delete limpa sem mover, Tab vai à próxima palavra).
4. **Given** duas palavras vizinhas na mesma direção, **When** o tabuleiro é desenhado, **Then** uma barra visível separa as duas, nos dois temas, sem mudar o tamanho das células.
5. **Given** as grades existentes (O Globo e Cruzada Online), **When** são abertas depois da mudança, **Then** continuam idênticas e jogáveis como antes.

---

### User Story 2 - Escolher a terceira fonte no site (Priority: P2)

A pessoa vê Cruzadas Clube como terceira aba do calendário e como terceiro cartão em "Hoje", e abre as edições salvas como abre as das outras fontes. O calendário mostra apenas os dias que têm edição salva: um dia passado sem edição não tenta buscar na fonte.

**Why this priority**: Entrega o valor ao jogador, mas depende da história 1 (jogar) e da 3 (ter edições salvas). O layout já foi pensado para 1 a 3 fontes (feature 015).

**Independent Test**: Com edições das três fontes salvas, abrir o site, conferir os três cartões em "Hoje" e as três abas, jogar uma edição do Cruzadas Clube e conferir que o progresso não aparece nas outras fontes; abrir um dia passado sem edição e conferir que nenhum pedido à fonte é feito.

**Acceptance Scenarios**:

1. **Given** edições salvas das três fontes, **When** a pessoa abre a biblioteca, **Then** vê uma aba e um cartão "Hoje" para cada uma, com o contador de concluídas por aba.
2. **Given** a fonte Cruzadas Clube e um dia passado sem edição salva, **When** a pessoa tenta abrir esse dia, **Then** vê que não há cruzada nesse dia, sem busca na fonte e sem tela de espera.
3. **Given** a pessoa está numa edição do Cruzadas Clube, **When** a tela do jogo aparece, **Then** a atribuição mostra "Cruzadas Clube" e o autor da edição, sem repetir partes iguais.
4. **Given** a fonte padrão nos ajustes, **When** a pessoa escolhe Cruzadas Clube como padrão, **Then** o calendário abre nela; e uma fonte desconhecida continua lida como a primeira.
5. **Given** um site da versão anterior, **When** ele fala com a API nova, **Then** continua funcionando e só vê as fontes que conhece; e o site novo funciona contra a API anterior sem a fonte nova.

---

### User Story 3 - Coletar as edições do Cruzadas Clube (Priority: P3)

O autor tem a coleta (comando e agendamento) salvando também as edições do Cruzadas Clube, cada uma com a data tirada da página, e uma verificação sob demanda contra a fonte real que diz se a busca e a conversão funcionaram.

**Why this priority**: Sem coleta não há edição salva, e o calendário só mostra o que está salvo; mas a história 1 se prova com fixtures e a 2 com dados de teste.

**Independent Test**: Rodar a coleta com fontes falsas e conferir que a terceira fonte é coletada, que uma falha ou limite nela não impede as outras, e que o XML é obtido sem executar código remoto fora de uma sandbox sem rede e sem arquivos.

**Acceptance Scenarios**:

1. **Given** a página de uma edição com data e o arquivo do jogo, **When** o adaptador a busca, **Then** devolve um puzzle no formato interno, com fonte `clube`, nível `daily`, a data da página, o autor da edição e atribuição "Cruzadas Clube".
2. **Given** o arquivo do jogo ofuscado, **When** o XML é extraído, **Then** a extração roda numa sandbox sem acesso a rede e a arquivos, com limite de tempo e de memória, e nenhum código remoto roda fora dela.
3. **Given** a coleta agendada, **When** ela roda, **Then** salva a edição mais recente e as anteriores que faltam na janela configurada, seguindo o link de edição anterior, com pausa entre pedidos e sem repetir edições já salvas.
4. **Given** a fonte Cruzadas Clube falha ou sinaliza limite durante a coleta, **When** a coleta continua, **Then** as outras duas fontes não são afetadas e a falha aparece no resultado, prefixada com o nome da fonte.
5. **Given** uma página sem data legível, sem o arquivo do jogo, com XML fora do esperado ou com a ofuscação alterada, **When** é convertida, **Then** o motivo é `unexpected-format` e nenhum puzzle parcial é salvo.
6. **Given** a suíte automática, **When** ela roda, **Then** a verificação contra a fonte real não é executada.

---

### Edge Cases

- Edição publicada em data que já tem outra edição da mesma fonte: o sistema guarda um puzzle por fonte, nível e data; a segunda é ignorada e contada como já salva (`skipped`) no resultado da coleta, nunca sobrescreve.
- Nenhuma edição para um dia passado: o dia aparece sem puzzle; a busca sob demanda nunca é feita para esta fonte.
- Grade sem nenhum bloco: toda célula é aberta; as regras de números, cruzamentos e cobertura continuam valendo para todas as células.
- Palavra que termina na borda da grade ou que tem bloco/barra depois: continua válida como hoje.
- Barra sem palavra que comece do outro lado, ou palavras da mesma direção que se sobrepõem: recusadas como `unexpected-format`.
- A mesma célula é fim de uma palavra e início de outra na mesma direção só é aceita quando a célula seguinte ao fim é exatamente o início da vizinha; não se aceitam lacunas nem sobreposição.
- Página com várias datas (menu, edição anterior, rodapé): vale apenas a data da edição em exibição.
- Mudança no ofuscador, no nome da variável ou no formato do XML: `unexpected-format` e um teste de contrato falha; nunca um puzzle errado.
- Código remoto que tenta rede, arquivos, laço infinito ou memória excessiva: a extração é interrompida e o motivo é `unexpected-format`, sem afetar a API.
- Tempo limite de 10 segundos ou erro de rede: `source-down`; status 5xx: `source-down`; 429: `rate-limited`, sem nova tentativa; 403 ou 404: `unavailable`.
- Corpo acima do limite de tamanho: recusado sem interpretar.
- Letras acentuadas na solução: as regras de comparação e ajuda que já valem para as outras fontes continuam valendo.
- Grade pequena e densa: a experiência precisa ser validada numa partida de teste antes de investir no acabamento (ver Suposições).

## Requirements *(mandatory)*

### Functional Requirements

**Formato e regras de puzzle (`shared`)**

- **FR-001**: A validação de puzzle MUST aceitar palavras vizinhas na mesma direção sem bloco entre elas: a célula seguinte ao fim de uma palavra pode estar aberta somente se for o início de outra palavra da mesma direção. Todas as demais regras (cobertura de células abertas, numeração, cruzamentos, tamanho mínimo, par puzzle/solução) MUST continuar valendo sem enfraquecimento.
- **FR-002**: O conjunto de fontes aceitas MUST incluir `clube`, com nome de atribuição "Cruzadas Clube"; o único nível aceito continua sendo `daily`.
- **FR-003**: As grades das fontes atuais MUST continuar válidas e idênticas: os testes das features 003 e 014 passam sem alteração.
- **FR-004**: Os schemas de resposta MUST continuar compatíveis com a versão anterior do site e da API (regra das duas releases): a fonte nova só aparece em respostas para quem a pede com `source=clube`, e um site anterior MUST funcionar contra a API nova. Pedidos sem `source` (biblioteca e puzzle por data) MUST NOT devolver puzzle `clube`, verificado por teste. Um site novo contra a API anterior MUST tratar a recusa de `source=clube` como fonte indisponível, sem afetar as outras.

**Adaptador Cruzadas Clube**

- **FR-005**: O sistema MUST acessar o Cruzadas Clube apenas por um adaptador que implementa a interface comum de fonte; nenhuma outra parte MUST conhecer o endereço, o formato da página, a ofuscação ou o XML da fonte.
- **FR-006**: O adaptador MUST buscar a edição, obter o XML do jogo e convertê-lo para o formato interno (parte pública e solução separadas), validando o resultado contra as regras de puzzle e de par antes de devolvê-lo.
- **FR-007**: O XML MUST ser obtido sem executar código remoto fora de uma sandbox sem acesso a rede e a arquivos, com limites de tempo e de memória; a resposta MUST ser tratada como dado desconhecido até passar pela validação e o XML MUST ser lido de forma segura (sem entidades externas ou expandidas, com limite de tamanho).
- **FR-008**: A conversão MUST mapear as barras de limite do XML (`left-bar`, `top-bar`) para os limites entre palavras vizinhas, as palavras (posição inicial, direção e tamanho), os números de célula, as dicas por palavra e os metadados (autor da edição), e MUST recusar como `unexpected-format` qualquer inconsistência (dica sem palavra, palavra sem dica, barra sem palavra do outro lado, número divergente).
- **FR-009**: O texto da dica MUST ser só o conteúdo textual, sem marcação, com entidades decodificadas e espaços normalizados, como nas outras fontes.
- **FR-010**: A data de cada edição MUST vir da página da edição, não do número da edição; sem data legível, o motivo é `unexpected-format`.
- **FR-011**: O adaptador MUST devolver os motivos da interface (`unavailable`, `rate-limited`, `source-down`, `unexpected-format`, `unsupported`) com as mesmas regras de status e tempo limite das outras fontes, fazer no máximo dois pedidos por edição (a página e, só se a data ainda não está salva, o script) e um pedido a mais por coleta (a lista de cruzadas clássicas), sem nova tentativa, e MUST NOT registrar o corpo bruto das respostas nem o conteúdo do script remoto.
- **FR-012**: A atribuição do puzzle MUST mostrar "Cruzadas Clube" e o autor da edição; a tela do jogo MUST NOT repetir partes iguais.

**Armazenamento e API**

- **FR-013**: Uma migração MUST ampliar a restrição de fontes aceitas da coleção de puzzles para incluir `clube`, sem alterar mais nada e sem perder dados.
- **FR-014**: As rotas de puzzle por data e de biblioteca MUST aceitar `clube` como fonte, com os mesmos limites e regras das outras fontes (366 por fonte, estados e tempos iguais); porém, para `clube`, a rota de puzzle por data MUST responder apenas com o que está salvo: um dia sem edição responde "não encontrado" sem pedir à fonte e sem consumir o limite de pedidos. Sem fonte informada continua valendo `oglobo`.
- **FR-015**: A coleta (`puzzles collect` e o fluxo agendado) MUST incluir a fonte nova, relatando cada fonte numa linha, com pausa entre pedidos e sem repetir edições salvas; uma falha ou sinal de limite numa fonte MUST NOT impedir a coleta das outras.

**Site**

- **FR-016**: O tabuleiro MUST desenhar uma barra visível entre palavras vizinhas da mesma direção, com contraste suficiente nos dois temas, sem alterar o tamanho das células nem causar salto de layout.
- **FR-017**: A digitação, Home, End, Delete, Tab/Shift+Tab, o teclado na tela, as ajudas, a verificação e a detecção de conclusão MUST respeitar o limite pelo comprimento da palavra, e não só por blocos. As setas mudam de célula e a palavra ativa passa a ser a da nova célula na direção atual.
- **FR-018**: O site MUST mostrar a terceira fonte como aba do calendário e cartão em "Hoje", nos ajustes de fonte padrão e nos textos de fonte, mantendo contador de concluídas, estados e atalho para a próxima fonte; para `clube`, um dia passado sem edição MUST aparecer como "sem cruzada", sem busca sob demanda, e `/dia/:date?fonte=clube` de um dia sem edição MUST mostrar a mesma mensagem.

**Testes e fixtures**

- **FR-019**: O sistema MUST oferecer uma verificação sob demanda contra o Cruzadas Clube real, fora da suíte automática, com uma linha de resultado por edição e sem imprimir o conteúdo do script nem do XML.
- **FR-020**: O adaptador MUST ter testes de contrato sem rede com fixtures reduzidas e inventadas (nunca puzzles completos da fonte), cobrindo no mínimo: edição válida com palavras vizinhas, página sem data, arquivo sem a variável do jogo, XML mal formado, estrutura alterada, barra sem palavra do outro lado, script que tenta usar rede ou arquivos, laço infinito e corpo grande.
- **FR-021**: Testes unitários, de integração e e2e MUST cobrir as mudanças, e `npm run lint`, `typecheck`, `test` e `build` MUST passar.

### Key Entities

- **Fonte Cruzadas Clube**: nova fonte, identificada por `clube`, com no máximo uma edição por data no nível `daily`, atribuição "Cruzadas Clube" e autor da edição.
- **Edição**: a cruzada clássica numerada publicada numa data; tem página (com data e link para a anterior) e arquivo do jogo com o XML.
- **Palavras vizinhas**: duas palavras da mesma direção em células consecutivas sem bloco entre elas; o limite entre elas é dado pelo comprimento da primeira.
- **Puzzle e Solução**: os mesmos das features 003 e 014, agora aceitando palavras vizinhas e `clube` como fonte.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das fixtures válidas viram puzzles que passam na validação e reproduzem exatamente dimensões, números, dicas, letras e limites entre palavras do arquivo; 100% das fixtures de falha produzem o motivo esperado, sem puzzle parcial.
- **SC-002**: As grades existentes de O Globo e Cruzada Online continuam passando em 100% dos testes anteriores, sem mudança de aparência.
- **SC-003**: Numa partida completa de uma cruzada clássica de teste, a pessoa digita e navega por todas as palavras sem que o cursor passe para uma palavra vizinha por engano ao digitar, em Home, End, Delete e Tab; as setas mudam de palavra só ao mudar de célula.
- **SC-004**: Uma pessoa que já joga as outras fontes encontra e abre a edição do dia do Cruzadas Clube em até 2 interações a partir do calendário.
- **SC-005**: Nenhum pedido à fonte é feito ao abrir um dia passado sem edição salva no Cruzadas Clube.
- **SC-006**: Código remoto que tenta rede, arquivos, laço infinito ou memória excessiva é interrompido em 100% dos casos de teste, sem afetar a API.
- **SC-007**: A verificação sob demanda converte sem erro as edições reais de pelo menos 5 datas diferentes.
- **SC-008**: O site da versão anterior continua funcionando contra a API nova, e o site novo contra a API anterior, verificado por teste.
- **SC-009**: Nenhum arquivo versionado contém um puzzle completo do Cruzadas Clube, e a suíte automática continua passando sem internet.

## Assumptions

- O nível do Cruzadas Clube é tratado como `daily`: há uma edição por data, mesmo que a periodicidade real seja irregular; a data é a da página.
- Como a fonte não tem lista de datas, a coleta descobre as edições seguindo o link de edição anterior a partir da mais recente, até a janela configurada (`COLLECT_HISTORY_DAYS`); o histórico completo não é baixado.
- Se houver duas edições na mesma data, vale a primeira salva (a restrição de unicidade já existente); isso é registrado, não tratado como erro fatal.
- O jogo continua em português do Brasil, assim como as dicas desta fonte.
- A extração do XML roda numa sandbox isolada no próprio processo da API, com limites de tempo e de memória; a escolha do mecanismo fica para o plano.
- Pedir o XML aberto à fonte reduziria o risco de a ofuscação mudar; isso não faz parte desta feature, mas fica como contato recomendado, e uma mudança na ofuscação quebra o adaptador de forma visível (teste de contrato e verificação sob demanda).
- A experiência numa grade 12 x 8 densa é validada numa partida de teste logo no início da implementação (antes do acabamento do site); se for ruim, o resultado é registrado e a feature é reavaliada.
- A feature mexe em `shared` (bump de patch em API e site), `apps/api` (adaptador, migração `0006`, coleta, CLI) e `apps/web` (barras, navegação, aba e cartão).
- Fora do escopo: outros níveis, ranking entre fontes, busca sob demanda de dias passados do Cruzadas Clube, mudança de política de direitos e de uso privado (princípio VIII) e o contato com o site da fonte.
