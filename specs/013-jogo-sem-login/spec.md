# Feature Specification: Jogo sem login e cadastro aberto

**Feature Branch**: `feat/013-jogo-sem-login`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Permitir jogar sem precisar logar, quando estiver jogando logado não é salvo na api, apenas localmente, talvez utilizando o indexDB do browser. Aproveitando também remover a funcionalidade de criar conta por convite, qualquer um vai poder criar conta, porém a criação de conta vai ficar desabilitado por feature flag."

_Leitura da descrição_: "quando estiver jogando logado não é salvo na api" foi lido como "jogando **des**logado". Quem joga sem conta tem o progresso só no aparelho; quem joga logado continua salvando no servidor, como hoje (feature 008).

## Clarifications

### Session 2026-10-16

- Q: Com o cadastro fechado e sem convites, como uma conta nova é criada? → A: Por um comando do autor na linha de comando, no lugar de `invites create`.
- Q: O que acontece com o progresso do visitante quando ele entra numa conta? → A: Fica guardado no aparelho, fora de vista, e volta quando a pessoa sai da conta; nada é levado para a conta.
- Q: Com o jogo aberto a visitantes, qual o nível de exposição do site? → A: Qualquer pessoa com o endereço do site pode acessá-lo, sem convite nem conta. Não ficou definido se buscadores podem indexar o site; a premissa é manter o `noindex` atual (ver Assumptions).
- Q: Ao entrar no site, o que a pessoa vê primeiro? → A: O calendário da biblioteca, no mês atual, direto, sem tela de boas-vindas, banner ou convite para entrar por cima. Vale para visitante e para quem está logado. A única indicação de visitante é "Visitante / Entrar" no cabeçalho.

## Contexto

Hoje o site é fechado: toda tela exceto login e cadastro exige sessão, e só cria conta quem tem um convite (features 004 e 010). Esta feature abre o jogo para quem não tem conta. Essa pessoa (o **visitante**) escolhe um dia e joga, e o progresso, o tempo, as ajudas e a conclusão ficam guardados só no navegador dela. Quem tem conta continua com tudo salvo no servidor e sincronizado entre aparelhos.

A feature também acaba com os convites. O cadastro passa a pedir só e-mail e senha, mas fica controlado por uma chave de configuração (feature flag) que vem **desligada**. Com a chave desligada, ninguém cria conta pelo site nem pela API. O autor liga a chave quando quiser abrir o cadastro, sem mudar código e sem lançar versão nova.

**Dependência da constitution**: esta feature contraria dois princípios da v3.0.0. O VI diz que a solução vai ao navegador "somente a usuários com sessão válida". O VIII diz que o site é "privado, restrito a convidados". O VI também exige limite de tentativas na "geração de convites". O plano só pode passar no Constitution Check depois de uma emenda (provavelmente MAJOR, 4.0.0) que: permita entregar puzzle e solução a visitantes; troque "privado, restrito a convidados" por "acessível a qualquer pessoa com o endereço" (FR-025); e retire os convites do texto, mantendo o limite de tentativas no login e no cadastro. Essa emenda é pré-requisito do `/speckit-plan`.

Fora do escopo: recuperação de senha, "sair de todos os aparelhos", verificação de e-mail, captcha, sincronizar o progresso do visitante entre aparelhos ou navegadores, estatísticas, ranking, outras fontes e níveis, e qualquer painel para ligar a chave de cadastro (ela é só configuração).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Jogar sem conta (Priority: P1)

Alguém abre o site pela primeira vez, sem conta, e chega à biblioteca. Escolhe a cruzada de hoje e joga com tudo o que a pessoa logada tem: tabuleiro, dicas, cronômetro, pausa, ajudas e janela de conclusão. Se fechar a aba e voltar depois no mesmo navegador, a partida continua de onde parou.

**Why this priority**: é o valor principal da feature, porque tira a barreira de entrada. Com o cadastro desligado por padrão, é o único jeito de uma pessoa nova jogar.

