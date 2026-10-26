# Feature Specification: Reorganizar web e API por feature

**Feature Branch**: `chore/reorganizar-web-e-api-por-feature-com-page`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/114" ([Chore]: reorganizar web e API por feature, com pages/ e fronteiras públicas)

## Contexto

O código é organizado em camadas e funciona, mas cada feature nova aumenta o acoplamento entre áreas. Quem mantém o projeto (a pessoa autora e quem contribuir) sente isso ao procurar onde uma regra mora, ao mexer em uma área e quebrar outra, e ao revisar mudanças que tocam arquivos distantes. Não há mudança para quem joga: esta spec trata só da estrutura do código.

Problemas medidos hoje:

- **Site**: ciclos entre features (configurações ↔ biblioteca, jogo ↔ visitante) e entre features e `app/` (sessão, tela de erro, "não encontrado"); a pasta do jogo reúne 68 arquivos planos e a página do jogo (449 linhas) importa cinco outras features; a pasta `app/` mistura a casca do site com regra de sessão. A issue cita também `apps/web/src/specs/`, que já não existe (ver `research.md`).
- **API**: o módulo de autenticação (18 arquivos) reúne sessão, cadastro com confirmação de e-mail e recuperação de senha, e um único arquivo de rotas tem as três; limite de tentativas e e-mail são infraestrutura, mas ficam entre os módulos de negócio e são importados por dentro; `app.ts` tem 40 importações de composição manual.

O ator desta spec é quem mantém o código. O trabalho é uma refatoração: nenhum comportamento, rota HTTP, esquema de banco ou contrato entre site e API muda. O pacote compartilhado (`packages/shared`) não muda.

Esta spec não muda uma regra documentada de produto. Atualiza a documentação de estrutura (CLAUDE.md, `docs/`, specs que citam caminhos).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fronteiras entre features checadas automaticamente (Priority: P1)

Quem mantém o código declara quais áreas podem depender de quais, e a verificação automática (a mesma que já roda no commit, no push e na CI) falha quando uma importação viola a regra. Cada área expõe uma entrada pública, e as outras só a alcançam por ela.

**Why this priority**: Sem a regra checada, qualquer reorganização volta a degradar. As demais histórias dependem dela para provar que a estrutura nova se sustenta.

**Independent Test**: Adicionar uma importação proibida (por exemplo, uma feature importando de `pages/`, ou um módulo da API importando um arquivo interno de `platform/email`) e conferir que a verificação reporta a violação; remover e conferir que passa.

**Acceptance Scenarios**:

1. **Given** a regra publicada em modo aviso, **When** a verificação roda sobre o código atual, **Then** lista as violações existentes sem falhar a CI.
2. **Given** todas as violações corrigidas, **When** a regra passa para modo erro, **Then** qualquer importação nova que a viole falha a verificação.
3. **Given** o roteador, **When** carrega as páginas por caminho direto para manter o carregamento sob demanda, **Then** essa exceção é explícita na regra e não gera violação.
4. **Given** uma feature, **When** outra feature a importa, **Then** só é permitido pela entrada pública e na ordem de dependência definida (sessão < visitante < biblioteca < configurações < jogo; conta e status dependem só de sessão e do que é compartilhado).

---

### User Story 2 - Sem ciclos entre features do site (Priority: P1)

As duas dependências circulares do site desaparecem: o armazenamento de configurações deixa de pertencer a uma feature da qual a biblioteca depende, os esquemas de ajuda e de salvamento descem para a regra pura do jogo, e a página do jogo entrega ao hook do jogo a fábrica da fila de salvamento em vez de o hook importar o visitante.

**Why this priority**: Os ciclos são o acoplamento mais grave e bloqueiam mover as features sem criar novos ciclos.

**Independent Test**: Rodar a detecção de ciclos no site e obter zero ciclos; rodar os testes do jogo, da biblioteca e das configurações sem alteração de comportamento.

**Acceptance Scenarios**:

1. **Given** o código reorganizado, **When** a detecção de ciclos roda no site, **Then** não encontra nenhum.
2. **Given** um visitante e uma pessoa com conta, **When** jogam, salvam e retomam uma cruzada, **Then** o progresso é gravado e lido exatamente como antes.
3. **Given** a regra pura do jogo e do visitante, **When** o código é inspecionado, **Then** nenhum deles importa React, entrada e saída ou outra feature.

---

### User Story 3 - Site organizado por feature, com páginas só compondo (Priority: P2)

O site tem `app/` (roteador e casca), `pages/` (uma pasta por rota, só compõe features), `shared/`, `domain/` e `features/` (sessão, conta, visitante, biblioteca, configurações, jogo, status), cada feature com subpastas só do que existir. A página do jogo fica menor e o corte do que sai dela é registrado.

**Why this priority**: É o ganho de legibilidade pedido, mas só se sustenta depois das histórias 1 e 2.

**Independent Test**: Para cada feature movida, a suíte de testes unitários, o e2e e a build passam sem alterar teste algum além do caminho de importação; o tamanho dos chunks do site antes e depois fica equivalente.

**Acceptance Scenarios**:

