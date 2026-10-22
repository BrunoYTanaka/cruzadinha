# Feature Specification: Templates de issues para feature, bug, documentação e manutenção

**Feature Branch**: `chore/025-templates-issues`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/43 — Adicionar templates de issues para feature, bugfix e documentação. Padronizar a abertura de issues no GitHub com templates para feature/enhancement, bug/bugfix, documentação e manutenção/chore, cada um com campos e instruções curtas, títulos e campos obrigatórios padronizados, prontos para uso no repositório."

## Contexto

Hoje o repositório não tem nenhum template de issue: quem abre uma issue vê uma caixa de texto vazia. As issues saem com formatos muito diferentes, o que atrapalha entender a demanda, reproduzir bugs, validar escopo e critérios de aceitação, manter a documentação consistente e classificar o trabalho. O fluxo do projeto já distingue os tipos de trabalho (nova funcionalidade segue o ciclo completo do Spec Kit; correção de bug começa por um teste que falha; chore e documentação seguem direto), e os tipos de commit e de branch usam os mesmos nomes. Os templates devem refletir essa distinção, para que a issue já traga o que cada fluxo precisa.

Esta mudança não altera o site nem a API: só adiciona arquivos de configuração do GitHub.

## Clarifications

### Session 2026-10-22

- Q: Que prefixo de título os formulários devem sugerir, e deve haver um ID estilo Jira? → A: Prefixos entre colchetes (`[Bug]: `, `[Feature]: `, `[Docs]: `, `[Chore]: `), sem ID no título; o número da issue do GitHub (`#43`) é o identificador e é referenciado em branches, commits e PRs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir uma issue de bug com o que é preciso para reproduzir (Priority: P1)

Quem encontrou um defeito escolhe "Bug" ao criar a issue e preenche um formulário que pede descrição, passos para reproduzir, comportamento esperado e o atual, ambiente/versão e evidências (print, logs). Quem for corrigir lê a issue e consegue escrever o teste que falha sem pedir mais informação.

**Why this priority**: Bugs são o tipo de issue em que a falta de informação mais custa tempo, e o fluxo do projeto exige reproduzir o defeito num teste antes de corrigir.

**Independent Test**: Na página de nova issue do repositório, escolher "Bug", conferir que os campos aparecem na ordem de `contracts/issue-forms.md`, que os obrigatórios impedem o envio vazio e que a issue criada sai com o título padronizado e a etiqueta `bug`.

**Acceptance Scenarios**:

1. **Given** a página de nova issue, **When** a pessoa escolhe "Bug", **Then** vê um formulário com descrição do problema, passos para reprodução, comportamento esperado, comportamento atual, ambiente/versão e evidências, cada um com uma instrução curta.
2. **Given** o formulário de bug, **When** a pessoa tenta enviar sem preencher descrição, passos, esperado ou atual, **Then** o envio é recusado indicando o campo faltante.
3. **Given** o formulário de bug, **When** a pessoa deixa "evidências" em branco, **Then** a issue ainda pode ser criada, porque nem todo bug tem print ou log.
4. **Given** uma issue de bug criada pelo formulário, **When** ela aparece na lista, **Then** o título começa com o prefixo de bug e a issue recebe a etiqueta `bug`.

---

### User Story 2 - Propor uma funcionalidade com objetivo e critérios de aceitação (Priority: P1)

Quem quer propor uma funcionalidade ou melhoria escolhe "Feature / melhoria" e preenche contexto do problema, objetivo da funcionalidade, critérios de aceitação e impactos esperados. A issue chega pronta para virar o ponto de partida do `/speckit-specify`.

**Why this priority**: Funcionalidades novas passam por todo o ciclo de especificação; uma issue bem estruturada reduz idas e vindas antes da especificação.

**Independent Test**: Escolher "Feature / melhoria", conferir os campos e a obrigatoriedade, criar a issue e verificar título padronizado e etiqueta `enhancement`.

**Acceptance Scenarios**:

1. **Given** a página de nova issue, **When** a pessoa escolhe "Feature / melhoria", **Then** vê campos para contexto do problema, objetivo, critérios de aceitação e impactos esperados, cada um com instrução curta.
2. **Given** o formulário, **When** a pessoa deixa contexto, objetivo ou critérios de aceitação em branco, **Then** o envio é recusado; "impactos esperados" pode ficar em branco.
3. **Given** uma issue de feature criada, **When** ela aparece na lista, **Then** o título começa com o prefixo de feature e a issue recebe a etiqueta `enhancement`.

---

### User Story 3 - Pedir uma atualização de documentação (Priority: P2)

