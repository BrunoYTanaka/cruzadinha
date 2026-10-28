# Cruzadinha Constitution

## Core Principles

### I. TypeScript estrito em monorepo
Todo código de aplicação MUST ser TypeScript em um monorepo npm workspaces (`apps/api`, `apps/web`,
`packages/shared`). `tsconfig.base.json` MUST usar `strict: true` e cada pacote o estende.
Tipos e schemas Zod compartilhados entre front e back MUST viver em `packages/shared`.
O código MUST NOT escrever o tipo `any` (`: any`, `as any`, `<any>`); o ESLint MUST tratar isso
como erro (`@typescript-eslint/no-explicit-any`) e o `strict` barra o `any` implícito. Quando não
houver tipo conhecido, usar `unknown`, genéricos ou uniões. Dados externos (respostas HTTP,
`JSON.parse`, corpo de requisição, variáveis de ambiente) SHOULD entrar como `unknown` e ser
validados com Zod antes de usados, porque o `any` vindo de bibliotecas não é barrado pelo lint.
Rationale: um único contrato tipado evita divergência entre cliente e servidor, e um `any` desliga
a checagem de tipos justamente onde ela protege.

### II. Qualidade automatizada obrigatória
Prettier, ESLint (flat config, `typescript-eslint`, `eslint-config-prettier`; no front também
`react-hooks` e `jsx-a11y`), Husky e lint-staged MUST estar ativos. O pré-commit formata e confere
os arquivos alterados; o pré-push roda `typecheck` e os testes unitários (sem Postgres, rede ou
navegador). Os hooks locais podem ser pulados, então a CI (GitHub Actions) é o portão definitivo:
MUST rodar `npm ci`, lint, typecheck e todos os testes a cada push, e uma CI vermelha MUST ser
corrigida antes de novas features. O `package-lock.json` MUST ser versionado. Os scripts da raiz
(`lint`, `format`, `typecheck`, `test`) MUST cobrir todos os workspaces.

### III. Camadas e fronteiras claras no back
Cada módulo da API MUST seguir rota → serviço → repositório. Rotas MUST NOT conter regra de
negócio; serviços MUST NOT conhecer HTTP; SQL MUST ficar nos repositórios.

### IV. Integrações externas isoladas em adaptadores
Qualquer fonte externa de puzzles MUST ser acessada apenas por uma implementação da interface
`PuzzleSource`. Só o adaptador conhece o formato do fornecedor e o converte para o formato interno.
Cada adaptador MUST ter testes de contrato com respostas reais salvas como fixtures, para que
mudanças no formato externo quebrem os testes.

### V. Lógica de jogo pura e testada
As regras do tabuleiro MUST ficar em `game-logic`, sem dependência de React, expostas como reducer
testável. Toda regra de jogo (seleção, digitação, direção, avanço, conclusão) MUST ter teste
unitário. O estado de servidor fora da partida MUST vir do TanStack Query, sem biblioteca de estado
global extra.

### VI. Segurança e privacidade por padrão
A solução de um puzzle MAY ser enviada ao navegador no payload do puzzle, a usuários logados e a
visitantes sem sessão, mas nunca em respostas de erro, logs ou mensagens; assim o front controla
as formas de dica sem depender do servidor. O servidor MUST validar a coerência entre puzzle e
solução antes de entregá-la. Verificação autoritativa de respostas, se um dia for necessária,
MUST acontecer no servidor. O progresso de visitantes MUST ficar só no navegador do aparelho e
MUST NOT ser enviado ao servidor. Senhas MUST usar hash argon2; sessões MUST ser guardadas apenas
como hash. Cookies de sessão MUST ser `HttpOnly` e `SameSite=Lax`. Login e cadastro MUST ter
limite de tentativas. O cadastro aberto MUST ficar atrás de uma chave de configuração desligada
por padrão, e com ela desligada o servidor MUST recusar todo cadastro, venha ou não do site.
Mensagens de erro de autenticação MUST ser genéricas. Cada usuário MUST acessar somente o próprio
progresso, e respostas a quem não tem sessão MUST NOT conter dados de nenhum usuário.

