# Feature Specification: Captcha no cadastro e na recuperação de senha

**Feature Branch**: `feat/049-captcha-cadastro-recuperacao`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/113" (captcha do Cloudflare Turnstile no cadastro e na recuperação de senha)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Impedir que scripts esgotem os e-mails do site (Priority: P1)

Hoje as três ações que enviam e-mail sem sessão (pedir o cadastro, reenviar o e-mail de confirmação e pedir a recuperação de senha) só têm limite por endereço de e-mail e por origem da requisição (feature 035). Um script com muitos endereços de origem consegue gastar o teto diário de e-mails do site e fazer o provedor de e-mail bloquear a cota, o que deixa cadastro e recuperação indisponíveis para todos; também consegue mandar e-mails indesejados a terceiros. Com a verificação de captcha, o site só aceita esses pedidos quando vêm acompanhados de uma prova de que foram feitos por uma pessoa, e um pedido sem prova válida é recusado antes de gastar qualquer limite ou teto.

**Why this priority**: É o objetivo da feature: proteger a cota de e-mails e os terceiros. Sem a verificação no servidor o resto não protege nada.

**Independent Test**: Com a verificação ligada, enviar cada um dos três pedidos sem prova, com prova inválida, com prova já usada, com prova emitida para outra ação e com prova emitida para outro site, e conferir que todos são recusados com a mesma resposta genérica, que nenhum e-mail sai e que nenhum limite por endereço, intervalo ou teto diário é consumido; depois enviar com prova válida e conferir que o comportamento é o de hoje.

**Acceptance Scenarios**:

1. **Given** a verificação ligada, **When** um dos três pedidos chega sem prova, com prova vazia, inválida, expirada ou já usada, **Then** o pedido é recusado com uma resposta genérica de captcha e nenhum e-mail é enviado.
2. **Given** a verificação ligada e uma prova válida emitida para outra ação (por exemplo, a de cadastro enviada ao pedido de recuperação), **When** o pedido chega, **Then** é recusado como qualquer prova inválida.
3. **Given** a verificação ligada e uma prova emitida para outro site, **When** o pedido chega, **Then** é recusado como qualquer prova inválida.
4. **Given** um pedido recusado por captcha, **When** o servidor responde, **Then** o intervalo mínimo entre pedidos, o limite por endereço, o limite por origem e o teto diário de e-mails ficam como estavam e nenhuma consulta à conta é feita.
5. **Given** a verificação ligada e um pedido para um endereço que tem conta e outro para um que não tem, ambos com prova inválida, **When** o servidor responde, **Then** as respostas são iguais: a recusa nunca revela se há conta.
6. **Given** a verificação ligada e o serviço de verificação indisponível (sem rede, demora além de 10 s, resposta fora do esperado), **When** um dos três pedidos chega, **Then** é recusado; o site não deixa passar pedido sem verificação.
7. **Given** uma prova válida, **When** o pedido é aceito, **Then** o comportamento seguinte (respostas, limites, e-mail) é idêntico ao de hoje, inclusive a resposta igual com e sem conta.

---

### User Story 2 - Passar pelo captcha sem atrito (Priority: P1)

Quem se cadastra, reenvia o e-mail de confirmação ou pede a recuperação de senha precisa conseguir fazê-lo sem esforço extra na grande maioria dos casos. O desafio fica quase invisível: só aparece algo quando o serviço de verificação duvida que seja uma pessoa. O botão de envio fica desabilitado até haver uma prova pronta, e o desafio acompanha o idioma (português do Brasil) e o tema claro ou escuro do site.

**Why this priority**: Sem uma experiência que funcione, a proteção bloqueia pessoas de verdade e quebra cadastro e recuperação, que são o caminho de entrada de quem usa conta.

**Independent Test**: Abrir `/cadastro` e `/esqueci-a-senha` nos dois temas, só com teclado e com leitor de tela (verificação de acessibilidade automática), e concluir cada fluxo; conferir que, sem desafio visível, o envio é liberado sozinho em instantes.

**Acceptance Scenarios**:

