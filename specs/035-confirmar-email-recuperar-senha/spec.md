# Feature Specification: Confirmar e-mail no cadastro e recuperar senha

**Feature Branch**: `feat/035-confirmar-email-recuperar-senha` (o trabalho segue na branch já aberta `feature-confirmar-e-mail-no-cadastro-e-recuperar`)

**Created**: 2026-10-26

**Status**: Implemented

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/82 — [Feature]: confirmar e-mail no cadastro e recuperar senha por e-mail"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar conta confirmando o e-mail (Priority: P1)

Uma pessoa informa só o e-mail no cadastro. Nada é criado ainda: ela vê a mensagem "enviamos um link para o seu e-mail". Ao abrir o link recebido, ela escolhe a senha; só então a conta passa a existir, e a pessoa é levada ao login. A senha é escolhida por quem tem o link, nunca por quem pediu o cadastro: assim ninguém cadastra o e-mail de outra pessoa com uma senha que só ele conhece.

**Why this priority**: hoje qualquer um pode registrar o e-mail de outra pessoa e o e-mail informado nunca é conferido. Sem isso a conta não tem dono comprovado, e a recuperação de senha (Story 3) depende de um e-mail confiável.

**Independent Test**: com o cadastro aberto, cadastrar um e-mail, confirmar que ainda não é possível entrar, abrir o link do e-mail e então entrar com sucesso.

**Acceptance Scenarios**:

1. **Given** o cadastro está aberto e o e-mail não tem conta, **When** a pessoa envia um e-mail válido, **Then** o site mostra que um link foi enviado, nenhuma conta nem sessão existe ainda e o e-mail com o link é enviado.
2. **Given** existe um cadastro pendente com link válido, **When** a pessoa abre o link e envia uma senha válida, **Then** a conta é criada com essa senha, a pendência some, nenhuma sessão é aberta e o site orienta a entrar. Abrir o link sem enviar a senha não gasta o link, e uma senha inválida também não.
3. **Given** um link já usado, vencido ou substituído por um reenvio, **When** a pessoa o abre, **Then** o site diz que o link não vale mais e oferece pedir outro, sem criar nada.
4. **Given** um cadastro pendente, **When** a pessoa tenta entrar com o e-mail e a senha antes de confirmar, **Then** o login falha com a mesma mensagem genérica de credenciais inválidas.

---

### User Story 2 - Reenviar o link de confirmação (Priority: P1)

Quem não recebeu o e-mail (ou deixou o link vencer) pede um novo. O site mostra uma contagem regressiva até o próximo reenvio permitido. O link novo invalida o anterior.

**Why this priority**: sem reenvio, um e-mail perdido trava o cadastro; faz parte do fluxo mínimo da Story 1.

**Independent Test**: cadastrar, pedir reenvio antes do intervalo (nenhum e-mail sai e a resposta traz o tempo restante), esperar o intervalo, pedir de novo (aceito) e confirmar que só o link novo funciona.

**Acceptance Scenarios**:

1. **Given** um cadastro pendente e o intervalo mínimo já passou, **When** a pessoa pede reenvio, **Then** um novo e-mail é enviado, o link antigo deixa de valer e o site reinicia a contagem com o tempo informado pela API.
2. **Given** o último envio foi há menos que o intervalo mínimo, **When** a pessoa pede reenvio, **Then** nenhum e-mail sai e a resposta informa o tempo restante até o próximo reenvio permitido (a resposta é a mesma de um reenvio aceito, para não revelar se há pendência).
3. **Given** um e-mail sem cadastro pendente, **When** alguém pede reenvio, **Then** a resposta é indistinguível da de um e-mail com pendência.

---

### User Story 3 - Recuperar a senha por e-mail (Priority: P1)

Quem esqueceu a senha informa o e-mail em "esqueci a senha", recebe um link de uso único e de validade curta, define uma nova senha e passa a entrar com ela. Todas as sessões antigas da conta são encerradas.