Segredos e informações sensíveis MUST NOT ser compartilhados nem versionados: isso inclui variáveis
de ambiente com valores reais (`.env`), tokens e chaves de API (como `x-access-token` e `x-key` da
fonte de puzzles), senhas, URLs de conexão do banco, cookies de sessão e dados pessoais de usuários.
O repositório MUST ignorar arquivos `.env*` reais via `.gitignore` e manter apenas um `.env.example`
com nomes de variáveis e valores fictícios. Esses valores MUST NOT aparecer em commits, issues,
logs, fixtures de teste, specs, planos, mensagens de commit ou saída colada em conversas. Fixtures
de respostas reais MUST ser sanitizadas antes de entrar no repositório. Segredos de implantação MUST
ficar nos cofres dos provedores e da CI. Um segredo exposto MUST ser tratado como comprometido e
rotacionado.
Rationale: o histórico do git é permanente, e um segredo publicado deve ser considerado vazado.
A entrega da solução ao navegador (emendas 3.0.0 e 4.0.0) é aceita porque a fonte original
também a entrega sem login e o jogo não tem placar competitivo nem prêmio.

### VII. Testes determinísticos e sem internet
A suíte automática MUST NOT depender de serviços externos. Autenticação, cadastro e progresso MUST
ter testes de integração com Postgres real em container. Testes contra a fonte real ficam fora da
rotina automática e rodam sob demanda. Um ou dois caminhos ponta a ponta (Playwright) cobrem o
fluxo principal.

### VIII. Conteúdo de terceiros e uso privado
Os puzzles pertencem às fontes. O site MAY ser acessado por qualquer pessoa que tenha o endereço,
com ou sem conta. Só a landing (o endereço raiz) MAY ser divulgada em buscadores, e ela MUST conter
apenas texto próprio, sem conteúdo de nenhuma fonte; as instruções de não indexação MUST valer para
todas as outras páginas (calendário, dia, jogo, conta, links de e-mail e as demais). O conteúdo MUST NOT ser redistribuído fora do site (exportação,
feeds ou API pública documentada). Cada puzzle MUST exibir a atribuição à sua fonte. O cache MUST
guardar apenas o necessário para jogar.
Rationale: o projeto é de portfólio e usa uma API não oficial; o risco de direitos fica restrito
ao uso atribuído, sem divulgar os puzzles nos buscadores (a landing só apresenta o site), já que a própria fonte publica os puzzles sem login. A leitura dos termos de uso das fontes não é condição de nenhuma
feature (emenda 2.0.0).

### IX. Mudanças de schema por migração
Toda mudança no schema do banco MUST ser uma migração Drizzle versionada no repositório. O banco
MUST NOT ser alterado manualmente fora de migrações.

## Restrições Técnicas

- Back: Fastify, Drizzle, Zod, Postgres. Front: React, Vite, React Router, TanStack Query, CSS com
  variáveis, sem biblioteca de UI pronta; componentes MUST ler tokens de tema, sem cores fixas.
- Custo zero e portabilidade: configuração apenas por variáveis de ambiente validadas com Zod, API
  em Dockerfile, migrações Drizzle e front estático, de modo que trocar de provedor não exija mudar
  código de aplicação.
- O jogo MUST funcionar bem no celular e em modo claro e escuro, com contraste claro entre bloco,
  célula selecionada, palavra ativa e letra preenchida.

## Fluxo de Desenvolvimento

- O trabalho segue o Spec Kit: constitution → specify → clarify → plan → tasks → analyze →
  implement. Uma feature por ciclo, com branch numerada.
- Spec descreve o quê e o porquê; stack e arquitetura entram só no plano.
- A viabilidade da fonte de puzzles (O Globo/Agilmente) MUST ser confirmada antes de investir nas
  demais features.
- Todo plano MUST passar por um Constitution Check contra estes princípios.
- Feature (comportamento novo) MUST seguir o ciclo completo do Spec Kit.
- Correção (o código não faz o que a spec ou o design já define) MUST dispensar o ciclo completo,
  mas MUST começar por um teste de regressão que falha e MUST incluí-lo no mesmo commit ou PR da
  correção.