1. **Given** a verificação ligada, **When** a pessoa abre o cadastro ou a recuperação de senha, **Then** a prova é obtida em segundo plano e o botão de envio fica desabilitado até estar pronta, com a razão acessível a leitores de tela.
2. **Given** o serviço de verificação duvida da pessoa, **When** pede interação, **Then** o desafio aparece no próprio formulário, é operável só por teclado, está em português do Brasil e segue o tema atual do site.
3. **Given** a pessoa troca o tema do site com o formulário aberto, **When** o desafio é exibido, **Then** ele acompanha o novo tema.
4. **Given** um envio concluído, certo ou errado, **When** a página volta a aceitar um novo envio, **Then** a prova anterior foi descartada e uma nova é obtida antes de liberar o botão.
5. **Given** a tela de reenvio com contagem regressiva, **When** a contagem termina e a pessoa pede novo reenvio, **Then** o novo pedido leva uma prova nova e é aceito.
6. **Given** a prova expira enquanto a pessoa preenche o formulário, **When** isso acontece, **Then** o botão volta a ficar desabilitado e uma nova prova é obtida sozinha.
7. **Given** o desafio não carrega (bloqueador de conteúdo, rede ruim, erro do serviço), **When** o tempo de espera passa, **Then** o formulário mostra um aviso claro com a opção de tentar de novo; a página nunca fica travada em silêncio.

---

### User Story 3 - Poder desligar o captcha rápido e lançar sem quebrar o site antigo (Priority: P2)

Quem administra o site precisa de um interruptor que desligue a exigência do captcha sem publicar nova versão, caso o serviço de verificação falhe ou bloqueie pessoas de verdade. Com o interruptor desligado, o site não mostra o desafio e a API não pede nem consulta prova. A exigência também precisa poder ser introduzida em duas etapas: primeiro a API aceita a prova sem exigi-la, depois o site passa a enviá-la, e só então a exigência é ligada, sem que o site antigo deixe de funcionar em nenhum momento.

**Why this priority**: É a saída de emergência e a condição para um lançamento seguro; vem depois da proteção em si, mas sem ele um problema do serviço de verificação derruba cadastro e recuperação.

**Independent Test**: Com o interruptor desligado, concluir os três fluxos sem prova e sem ver o desafio; com ele ligado, repetir e conferir a exigência. Enviar a um servidor novo um pedido no formato antigo (sem prova) com o interruptor desligado e conferir que é aceito.

**Acceptance Scenarios**:

1. **Given** o interruptor desligado, **When** um dos três pedidos chega com ou sem prova, **Then** é tratado como hoje e nenhum serviço externo é consultado.
2. **Given** o interruptor desligado, **When** a pessoa abre cadastro ou recuperação, **Then** o site não mostra o desafio nem carrega o script do serviço de verificação.
3. **Given** o interruptor ligado e a chave secreta do serviço ausente, **When** a API inicia, **Then** recusa subir com uma mensagem que diz o que falta.
4. **Given** o site e a API em versões diferentes, **When** o site antigo (sem prova) fala com a API nova com o interruptor desligado, **Then** os pedidos continuam sendo aceitos.
5. **Given** o interruptor ligado, **When** o site pergunta à API se a verificação está ativa, **Then** a resposta é a mesma que governa a exigência na API, sem segunda configuração no site.
6. **Given** o ambiente de desenvolvimento, **When** nada é configurado, **Then** o interruptor está desligado; em produção, o padrão é ligado.

---

### Edge Cases