1. **Given** uma feature movida, **When** a CI roda, **Then** formatação, lint, tipos, testes e build passam e o histórico do arquivo continua rastreável.
2. **Given** a página de uma rota, **When** é aberta, **Then** só compõe componentes de features, sem regra de negócio própria.
3. **Given** o roteador, **When** uma página é carregada sob demanda, **Then** continua em chunk próprio, sem passar por uma entrada pública que a puxe para o chunk principal.
4. **Given** o site antes e depois, **When** os chunks são comparados, **Then** nenhum cresce além de uma tolerância acordada no plano.
5. **Given** a pasta de resíduo do Spec Kit dentro do código do site, **When** a reorganização termina, **Then** ela não existe mais.

---

### User Story 4 - API com identidade separada e infraestrutura em `platform/` (Priority: P2)

A API separa sessão, cadastro e recuperação de senha em partes próprias dentro de um módulo de identidade, cada uma com suas rotas. Limite de tentativas e e-mail passam a ser infraestrutura de plataforma, importada só pela entrada pública. A composição em `app.ts` fica menor.

**Why this priority**: Resolve o arquivo de rotas com três responsabilidades e a infraestrutura importada por dentro, mas não bloqueia o site.

**Independent Test**: Os testes unitários e de integração da API passam; as rotas `/api/auth/*` respondem igual (método, caminho, códigos, corpo e cookies); a documentação OpenAPI lista as mesmas rotas.

**Acceptance Scenarios**:

1. **Given** a API reorganizada, **When** os testes de integração rodam, **Then** passam sem mudar expectativa.
2. **Given** qualquer rota `/api/auth/*`, **When** é chamada, **Then** responde como antes, inclusive para o site anterior (compatibilidade entre versões).
3. **Given** um módulo de negócio, **When** usa limite de tentativas ou e-mail, **Then** importa só da entrada pública da plataforma.
4. **Given** a documentação das rotas, **When** é gerada, **Then** o conjunto de rotas e esquemas é o mesmo de antes.

---

### Edge Cases

- Uma entrada pública puxar uma página para o chunk principal e desfazer o carregamento sob demanda: medir os chunks antes e depois de cada passo.
- O corte real de `features/game` e da página do jogo só aparece ao mover: o plano registra o que saiu e por quê; não há meta de linhas fixa.
- Arquivos de teste e de estilo de um componente devem acompanhá-lo ao ser movido, sem ficar para trás.
- Classificação de arquivos entre `helpers/` e `services/` feita por nome: o que usa armazenamento do navegador ou o store de configurações vai para `services/`, e a dúvida se resolve ao mover.
- Importações em outros workspaces, scripts, configs de build, workflows e e2e que citam caminhos antigos devem ser ajustadas, e não só o código do site e da API.
- Specs antigas e documentação citam caminhos que mudam: devem ser atualizadas sem reescrever o histórico das decisões.
- Uma mudança de outra branch tocando um arquivo movido entre passos: cada passo é um PR curto para reduzir o conflito.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A reorganização MUST NOT alterar comportamento observável: telas, textos, rotas do site, rotas HTTP, contrato com a API, esquema de banco, cookies, chaves de armazenamento do navegador e variáveis de ambiente ficam idênticos.
- **FR-002**: O site MUST ter a estrutura-alvo: `app/` (roteador, casca, tela de erro de rota, recarga após deploy), `pages/` (login, cadastro, confirmação de e-mail, esqueci a senha, redefinir senha, biblioteca, dia, jogo, status), `shared/` (componentes, hooks, serviços como cliente da API, armazenamento e store de configurações, helpers, temas; também a tela de erro e a página não encontrada, usadas por várias features), `domain/` (regra pura do jogo e do visitante) e `features/` (sessão, conta, visitante, biblioteca, configurações, jogo, status), mais `test/`.
- **FR-003**: Cada feature do site MUST ter, só do que existir, `components/`, `hooks/`, `services/`, `helpers/` e uma entrada pública `index.ts`.
- **FR-004**: A API MUST ter a estrutura-alvo: `platform/` (banco, http, lib, docs, limite de tentativas e e-mail, os dois últimos com entrada pública), `modules/` (identidade com sessão, cadastro e recuperação; cruzadas; biblioteca; progresso; configurações; saúde) e `sources/` sem mudança de conteúdo. O que prepara dados de desenvolvimento (`seed`) fica fora de `platform/`, porque importa módulos.
- **FR-005**: As regras de dependência do site MUST valer: `app → pages → features → shared/domain`; feature nunca importa de `pages/`; `shared` e `domain` nunca importam de feature; entre features só pela entrada pública e na ordem sessão < visitante < biblioteca < configurações < jogo; conta e status dependem só de sessão e do que é compartilhado; visitante e `domain` não importam de feature.
- **FR-006**: O roteador MUST carregar as páginas por caminho direto para manter o carregamento sob demanda, como exceção explícita da regra.
- **FR-007**: As regras de dependência da API MUST valer: módulos importam limite de tentativas e e-mail só pela entrada pública da plataforma.
- **FR-008**: As regras MUST ser verificadas automaticamente pelo lint do repositório, primeiro em modo aviso e depois em modo erro, falhando commit, push e CI quando em erro.
- **FR-009**: O site MUST NOT ter ciclos de importação ao fim; a detecção de ciclos MUST passar.
- **FR-010**: O armazenamento de configurações, os esquemas de ajuda e de salvamento e a fábrica da fila de salvamento MUST sair do lugar que causa os ciclos conforme o Contexto: o armazenamento sobe para `shared/`, os esquemas descem para `domain/`, e a fábrica da fila é entregue pela página ao hook do jogo.
- **FR-011**: Os formulários de conta MUST ficar na feature de conta, de modo que a página só componha.
- **FR-012**: O código do site MUST NOT conter resíduo do Spec Kit (`apps/web/src/specs/`). Medido em 2026-10-26: a pasta já não existe; o requisito vira uma checagem, não uma remoção.
- **FR-013**: Cada arquivo movido MUST preservar o histórico (movido, não recriado), e testes e estilos MUST acompanhar o arquivo.
- **FR-014**: O trabalho MUST ser entregue em passos pequenos, cada um um PR de refatoração com CI verde, na ordem: regra em modo aviso (e conferir que o resíduo não existe); quebrar os ciclos; mover features (começando por status e conta); mover páginas e afinar a página do jogo; separar a identidade na API; mover limite de tentativas e e-mail para `platform/`; regra em modo erro.
- **FR-015**: Cada passo MUST passar formatação, lint, tipos, testes unitários e build; os passos que tocam a API MUST passar também os testes de integração; os que tocam o site MUST passar o e2e. Ao fim, a detecção de ciclos MUST passar.
- **FR-016**: O tamanho dos chunks do site MUST ser medido antes e depois dos passos que movem páginas e entradas públicas, e uma regressão que desfaça o carregamento sob demanda MUST ser corrigida antes de seguir.
- **FR-017**: CLAUDE.md, `docs/` e as specs que citam caminhos antigos MUST ser atualizados para os novos caminhos; as regras de dependência MUST ficar documentadas onde quem contribui as encontre.
- **FR-018**: A mudança MUST ser compatível com a versão anterior do outro lado: como as rotas e os contratos não mudam, não há duas versões a coordenar, e a entrega é só de refatoração, sem aumento de versão.