- Correção que altera uma regra documentada MUST atualizar antes o `spec.md` da feature afetada
  (`/speckit-clarify`) e passar a valer como feature.
- Manutenção (dependências, configuração, documentação) MUST dispensar spec.
- Toda decisão ou código que dependa de biblioteca, framework, SDK, API ou ferramenta de CLI
  (Fastify, Drizzle, React, Vite, TanStack Query, Zod, Playwright, Vitest etc.) MUST consultar a
  documentação atual via Context7 MCP antes de ser escrito, em vez de depender de memória. Planos
  e implementações MUST usar as versões e APIs confirmadas ali. Context7 não se aplica a
  refatoração, regra de negócio própria nem conceitos gerais de programação.

## Governance

Esta constitution prevalece sobre outras práticas do projeto. Emendas MUST ser registradas neste
arquivo com justificativa e, quando houver impacto em código existente, um plano de migração.
Versionamento semântico: MAJOR para remoção ou redefinição incompatível de princípios, MINOR para
novo princípio ou expansão material, PATCH para esclarecimentos. Revisões e planos MUST verificar
conformidade; desvios MUST ser justificados por escrito. Convenções de formatação e de git ficam
em `CLAUDE.md`.

### Emenda 3.0.0 (2026-10-13)

O princípio VI deixou de proibir o envio da solução ao navegador. Justificativa: o front precisa
da resposta para controlar as formas de dica (revelar letra ou palavra, destacar erro), e a
proibição era uma decisão provisória da v1. É MAJOR por redefinir um princípio de forma
incompatível. Plano de migração, sem alteração de dados nem de schema: a feature 007 muda a
entrega do puzzle, atualiza o FR-002 e o SC-004 da feature 006 e o item 30 de `docs/design.md`.
Até a 007 ser implementada, a API continua sem entregar a solução.

### Emenda 4.0.0 (2026-10-16)

Os princípios VI e VIII deixaram de exigir sessão e convite. Justificativa: a feature 013
(`specs/013-jogo-sem-login/spec.md`) abre o jogo a visitantes sem conta, com o progresso só no
navegador, e troca o cadastro por convite por um cadastro aberto controlado por chave de
configuração (desligada por padrão; o autor cria contas pela linha de comando). O VI passa a
permitir a solução para visitantes, proíbe enviar o progresso deles ao servidor e tira as regras de
convite, mantendo o limite de tentativas no login e no cadastro. O VIII troca "privado, restrito a
convidados" por "acessível a quem tem o endereço, sem indexação". O VII troca convites por cadastro
nos testes de integração. É MAJOR por redefinir princípios de forma incompatível. Plano de
migração: a feature 013 entrega as rotas de puzzle e biblioteca sem sessão, remove os convites
(API, site, linha de comando e dados, por migração) e mantém o `noindex` da feature 012. Até a 013
ser implementada, o código continua exigindo sessão e convite, o que é mais restrito que esta
versão e, portanto, conforme.

### Emenda 5.0.0 (2026-10-28)

O princípio VIII deixou de exigir não indexação em todas as páginas: a landing pública (endereço
raiz) passa a poder ser indexada, e todas as outras páginas seguem sem indexação. Justificativa: a
feature 048 (`specs/048-landing-page-indexacao/spec.md`, issue #122) cria uma landing que apresenta
o site a quem chega de fora, e ela só cumpre o papel se o Google puder encontrá-la; a landing tem
texto próprio e nenhum conteúdo das fontes, então o risco de direitos que o princípio protege não
muda. É MAJOR por redefinir um princípio de forma incompatível. Plano de migração, sem alteração
de dados nem de schema: a feature 048 troca o `noindex` global de `public/_headers` por um
`noindex` com exceção para `/`, passa a gerar `robots.txt` e `sitemap.xml` no build e muda o passo
"Verificar" do `deploy.yml`. Até a 048 ser implementada, o site continua sem indexação em todas as
páginas, o que é mais restrito que esta versão e, portanto, conforme.

**Version**: 5.0.0 | **Ratified**: 2026-10-12 | **Last Amended**: 2026-10-28