- Pedido com prova maior que o limite aceito pelo serviço de verificação: recusado como prova inválida, sem consultar o serviço.
- Duas abas do mesmo formulário: cada uma tem a própria prova; a prova de uma não vale para a outra depois de usada.
- A pessoa clica duas vezes em enviar, mesmo no mesmo instante: só o primeiro pedido leva a prova; o segundo não sai até haver uma nova (teste de envio duplo no cadastro).
- Um script manda muitos pedidos ao mesmo tempo, cada um com uma prova inventada: a API só confere um número pequeno por vez (por endereço e no total) e recusa o resto como qualquer prova inválida, sem chamar o serviço de verificação (FR-020).
- Rotas de verificação do e-mail e de redefinição da senha, que já exigem um código de uso único recebido por e-mail: não pedem captcha.
- Cadastro fechado (`REGISTRATION_ENABLED` desligado): a resposta de cadastro fechado continua vindo primeiro, sem consultar o serviço de verificação.
- Falha ao carregar o script do desafio em `/cadastro` e `/esqueci-a-senha` com o interruptor ligado: a pessoa vê o aviso com nova tentativa e não consegue enviar sem prova.
- Os cabeçalhos do site (política de referência, política de conteúdo) impedem o desafio de rodar: o desafio precisa funcionar nas duas páginas, o que deve ser conferido nesses cabeçalhos.
- Pessoa com bloqueador de rastreamento ou navegação restrita: se o desafio não puder rodar, o aviso orienta a tentar de novo ou desativar o bloqueio; não há caminho alternativo sem prova com o interruptor ligado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Com a verificação ligada, o pedido de cadastro, o de reenvio do e-mail de confirmação e o de recuperação de senha MUST exigir uma prova de captcha e MUST recusá-lo sem ela.
- **FR-002**: A prova MUST ser validada no servidor junto ao serviço de verificação, informando a prova, a chave secreta e o endereço real da pessoa (o que o site já usa para os limites, não o do repasse da hospedagem). Quando esse endereço é só uma chave de limite e não um IP (um IPv6 contado pelo bloco /64), ele não é enviado: o campo é opcional para o serviço.
- **FR-003**: Além de o serviço de verificação aprovar a prova, o servidor MUST conferir que a prova foi emitida para a ação certa do fluxo (cadastro, reenvio ou recuperação, cada uma com sua ação) e para o site configurado.
- **FR-004**: A validação MUST ter limite de tempo de 10 segundos e MUST recusar o pedido em qualquer falha: sem rede, resposta fora do esperado, conteúdo ilegível ou tempo esgotado.
- **FR-005**: Qualquer causa de recusa (prova ausente, vazia, inválida, expirada, repetida, ação ou site errado, falha do serviço) MUST resultar numa única resposta genérica de captcha, igual com ou sem conta para o endereço informado.
- **FR-006**: A verificação do captcha MUST acontecer antes de qualquer outro trabalho da rota: antes do intervalo mínimo entre pedidos, da consulta ao banco, dos limites por endereço, por origem e por e-mail e do teto diário. Um pedido recusado por captcha MUST NOT consumir nenhum deles.
- **FR-007**: Cada prova MUST ser usada uma só vez; o servidor MUST NOT tentar repetir a validação da mesma prova.
- **FR-008**: O corpo dos três pedidos MUST aceitar um campo opcional de prova de captcha com no máximo 2048 caracteres; acima disso o pedido é recusado sem consulta ao serviço. O campo é opcional no formato para manter compatível o site antigo.
- **FR-009**: Um interruptor de configuração (ligado ou desligado) MUST controlar a exigência. Desligado, a API MUST NOT exigir nem consultar prova, mesmo que o pedido a traga, e o site MUST NOT mostrar o desafio nem carregar o script do serviço. O padrão é ligado em produção e desligado em desenvolvimento e nos testes.
- **FR-010**: Com o interruptor ligado e sem chave secreta, o servidor da API MUST recusar iniciar (a linha de comando do autor, que não atende pedidos, não exige a chave), com mensagem que nomeia o que falta; a chave secreta MUST ficar só no painel da hospedagem da API e nunca no repositório, no site ou nos registros de log.
- **FR-011**: O site MUST descobrir se a verificação está ativa perguntando à API (resposta já usada para saber se o cadastro está aberto), sem segunda variável de build para isso. A chave pública do desafio é uma variável de build do site.
- **FR-012**: O site MUST obter a prova em segundo plano, MUST manter o envio desabilitado até haver uma prova pronta e MUST descartar a prova e obter outra depois de cada envio, certo ou errado, inclusive no reenvio com contagem regressiva.
- **FR-013**: O site MUST tratar prova expirada e erro do desafio limpando a prova e desabilitando o envio, e MUST mostrar um aviso com nova tentativa se o desafio não carregar; MUST NOT travar a página em silêncio.
- **FR-014**: O desafio MUST ficar invisível a menos que o serviço peça interação, MUST usar português do Brasil e MUST acompanhar o tema claro ou escuro do site.
- **FR-015**: O script do serviço de verificação MUST ser carregado só nas páginas que o usam (cadastro e recuperação de senha, mais a tela de reenvio quando faz parte do cadastro), e só com a verificação ativa.
- **FR-016**: As rotas de confirmação do e-mail e de redefinição da senha MUST NOT exigir captcha.
- **FR-017**: O site MUST mostrar o desafio e enviar a prova só quando a API disser que a verificação está ativa, de modo que API e site possam sair no mesmo lançamento; a exigência é ligada por último, depois de os dois estarem publicados. A API aceita a prova opcional e só a exige com o interruptor ligado. O site antigo MUST continuar funcionando contra a API nova com o interruptor desligado, e um site novo contra uma API anterior MUST se comportar como sem captcha.
- **FR-018**: Os testes automatizados MUST NOT depender da rede nem da chave de produção: a API usa um verificador substituível, com um real e um falso, no molde do envio de e-mail.
- **FR-019**: A documentação de configuração (variáveis, interruptor, ordem de lançamento, como desligar em emergência) MUST ser atualizada, incluindo a descrição do campo novo da resposta de cadastro aberto na documentação da API (OpenAPI) e em `docs/design.md`. Não há tabela nova, então não há definição de dados a atualizar.

- **FR-020**: Como o captcha vem antes dos limites por endereço, a API MUST limitar as verificações em andamento (por endereço e no total) e recusar o excedente com a mesma resposta genérica, sem chamar o serviço de verificação.
- **FR-021**: Quando o desafio não pode existir por falta da chave pública no site, o aviso MUST aparecer sem a opção "Tentar de novo", que não resolveria; o envio segue bloqueado.