Quem percebe documentação faltando, errada ou desatualizada escolhe "Documentação" e informa o documento ou a área afetada, o objetivo da atualização, o público-alvo e como a revisão deve ser validada.

**Why this priority**: Documentação é um tipo frequente neste repositório (runbooks, versionamento, design), mas o defeito é menos urgente que um bug ou uma funcionalidade.

**Independent Test**: Escolher "Documentação", conferir os campos, criar a issue e verificar título padronizado e etiqueta `documentation`.

**Acceptance Scenarios**:

1. **Given** a página de nova issue, **When** a pessoa escolhe "Documentação", **Then** vê campos para documento/área afetada, objetivo da atualização, público-alvo e validação/revisão esperada.
2. **Given** o formulário, **When** a pessoa deixa documento/área ou objetivo em branco, **Then** o envio é recusado; público-alvo e validação são opcionais.
3. **Given** uma issue de documentação criada, **Then** o título começa com o prefixo de documentação e a issue recebe a etiqueta `documentation`.

---

### User Story 4 - Registrar uma tarefa de manutenção (Priority: P3)

Quem precisa registrar uma tarefa de manutenção (atualizar dependências, mexer em CI, ferramentas, limpeza) escolhe "Manutenção / chore" e informa o objetivo, o impacto no projeto e os riscos e a validação.

**Why this priority**: A própria issue marca este template como "se necessário"; chores são comuns, mas têm menos risco de mal-entendido.

**Independent Test**: Escolher "Manutenção / chore", conferir os campos, criar a issue e verificar o título padronizado.

**Acceptance Scenarios**:

1. **Given** a página de nova issue, **When** a pessoa escolhe "Manutenção / chore", **Then** vê campos para objetivo da tarefa, impacto no projeto e riscos e validação.
2. **Given** o formulário, **When** a pessoa deixa objetivo em branco, **Then** o envio é recusado; impacto e riscos/validação são opcionais.
3. **Given** uma issue de manutenção criada, **Then** o título começa com o prefixo de chore.

---

### User Story 5 - Escolher o tipo certo sem ruído (Priority: P3)

Quem abre uma nova issue vê uma lista curta e clara com os quatro tipos, cada um com uma descrição de uma linha, e escolhe o que se aplica sem ter de preencher campos de outro tipo.

**Why this priority**: É o que amarra os quatro templates numa experiência coerente, mas só faz sentido depois de existirem.

**Independent Test**: Abrir a página de nova issue e conferir que os quatro tipos aparecem com nome e descrição.

**Acceptance Scenarios**:

1. **Given** a página de nova issue, **When** ela carrega, **Then** os quatro tipos aparecem com nome e descrição curta.
2. **Given** qualquer um dos tipos, **When** a pessoa o escolhe, **Then** nenhum campo pertencente a outro tipo aparece.

---

### Edge Cases

