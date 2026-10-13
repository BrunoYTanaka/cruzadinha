# Feature Specification: Banco de dados, autenticação e convites

**Feature Branch**: `feat/004-banco-auth-convites`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "Banco de dados, autenticação e convites (back-end): conexão com Postgres, schema e migrações versionadas (Drizzle) só com as tabelas users, sessions e invites, todas com created_at e updated_at preenchidos e atualizados automaticamente; cadastro só com convite, login, logout e 'quem sou eu' com sessão no servidor; convites de uso único com cota de 3 ativos por usuário e CLI do autor (create, list, revoke); testes de integração com Postgres real em container, com script próprio e job na CI. Fora do escopo: telas do front, easter egg Konami, preferência de tema, tabelas puzzles e progress." (documento de design `docs/design.md`, seção 10, item 4; seções 4 e 6, regras 14 a 27)

## Clarifications

### Session 2026-10-13

- Q: Como a sessão deve se manter válida enquanto o usuário continua usando o site? → A: Expiração deslizante: a sessão expira após 30 dias sem uso, cada uso estende o prazo para 30 dias a partir dali (gravando no máximo uma vez por dia por sessão), com limite absoluto de 1 ano desde o login.
- Q: Onde devem ficar os contadores de tentativas de login, cadastro e geração de convites? → A: No banco, numa tabela própria de tentativas (com `created_at`/`updated_at`), para sobreviver a reinícios e ao servidor dormir.
- Q: Como um usuário que esqueceu a senha deve recuperar o acesso, já que o site não envia e-mails? → A: Fica para uma feature futura; nesta feature quem esquecer a senha fica sem acesso.
- Q: Quem deve poder encerrar de uma vez todas as sessões (cookies) de um usuário, além do logout normal da sessão atual? → A: Ninguém nesta feature; fica para a mesma feature futura da recuperação de senha.
- Q: De onde o seed de desenvolvimento deve tirar o e-mail e a senha do usuário de teste? → A: Das variáveis `SEED_USER_EMAIL` e `SEED_USER_PASSWORD`, com valores fictícios no `.env.example`; sem elas, o seed falha com mensagem clara.
- Q: O que o seed deve fazer quando o usuário de teste já existe? → A: Não muda nada (nem a senha) e informa que o usuário já existe.

## User Scenarios & Testing *(mandatory)*

Há três atores: o **autor** do projeto, que opera o banco e cria ou revoga convites pela linha de comando; o **convidado**, que recebe um código e cria a conta; e o **usuário** já cadastrado, que entra, sai e gera convites para outras pessoas. Esta feature entrega só o lado do servidor. As telas de login e cadastro ficam para uma feature do site, então os cenários abaixo são exercitados diretamente contra a API e a linha de comando.

### User Story 1 - Banco versionado com datas de criação e alteração (Priority: P1)

O autor consegue levar um banco vazio até a estrutura atual com um único comando, e cada registro guardado traz quando foi criado e quando foi alterado pela última vez, preenchidos pelo próprio banco. Essa convenção vale para as tabelas desta feature e para todas as que vierem depois.

**Why this priority**: Todas as outras histórias guardam dados. Sem o banco versionado elas não têm onde gravar, e a convenção de datas precisa existir desde a primeira tabela para não exigir migração de correção depois.

**Independent Test**: Partir de um banco vazio, aplicar as migrações, inserir um registro sem informar datas e conferir que as duas estão preenchidas; alterar o registro sem informar datas e conferir que só a data de alteração avançou; aplicar as migrações de novo e conferir que nada mudou.

**Acceptance Scenarios**:

1. **Given** um banco vazio, **When** o autor aplica as migrações, **Then** as tabelas de usuários, sessões, convites e tentativas passam a existir, e as tabelas de puzzles e progresso não.
2. **Given** o banco já na versão atual, **When** as migrações são aplicadas de novo, **Then** nada muda e o comando termina sem erro.
3. **Given** um registro novo gravado sem datas informadas, **When** ele é lido, **Then** a data de criação e a de alteração estão preenchidas, em UTC, com o mesmo instante.
4. **Given** um registro existente, **When** qualquer campo dele é alterado sem informar a data de alteração, **Then** a data de alteração avança e a de criação fica igual.