### Key Entities *(include if feature involves data)*

- **Feature (site)**: uma área de produto do site (sessão, conta, visitante, biblioteca, configurações, jogo, status) com conteúdo próprio e uma entrada pública; tem uma posição na ordem de dependência.
- **Página**: a composição de uma rota; depende de features, nunca o contrário.
- **Domínio**: regra pura do jogo e do visitante, sem interface nem entrada e saída, usada por features.
- **Plataforma (API)**: infraestrutura sem regra de produto (banco, http, utilitários, documentação, limite de tentativas, e-mail), acessada pelos módulos só pela entrada pública.
- **Regra de fronteira**: declaração verificável de quem pode importar de quem.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero ciclos de importação no site ao fim (hoje há vários, entre features e com `app/`).
- **SC-002**: Zero violações das regras de fronteira com a verificação em modo erro, e a verificação falha em uma importação proibida de teste.
- **SC-003**: 100% dos testes unitários, de integração e e2e existentes passam em cada passo sem mudar expectativa (só caminhos de importação).
- **SC-004**: Nenhuma mudança observável para quem joga: o mesmo conjunto de rotas HTTP, o mesmo conjunto de telas e o mesmo documento de API antes e depois.
- **SC-005**: Nenhuma pasta de feature do site mantém mais de 20 arquivos diretamente na raiz de uma subpasta (hoje o jogo tem 68 planos).
- **SC-006**: O arquivo de rotas de identidade da API deixa de reunir sessão, cadastro e recuperação: cada uma tem seu arquivo.
- **SC-007**: O tamanho dos chunks do site fica dentro da tolerância definida no plano (sem regressão do carregamento sob demanda).
- **SC-008**: Nenhuma referência a caminhos antigos resta em CLAUDE.md e `docs/`.

## Assumptions

- A estrutura-alvo e a ordem dos passos são as da issue 114; a spec as adota como decisão tomada.
- A spec, e não a issue, é o artefato rastreado; os passos viram PRs `refactor/...` curtos, cada um com seu escopo na lista de tarefas.
- O pacote compartilhado não muda, e nenhuma tabela muda, então não há DDE nem ERD.
- A ferramenta de detecção de ciclos é escolhida no plano (a issue cita `madge`); a escolha da ferramenta de lint das fronteiras também.
- O número exato de arquivos por pasta e o corte da página do jogo dependem do que aparecer ao mover; SC-005 fixa só um teto.
- Os nomes de pastas dos módulos da API (`identity/sessions`, `identity/registration`, `identity/recovery`) seguem a issue; qualquer ajuste de nome vai para o plano.
- Esta é uma tarefa de manutenção pela regra do projeto (chore/refactor sem comportamento novo), mas segue o ciclo da spec por pedido de quem a abriu, por ser grande e dividida em muitos PRs.
