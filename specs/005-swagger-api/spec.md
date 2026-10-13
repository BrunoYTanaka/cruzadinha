# Feature Specification: Documentação interativa da API (Swagger)

**Feature Branch**: `feat/005-swagger-api`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Criar o swagger para facilitar os testes da api"

## Clarifications

### Session 2026-10-13

- Q: A página e a descrição da API devem existir em produção? → A: Não, ficam sempre desativadas em produção, sem opção de ligar por configuração; para testar a API publicada usa-se outra ferramenta.

## User Scenarios & Testing *(mandatory)*

O ator é o **desenvolvedor** (o autor do projeto ou quem roda a API localmente), que hoje testa a API à mão com `curl`, precisando montar corpos de requisição e guardar o cookie de sessão por conta própria. Esta feature dá a ele uma página navegável que lista todas as operações da API, descreve o que cada uma recebe e devolve, e permite executá-las direto do navegador, inclusive as que exigem sessão. Também publica a mesma descrição num formato legível por máquina, para ferramentas de teste de API.

### User Story 1 - Consultar e executar as operações pelo navegador (Priority: P1)

Com a API rodando, o desenvolvedor abre uma página da própria API e vê todas as operações agrupadas por assunto (saúde, autenticação, convites). Para cada uma, vê o método, o caminho, uma descrição curta, o corpo esperado com exemplo e as respostas possíveis. Ele preenche um exemplo, executa e vê o código de status e o corpo da resposta real.

**Why this priority**: É o pedido em si: facilitar os testes da API sem montar requisições à mão.

**Independent Test**: Subir a API localmente, abrir a página de documentação, executar a verificação de saúde e conferir que a resposta exibida é a mesma de uma chamada direta.

**Acceptance Scenarios**:

1. **Given** a API rodando em desenvolvimento, **When** o desenvolvedor abre a página de documentação, **Then** vê todas as operações públicas da API (saúde, cadastro, login, logout, "quem sou eu", gerar convite, listar convites), agrupadas por assunto.
2. **Given** a página aberta, **When** ele escolhe uma operação, **Then** vê o método, o caminho, a descrição, os campos de entrada com tipo, obrigatoriedade e limites (por exemplo, senha de 8 a 128 caracteres), um exemplo de corpo e cada resposta possível com código de status e formato.
3. **Given** uma operação escolhida, **When** ele executa com um corpo de exemplo, **Then** a requisição chega à API de verdade e a página mostra o código de status e o corpo da resposta.
4. **Given** um corpo inválido (por exemplo, e-mail mal formado), **When** ele executa, **Then** a página mostra a mesma recusa que a API daria a qualquer outro cliente.

---

### User Story 2 - Testar operações que exigem sessão (Priority: P2)

O desenvolvedor entra pela própria página de documentação (operação de login) e, em seguida, executa "quem sou eu" e as operações de convite sem copiar cookie nenhum. Ao executar o logout, as operações protegidas voltam a responder "não autenticado".

**Why this priority**: Metade das operações atuais exige sessão; sem isso a página só serviria para as rotas públicas.

**Independent Test**: Com a conta do seed de desenvolvimento, executar login na página, depois "quem sou eu" e conferir o e-mail; executar logout e conferir que "quem sou eu" passa a dar "não autenticado".

**Acceptance Scenarios**:

1. **Given** a página aberta e uma conta existente, **When** o desenvolvedor executa o login com credenciais corretas, **Then** as operações protegidas executadas em seguida pela página são atendidas com essa sessão.
2. **Given** uma sessão aberta pela página, **When** ele executa o logout, **Then** as operações protegidas seguintes respondem "não autenticado".
3. **Given** a página, **When** ele consulta uma operação protegida, **Then** a página indica que ela exige sessão e lista a resposta "não autenticado" entre as possíveis.

---

### User Story 3 - Descrição da API legível por máquina (Priority: P3)

O desenvolvedor baixa a descrição completa da API num formato padrão de mercado e a importa numa ferramenta de testes de API, obtendo a mesma lista de operações da página.