---

### User Story 2 - Cadastro com convite (Priority: P2)

O autor gera um convite pela linha de comando e entrega o código a alguém. Essa pessoa se cadastra com e-mail, senha e o código, e já sai do cadastro autenticada. Sem um convite válido, ninguém consegue criar conta.

**Why this priority**: É a porta de entrada do site, que é privado e restrito a convidados (constitution, princípio VIII). Sem cadastro não existe usuário para as demais histórias.

**Independent Test**: Gerar um convite pela linha de comando, cadastrar uma conta com ele e conferir que a consulta "quem sou eu" responde com o e-mail cadastrado; tentar cadastrar outra conta com o mesmo código e conferir a recusa com a mensagem "convite inválido".

**Acceptance Scenarios**:

1. **Given** um convite válido, **When** o convidado se cadastra com e-mail novo e senha de pelo menos 8 caracteres, **Then** a conta é criada, o convite fica marcado como usado por essa conta e o convidado recebe uma sessão ativa.
2. **Given** um código inexistente, já usado, expirado ou revogado, **When** alguém tenta se cadastrar com ele, **Then** a resposta é a mesma nos quatro casos: "convite inválido".
3. **Given** um convite válido e um e-mail que já tem conta (mesmo com maiúsculas diferentes ou espaços nas pontas), **When** alguém tenta se cadastrar, **Then** o cadastro é recusado com mensagem genérica que não confirma a existência do e-mail, e o convite continua válido.
4. **Given** um convite válido e uma senha com menos de 8 caracteres ou um e-mail mal formado, **When** alguém tenta se cadastrar, **Then** o cadastro é recusado indicando o campo inválido, e o convite continua válido.
5. **Given** duas tentativas simultâneas de cadastro com o mesmo convite, **When** ambas são processadas, **Then** exatamente uma conta é criada.
6. **Given** muitas tentativas de cadastro vindas do mesmo endereço de rede em pouco tempo, **When** o limite é ultrapassado, **Then** as tentativas seguintes são recusadas até a janela passar, sem consultar convites.

---

### User Story 3 - Entrar, saber quem está logado e sair (Priority: P3)

O usuário cadastrado entra com e-mail e senha, o servidor reconhece a sessão enquanto ele continuar usando o site (ela só expira após 30 dias sem uso, ou 1 ano depois do login), e ao sair a sessão deixa de valer imediatamente. Erros de login nunca revelam se um e-mail tem conta, e tentativas repetidas são barradas.

**Why this priority**: Depois do cadastro, é o que permite voltar ao site. Depende da história 2 para ter contas.

**Independent Test**: Com uma conta criada, entrar com a senha certa e conferir "quem sou eu"; avançar o relógio e conferir que o uso estende a expiração e que o limite de 1 ano é respeitado; sair e conferir que a mesma sessão passa a ser recusada; errar a senha várias vezes e conferir o bloqueio temporário; comparar as respostas de e-mail inexistente e senha errada.

**Acceptance Scenarios**:

1. **Given** uma conta existente, **When** o usuário entra com o e-mail (sem diferenciar maiúsculas) e a senha corretos, **Then** recebe uma sessão nova, que expira após 30 dias sem uso.
2. **Given** um e-mail sem conta, ou um e-mail com conta e a senha errada, **When** alguém tenta entrar, **Then** a resposta é a mesma nos dois casos, inclusive sem diferença perceptível de tempo.
3. **Given** uma sessão ativa, **When** o usuário pergunta "quem sou eu", **Then** recebe o próprio identificador e e-mail, e nunca a senha ou o hash dela.
4. **Given** nenhuma sessão, uma sessão expirada ou uma sessão encerrada, **When** alguém pergunta "quem sou eu", **Then** a resposta é "não autenticado".
5. **Given** uma sessão ativa, **When** o usuário sai, **Then** a sessão é invalidada no servidor, o navegador é instruído a descartá-la, e reapresentar a mesma sessão depois dá "não autenticado".
6. **Given** uma sessão ativa usada pela última vez há mais de 1 dia, **When** o usuário faz uma requisição autenticada, **Then** a expiração passa a ser 30 dias a partir dali, sem nunca ultrapassar 1 ano desde o login, e o navegador recebe o cookie com a nova validade.
7. **Given** uma sessão com mais de 1 ano desde o login, **When** ela é apresentada, **Then** a resposta é "não autenticado", mesmo que tenha sido usada nos últimos 30 dias.
8. **Given** tentativas de login erradas em sequência, **When** o limite é ultrapassado, **Then** as tentativas seguintes são recusadas com "muitas tentativas, tente mais tarde", mesmo que a senha esteja certa, até a janela passar.

---

### User Story 4 - Usuário gera convites dentro da cota (Priority: P4)

O usuário logado pede um convite novo e recebe o código uma única vez. Ele pode consultar a lista dos convites que gerou, com a situação de cada um, mas nunca vê o código de novo. Cada usuário tem no máximo 3 convites ativos ao mesmo tempo.

**Why this priority**: Permite que o site cresça por indicação sem depender do autor, mas o site funciona sem isso, já que o autor gera convites pela linha de comando.

**Independent Test**: Logado, gerar três convites e conferir que um quarto é recusado por cota; deixar um ser usado (ou expirar) e conferir que um novo pode ser gerado; listar os convites e conferir que nenhum código aparece.

**Acceptance Scenarios**:

1. **Given** um usuário logado com menos de 3 convites ativos, **When** ele pede um convite, **Then** recebe um código novo, válido por 7 dias, que só aparece nessa resposta.
2. **Given** um usuário com 3 convites ativos, **When** ele pede outro, **Then** o pedido é recusado informando que a cota foi atingida.
3. **Given** um usuário com 3 convites, um deles usado, expirado ou revogado, **When** ele pede outro, **Then** o pedido é aceito.
4. **Given** um usuário com 2 convites ativos, **When** ele faz dois pedidos simultâneos, **Then** no máximo um é aceito e ele nunca passa de 3 ativos.
5. **Given** um usuário logado, **When** ele lista os próprios convites, **Then** vê, para cada um, a data de criação, a de expiração e a situação (ativo, usado, expirado ou revogado), sem o código, e não vê convites de outros usuários nem os criados pelo autor na linha de comando.
6. **Given** nenhuma sessão válida, **When** alguém pede ou lista convites, **Then** a resposta é "não autenticado".
7. **Given** muitos pedidos de convite vindos do mesmo endereço de rede em pouco tempo, **When** o limite é ultrapassado, **Then** os pedidos seguintes são recusados até a janela passar.

---

### User Story 5 - Autor administra convites pela linha de comando (Priority: P5)

O autor cria convites sem cota e com validade configurável, lista todos os convites do sistema e revoga qualquer convite ainda não usado, tudo pela linha de comando, sem passar pela API.

**Why this priority**: A criação pela linha de comando já é necessária na história 2. Listar e revogar são administração e podem vir por último.

**Independent Test**: Criar um convite com validade de 1 dia e outro com o padrão, listar e conferir as expirações; revogar um e conferir que o cadastro com ele passa a dar "convite inválido".

**Acceptance Scenarios**:

1. **Given** a linha de comando, **When** o autor cria um convite sem informar a validade, **Then** o código é exibido uma única vez e vale por 7 dias; informando a validade em dias, vale pelo período informado.
2. **Given** convites criados pelo autor e por usuários, **When** o autor lista os convites, **Then** vê todos, com identificador, quem criou (ou "linha de comando"), datas e situação, sem nenhum código.
3. **Given** um convite ativo, **When** o autor o revoga pelo identificador, **Then** ele passa a ser recusado como "convite inválido" e deixa de contar na cota de quem o criou.
4. **Given** um convite já usado ou um identificador inexistente, **When** o autor tenta revogá-lo, **Then** o comando informa que não há o que revogar e não altera nada.
5. **Given** o autor criando convites pela linha de comando, **When** ele cria mais de 3, **Then** todos são aceitos, porque a cota não se aplica a ele.
6. **Given** o ambiente de desenvolvimento com e-mail e senha de teste configurados, **When** o autor roda o seed, **Then** passa a existir uma conta com essas credenciais, sem precisar de convite, e o login com elas funciona.
7. **Given** o ambiente de produção, ou o e-mail ou a senha de teste ausentes, **When** o autor roda o seed, **Then** o comando recusa com mensagem clara e não grava nada.
8. **Given** a conta de teste já existe, **When** o autor roda o seed de novo, **Then** nada muda (nem a senha) e o comando informa que o usuário já existe.

---

### Edge Cases

- E-mail com maiúsculas ou espaços nas pontas: é normalizado (minúsculas, sem espaços nas pontas) no cadastro e no login, então `Ana@X.com ` e `ana@x.com` são a mesma conta.
- Senha com espaços nas pontas: é mantida exatamente como digitada; só o e-mail é normalizado.
- Senha longa demais: recusada acima de 128 caracteres, para que o cálculo do hash não possa ser usado para sobrecarregar o servidor.
- Código de convite digitado com minúsculas, espaços ou hífens: é normalizado antes da comparação, e o alfabeto do código evita caracteres confundíveis (`0`/`O`, `1`/`I`/`L`).
- Convite que expira entre a validação e a criação da conta: a verificação e o consumo acontecem na mesma operação atômica, então ou o convite ainda vale e é consumido, ou o cadastro é recusado como "convite inválido".
- Falha no meio do cadastro (por exemplo, e-mail duplicado detectado ao gravar): nada fica gravado e o convite continua válido.
- Usuário logado que se cadastra de novo com outro convite: é tratado como cadastro comum; a sessão anterior não interfere.
- Login com sessão já ativa: uma sessão nova é criada; as outras sessões do usuário continuam válidas até expirar ou ele sair delas.
- Sessão apresentada perto do fim do prazo: vale até o instante exato de expiração e é recusada depois; se for usada antes disso, o prazo se estende.
- Várias requisições na mesma sessão no mesmo dia: a expiração é regravada no máximo uma vez por dia, para não escrever no banco a cada requisição.
- Renovação perto do limite absoluto: a nova expiração é o menor entre "agora + 30 dias" e "login + 1 ano".
- Sessão adulterada ou com formato inválido: tratada como "não autenticado", sem erro do servidor.
- Banco fora do ar: as operações respondem com erro de serviço indisponível, sem expor detalhes da conexão.
- Revogar um convite já expirado: aceito, a situação passa a "revogado" (não muda a validade de nada, mas deixa o registro claro).
- Rodar a criação de convite pela linha de comando com validade zero, negativa ou não numérica: recusado antes de gravar.

## Requirements *(mandatory)*

### Functional Requirements

**Banco e convenções de dados**

- **FR-001**: O sistema MUST guardar usuários, sessões, convites e tentativas limitadas num banco relacional cuja estrutura é definida só por migrações versionadas no repositório (constitution, princípio IX). Aplicar as migrações a um banco vazio MUST produzir a estrutura atual, e aplicá-las de novo MUST NOT alterar nada.
- **FR-002**: Esta feature MUST criar apenas as estruturas de usuários, sessões, convites e tentativas. Puzzles e progresso ficam para a feature de puzzles.
- **FR-003**: Toda tabela, desta e das próximas features, MUST ter data e hora de criação (`created_at`) e de última alteração (`updated_at`), obrigatórias, com fuso horário e em UTC. Ambas MUST ser preenchidas pelo banco na criação, e `updated_at` MUST avançar automaticamente a cada alteração do registro, sem depender de o código da aplicação informá-la.
- **FR-004**: A conexão com o banco MUST ser configurada só por variável de ambiente validada na inicialização. Sem ela, a API MUST recusar a subida com uma mensagem que não exponha o valor.