**Why this priority**: hoje quem esquece a senha perde a conta definitivamente. É metade do objetivo da feature.

**Independent Test**: com uma conta existente e sessão aberta em outro aparelho, pedir recuperação, abrir o link, definir nova senha, confirmar que a senha antiga não vale, a nova vale e a outra sessão foi encerrada.

**Acceptance Scenarios**:

1. **Given** uma conta existente, **When** a pessoa pede recuperação com o e-mail dela, **Then** recebe um e-mail com link de uso único e validade curta.
2. **Given** um e-mail sem conta, **When** alguém pede recuperação, **Then** o site e a API respondem exatamente como no caso com conta, e nenhum e-mail de recuperação sai.
3. **Given** um link de recuperação válido, **When** a pessoa define uma nova senha válida, **Then** a senha muda, o link não pode ser reutilizado e todas as sessões da conta são encerradas.
4. **Given** dois pedidos de recuperação seguidos, **When** a pessoa abre o link do primeiro, **Then** ele não vale mais; só o do pedido mais recente vale.
5. **Given** um link vencido, usado ou inválido, **When** a pessoa o abre ou tenta enviar a nova senha, **Then** nada muda e o site oferece pedir outro.

---

### User Story 4 - Aviso claro quando e-mails estão indisponíveis (Priority: P2)

Se a cota de e-mails do provedor acabar, cadastro, reenvio e recuperação ficam bloqueados até a cota voltar. A pessoa vê um erro genérico ("Não foi possível enviar o e-mail agora. Tente novamente mais tarde.") sem citar cota nem provedor, e o que ela digitou é mantido. Um cadastro pendente é mantido para o reenvio funcionar depois.

**Why this priority**: com cota diária pequena e sem captcha, o bloqueio é esperado; o produto precisa degradar com clareza, sem desperdiçar tentativas nem vazar detalhes internos.

**Independent Test**: simular a resposta de cota esgotada do provedor, ver as rotas que enviam e-mail recusarem sem chamar o provedor de novo, e o site mostrar o aviso genérico mantendo os campos.

**Acceptance Scenarios**:

1. **Given** o provedor informa cota diária ou mensal esgotada, **When** a API tenta enviar um e-mail, **Then** ela registra uma trava até a cota voltar; a partir da requisição seguinte as rotas respondem "e-mail indisponível" com o tempo para tentar de novo. A tentativa que descobriu a cota esgotada já tinha sido respondida (o envio acontece depois da resposta, para o tempo de resposta não revelar se a conta existe); a pessoa dessa tentativa usa o reenvio.
2. **Given** a trava está ativa, **When** qualquer rota que envia e-mail é chamada, **Then** responde "e-mail indisponível" sem chamar o provedor.
3. **Given** o provedor recusa só por excesso momentâneo de pedidos por segundo, **When** isso ocorre, **Then** nenhuma trava é criada.
4. **Given** o site recebe "e-mail indisponível", **When** mostra o resultado, **Then** exibe um aviso de alerta genérico no formulário, mantém o que foi digitado e não mostra tempo de espera.

---

### User Story 5 - Proteção contra abuso e contra cadastro alheio (Priority: P2)

Cadastrar o e-mail de um dono que já tem conta não revela que a conta existe: a resposta é igual à de um cadastro novo, e o dono recebe um e-mail avisando da tentativa. Os envios têm limites por endereço, por e-mail e um teto global diário abaixo da cota do provedor, com as últimas vagas reservadas à recuperação de senha.

**Why this priority**: sem captcha, os limites são a única defesa; a reserva evita que abuso de cadastros impeça quem já tem conta de recuperá-la.

**Independent Test**: repetir pedidos até cada limite (por endereço, por e-mail, global) e verificar a recusa; esgotar o teto de cadastros e verificar que a recuperação ainda passa.

**Acceptance Scenarios**:

1. **Given** um e-mail que já tem conta, **When** alguém tenta cadastrá-lo, **Then** a resposta é igual à de um cadastro novo, nenhum pendente é criado e o dono recebe um e-mail de aviso.
2. **Given** um endereço ou e-mail que excedeu seu limite, **When** pede outro envio, **Then** o pedido é recusado com o tempo para tentar de novo.
3. **Given** o teto global diário de cadastro foi atingido mas a reserva não, **When** alguém pede recuperação de senha, **Then** o e-mail é enviado; os cadastros novos não enviam e-mail, e a resposta a quem cadastra é a mesma de sempre (nada revela o teto).
4. **Given** os casos "e-mail existe" e "não existe", **When** o tempo de resposta é medido, **Then** os dois são parecidos o bastante para não revelar a existência da conta.

---

### Edge Cases

- Cadastro repetido do mesmo e-mail com pendência aberta: troca o link (o anterior deixa de valer), sujeito ao intervalo mínimo entre envios. Como a pendência não guarda senha, quem cadastra o e-mail de outra pessoa não consegue definir a senha da conta dela.
- O e-mail é confirmado depois que outra conta com o mesmo e-mail foi criada (por exemplo pelo autor): o link não cria nada e a pessoa vê o mesmo "link não vale mais".
- Falha de rede ou erro do provedor (que não é cota) ao enviar: nenhuma trava é criada e a falha só vai para o registro de erros, sem endereço nem token. Como o envio ocorre depois da resposta, a pessoa vê "enviamos um link" e, se o e-mail não chegar, usa o reenvio (que respeita o intervalo mínimo).
- O link é aberto duas vezes, ou em dois aparelhos ao mesmo tempo: só um uso vence.
- O token não deve ficar na barra de endereço nem no histórico após a leitura, nem ir a servidores em cabeçalhos de origem.
- Recuperação com sessão aberta em outros aparelhos: todas são encerradas ao redefinir a senha, inclusive a do aparelho que redefiniu (a pessoa entra de novo).
- Cadastro fechado (`REGISTRATION_ENABLED=false`): cadastro e reenvio de confirmação seguem recusados como hoje; recuperação de senha continua funcionando para contas existentes (criadas pelo autor).
- A pendência e os tokens vencidos acumulam: uma limpeza agendada remove o que expirou.
- Senha nova fora das regras de senha do cadastro: recusada com a mesma mensagem de validação, sem consumir o link.

## Requirements *(mandatory)*

### Functional Requirements

**Cadastro com confirmação**

- **FR-001**: O cadastro MUST guardar apenas uma pendência (e-mail, token protegido, validade), sem senha, e enviar o e-mail com o link; MUST NOT criar conta nem sessão.
- **FR-002**: Abrir o link de confirmação MUST validar o token (existência, validade, uso único), criar a conta com a senha enviada junto com o token (validada antes, sem gastar o link), apagar a pendência e MUST NOT abrir sessão.
- **FR-003**: O reenvio MUST gerar token novo (o anterior deixa de valer), respeitar o intervalo mínimo entre reenvios (pedido dentro do intervalo não envia nada e informa o tempo restante) e responder igual exista ou não pendência para o e-mail.
- **FR-004**: Cadastro com e-mail que já tem conta MUST responder igual a um cadastro novo, MUST NOT criar pendência e MUST avisar o dono por e-mail.
- **FR-005**: Enquanto só houver pendência, o login MUST falhar com a mensagem genérica de credenciais inválidas.
- **FR-006**: A regra `REGISTRATION_ENABLED` MUST continuar valendo: com o cadastro fechado, cadastro e reenvio de confirmação MUST ser recusados antes de qualquer outra verificação.

**Recuperação de senha**

- **FR-007**: O pedido de recuperação MUST responder igual exista ou não a conta; MUST enviar o e-mail só quando existir.
- **FR-008**: O token de recuperação MUST ser de uso único e de validade curta; um novo pedido MUST invalidar o anterior.
- **FR-009**: Redefinir a senha MUST gravar a nova senha com o mesmo nível de proteção do cadastro, marcar o token como usado e encerrar todas as sessões do usuário.
- **FR-010**: A nova senha MUST seguir as mesmas regras de senha do cadastro; senha inválida MUST NOT consumir o token.

