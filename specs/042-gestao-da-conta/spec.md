# Feature Specification: Gestão da conta

**Feature Branch**: `feat/042-gestao-da-conta`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Gestão da conta: trocar e-mail e senha com confirmação como na feature 035, sair de todos os aparelhos e excluir conta (ref. issue #90)"

## Clarifications

### Session 2026-10-27

- Q: Por quanto tempo vale o link de troca de e-mail? → A: 60 minutos, a mesma validade do link de recuperação de senha da feature 035.
  - Motivo: segurança (janela curta para um link de posse; a pessoa está logada e espera o e-mail na hora) e padrão da feature 035.
- Q: Trocar a senha logado invalida links de "esqueci a senha" ainda abertos? → A: Sim, todos os links de recuperação abertos da conta são invalidados, como já acontece ao concluir uma recuperação.
  - Motivo: segurança (um link de recuperação vazado não pode desfazer a troca).
- Q: O aviso enviado ao endereço antigo mostra o novo endereço? → A: Não; diz só que uma troca de e-mail foi pedida, quando, e orienta a trocar a senha se não foi a pessoa.
  - Motivo: privacidade (não envia o novo endereço a uma caixa que pode não ser mais da pessoa; menos dados).
- Q: Abrir o link de troca de e-mail conclui a troca na hora ou pede um clique de confirmação? → A: Conclui ao abrir a página (o token segue no fragmento da URL e é lido uma vez); não há senha nem botão extra.
  - Motivo: usabilidade (menos passos); o link só confirma a posse do endereço que a própria conta pediu, então gastá-lo ao abrir não expõe nada.
- Q: Em outro aparelho, o que acontece com os dados guardados para uso sem rede de uma conta excluída? → A: Esse aparelho trata a sessão como expirada (regra da feature 041: sessão expirada não apaga nada); os dados saem quando a pessoa sai ou outra conta entra nele. Só o aparelho onde a exclusão foi feita apaga os dados na hora. [LOW CONFIDENCE]
  - Motivo: privacidade (o servidor não guarda rastro da conta excluída para avisar outros aparelhos) e simplicidade (reusa a regra da feature 041); muda o que fica visível no aparelho, por isso revisar no próximo gate.
- Q: Concluir a troca de e-mail invalida links de "esqueci a senha" ainda abertos? → A: Sim, todos os links de recuperação abertos da conta são revogados na mesma transação que troca o e-mail.
  - Motivo: segurança (esses links foram para o endereço antigo, que a pessoa pode estar deixando por ter perdido ou comprometido a caixa; se ficassem abertos, quem a controla poderia redefinir a senha por até 60 minutos).
- Q: Um segundo pedido de troca dentro do intervalo mínimo entre envios (`EMAIL_RESEND_INTERVAL_SECONDS`) vale? → A: Não é um pedido novo: a API responde `202` com o tempo restante sem salvar nem enviar nada, e o pedido anterior continua como estava; o site desabilita o envio durante a contagem.
  - Motivo: consistência (nunca fica sem link válido enquanto o site diz que enviou) e reuso do tratamento de espera da feature 035.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trocar a senha estando logado (Priority: P1)

Quem tem sessão aberta entra na página da conta, informa a senha atual e escolhe uma nova. A senha muda, e as sessões dos outros aparelhos são encerradas; a sessão em uso continua aberta.

**Why this priority**: hoje a única forma de mudar a senha é "esqueci a senha", que exige sair e passar pelo e-mail. Quem suspeita que a senha vazou precisa de um caminho direto.

**Independent Test**: com a conta aberta em dois navegadores, trocar a senha em um; o outro perde a sessão, o primeiro segue logado, a senha antiga não entra mais e a nova entra.

**Acceptance Scenarios**:

1. **Given** uma sessão aberta, **When** a pessoa envia a senha atual correta e uma nova senha válida, **Then** a senha muda, as demais sessões da conta são encerradas e a sessão atual continua.
2. **Given** uma sessão aberta, **When** a senha atual está errada, **Then** nada muda e o site mostra uma mensagem de que a senha atual não confere.
3. **Given** uma nova senha fora das regras de senha do cadastro, **When** a pessoa envia, **Then** nada muda e o site aponta o problema.
4. **Given** várias tentativas seguidas com a senha atual errada, **When** o limite é atingido, **Then** novas tentativas são recusadas por um tempo, como no login.

---

### User Story 2 - Sair de todos os aparelhos (Priority: P1)

Na página da conta, a pessoa encerra de uma vez todas as outras sessões, sem trocar a senha. A sessão atual continua.

**Why this priority**: caso de perda ou empréstimo de aparelho; é pequeno e independente das demais histórias.

**Independent Test**: abrir a conta em dois navegadores, usar "Sair de todos os aparelhos" em um; o outro volta a ser visitante na próxima ação que depende da conta.

**Acceptance Scenarios**:

1. **Given** sessões abertas em vários aparelhos, **When** a pessoa pede para sair de todos os aparelhos, **Then** todas as outras sessões são encerradas e a atual continua.
2. **Given** um aparelho cuja sessão foi encerrada assim, **When** a pessoa estava jogando nele, **Then** o jogo não é interrompido: ela passa a ser visitante com um aviso não bloqueante, como em qualquer sessão expirada.

---

### User Story 3 - Trocar o e-mail com confirmação (Priority: P2)

A pessoa informa o novo e-mail e a senha atual. Um link de uso único, válido por 60 minutos, é enviado ao **novo** endereço; o e-mail da conta só muda quando ela abre o link (abrir a página já conclui a troca). Até lá, o e-mail antigo continua valendo para entrar. O endereço antigo recebe um aviso de que uma troca foi pedida, sem o novo endereço.

**Why this priority**: resolve e-mail digitado errado ou abandonado, mas só serve a quem já tem conta e depende do envio de e-mail da feature 035.

**Independent Test**: pedir a troca, confirmar que o login com o e-mail novo ainda falha, abrir o link e então entrar com o e-mail novo e não mais com o antigo.

**Acceptance Scenarios**:

1. **Given** uma sessão aberta e um novo e-mail válido, **When** a pessoa envia o pedido com a senha atual correta, **Then** o site diz que um link foi enviado ao novo endereço, o e-mail da conta não muda e o endereço antigo recebe o aviso.
2. **Given** um pedido pendente, **When** a pessoa abre o link, **Then** a troca é concluída ao abrir a página, sem clique extra: o e-mail da conta passa a ser o novo, o link não pode ser reutilizado e o pedido some.
3. **Given** um link vencido, usado ou substituído por um pedido mais recente, **When** a pessoa o abre, **Then** nada muda e o site oferece pedir outro.
4. **Given** um novo e-mail que já pertence a outra conta, **When** a pessoa envia o pedido, **Then** a resposta é igual à de um e-mail livre (sem revelar a existência da conta), nenhum link de troca sai para esse endereço, o pedido pendente anterior da conta (se houver) é descartado e, se o link de outro pedido for aberto depois que o endereço foi ocupado, nada muda.
5. **Given** a senha atual errada, **When** a pessoa envia o pedido, **Then** nada é enviado e o site mostra que a senha não confere.
6. **Given** o limite de envios de e-mail da feature 035, **When** ele é atingido, **Then** o pedido é recusado com o mesmo tratamento de espera dos outros fluxos de e-mail.

---

### User Story 4 - Excluir a conta (Priority: P2)

A pessoa pede a exclusão na página da conta, lê o que será apagado e confirma com a senha. A conta, as sessões, o progresso salvo e os ajustes da conta somem na hora e a pessoa volta a ser visitante.

**Why this priority**: direito básico de quem criou conta, mas é destrutivo e irreversível; vem depois do que protege a conta.

**Independent Test**: com uma conta que tem progresso e ajustes, excluir; entrar com o e-mail antigo falha, o e-mail pode ser cadastrado de novo e nada da conta resta na lista da biblioteca nem no aparelho.

**Acceptance Scenarios**:

1. **Given** uma sessão aberta, **When** a pessoa abre "Excluir conta", **Then** o site mostra o que será apagado e que não há volta, e nada é apagado antes da confirmação com a senha.
2. **Given** a confirmação com a senha correta, **When** a pessoa confirma, **Then** a conta, as sessões, o progresso, os ajustes e os pedidos pendentes de troca de e-mail e de senha são apagados, a sessão termina e o site mostra a tela de visitante.
3. **Given** a senha errada, **When** a pessoa confirma, **Then** nada é apagado.
4. **Given** a conta excluída, **When** alguém tenta entrar com o e-mail e a senha antigos, **Then** o login falha com a mensagem genérica de credenciais inválidas.
5. **Given** o aparelho tinha cruzadas e progresso da conta guardados para uso sem rede (feature 041), **When** a exclusão termina, **Then** esses dados da conta são removidos do aparelho; o progresso de visitante não é tocado.
6. **Given** a conta excluída está aberta em outro aparelho, **When** a pessoa usa o site lá, **Then** ela passa a ser visitante com o aviso padrão de sessão encerrada; os dados da conta guardados lá para uso sem rede seguem a regra de sessão expirada da feature 041.

---

### Edge Cases

- Duas trocas de e-mail pedidas em sequência (fora do intervalo mínimo entre envios): só o link do pedido mais recente vale, inclusive quando o segundo endereço já pertence a outra conta (o pedido anterior é descartado e nenhum link vale). Dentro do intervalo mínimo o segundo pedido não é aceito e o anterior segue valendo.
- A senha é trocada ou a conta recebe "esqueci a senha" com um pedido de troca de e-mail pendente: o pedido de troca segue valendo até vencer (a posse do novo endereço continua comprovada pelo link), salvo exclusão da conta, que o apaga. Um pedido pendente também sobrevive a uma recuperação de senha concluída.
- Pedir a troca para o próprio e-mail atual: recusado sem enviar nada, com mensagem clara (a pessoa está logada, então nada é revelado).
- "Esqueci a senha" pedido antes de uma troca de senha logada: o link de recuperação deixa de valer após a troca.
- O link de troca é aberto sem sessão (outro navegador): a troca é concluída mesmo assim, pois o link é a prova de posse; a página oferece o link "Entrar".
- Link de "esqueci a senha" pedido antes de uma troca de e-mail concluída: deixa de valer quando a troca é concluída.
- Falha ou indisponibilidade do envio de e-mail: o pedido de troca informa o erro e o e-mail da conta não muda; a troca de senha, sair de todos os aparelhos e excluir a conta não dependem de e-mail.
- Dois cliques seguidos em confirmar a exclusão ou a troca de senha: o site desabilita o botão enquanto a requisição está em andamento (a proteção é do site); se uma segunda requisição chegar à API mesmo assim, ela não duplica efeito e o site não mostra aviso de sessão encerrada por cima de "Sua conta foi excluída.".
- Sessão que expira com a página da conta aberta: o site trata como em qualquer outra tela (vira visitante, sem perder o resto).
- Sem rede: as ações de conta exigem conexão e o site mostra "Esta tela precisa de conexão." (feature 041).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A pessoa com sessão MUST ter uma página da conta, acessível pelo e-mail no cabeçalho (um link para `/conta`), que reúne trocar senha, trocar e-mail, sair de todos os aparelhos e excluir conta. Visitantes MUST NOT ver essas opções.
- **FR-002**: Trocar a senha MUST exigir a senha atual correta e aplicar as mesmas regras de senha do cadastro; ao concluir, MUST encerrar todas as outras sessões da conta, manter a atual e invalidar todos os links de recuperação de senha abertos da conta.
- **FR-003**: Trocar o e-mail MUST exigir a senha atual correta, enviar um link de uso único válido por 60 minutos ao novo endereço e só alterar o e-mail da conta quando o link for aberto; abrir a página do link MUST concluir a troca sem pedir senha nem outro clique (token no fragmento da URL, lido uma vez); até lá, o e-mail antigo MUST continuar valendo. Ao concluir a troca, MUST revogar, na mesma transação, todos os links de recuperação de senha abertos da conta.
- **FR-004**: Cada novo pedido de troca de e-mail aceito (inclusive o que não gera envio por o endereço já ser de outra conta) MUST invalidar o anterior da mesma conta; um pedido recusado pelo intervalo mínimo entre envios não é aceito e não altera o anterior; um link usado, vencido ou substituído MUST NOT alterar nada.
- **FR-005**: A resposta ao pedido de troca MUST ser a mesma para um e-mail livre e para um e-mail de outra conta, e nenhum link MUST ser enviado quando o endereço já pertence a outra conta; ao abrir um link, MUST ser checado de novo que o endereço continua livre.
- **FR-006**: Ao pedir a troca de e-mail, o endereço antigo MUST receber um aviso (sem link de ação) de que a troca foi pedida, com a data e a orientação de trocar a senha se não foi a pessoa; o aviso MUST NOT conter o novo endereço.
- **FR-007**: Os pedidos de troca de e-mail MUST usar os limites de envio e de tentativas e o tratamento de espera da feature 035, sem permitir que simultâneos ultrapassem o limite.
- **FR-008**: "Sair de todos os aparelhos" MUST encerrar todas as outras sessões da conta, manter a atual e não exigir senha.
- **FR-009**: Excluir a conta MUST exigir a senha atual correta, mostrar antes o que será apagado e que a ação é irreversível, e apagar de forma definitiva a conta, as sessões, o progresso, os ajustes e os pedidos pendentes (troca de e-mail, recuperação de senha) e os contadores de tentativas por usuário. Contadores antiabuso por endereço de e-mail ou de rede (`rate_limit_attempts`) não são dado da conta e saem pelo `auth cleanup` em até 2 dias.
- **FR-010**: Depois da exclusão, o e-mail MUST poder ser usado em um novo cadastro e o login com as credenciais antigas MUST falhar com a mensagem genérica de credenciais inválidas.
- **FR-011**: Ao concluir a exclusão, o site MUST apagar do aparelho onde a exclusão foi feita os dados da conta guardados para uso sem rede e deixar intacto o progresso de visitante. Outros aparelhos tratam a sessão como expirada (feature 041: nada é apagado) e os dados saem quando a pessoa sai ou outra conta entra neles. [LOW CONFIDENCE]
- **FR-012**: Erros de senha atual MUST ter limite de tentativas por conta, igual ao do login, e as respostas MUST NOT revelar dados de outras contas.
- **FR-013**: Após qualquer ação que encerre sessões (trocar senha, sair de todos, excluir), os outros aparelhos MUST tratar a sessão encerrada como já tratam hoje uma sessão expirada: aviso não bloqueante, sem interromper um jogo em andamento.
- **FR-014**: As ações da página da conta MUST funcionar com teclado e leitor de tela, respeitar os temas e o layout móvel, e mostrar estados de envio, sucesso e erro sem deslocar o layout.
- **FR-015**: Os contratos novos MUST ser compatíveis com a versão anterior do site e da API (duas versões para remover algo) e a documentação de dados e o diagrama de entidades MUST ser atualizados se houver tabela nova.

### Key Entities *(include if feature involves data)*

- **Conta**: a pessoa autenticada (e-mail, senha, sessões, progresso, ajustes); a exclusão remove tudo o que depende dela.
- **Pedido de troca de e-mail**: no máximo um por conta; guarda o novo endereço, a validade e o uso único do link; some ao ser usado, vencer, ser substituído ou a conta ser excluída.
- **Sessão**: aparelho com acesso à conta; trocar senha e "sair de todos" encerram todas menos a atual, a exclusão encerra todas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quem está logado troca a senha em até 3 interações a partir do e-mail no cabeçalho (abrir a página, preencher, confirmar), sem passar pelo e-mail.
- **SC-002**: Em 100% das trocas de senha e usos de "sair de todos os aparelhos", nenhuma outra sessão da conta consegue mais usar a conta depois da confirmação, e a sessão atual segue ativa.
- **SC-003**: Em 100% das trocas de e-mail, o e-mail da conta só muda depois de abrir o link enviado ao novo endereço, e um link usado, vencido ou substituído não altera nada.
- **SC-004**: Depois da exclusão, 0 dados da conta (conta, sessões, progresso, ajustes, pedidos pendentes, contadores por usuário) permanecem no servidor ou, para uso sem rede, no aparelho onde a exclusão foi feita, e o progresso de visitante permanece; apenas contadores antiabuso por endereço (sem vínculo com a conta) ficam até o `auth cleanup`, em no máximo 2 dias.
- **SC-005**: Nenhuma ação da conta consegue ser concluída sem a senha atual correta (trocar senha, trocar e-mail, excluir), e nenhuma resposta permite descobrir se um e-mail pertence a outra conta.
- **SC-006**: Nenhuma ação da conta interrompe uma cruzada em andamento em outro aparelho.

## Assumptions

- Todas as ações sensíveis (trocar senha, trocar e-mail, excluir) pedem a senha atual em vez de reconfirmar por e-mail; "sair de todos os aparelhos" não pede senha porque só reduz o acesso.
- A exclusão é imediata e definitiva, sem período de arrependimento; a confirmação é a tela de aviso mais a senha.
- Trocar o e-mail não encerra outras sessões; trocar a senha encerra, como a recuperação da feature 035.
- O aviso ao endereço antigo é informativo e usa a mesma cota diária de e-mail; a feature 035 já define limites, validade curta e reenvio, e esta feature os reutiliza.
- Sem chave de envio de e-mail (`RESEND_API_KEY`), a troca de e-mail responde como os demais fluxos de e-mail; as outras três ações não dependem dela.
- Não há listagem nem encerramento individual de sessões (nome do aparelho, última atividade): fora de escopo.
- O link de troca de e-mail vale 60 minutos, como o de recuperação de senha da feature 035.
- Não há exportação dos dados da conta antes de excluir: fora de escopo.
- Registro de acesso, autenticação em dois fatores e troca do e-mail por administradores: fora de escopo.
- A feature depende de: sessões no servidor, limites persistidos e envio de e-mail (feature 035), limpeza de dados da conta no aparelho (feature 041) e tratamento de sessão encerrada fora do tabuleiro (feature 018 em diante).