**Conta**

- **FR-005**: O cadastro MUST exigir e-mail, senha e código de convite, e MUST criar a conta e consumir o convite numa única operação atômica: ou as duas coisas acontecem, ou nenhuma.
- **FR-006**: O e-mail MUST ser normalizado (minúsculas, sem espaços nas pontas), ter formato válido e ser único entre as contas. A senha MUST ter de 8 a 128 caracteres.
- **FR-007**: A senha MUST ser guardada só como hash argon2. A senha e o hash MUST NOT aparecer em respostas, logs ou mensagens de erro.
- **FR-008**: O cadastro bem-sucedido MUST abrir uma sessão para a conta criada.
- **FR-009**: Falhas de cadastro por e-mail já existente MUST usar uma mensagem genérica que não confirma a existência do e-mail. Falhas de formato (e-mail mal formado, senha curta ou longa demais) PODEM indicar o campo, porque não revelam nada sobre contas.

**Sessão**

- **FR-010**: O login MUST aceitar e-mail (normalizado como em FR-006) e senha e, se corretos, abrir uma sessão nova.
- **FR-011**: Login com e-mail inexistente e login com senha errada MUST produzir a mesma resposta, sem diferença de tempo que permita distinguir os casos.
- **FR-012**: A sessão MUST ser guardada no servidor, identificada por um valor aleatório que só existe no cookie do navegador; o banco MUST guardar apenas o hash desse valor (constitution, princípio VI).
- **FR-013**: O cookie de sessão MUST ser `HttpOnly` e `SameSite=Lax`, e `Secure` fora do ambiente de desenvolvimento local.
- **FR-014**: A sessão MUST expirar após 30 dias sem uso. A cada requisição autenticada em que a última renovação tenha ocorrido há mais de 1 dia, o sistema MUST estender a expiração para 30 dias a partir dali e reenviar o cookie com a nova validade. A expiração MUST NOT ultrapassar 1 ano desde a abertura da sessão (limite absoluto). Sessões expiradas por inatividade ou pelo limite absoluto MUST ser recusadas como "não autenticado".
- **FR-015**: O sistema MUST permitir consultar "quem sou eu" com uma sessão válida, devolvendo o identificador e o e-mail da conta, e "não autenticado" sem ela.
- **FR-016**: Sair MUST invalidar a sessão no servidor e instruir o navegador a descartar o cookie. Uma sessão encerrada MUST ser recusada mesmo que o cookie volte a ser apresentado.

**Convites**

- **FR-017**: O código de convite MUST ter 16 caracteres aleatórios de um alfabeto sem caracteres confundíveis, gerados por fonte criptograficamente segura. Ele MUST ser exibido só na resposta de criação, e o banco MUST guardar apenas o hash.
- **FR-018**: Ao validar um código, o sistema MUST normalizá-lo (maiúsculas, sem espaços nem hífens) antes de compará-lo.
- **FR-019**: Um convite MUST ser de uso único e, por padrão, válido por 7 dias a partir da criação. Ele MUST NOT ser amarrado a um e-mail.
- **FR-020**: Convite inexistente, usado, expirado ou revogado MUST produzir a mesma resposta: "convite inválido".
- **FR-021**: Um usuário logado MUST poder gerar convites, com no máximo 3 ativos ao mesmo tempo (ativo = não usado, não expirado e não revogado). A cota MUST valer mesmo com pedidos simultâneos.
- **FR-022**: Um usuário logado MUST poder listar os convites que gerou, com datas de criação e de expiração e situação (ativo, usado, expirado, revogado), sem o código e sem os convites de outras pessoas.
- **FR-023**: O sistema MUST registrar quem criou cada convite (vazio quando criado pela linha de comando), quem o usou e quando, e quando foi revogado.

**Linha de comando do autor**