**Limites e cota**

- **FR-011**: Rotas que enviam e-mail MUST ter limite persistido por endereço e por e-mail e um teto global diário abaixo da cota do provedor, com as últimas vagas reservadas à recuperação de senha. Não há captcha.
- **FR-012**: Ao receber do provedor o sinal de cota diária ou mensal esgotada, a API MUST gravar uma trava até o fim do bloqueio e, enquanto ela durar, as rotas que enviam e-mail MUST responder "e-mail indisponível" com o tempo para nova tentativa, sem chamar o provedor. O sinal de excesso momentâneo de pedidos MUST NOT acionar a trava. A trava vale a partir da requisição seguinte à que descobriu a cota esgotada (o envio ocorre depois da resposta, FR-015).
- **FR-013**: O intervalo entre reenvios (padrão 60 s, de 30 a 3600 s), o teto por e-mail por dia, o teto global por dia e a reserva para recuperação MUST ser configuráveis por variáveis de ambiente validadas; valor inválido MUST impedir a API de subir.
- **FR-014**: A API MUST informar o tempo restante para nova tentativa na resposta do cadastro, do reenvio, da recuperação e das recusas por limite de tentativas; a contagem regressiva do site MUST usar esse valor, sem número fixo.
- **FR-015**: O tempo de resposta nos casos "existe" e "não existe" MUST ser parecido (FR-003, FR-004, FR-007).

**Site**

- **FR-016**: O site MUST ter: cadastro só com o e-mail, com a mensagem "enviamos um link" e reenvio com contagem regressiva; tela de confirmação do e-mail, onde a senha é escolhida; "esqueci a senha"; e tela de redefinição.
- **FR-017**: O token MUST viajar no fragmento do endereço e ser removido do endereço depois de lido.
- **FR-018**: Diante de "e-mail indisponível", o site MUST exibir um aviso de alerta genérico ("Não foi possível enviar o e-mail agora. Tente novamente mais tarde."), sem citar cota nem provedor e sem mostrar o tempo de espera, manter o que foi digitado e manter o cadastro pendente.
- **FR-019**: As telas novas MUST ter um `h1` e passar na verificação de acessibilidade nos dois temas, no celular e no desktop.

**Operação e documentação**

- **FR-020**: Pendências e tokens expirados MUST ser removidos por uma limpeza agendada.
- **FR-021**: O envio de e-mail MUST ficar atrás de uma interface substituível; os testes automáticos MUST NOT usar a rede.
- **FR-022**: Cada rota nova MUST constar na documentação OpenAPI.
- **FR-023**: O schema MUST mudar por migração versionada, com as colunas de datas padrão e o gatilho de atualização, e `users` MUST NOT mudar.
- **FR-024**: A documentação MUST ser atualizada: nova definição de dados (próximo `DDE-NNN` livre) das tabelas novas, ERD com as tabelas e a relação dos tokens de recuperação com `users` (`npm run check:ids` passa), e `docs/deploy.md` com variáveis novas, configuração do provedor e do DNS (SPF, DKIM, DMARC), cota e como ler a falha.
- **FR-025**: O lançamento MUST ser em duas partes compatíveis: primeiro `shared` e API com o cadastro ainda fechado, depois o site; só então o cadastro é aberto. O site anterior MUST continuar funcionando com a API nova.

### Key Entities