**Why this priority**: Amplia o uso para outras ferramentas, mas a página da história 1 já resolve o pedido.

**Independent Test**: Baixar a descrição, validá-la com um validador do formato padrão e conferir que ela lista exatamente as operações registradas na API.

**Acceptance Scenarios**:

1. **Given** a API rodando em desenvolvimento, **When** o desenvolvedor pede a descrição da API, **Then** recebe um documento no formato padrão, válido segundo a especificação desse formato.
2. **Given** a descrição baixada, **When** ela é importada numa ferramenta de testes de API, **Then** aparecem as mesmas operações, campos e respostas da página.

---

### User Story 4 - Documentação que não fica desatualizada (Priority: P4)

Quando alguém cria uma operação nova ou muda as regras de entrada de uma existente, a documentação acompanha sem edição manual à parte, e a suíte de testes acusa qualquer operação sem documentação.

**Why this priority**: Protege o valor das histórias anteriores ao longo das próximas features (puzzles, biblioteca, progresso), mas não muda o que o desenvolvedor vê hoje.

**Independent Test**: Registrar uma operação nova sem descrição num teste e conferir que a suíte falha; mudar o limite de um campo nas regras de validação e conferir que a descrição reflete o novo limite.

**Acceptance Scenarios**:

1. **Given** as regras de validação de entrada de uma operação, **When** a descrição é gerada, **Then** os campos, tipos e limites descritos são os mesmos que a API aplica de fato.
2. **Given** uma operação registrada na API sem descrição de entradas e respostas, **When** a suíte de testes roda, **Then** ela falha apontando a operação.
3. **Given** a descrição gerada, **When** a suíte de testes roda, **Then** ela confere que o documento é válido no formato padrão, sem acesso à internet.

---

### Edge Cases

- API em produção: a página e a descrição ficam sempre desativadas (FR-009), e os caminhos respondem como qualquer caminho inexistente, sem revelar que a documentação existe.
- Limite de tentativas: as execuções feitas pela página contam nos limites de login, cadastro e geração de convites como qualquer outro cliente; a página não abre exceção.
- Exemplos de corpo: usam só valores fictícios (por exemplo, `ana@example.com`), nunca credenciais reais, nem as do seed configuradas no `.env` (constitution, princípio VI).
- Código de convite: aparece na resposta de geração exibida pela página, como em qualquer cliente, mas não fica gravado na documentação nem em logs.
- Operações internas que não fazem parte da API pública (por exemplo, as próprias rotas da documentação): não aparecem na lista de operações.
- Banco fora do ar: as operações executadas pela página respondem com o mesmo erro de serviço indisponível; a página e a descrição continuam acessíveis, porque não dependem do banco.
- Página aberta com a API acessada por outro endereço (por exemplo, pelo proxy do Vite em `/api`): as execuções continuam indo para a mesma origem de onde a página foi carregada, para que o cookie de sessão funcione.

## Requirements *(mandatory)*

### Functional Requirements

**Descrição da API**

- **FR-001**: A API MUST publicar uma descrição de todas as suas operações públicas num formato padrão de mercado para APIs HTTP, legível por máquina e válido segundo a especificação desse formato.
- **FR-002**: Para cada operação, a descrição MUST conter método, caminho, um resumo, o grupo (saúde, autenticação, convites), os campos de entrada com tipo, obrigatoriedade e limites, e cada resposta possível com código de status e formato do corpo, inclusive as de erro (entrada inválida, não autenticado, convite inválido, cota atingida, muitas tentativas, serviço indisponível).
- **FR-003**: Os campos, tipos e limites descritos MUST vir das mesmas regras de validação que a API aplica às requisições, sem uma cópia mantida à mão que possa divergir delas.
- **FR-004**: Operações que exigem sessão MUST estar marcadas como tal na descrição, indicando que a sessão é o cookie emitido pelo login ou cadastro.
- **FR-005**: Cada operação com corpo de entrada MUST trazer um exemplo de corpo válido, com valores fictícios.
- **FR-006**: As respostas descritas MUST NOT incluir senha nem hash de senha, e nenhum exemplo MUST conter segredo, credencial real ou dado pessoal real (constitution, princípio VI).