- **FR-024**: A linha de comando MUST permitir criar convites sem cota, com validade em dias opcional (padrão 7, aceitando só inteiros positivos), exibindo o código uma única vez.
- **FR-025**: A linha de comando MUST permitir listar todos os convites, com identificador, criador, datas e situação, sem códigos.
- **FR-026**: A linha de comando MUST permitir revogar um convite não usado pelo identificador, e MUST informar sem alterar nada quando o convite já foi usado ou não existe.

**Seed de desenvolvimento**

- **FR-033**: O sistema MUST oferecer um comando de seed, só para desenvolvimento, que cria uma conta de teste com e-mail e senha lidos da configuração (`SEED_USER_EMAIL` e `SEED_USER_PASSWORD`), sem convite. O e-mail passa pela mesma normalização e validação de FR-006, e a senha pela mesma regra de tamanho e pelo mesmo hash de FR-007. O comando MUST recusar rodar em produção e MUST falhar sem gravar nada se alguma das duas variáveis faltar ou for inválida. Se a conta já existir, o comando MUST NOT alterá-la (nem a senha) e MUST informar que ela já existe, de modo que rodá-lo de novo é seguro. Os valores versionados no exemplo de configuração MUST ser fictícios (constitution, princípio VI).

**Limites de tentativas**

- **FR-027**: O login MUST ter limite de tentativas falhas: no máximo 5 por e-mail em 15 minutos e no máximo 20 por endereço de rede em 15 minutos. Ao atingir qualquer um, as tentativas seguintes MUST ser recusadas com "muitas tentativas, tente mais tarde" até a janela passar, sem verificar a senha.
- **FR-028**: O cadastro e a geração de convites pela API MUST ter limite de tentativas por endereço de rede: no máximo 10 de cada em 1 hora.
- **FR-029**: A resposta de limite atingido MUST ser distinta das demais, mas MUST NOT revelar se o e-mail tem conta. Os registros de tentativas MUST ser guardados no banco, para que os limites continuem valendo depois de a API reiniciar ou dormir, e MUST valer também com mais de uma instância da API. Eles MUST NOT guardar a senha tentada.

**Testes**

- **FR-030**: Cadastro, sessão, convites e as convenções de FR-003 MUST ter testes de integração contra um banco real em container, separados dos testes unitários e com comando próprio.
- **FR-031**: Os testes de integração MUST cobrir, no mínimo: uso único do convite, cadastro e uso simultâneos do mesmo convite, expiração, cota de 3 (inclusive com pedidos simultâneos), revogação, convite não gasto quando o cadastro falha, limites de tentativas, expiração, renovação, limite absoluto e encerramento de sessão e o preenchimento automático de `created_at` e `updated_at`.
- **FR-032**: A CI MUST rodar os testes de integração a cada push, com o banco em container. Os testes unitários e o hook de pré-push MUST continuar sem depender de banco (constitution, princípios II e VII).

### Key Entities

