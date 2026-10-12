# Feature Specification: Fundação do projeto

**Feature Branch**: `feat/002-fundacao`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "002-fundacao" (documento de design `2026-10-12-cruzadas-design.md`, seção 10, item 2: monorepo, ferramentas de qualidade, ambiente local e verificação automática; seções 3 e 9)

## Clarifications

### Session 2026-10-12

- Q: O repositório remoto será público ou privado? → A: Público, para servir de portfólio. Fixtures com respostas reais da fonte ficam reduzidas a um trecho mínimo (ou adulterado) que preserva a estrutura do formato, sem redistribuir puzzles completos.
- Q: A lógica do tabuleiro deve ser uma parte separada do projeto ou uma pasta dentro do site? → A: Pasta dentro do site, como no design; o projeto tem só três partes. Se o servidor um dia precisar dela, ela pode virar parte própria, por já ser pura e sem dependência de interface.
- Q: A feature deve ficar só na estrutura com o mínimo de código para prová-la, ou já incluir um pedaço de produto? → A: Só a estrutura, com o mínimo de código que a prova (verificação de saúde, página mínima e um tipo compartilhado); nenhuma funcionalidade de produto.
- Q: Até onde vai a regra "nunca usar `any`": só o `any` escrito no código, ou também o que entra sem ninguém escrever? → A: Só o `any` escrito no código (`: any`, `as any`, `<any>`), barrado como erro pela análise estática; o modo estrito já barra o `any` implícito em parâmetros. O `any` vindo de bibliotecas ou de `JSON.parse` não é barrado automaticamente.

## User Scenarios & Testing *(mandatory)*

O ator desta feature é o autor do projeto, como desenvolvedor. Ela não entrega nada ao jogador: entrega a base sobre a qual todas as features seguintes são construídas e verificadas.

### User Story 1 - Preparar o projeto e conferir a qualidade com comandos únicos (Priority: P1)

O autor clona o repositório, instala tudo com um único comando e, da raiz, roda os comandos de formatação, análise estática, checagem de tipos e testes, que cobrem as três partes do projeto (servidor, site e código compartilhado) de uma vez.

**Why this priority**: Sem essa estrutura nenhuma feature seguinte pode começar, e a constitution (princípios I e II) exige que ela exista antes de qualquer código de aplicação.

**Independent Test**: Num clone limpo, rodar a instalação e depois cada comando de qualidade da raiz; todos terminam com sucesso e mostram que passaram pelas três partes.

**Acceptance Scenarios**:

1. **Given** um clone limpo do repositório, **When** o autor roda o comando de instalação, **Then** as dependências de todas as partes são instaladas nas versões exatas registradas no repositório.
2. **Given** o projeto instalado, **When** o autor roda o comando de testes da raiz, **Then** os testes de todas as partes rodam e passam, sem acesso à internet nem a banco de dados.
3. **Given** um erro de tipo introduzido de propósito em qualquer parte, **When** o autor roda a checagem de tipos da raiz, **Then** ela falha e aponta o arquivo e a linha.
4. **Given** um tipo definido no código compartilhado, **When** o servidor e o site o usam, **Then** a checagem de tipos passa nas duas partes, e uma mudança incompatível nesse tipo a faz falhar nas duas.

---

### User Story 2 - Barrar automaticamente o que quebra a qualidade (Priority: P2)

A cada envio de código ao repositório remoto, uma verificação automática reinstala o projeto do zero e roda análise estática, checagem de tipos e todos os testes. O resultado fica visível, e um resultado vermelho indica que algo precisa ser corrigido antes de seguir.

**Why this priority**: É o portão definitivo de qualidade da constitution (princípio II); as proteções locais podem ser puladas, esta não.

**Independent Test**: Enviar uma alteração correta e ver o resultado verde; enviar uma alteração com erro de análise estática, de tipo ou de teste e ver o resultado vermelho, com o motivo.

**Acceptance Scenarios**:

1. **Given** uma alteração sem erros, **When** ela é enviada ao repositório remoto, **Then** a verificação automática roda e termina verde.
2. **Given** uma alteração com um teste falhando, **When** ela é enviada, **Then** a verificação termina vermelha e mostra qual teste falhou.
3. **Given** uma alteração que muda dependências sem atualizar o registro de versões, **When** ela é enviada, **Then** a verificação falha na instalação, em vez de instalar versões diferentes das registradas.

---

### User Story 3 - Corrigir problemas antes de registrar e enviar (Priority: P3)

Ao registrar uma alteração (commit), os arquivos alterados são formatados e conferidos automaticamente. Ao enviar ao repositório remoto (push), a checagem de tipos e os testes rápidos rodam antes. O autor descobre os problemas na hora, e não minutos depois pela verificação automática.

**Why this priority**: Encurta o ciclo de correção, mas a verificação automática (história 2) já protege o repositório sem isso.

**Independent Test**: Registrar uma alteração com um arquivo mal formatado e ver que ele é formatado; tentar registrar com um erro de análise estática e ver o registro bloqueado; tentar enviar com um teste falhando e ver o envio bloqueado.