**Página interativa**

- **FR-007**: A API MUST servir uma página navegável a partir da descrição de FR-001, que liste as operações por grupo e permita executá-las contra a própria API, mostrando o código de status e o corpo da resposta.
- **FR-008**: A página MUST ser servida pela mesma origem da API, de modo que a sessão aberta por um login executado nela seja usada nas operações protegidas executadas em seguida, sem o desenvolvedor copiar o cookie.
- **FR-009**: A página e a descrição MUST estar disponíveis em desenvolvimento. Em produção, elas MUST ficar sempre desativadas, sem configuração que as ligue: os caminhos respondem como qualquer caminho inexistente.
- **FR-010**: As operações executadas pela página MUST seguir exatamente as mesmas regras de validação, autenticação e limite de tentativas de qualquer outro cliente.
- **FR-011**: A página e a descrição MUST funcionar sem acesso à internet a partir do navegador, sem carregar recursos de terceiros.

**Manutenção**

- **FR-012**: A suíte de testes unitários MUST falhar quando uma operação pública da API não tiver descrição de entradas e respostas.
- **FR-013**: A suíte de testes unitários MUST validar a descrição gerada contra a especificação do formato padrão, sem acesso à internet nem a banco (constitution, princípio VII).
- **FR-014**: O guia de comandos do repositório MUST informar onde ficam a página e a descrição ao rodar a API localmente.

### Key Entities

- **Descrição da API**: o documento legível por máquina com todas as operações públicas, seus grupos, entradas, respostas, exemplos e o esquema de sessão. Gerado a partir das rotas registradas e das regras de validação, não guardado à parte.
- **Operação**: um par método e caminho exposto pela API, com grupo, resumo, entradas, respostas possíveis e indicação de exigir sessão.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das operações públicas registradas na API aparecem na descrição e na página, e nenhuma operação interna aparece.
- **SC-002**: Um desenvolvedor com a API local rodando consegue, só pela página, entrar com a conta de teste, consultar "quem sou eu", gerar um convite, listar convites e sair em menos de 3 minutos, sem usar outra ferramenta.
- **SC-003**: A descrição gerada passa num validador do formato padrão sem erros, conferido automaticamente a cada execução da suíte.
- **SC-004**: Para 100% dos campos de entrada, os limites descritos (tamanho, formato, obrigatoriedade) coincidem com os aplicados pela API: uma requisição montada conforme a descrição nunca é recusada por formato, e uma que viola um limite descrito é sempre recusada.
- **SC-005**: Registrar uma operação nova sem descrição faz a suíte falhar em 100% dos casos.
- **SC-006**: Uma busca na descrição e na página não encontra nenhuma senha, hash, código de convite real, valor de sessão ou credencial do `.env`.

## Assumptions

- O formato padrão de mercado é o OpenAPI, e "Swagger" no pedido se refere à página interativa que o lê; a versão do formato e a biblioteca ficam para o plano, que MUST consultar a documentação atual via Context7 (constitution, Fluxo de Desenvolvimento).
- Os caminhos da página e da descrição ficam sob `/api/` (por exemplo, `/api/docs`), para passarem pelo mesmo proxy do Vite e da implantação; o caminho exato é definido no plano.
- As operações documentadas são as que existem hoje (saúde, autenticação e convites). As próximas features (puzzles, biblioteca, progresso, preferências) passam a documentar as próprias operações por força de FR-012, sem nova feature de documentação.
- A linha de comando do autor (`cli`), o seed e a coleta diária não são operações HTTP e ficam fora da descrição.
- A documentação descreve a API como ela é: esta feature não muda caminhos, corpos, códigos de status nem mensagens das operações existentes. Se o plano encontrar uma resposta sem formato definido, ele a descreve como está ou registra a divergência, sem alterar o comportamento.
- O site (`apps/web`) não ganha tela nova; a página de documentação é servida pela API.
- Não há autenticação extra para abrir a página, porque ela só existe fora de produção (FR-009); as operações protegidas continuam exigindo sessão.