- Quem preenche só o mínimo obrigatório: a issue deve continuar compreensível, então os campos obrigatórios são os que sem eles a issue não é acionável.
- Quem cola logs longos ou prints no campo de evidências: o campo aceita texto livre e imagens anexadas, e logs ficam formatados como código.
- Bug que não é do site nem da API (ex.: CI, deploy): o campo de ambiente/versão não pode obrigar a escolher "site" ou "API"; deve aceitar outra área.
- Issue com mais de um tipo (ex.: bug que exige mudança de documentação): a pessoa abre duas issues; os templates não tentam cobrir tipos combinados.
- Issues já existentes (como a #43) não são alteradas: os templates valem só para issues novas.
- Quem abre issue por outro meio que não a página web (linha de comando, API do GitHub): não passa pelos formulários, e isso é aceito.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O repositório MUST oferecer um template de issue para **bug/bugfix** com os campos: descrição do problema, passos para reprodução, comportamento esperado, comportamento atual, ambiente/versão e evidências (prints, logs).
- **FR-002**: O repositório MUST oferecer um template de issue para **feature/enhancement** com os campos: contexto do problema, objetivo da funcionalidade, critérios de aceitação e impactos esperados.
- **FR-003**: O repositório MUST oferecer um template de issue para **documentação** com os campos: documento ou área afetada, objetivo da atualização, público-alvo e validação/revisão esperada.
- **FR-004**: O repositório MUST oferecer um template de issue para **manutenção/chore** com os campos: objetivo da tarefa, impacto no projeto e riscos e validação.
- **FR-005**: Cada campo MUST ter um rótulo e uma instrução curta (uma ou duas frases, com exemplo quando ajudar) dizendo o que escrever.
- **FR-006**: Os campos sem os quais a issue não é acionável MUST ser obrigatórios, e os demais opcionais, conforme a tabela abaixo.
- **FR-007**: Cada template MUST sugerir um título com prefixo padronizado, no formato de colchetes usado por projetos open source: `[Bug]: `, `[Feature]: `, `[Docs]: ` e `[Chore]: `, seguido de um espaço. Os prefixos diferem de propósito dos tipos de commit (`fix:`, `feat:`), que ficam para commits e PRs.
- **FR-008**: Cada template MUST aplicar automaticamente a etiqueta correspondente que já existe no repositório: `enhancement` (feature), `bug` (bug) e `documentation` (documentação).
- **FR-009**: O template de feature MUST pedir os critérios de aceitação como lista de itens marcáveis, no mesmo formato usado nas issues do projeto.
- **FR-010**: A página de nova issue MUST listar os quatro tipos, cada um com nome e descrição de uma linha, e nenhum campo de um tipo MUST aparecer em outro.
- **FR-011**: Os textos dos templates (nomes, rótulos, instruções, descrições) MUST ser escritos em português do Brasil, como a documentação e as issues existentes do projeto.
- **FR-012**: Os templates MUST funcionar na versão atual do GitHub sem configuração adicional no repositório além dos arquivos versionados nele, e MUST estar na branch principal para valer.
- **FR-013**: A criação ou alteração dos templates MUST NOT mudar o comportamento do site, da API, dos testes ou do pipeline de CI/release.
- **FR-014**: A documentação de contribuição do projeto (onde a convenção de branches, commits e fluxo por tipo de trabalho está descrita) MUST mencionar os templates e a ligação entre o tipo de issue e o fluxo de trabalho correspondente.

| Tipo | Obrigatórios | Opcionais |
| --- | --- | --- |
| Bug | descrição, passos para reprodução, esperado, atual | ambiente/versão, evidências |
| Feature | contexto do problema, objetivo, critérios de aceitação | impactos esperados |
| Documentação | documento/área afetada, objetivo | público-alvo, validação/revisão |
| Chore | objetivo | impacto, riscos e validação |

### Key Entities

- **Template de issue**: um tipo de issue oferecido na criação, com nome, descrição de uma linha, prefixo de título, etiqueta e uma lista ordenada de campos.
- **Campo do template**: um item a preencher, com rótulo, instrução curta, indicação de obrigatório ou opcional e, quando fizer sentido, uma opção fixa ou lista (por exemplo, a área do ambiente).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das issues novas abertas pela página web do repositório passam por um dos quatro tipos e saem com o prefixo de título e a etiqueta definidos para o tipo (exceto chore, que só tem prefixo).
- **SC-002**: Uma pessoa consegue abrir uma issue de bug completa em menos de 5 minutos, sem precisar perguntar o que escrever em nenhum campo.
- **SC-003**: Quem for corrigir um bug aberto pelo formulário encontra na própria issue os passos de reprodução e o comportamento esperado e o atual em 100% dos casos (campos obrigatórios).
- **SC-004**: Nenhum tipo exige mais de quatro campos obrigatórios, para que abrir uma issue simples continue rápido.
- **SC-005**: Os quatro critérios de aceitação de tipo da issue #43 (feature, bug, documentação, chore) ficam atendidos e verificáveis na página de nova issue do repositório após o merge na branch principal.

## Assumptions

- Os templates são formulários de issue do GitHub (campos estruturados, com obrigatoriedade), e não texto livre pré-preenchido, porque a issue pede campos obrigatórios e padronizados. A escolha exata do formato de arquivo fica para o plano.
- Os templates seguem o formato pensado para qualquer colaborador, e as instruções são curtas.
- Não existe etiqueta `chore` no repositório e criar etiquetas está fora do escopo; a issue de chore recebe só o prefixo de título.
- Abrir issue em branco continua permitido, para casos que não cabem nos quatro tipos (por exemplo, uma pergunta rápida); não há link externo de contato nem de suporte.
- O campo de ambiente/versão do bug aceita texto livre, com uma dica dos valores úteis: versão do site e da API (visíveis em `/api/health` e `version.json`), navegador e sistema, e se o problema acontece como visitante ou logado.
- Os prefixos de título (`[Feature]: `, `[Bug]: `, `[Docs]: `, `[Chore]: `) são sugestões pré-preenchidas que a pessoa pode editar; o GitHub não impede um título diferente.
- Todo o trabalho acontece em arquivos de configuração e documentação, sem alterar `apps/` nem `packages/`; por isso, segundo o fluxo do projeto, a mudança entra como `chore`/`docs` e não gera versão do site nem da API.
- Os templates só têm efeito depois do merge na branch principal (`main`); a verificação final é feita na página de nova issue do repositório.