- **Cadastro pendente**: e-mail ainda não confirmado, token de confirmação (guardado só protegido) e validade, sem senha. No máximo um por e-mail. Vira um usuário ao ser confirmado e é apagado.
- **Token de recuperação de senha**: pertence a um usuário, guardado só protegido, com validade curta, uso único e marca de uso. Um pedido novo invalida o anterior.
- **Trava de envio de e-mail**: registro único do instante até o qual envios estão bloqueados por cota do provedor.
- **Usuário**: sem mudança; passa a nascer só depois da confirmação do e-mail (ou pela CLI do autor).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa com acesso ao e-mail completa o cadastro (formulário, link, primeiro login) em menos de 3 minutos.
- **SC-002**: Nenhum cadastro cria conta ou sessão sem a confirmação do e-mail: 100% dos cadastros sem clique no link deixam zero contas novas.
- **SC-003**: Uma pessoa que esqueceu a senha volta a entrar em menos de 3 minutos, e 100% das sessões antigas da conta deixam de funcionar após a redefinição.
- **SC-004**: Para um observador externo, as respostas de cadastro, reenvio e recuperação são indistinguíveis entre e-mail existente e inexistente (mesma resposta; tempo de resposta (a resposta não espera o envio do e-mail e a diferença entre as medianas dos dois casos fica abaixo de 250 ms nos testes) sem valor prático para inferir a existência).
- **SC-005**: Um link de confirmação ou de recuperação funciona no máximo uma vez e deixa de funcionar quando é substituído ou vence: 0 reutilizações bem-sucedidas.
- **SC-006**: Com a cota do provedor esgotada, 100% das tentativas de envio seguintes são recusadas sem nova chamada ao provedor, e nenhuma tela cita cota ou provedor.
- **SC-007**: Com o teto global de cadastros atingido, a recuperação de senha ainda envia e-mail dentro da reserva.
- **SC-008**: Todas as telas novas passam na verificação de acessibilidade e têm um único `h1`, nos dois temas.
- **SC-009**: A suíte automática da feature roda sem nenhuma chamada de rede.

## Assumptions

- O provedor de e-mail é o Resend, plano grátis (100 e-mails por dia e 3.000 por mês), com domínio verificado (SPF, DKIM, DMARC) configurado fora do código; a contratação e o DNS são tarefas do autor.
- Sem captcha: a proteção contra abuso é só limite persistido; um captcha pode ser acréscimo futuro.
- Validade padrão (ajustável no plano): link de confirmação 24 horas, link de recuperação 1 hora.
- Regras de senha e de formato de e-mail são as já usadas no cadastro atual; a senha é validada na tela de confirmação.
- Revisão de código: o intervalo mínimo entre envios conta por e-mail na mesma medida com ou sem conta ou pendência, e é desfeito quando nenhum e-mail chegou a sair (falha do provedor, trava ou teto), para o tempo restante não revelar a conta e a pessoa não esperar por um e-mail que não chegou.
- Concluir a confirmação leva ao login, sem abrir sessão (decisão da issue, por segurança).
- Desvio consciente da issue #82: um pedido de reenvio, cadastro repetido ou recuperação feito dentro do intervalo mínimo não recebe `429`, e sim a mesma resposta de um pedido aceito com o tempo restante, sem enviar. Um `429` por pedido cedo demais revelaria que há pendência ou conta. O `429` fica para os limites por endereço, que não dependem do e-mail.
- Abrir o link de confirmação não gasta o token: a pessoa escolhe a senha e só o envio do formulário o consome. O token vai só no fragmento do endereço e as páginas dos links não enviam o endereço de origem a outros sites.
- A recuperação de senha funciona mesmo com `REGISTRATION_ENABLED=false`, porque atende contas existentes; só o cadastro e seu reenvio dependem da chave.
- Valores padrão dos tetos (por e-mail por dia, global por dia, reserva) serão definidos no plano, sempre com o teto global abaixo de 100 por dia.
- Fora do escopo: "sair de todos os aparelhos" como recurso separado, troca de e-mail, troca de senha com a senha atual, captcha, e-mails de marketing ou notificação.
- Dependências: módulo de autenticação, limites persistidos e CLI do autor (feature 004), cadastro atrás de `REGISTRATION_ENABLED` (feature 013) e as telas de login e cadastro do site (feature 010).