**Independent Test**: num navegador sem sessão e sem dados, abrir o site, jogar parte da cruzada de hoje, recarregar a página e ver as letras e o tempo de volta. Confirmar que nenhum progresso foi gravado no servidor.

**Acceptance Scenarios**:

1. **Given** uma pessoa sem sessão, **When** abre o site, **Then** vê direto o calendário da biblioteca no mês atual, sem passar pelo login e sem nenhuma tela, banner ou janela por cima, e tem "Entrar" no cabeçalho.
2. **Given** um visitante na biblioteca, **When** abre um dia já guardado, **Then** o tabuleiro carrega e ele pode jogar, com ajudas, pausa e cronômetro iguais aos da pessoa logada.
3. **Given** um visitante com letras preenchidas, **When** recarrega a página ou fecha e reabre o navegador, **Then** as letras, o tempo decorrido e as ajudas usadas voltam como estavam.
4. **Given** um visitante jogando, **When** a conexão cai, **Then** ele continua jogando e o progresso continua guardado no aparelho, sem aviso de erro ao salvar (para o visitante, salvar não depende da rede).
5. **Given** um visitante jogando, **When** as letras mudam, **Then** nenhum progresso, tempo ou conclusão dele é enviado ao servidor.

---

### User Story 2 - Concluir e acompanhar cruzadas como visitante (Priority: P1)

O visitante termina a grade e vê a janela de conclusão com o tempo dele e o melhor tempo guardado no aparelho. Na biblioteca, cada dia mostra a situação (não iniciado, em andamento, concluído com tempo) a partir do que está guardado no navegador.

**Why this priority**: sem conclusão e sem situação na biblioteca, jogar sem conta vira uma experiência pela metade.

**Independent Test**: como visitante, concluir uma cruzada, voltar à biblioteca e ver o dia como concluído com o tempo; usar "Jogar de novo" e conferir que o melhor tempo continua lá.

**Acceptance Scenarios**:

1. **Given** um visitante que completa a grade com as letras certas, **When** a última letra entra, **Then** a janela de conclusão abre na hora com o tempo e o melhor tempo deste aparelho, sem aviso de "vamos registrar quando a conexão voltar".
2. **Given** um visitante com cruzadas iniciadas e concluídas, **When** abre a biblioteca, **Then** cada dia mostra a situação e o tempo guardados neste navegador, e os outros dias aparecem como não iniciados.
3. **Given** uma cruzada concluída pelo visitante, **When** ele a abre de novo, **Then** ela abre em modo leitura e "Jogar de novo" reinicia do zero mantendo o melhor tempo, mesmo sem conexão.
4. **Given** um visitante, **When** abre a biblioteca, **Then** vê os mesmos dias disponíveis que uma pessoa logada veria.

---

### User Story 3 - Cadastro sem convite, controlado por chave (Priority: P2)

Com a chave de cadastro ligada, qualquer pessoa cria uma conta só com e-mail e senha e já sai logada. Com a chave desligada (o padrão), a opção de criar conta não aparece no site e a API recusa qualquer tentativa de cadastro.

**Why this priority**: deixa o autor abrir e fechar o cadastro sem lançar versão, e tira os convites, que deixam de fazer sentido com o jogo aberto.

**Independent Test**: com a chave desligada, conferir que o site não oferece cadastro e que um pedido direto à API é recusado. Ligar a chave, reiniciar a API sem mudar código e criar uma conta só com e-mail e senha.

**Acceptance Scenarios**:

1. **Given** a chave de cadastro desligada, **When** uma pessoa abre a tela de entrada, **Then** vê só o login, sem link ou botão de criar conta.
2. **Given** a chave desligada, **When** alguém manda um pedido de cadastro direto à API, **Then** o pedido é recusado com uma resposta própria de "cadastro fechado" e nenhuma conta é criada.
3. **Given** a chave ligada, **When** uma pessoa informa um e-mail válido e uma senha de 8 a 128 caracteres, **Then** a conta é criada e ela entra logada, sem nenhum código.
4. **Given** a chave ligada e um e-mail que já tem conta, **When** alguém tenta se cadastrar com ele, **Then** vê a mesma mensagem genérica de hoje, sem confirmar que o e-mail existe.
5. **Given** a chave ligada, **When** o mesmo endereço de rede faz mais de 10 tentativas de cadastro em 1 hora, **Then** as seguintes são recusadas pelo limite de tentativas, como hoje.
6. **Given** o autor muda a chave na configuração, **When** a API reinicia, **Then** o site passa a mostrar ou esconder o cadastro conforme a chave, sem publicar uma versão nova do site.
7. **Given** a chave desligada, **When** o autor cria uma conta pela linha de comando com e-mail e senha, **Then** a conta é criada com as mesmas regras do cadastro, e a pessoa já consegue entrar pelo site.
8. **Given** o autor, **When** tenta criar pela linha de comando uma conta com um e-mail que já existe, ou com e-mail ou senha inválidos, **Then** o comando informa o problema e não grava nada.

---

### User Story 4 - Fim dos convites (Priority: P2)

Os convites deixam de existir: o cadastro não pede código, a sequência Konami não abre mais a janela de convite e a linha de comando do autor não cria, lista nem revoga convites.

**Why this priority**: o cadastro aberto deixa os convites sem função, e mantê-los pela metade confunde e deixa código morto.

**Independent Test**: logado, digitar a sequência Konami fora do tabuleiro e conferir que nada abre. Rodar a linha de comando do autor e ver que os comandos de convite não existem mais. Conferir que as rotas de convite da API não respondem mais.

**Acceptance Scenarios**:

1. **Given** uma pessoa logada fora do tabuleiro, **When** digita ↑ ↑ ↓ ↓ ← → ← → B A, **Then** nada acontece.
2. **Given** o autor, **When** roda a linha de comando, **Then** os comandos de convite não aparecem nem funcionam, e os comandos de puzzles continuam iguais.
3. **Given** um convite criado antes desta feature, **When** alguém tenta usá-lo, **Then** ele não tem efeito (o cadastro não aceita código), e as contas criadas com convite continuam funcionando.

---

### User Story 5 - Entrar numa conta depois de jogar como visitante (Priority: P3)

Um visitante que já jogou decide entrar numa conta. A partir daí ele vê e salva o progresso da conta no servidor. O progresso de visitante não é levado para a conta: fica guardado no aparelho e volta quando ele sai da conta.

**Why this priority**: importa para quem passa de visitante a usuário, mas o jogo já funciona sem isso.

**Independent Test**: como visitante, preencher parte de uma cruzada, entrar numa conta e ver o progresso da conta (não o do visitante); sair da conta e ver o progresso de visitante de volta, igual a antes.

**Acceptance Scenarios**:

1. **Given** um visitante no meio de uma partida, **When** entra numa conta pelo site, **Then** passa a ver o progresso da conta naquela cruzada (ou a cruzada do zero, se a conta não a começou), e nada do progresso de visitante é enviado ao servidor.
2. **Given** uma pessoa logada, **When** escolhe "Sair", **Then** volta à biblioteca como visitante, vendo só o progresso de visitante deste aparelho e nada do progresso da conta.
3. **Given** um visitante com progresso guardado que entrou numa conta, **When** sai da conta, **Then** o progresso de visitante volta exatamente como estava antes de entrar.

---

### Edge Cases

