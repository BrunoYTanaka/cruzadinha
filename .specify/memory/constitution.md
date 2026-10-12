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
A solução de um puzzle MUST NOT ser enviada ao navegador no payload do puzzle; qualquer verificação
futura MUST acontecer no servidor. Senhas MUST usar hash argon2; convites e sessões MUST ser
guardados apenas como hash. Cookies de sessão MUST ser `HttpOnly` e `SameSite=Lax`. Login, cadastro
e geração de convites MUST ter limite de tentativas. Mensagens de erro de autenticação e convite
MUST ser genéricas. Cada usuário MUST acessar somente o próprio progresso.

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

### VII. Testes determinísticos e sem internet
A suíte automática MUST NOT depender de serviços externos. Autenticação, convites e progresso MUST
ter testes de integração com Postgres real em container. Testes contra a fonte real ficam fora da
rotina automática e rodam sob demanda. Um ou dois caminhos ponta a ponta (Playwright) cobrem o
fluxo principal.

### VIII. Conteúdo de terceiros e uso privado
Os puzzles pertencem às fontes. O site MUST permanecer privado, restrito a convidados, e MUST NOT
redistribuir o conteúdo publicamente. Cada puzzle MUST exibir a atribuição à sua fonte, e o projeto
MUST respeitar os termos de uso da fonte e interromper o uso se ela o proibir. O cache MUST guardar
apenas o necessário para jogar.
Rationale: o projeto é de portfólio e usa uma API não oficial; o risco de direitos fica restrito
ao uso privado e atribuído.

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

**Version**: 1.4.0 | **Ratified**: 2026-10-12 | **Last Amended**: 2026-10-12