### Key Entities

- **Prova de captcha**: texto de uso único que o desafio entrega ao site e o site repassa à API junto com o pedido. Tem validade curta, é emitida para uma ação e para um site, e nunca é guardada.
- **Ação do captcha**: rótulo que identifica o fluxo para o qual a prova foi emitida (cadastro, reenvio, recuperação). A API confere que o rótulo recebido é o do fluxo do pedido.
- **Estado da verificação**: informação pública que diz ao site se a verificação está ativa, entregue junto ao estado do cadastro (aberto ou fechado).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com a verificação ligada, 100% dos pedidos aos três fluxos sem prova válida (ausente, inválida, repetida, de outra ação, de outro site ou com falha do serviço) são recusados e 0 e-mails saem por eles.
- **SC-002**: Um volume qualquer de pedidos recusados por captcha consome 0% do teto diário de e-mails, 0% dos limites por endereço e 0 intervalos mínimos de qualquer pessoa.
- **SC-003**: As respostas de recusa por captcha para um endereço com conta e para um sem conta são indistinguíveis (mesmo código, corpo e forma).
- **SC-004**: Pelo menos 95% das pessoas concluem cadastro ou recuperação sem ver nenhum desafio, e o envio é liberado em até 3 segundos depois de a página abrir, em conexão comum. Medido depois do lançamento, no painel de análises do Turnstile (7 dias) e na verificação manual do quickstart; nenhuma suíte automática o mede.
- **SC-005**: Nas duas páginas, nos dois temas, a verificação automática de acessibilidade não aponta violações e todo o fluxo se completa só com o teclado. A checagem automática cobre a página; o contraste e o foco dentro do quadro da Cloudflare não são verificáveis por ela e ficam na verificação manual.
- **SC-006**: Com o interruptor desligado, os três fluxos funcionam como antes desta feature, sem script externo e sem requisição ao serviço de verificação; desligar não exige nova versão do site.
- **SC-007**: Um site antigo continua cadastrando e recuperando senha contra a API nova durante todo o lançamento, até o interruptor ser ligado.
- **SC-008**: Se o desafio não carrega, 100% das pessoas veem um aviso com nova tentativa em até 10 segundos, em vez de uma página parada.
- **SC-009**: Com 50 pedidos simultâneos de um mesmo endereço, todos com provas inventadas, no máximo 2 chegam ao serviço de verificação e os demais recebem a recusa genérica.

## Assumptions

- O serviço de verificação é o Turnstile, da Cloudflare, gratuito e compatível com o site já hospedado na Cloudflare Pages; a escolha vem da issue #113.
- Os fluxos fora do escopo são `verify-email` e `reset-password` (já exigem código de uso único por e-mail e têm limite por endereço) e os fluxos com sessão (troca de e-mail, troca de senha, exclusão de conta), que já têm limite por usuário. Login também fica fora.
- As ações do captcha são `signup`, `resend` e `forgot`, uma por fluxo, como na issue.
- O site ainda não define política de segurança de conteúdo nem bloqueia o desafio; a spec deixa para o plano conferir `public/_headers` (liberação de `challenges.cloudflare.com` para script e quadro, se houver política) e se a política de referência `no-referrer` das rotas com código não impede o desafio, que roda em quadro. O plano conferiu: não há política de conteúdo, e o `no-referrer` não vale nas duas telas com desafio (guardado por teste).
- Os limites do plano gratuito do Turnstile e as chaves de teste da issue (`1x00000000000000000000AA` e `1x0000000000000000000000000000000AA`) foram conferidos na documentação (ver `research.md`, D4 e D5). Continua sem verificação a `action` e o `hostname` que as chaves de teste devolvem; nenhuma suíte automática depende deles.
- O hostname conferido vem da configuração da API (o do site público), e não do pedido.
- Por ser fail-closed, uma queda do serviço de verificação bloqueia cadastro e recuperação; o interruptor é a saída de emergência e exige reinício da API.
- Desenvolvimento e testes automatizados rodam com o interruptor desligado ou com o verificador falso; e2e usa o verificador falso, nunca a chave de produção.
- A feature mexe na API, no `shared` e no site; por isso segue duas versões: primeiro API e `shared`, depois o site, com o interruptor ligado por último.
- A mudança no formato de `GET /api/auth/registration` (campo novo) é aditiva e as respostas são tolerantes a campo desconhecido, então o site antigo a aceita.
- O teto de verificações em andamento (FR-020) é guardado na memória de cada processo da API; com mais de uma réplica ele vale por processo.