- Visitante que limpa os dados do navegador, usa janela anônima ou troca de navegador: começa do zero. O site não promete guardar nada fora daquele navegador.
- Armazenamento do navegador cheio, bloqueado ou indisponível (alguns modos privados): o visitante continua jogando. O progresso vale só enquanto a aba estiver aberta, e um aviso que não bloqueia explica que não será guardado.
- Duas abas do mesmo visitante na mesma cruzada: vale o salvamento mais recente, como na regra de hoje para a pessoa logada.
- Visitante escolhe um dia passado ainda não guardado no servidor: a busca na fonte segue as mesmas regras e mensagens de hoje (sem cruzada, fonte fora do ar, limite de buscas), com o mesmo limite por endereço de rede.
- Dados de visitante gravados por uma versão anterior do site, ou corrompidos: são descartados com segurança e a cruzada abre do zero, sem travar a tela.
- Uma cruzada removida ou alterada no servidor depois que o visitante começou: o progresso guardado que não bate com a grade atual é descartado.
- Sessão que expira no meio da partida de uma pessoa logada: segue a regra de hoje (FR-032 da feature 010). O jogo não passa a ser de visitante sozinho, para as letras não irem para o lugar errado.
- Cookie de uma sessão vencida ou encerrada ao abrir o site (por exemplo, uma conta antiga que não entra há meses): a pessoa entra como visitante, sem erro e sem aviso de sessão terminada, e o cookie velho é descartado na primeira resposta. Um link direto para uma cruzada também abre normalmente.
- Sessão expirada fora do tabuleiro: a pessoa passa a navegar como visitante, com um aviso de que a sessão terminou e um botão para entrar de novo.
- Chave de cadastro desligada com a tela de cadastro aberta numa aba antiga: o envio é recusado com a mensagem de "cadastro fechado".
- Chave de cadastro com valor inválido na configuração: a API não sobe, como acontece com qualquer configuração inválida.
- Cadastro aberto e e-mail já existente: a mensagem é genérica, mas quem tenta cadastrar pode deduzir que o e-mail existe. Com o cadastro aberto, qualquer pessoa chega a esse ponto (antes, só convidados). O limite de tentativas por endereço reduz o risco, e a chave desligada por padrão também.
- Visitante e pessoa logada no mesmo navegador: os dados do visitante e o progresso da conta nunca se misturam por acidente.

## Requirements _(mandatory)_

### Acesso sem conta

- **FR-001**: O site MUST permitir abrir a biblioteca e jogar qualquer cruzada guardada sem sessão. Login e cadastro deixam de ser a porta obrigatória. Abrir o endereço do site MUST mostrar direto o calendário da biblioteca no mês atual, para visitante e para quem está logado, sem tela de boas-vindas, banner ou janela por cima. A única espera permitida é a de o servidor acordar (feature 012). Isto substitui o FR-001 da feature 010.
- **FR-002**: O servidor MUST entregar a lista de dias disponíveis e cada cruzada (parte pública e solução) também a quem não tem sessão, mantendo a verificação de que puzzle e solução combinam antes da entrega. Para quem não tem sessão, a lista MUST NOT trazer situação nem tempos de nenhum usuário.
- **FR-003**: Buscar na fonte um dia passado ainda não guardado MUST seguir, para o visitante, as mesmas regras, mensagens e limite por endereço de rede de hoje (feature 006).
- **FR-004**: O progresso, o cronômetro, as ajudas usadas, as marcas das ajudas, a conclusão, o tempo final e o melhor tempo do visitante MUST ficar só no navegador do aparelho e MUST NOT ser enviados ao servidor.
- **FR-005**: O progresso do visitante MUST sobreviver a recarregar a página e a fechar e reabrir o navegador, e MUST ser salvo sem depender da rede.
- **FR-006**: Para o visitante, as regras de jogo, os limites de ajuda, a janela de conclusão, o modo leitura e "Jogar de novo" MUST funcionar como para a pessoa logada. A conclusão e o "Jogar de novo" MUST funcionar sem conexão, e o melhor tempo MUST ser mantido no aparelho.
- **FR-007**: A biblioteca do visitante MUST mostrar a situação de cada dia (não iniciado, em andamento, concluído com tempo) a partir dos dados do navegador, sempre por texto e não só por cor, como no FR-004 da feature 010.
- **FR-008**: Os dados de visitante lidos do navegador MUST ser validados antes do uso. Dados inválidos, de formato antigo ou que não batem com a grade atual MUST ser descartados sem travar a tela.
- **FR-009**: Se o navegador não deixar guardar dados, o visitante MUST continuar jogando e MUST ver um aviso que não bloqueia dizendo que o progresso não será guardado.
- **FR-010**: O site MUST deixar claro, em todas as telas, se a pessoa está como visitante ou logada, e MUST oferecer "Entrar" ao visitante. Na tela de jogo, o visitante MUST ver, sem bloquear o jogo, que o progresso fica só neste aparelho.
- **FR-011**: O progresso de visitante e o progresso de uma conta MUST ficar separados no aparelho: um nunca é lido, gravado ou mostrado como o outro. Sair da conta MUST levar a pessoa de volta a visitante, com o progresso de visitante intacto e nada da conta à vista.
- **FR-012**: Ao entrar numa conta, o progresso de visitante MUST NOT ser enviado ao servidor e MUST ficar guardado no aparelho, fora de vista enquanto a pessoa estiver logada (a volta ao sair segue o FR-011).
- **FR-013**: Para a pessoa logada, o progresso MUST continuar indo para o servidor como hoje (features 008 e 010). A sessão que expira no meio da partida MUST seguir o FR-032 da feature 010. A sessão que expira fora do tabuleiro MUST levar a pessoa à navegação de visitante, com aviso e opção de entrar de novo (substitui a ida obrigatória ao login).