**Acceptance Scenarios**:

1. **Given** um arquivo alterado e mal formatado, **When** o autor registra a alteração, **Then** o arquivo é formatado antes do registro, e só os arquivos alterados são processados.
2. **Given** um arquivo alterado com erro de análise estática que não se corrige sozinho, **When** o autor tenta registrar, **Then** o registro é bloqueado com a mensagem do erro.
3. **Given** um teste unitário falhando, **When** o autor tenta enviar, **Then** o envio é bloqueado e o teste que falhou é mostrado.
4. **Given** um clone recém-instalado, **When** o autor faz o primeiro registro, **Then** as proteções já estão ativas, sem passo manual de configuração.

---

### User Story 4 - Subir o ambiente local com um comando (Priority: P4)

O autor sobe, com um comando, o banco de dados e o servidor locais, e com outro o site em modo de desenvolvimento. O site fala com o servidor pelo mesmo endereço, como vai acontecer em produção, e uma página mínima mostra se o servidor e o banco estão respondendo.

**Why this priority**: A feature de banco e autenticação precisa desse ambiente, mas as histórias 1 a 3 têm valor sem ele.

**Independent Test**: Rodar o comando do ambiente local e o do site, abrir a página mínima e ver o servidor e o banco como disponíveis; parar o banco e ver a página indicar que ele está indisponível.

**Acceptance Scenarios**:

1. **Given** o projeto instalado e o ambiente de containers disponível, **When** o autor roda o comando do ambiente local, **Then** o banco e o servidor sobem, e a verificação de saúde do servidor informa que o banco está acessível.
2. **Given** o ambiente local no ar, **When** o autor abre o site em modo de desenvolvimento, **Then** a página mínima mostra o nome do projeto e o estado do servidor, obtido pelo mesmo endereço do site.
3. **Given** o banco parado, **When** a verificação de saúde é consultada, **Then** ela informa que o banco está indisponível, sem derrubar o servidor.
4. **Given** uma variável de configuração obrigatória ausente ou inválida, **When** o servidor inicia, **Then** ele não sobe e a mensagem diz qual variável falta, sem mostrar valores.

---

### Edge Cases

- As proteções locais são puladas (por exemplo com a opção de ignorar hooks): a verificação automática do envio continua barrando o erro.
- Uma parte do projeto não tem um dos comandos (por exemplo, o código compartilhado sem servidor de desenvolvimento): os comandos da raiz pulam essa parte sem falhar.
- A versão do ambiente de execução na máquina é diferente da declarada: a instalação avisa claramente qual versão é esperada.
- A porta do banco ou do servidor local já está em uso: o ambiente local falha com uma mensagem que cita a porta, e a porta pode ser trocada por configuração.
- O ambiente de containers não está instalado ou não está rodando: o comando do ambiente local falha com uma mensagem que diz isso.
- Um arquivo de configuração com valores reais é criado na pasta do projeto: ele é ignorado pelo controle de versão e não pode ser registrado por engano.
- Um arquivo alterado contém `any` escrito: o registro é bloqueado pela análise estática e, se as proteções locais forem puladas, a verificação automática fica vermelha.
- Um registro só muda documentação: as proteções locais terminam rápido e não rodam a suíte de testes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O repositório MUST ser organizado em três partes independentes e versionadas juntas: servidor, site e código compartilhado. Cada parte MUST herdar uma configuração base comum de checagem de tipos no modo mais estrito. O servidor e o site MUST NOT depender um do outro; o que os dois precisam conhecer fica no código compartilhado. A lógica do tabuleiro MUST NOT ser uma parte própria: ela fica numa área isolada dentro do site, criada pela feature da tela do jogo.
- **FR-002**: O código compartilhado MUST poder ser usado pelo servidor e pelo site sem publicação externa, e a checagem de tipos MUST detectar nas duas partes uma mudança incompatível nele.
- **FR-003**: Um único comando na raiz MUST instalar todas as partes nas versões exatas do registro de versões versionado no repositório.
- **FR-004**: A raiz MUST oferecer os comandos de formatação, análise estática, checagem de tipos e testes, cada um cobrindo todas as partes; uma parte sem o comando correspondente MUST ser pulada sem falha.
- **FR-005**: A formatação MUST seguir as convenções do `CLAUDE.md`. A análise estática MUST ter uma base comum a todas as partes e, no site, também regras de acessibilidade e de uso correto de componentes, conforme a constitution (princípio II). Escrever o tipo `any` no código (`: any`, `as any`, `<any>`) MUST ser erro de análise estática em todas as partes, e o `any` implícito MUST ser erro na checagem de tipos.
- **FR-006**: Cada parte MUST ter pelo menos um teste mínimo que passa, para provar que o comando de testes funciona nela. A suíte de testes desta feature MUST NOT depender de internet, banco de dados ou navegador.
- **FR-007**: Ao registrar uma alteração, o projeto MUST formatar e conferir apenas os arquivos alterados, e MUST bloquear o registro se restar erro que não se corrige sozinho.
- **FR-008**: Ao enviar ao repositório remoto, o projeto MUST rodar a checagem de tipos e os testes unitários (sem banco, rede ou navegador) e MUST bloquear o envio se falharem.
- **FR-009**: As proteções de FR-007 e FR-008 MUST ficar ativas automaticamente após a instalação, sem passo manual.
- **FR-010**: A cada envio ao repositório remoto, uma verificação automática MUST instalar o projeto do zero a partir do registro de versões, rodar análise estática, checagem de tipos e todos os testes, e terminar vermelha se qualquer etapa falhar.
- **FR-011**: Um comando MUST subir localmente o banco de dados e o servidor. O servidor MUST oferecer uma verificação de saúde que informa se ele e o banco estão disponíveis, sem cair quando o banco estiver fora.
- **FR-012**: O site em modo de desenvolvimento MUST mostrar uma página mínima com o nome do projeto e o estado do servidor, alcançando o servidor pelo mesmo endereço do site.
- **FR-013**: Toda configuração do servidor MUST vir de variáveis de ambiente validadas na inicialização. Variável obrigatória ausente ou inválida MUST impedir a inicialização com uma mensagem que cita o nome da variável e nunca o valor.
- **FR-014**: O repositório MUST conter um exemplo de configuração só com nomes de variáveis e valores fictícios, e MUST ignorar os arquivos de configuração com valores reais (princípio VI).
- **FR-015**: O servidor MUST poder ser empacotado como imagem de container configurada apenas por variáveis de ambiente, para manter a portabilidade entre provedores.
- **FR-016**: O projeto MUST declarar a versão do ambiente de execução esperada e avisar quando a versão em uso for diferente.
- **FR-017**: O `CLAUDE.md` MUST ser atualizado com os comandos reais de instalação, qualidade, testes (inclusive como rodar um teste único) e ambiente local, e com a nova estrutura do repositório.
- **FR-018**: A verificação automática MUST rodar num repositório remoto **público**. Por ser público, o repositório MUST NOT conter puzzles completos da fonte (princípio VIII); as fixtures de respostas reais exigidas pelo princípio IV MUST ser reduzidas ao mínimo que preserva a estrutura do formato (regra a cumprir pela feature `003`).