- **Usuário (`users`)**: uma conta. E-mail normalizado e único, hash da senha, datas de criação e alteração. Cria convites, pode ter usado um convite para se cadastrar e tem zero ou mais sessões.
- **Sessão (`sessions`)**: um acesso aberto por uma conta. Hash do valor aleatório do cookie, a conta a que pertence, instante de expiração (estendido com o uso), limite absoluto de 1 ano a partir da abertura, datas de criação e alteração. Pertence a um único usuário.
- **Tentativa (`rate_limit_attempts`, nome final no plano)**: o registro de uma tentativa sujeita a limite. Tipo de ação (login, cadastro, geração de convite), a chave limitada (e-mail normalizado ou endereço de rede), o instante, datas de criação e alteração. Não guarda senha nem código de convite, e não tem vínculo obrigatório com usuário.
- **Convite (`invites`)**: um código de uso único. Hash do código, quem criou (vazio se foi a linha de comando), instante de expiração, quem usou e quando, quando foi revogado, datas de criação e alteração. A situação (ativo, usado, expirado, revogado) é derivada desses campos, não guardada à parte.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A partir de um banco vazio, um único comando deixa a estrutura na versão atual, e repeti-lo não produz nenhuma alteração.
- **SC-002**: 100% dos registros criados nos testes têm data de criação e de alteração preenchidas sem que o código as informe, e 100% das alterações testadas avançam a data de alteração.
- **SC-003**: As quatro situações de convite inválido (inexistente, usado, expirado, revogado) produzem respostas idênticas em 100% dos casos.
- **SC-004**: Em 100% dos testes de cadastro simultâneo com o mesmo convite, exatamente uma conta é criada; em 100% dos testes de geração simultânea, nenhum usuário passa de 3 convites ativos.
- **SC-005**: Em 100% dos cadastros que falham, o convite usado continua válido.
- **SC-006**: Uma inspeção do banco ao fim de um teste que exercita cadastro, login, geração de convites pela API e pela linha de comando não encontra nenhuma senha, código de convite ou valor de sessão em texto puro.
- **SC-007**: As respostas a login com e-mail inexistente e com senha errada são idênticas, e a diferença entre as médias de tempo fica abaixo de 10% em 20 tentativas de cada, descartadas as 2 primeiras de cada lado como aquecimento.
- **SC-008**: Cadastro, login, saída e "quem sou eu" respondem em menos de 1 segundo numa máquina de desenvolvimento comum, sem contar o tempo de o servidor acordar.
- **SC-009**: A suíte de integração roda sem acesso à internet (além do download da imagem do banco) e termina em menos de 2 minutos, localmente e na CI.

## Assumptions

- Os caminhos da API seguem o design (§4): `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/invites` e `GET /api/invites`. O contrato exato (corpos, códigos de status) é definido no plano.
- A renovação da sessão estende o prazo da mesma sessão, sem trocar o valor do cookie e sem um token de renovação separado, porque a sessão já fica no servidor e pode ser invalidada a qualquer momento.
- Os registros de tentativas fora da janela de limite são ignorados na contagem. A limpeza deles, como a de sessões e convites expirados, pode ser feita de forma oportunista pelo plano ou ficar para quando o volume justificar.
- O valor exato dos limites (5 por e-mail e 20 por endereço de rede em 15 minutos no login; 10 por hora no cadastro e na geração) segue o exemplo do design e pode ser ajustado por configuração sem mudar a regra.
- Sessões e convites expirados não precisam ser apagados nesta feature; eles só são recusados. A limpeza periódica fica para quando o volume justificar.
- O cadastro com convite válido e e-mail já existente responde com mensagem genérica, mas quem tem um convite válido poderia deduzir que o e-mail existe. O risco é aceito: só convidados chegam a esse ponto, e o convite não é gasto.
- A lista de convites do usuário não mostra quem usou cada convite, só que foi usado.
- Troca de senha, recuperação de senha, exclusão de conta e confirmação de e-mail ficam fora do escopo desta feature (o site não envia e-mails). A recuperação de senha foi discutida e adiada para uma feature futura; até lá, quem esquecer a senha fica sem acesso à conta. Encerrar todas as sessões de um usuário de uma vez (pelo autor ou pelo próprio usuário) vai para essa mesma feature; até lá, cada sessão só termina pelo logout dela, pela inatividade de 30 dias ou pelo limite de 1 ano, e um cookie vazado continua valendo até um desses eventos.
- Os identificadores de usuário, sessão e convite são gerados pelo sistema e não revelam ordem nem quantidade de registros; o tipo exato fica para o plano e para a data definition.
- Fora do escopo: telas de login e cadastro no site, o easter egg Konami (o site só chamará a geração de convites numa feature futura), a preferência de tema e as tabelas de puzzles e progresso.
- O seed de desenvolvimento é uma conveniência para testar a API à mão; os testes automatizados não dependem dele e criam os próprios dados.
- O ambiente local já tem Postgres pelo Docker Compose (feature 002); os testes de integração sobem um banco próprio em container para não depender do banco de desenvolvimento.