### Cadastro e chave de cadastro

- **FR-014**: O cadastro MUST pedir só e-mail e senha, com as regras de hoje: normalização e unicidade do e-mail, senha de 8 a 128 caracteres guardada como hash argon2, mensagem genérica para e-mail já existente, sessão aberta ao concluir e limite de 10 tentativas por endereço de rede por hora.
- **FR-015**: O cadastro MUST ser controlado por uma chave de configuração lida e validada quando a API sobe, **desligada por padrão** em todos os ambientes que não a definirem.
- **FR-016**: Com a chave desligada, a API MUST recusar todo pedido de cadastro com uma resposta própria de "cadastro fechado", sem criar conta, e essa resposta MUST NOT revelar nada sobre contas existentes. A recusa MUST valer mesmo para pedidos que não vêm do site.
- **FR-017**: O site MUST descobrir com o servidor se o cadastro está aberto e mostrar ou esconder a opção de criar conta conforme a resposta, sem depender de uma versão nova do site. Quando não conseguir saber, MUST tratar o cadastro como fechado.
- **FR-018**: Mudar a chave MUST exigir só mudar a configuração e reiniciar a API, sem mudança de código.
- **FR-019**: A linha de comando do autor MUST permitir criar uma conta com e-mail e senha, com a chave ligada ou desligada e sem limite de tentativas, aplicando as mesmas regras de e-mail e senha do FR-014. Com e-mail já existente ou dados inválidos, o comando MUST informar o motivo e não gravar nada. A senha MUST NOT aparecer nos argumentos do comando, no histórico do terminal, na saída nem em logs (constitution, princípio VI).

### Fim dos convites

- **FR-020**: O sistema MUST deixar de aceitar, gerar, listar e revogar convites: pela API, pelo site (janela aberta pela sequência Konami) e pela linha de comando do autor. A sequência Konami MUST deixar de ter efeito.
- **FR-021**: Os convites guardados MUST ser descartados por migração versionada (constitution, princípio IX). As contas criadas com convite MUST continuar intactas, e as tentativas guardadas de "geração de convite" MUST deixar de ser contadas. A migração entra no lançamento seguinte ao que para de usar os convites (ver Assumptions e o FR-022).
- **FR-022**: A remoção MUST respeitar a compatibilidade entre versões vizinhas da API e do site (`docs/versionamento.md`): um site da versão anterior que ainda chame uma rota de convite MUST receber uma resposta tratável, sem quebrar as outras telas.

### Geral

- **FR-023**: Todos os textos novos MUST estar em português do Brasil e seguir o nível de acessibilidade do FR-027 da feature 010.
- **FR-024**: O site MUST continuar exibindo a atribuição à fonte em cada cruzada, também para o visitante.
- **FR-025**: O site MUST poder ser acessado e jogado por qualquer pessoa com o endereço, sem convite nem conta. As instruções para buscadores não indexarem o site (feature 012) MUST continuar valendo.

### Key Entities