### Key Entities

- **Parte do projeto**: servidor, site ou código compartilhado; cada uma com seus comandos de qualidade e testes.
- **Registro de versões**: arquivo versionado com as versões exatas de todas as dependências, usado pela instalação local e pela verificação automática.
- **Exemplo de configuração**: lista das variáveis de ambiente do servidor, com valores fictícios.
- **Resultado da verificação**: estado (verde ou vermelho) de cada envio, com a etapa que falhou.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A partir de um clone limpo, o autor fica pronto para desenvolver em no máximo 3 comandos e menos de 10 minutos, sem consultar nada além do `CLAUDE.md`.
- **SC-002**: Cada comando de qualidade da raiz termina em menos de 1 minuto na máquina do autor, no estado inicial do projeto.
- **SC-003**: Em 100% dos envios, a verificação automática roda; um erro proposital de análise estática, de tipo e de teste deixa o resultado vermelho nos três casos.
- **SC-004**: A verificação automática termina em menos de 10 minutos.
- **SC-005**: As proteções do registro terminam em menos de 10 segundos numa alteração típica de poucos arquivos.
- **SC-006**: O ambiente local fica disponível, com a verificação de saúde indicando servidor e banco no ar, em menos de 2 minutos depois do comando (com as imagens já baixadas).
- **SC-007**: Nenhum valor real de segredo existe no repositório nem no histórico, verificado por busca antes do merge.

## Assumptions

- Esta feature não entrega nenhuma funcionalidade de jogo, conta, convite ou puzzle; servidor, site e código compartilhado ficam no mínimo necessário para provar a estrutura (verificação de saúde, página mínima e um tipo compartilhado). Tabelas, migrações e formato interno de puzzle não são adiantados; o banco só é consultado para saber se está acessível.
- O banco local existe só para provar o ambiente; tabelas, migrações e testes de integração com banco chegam na feature de banco, `auth` e `invites` (`004`).
- O formato interno de puzzle e o adaptador `oglobo` não entram aqui; eles são a feature `003`.
- A implantação (front estático, servidor em container, banco gerenciado) é a última feature; aqui só se garante que o servidor pode ser empacotado em container (FR-015).
- O workflow agendado da coleta diária de puzzles chega na feature de puzzles; esta feature só prepara a verificação automática para receber outros workflows depois.
- O autor tem na máquina o ambiente de execução na versão declarada e um ambiente de containers.
- O autor vai criar o repositório remoto, público, no GitHub; até lá, as histórias 1, 3 e 4 podem ser verificadas localmente, e a história 2 só depois.
- Os caminhos ponta a ponta no navegador (princípio VII) chegam com a tela do jogo; aqui não há fluxo de usuário para cobrir.