- **Visitante**: quem usa o site sem sessão. Não existe no servidor; é identificado só pelo navegador do aparelho.
- **Progresso de visitante**: por cruzada, guardado só no navegador. Tem as letras, o tempo decorrido, a situação (em andamento ou concluída), o tempo final, o melhor tempo, as ajudas usadas e as marcas das células, e a data do último salvamento.
- **Chave de cadastro**: configuração da API, ligada ou desligada (desligada por padrão), que decide se o cadastro aceita pedidos; o site lê o valor no servidor.
- **Usuário**: conta com e-mail e senha, agora criada sem convite. As contas atuais continuam iguais.
- **Convite** (removido): deixa de existir com seus dados. A criação de contas pelo autor passa a ser um comando de conta na linha de comando.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Uma pessoa sem conta, com o servidor acordado, começa a jogar a cruzada de hoje em menos de 30 segundos e sem preencher nenhum formulário.
- **SC-002**: Em 100% dos testes, o progresso de um visitante (letras, tempo, ajudas e conclusão) volta igual depois de recarregar e de reabrir o navegador.
- **SC-003**: Depois de uma sessão completa de visitante (jogar, concluir, jogar de novo), o servidor não tem nenhum registro de progresso, tempo ou conclusão dessa pessoa.
- **SC-004**: Com a chave desligada, 0 contas são criadas por qualquer pedido de cadastro, venha do site ou direto à API.
- **SC-005**: Ligar ou desligar o cadastro leva menos de 5 minutos e nenhuma mudança de código ou versão nova do site.
- **SC-006**: Depois da feature, nenhuma tela, comando ou rota cria, lista, revoga ou aceita convite, e todas as contas existentes continuam entrando normalmente.
- **SC-007**: O fluxo do visitante (abrir, escolher um dia, jogar, usar cada ajuda, concluir) pode ser feito só com teclado, e a verificação automatizada de acessibilidade das telas novas ou alteradas não aponta violações críticas.

## Assumptions

- O modo visitante está sempre ligado; só o cadastro tem chave. A descrição pede chave só para o cadastro.
- O armazenamento do navegador é escolhido no plano. A descrição sugere IndexedDB, o que se encaixa nos requisitos (sobrevive a reabrir o navegador, guarda bem mais que algumas cruzadas), mas a escolha fica para o `/speckit-plan`.
- As preferências que já ficam só no aparelho (tema, tamanho do tabuleiro, largura da biblioteca, uso das ajudas) continuam onde estão. Para o visitante, as ajudas passam a ficar junto do progresso de visitante.
- O visitante não tem "outro aparelho": não há aviso de "concluída em outro aparelho" nem conflito entre aparelhos.
- Ler cruzadas já guardadas (biblioteca e cruzada por id, com a solução) não tem limite de pedidos, com ou sem sessão. Quem tem o endereço pode copiar o acervo guardado inteiro, e isso pesa no plano gratuito da API. O risco é aceito: a documentação da API não existe em produção, o site não oferece exportação nem feed (constitution VIII) e o uso esperado é pequeno. Se aparecer cópia em massa ou carga, a medida é um limite de leitura por endereço de rede, numa feature própria.
- O limite de buscas na fonte por endereço de rede (feature 006) basta para proteger a fonte com o jogo aberto. Mudar esse limite fica para depois, se necessário.
- Os textos e o fluxo de login continuam os da feature 010. Só saem o campo do código de convite e a ida obrigatória ao login.
- O seed de desenvolvimento continua criando a conta de teste.
- A resposta "qualquer pessoa pode acessar o endereço do site" não falou de buscadores. A premissa é manter o `noindex` (FR-025). Com isso o site fica aberto a quem tem o link, mas não é divulgado em buscas, o que expõe menos o conteúdo de terceiros (princípio VIII). Se o autor quiser o site indexado, isso muda o FR-025 e a emenda.
- O comando de conta do autor pede a senha sem mostrá-la na tela (ou a lê da entrada padrão). Os detalhes ficam para o plano.
- A chave de cadastro fica desligada em produção até o autor decidir abrir o cadastro.
- A remoção das rotas de convite e da tabela pode ser feita em mais de um lançamento, se for preciso para a compatibilidade do FR-022. O plano decide a ordem.
