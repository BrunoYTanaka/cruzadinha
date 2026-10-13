# Research: Documentação interativa da API (Swagger)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-13

## Fonte da documentação das bibliotecas

O Context7 MCP, exigido pela constitution (Fluxo de Desenvolvimento), não estava disponível nesta sessão. As decisões abaixo usam a documentação oficial das versões fixadas: o README e o código de cada pacote, baixados do registro npm (`npm pack`), e as referências do Fastify e do Zod já instalados em `node_modules`. Um spike descartável, fora do repositório, confirmou o comportamento combinado com as mesmas versões. Em seguida, ainda em 2026-10-13, o Context7 ficou disponível e as decisões foram conferidas nele (ver "Conferência no Context7" abaixo), o que encerra o desvio.

### Conferência no Context7

Bibliotecas consultadas: `/fastify/fastify-swagger`, `/fastify/fastify-swagger-ui`, `/colinhacks/zod/v4.6.5` e `/fastify/fastify/v5.0.0`.

Confirmado sem mudança:

- R1/R7: modo dinâmico a partir do `schema` das rotas; o plugin MUST ser registrado antes das rotas, e as registradas antes ficam fora do documento.
- R3: `setValidatorCompiler` ("Using other validation libraries") e `setSerializerCompiler(() => (data) => JSON.stringify(data))` são as APIs documentadas para trocar Ajv e fast-json-stringify.
- R4: `z.toJSONSchema` gera JSON Schema 2020-12 por padrão, inclui a chave `$schema` (por isso o `toDocSchema` a remove) e aceita `io: 'input' | 'output'`.
- R6: com `routePrefix`, a UI serve a página em `<prefix>/`, o documento em `<prefix>/json` e `<prefix>/yaml`.
- R9: `examples` no schema vira `example` do OpenAPI; `headers` dentro de uma resposta vira `headers` da resposta; `type: 'null'` documenta o 204 sem corpo.

Divergências, já refletidas nas tarefas:

- R2: mesmo com `openapi: '3.1.0'`, o `@fastify/swagger` converte `const` em `enum` de um valor por padrão (`convertConstToEnum`, porque a Swagger UI não exibe `const`). Mantido o padrão: o significado é o mesmo. Testes que comparam o documento com `toDocSchema` (T025) MUST tratar `const: x` e `enum: [x]` como equivalentes.
- R6/R10: `validatorUrl` é opção de primeiro nível do `@fastify/swagger-ui`, não de `uiConfig`, e já vem desligado por padrão. A tarefa T012 não o define em `uiConfig`; o teste T009 confere que a página não aponta para validador externo.
- O `@fastify/swagger` lê `version` do `package.json` só quando `info` não é passado. Como o plugin passa `info`, `info.version` precisa ser definido explicitamente (ver T002 e T006).

Versões conferidas em 2026-10-13:

| Pacote | Versão | Publicada | Papel |
|---|---|---|---|
| `@fastify/swagger` | 9.9 (9.9.2) | 2026-10-09 | Gera o documento OpenAPI a partir dos `schema` das rotas. Compatível com Fastify 5 (`>=9.x`). |
| `@fastify/swagger-ui` | 6.1 (6.1.2) | 2026-10-09 | Serve a página Swagger UI. Compatível com Fastify 5 e `@fastify/swagger` 9. |
| `@apidevtools/swagger-parser` | 13.1 (13.1.0) | 2026-09-20 | Valida o documento nos testes. Aceita OpenAPI 3.0.x e 3.1.0 a 3.1.2. |

## R1. Biblioteca da página e do documento

- **Decision**: `@fastify/swagger` 9.9 em modo dinâmico, que gera o documento a partir das rotas registradas, e `@fastify/swagger-ui` 6.1 para a página.
- **Rationale**:
  - São os plugins oficiais do ecossistema Fastify.
  - O modo dinâmico lê o `schema` de cada rota, então a lista de operações sai das rotas reais (FR-001, SC-001).
  - A Swagger UI é o "swagger" do pedido.
  - Os arquivos da página vêm dentro do pacote (`static/`), sem CDN, e o `validatorUrl` vem desligado por padrão (`null` em `lib/swagger-initializer.js`). Com isso, a página não carrega nada de terceiros (FR-011).
  - As rotas da própria documentação ficam fora do documento: no spike, só a rota de negócio apareceu em `paths`.
- **Alternatives considered**:
  - `@scalar/fastify-api-reference` (1.74): interface mais moderna, mas com mais dependências e versões quase diárias. O pedido nomeia o Swagger.
  - Escrever o documento OpenAPI à mão (YAML versionado): é exatamente a cópia manual que FR-003 proíbe.
  - Modo estático do `@fastify/swagger`: lê um arquivo pronto, com o mesmo problema.

## R2. Versão do OpenAPI

- **Decision**: OpenAPI `3.1.0` (`openapi: { openapi: '3.1.0' }`).
- **Rationale**:
  - O 3.1 usa JSON Schema 2020-12, que é o alvo padrão do `z.toJSONSchema` do Zod 4. Assim, `const`, `additionalProperties: false` e `format` passam sem conversão.
  - O README do `@fastify/swagger` diz que, no 3.1, os schemas ficam intactos.
  - O `@apidevtools/swagger-parser` 13.1 valida 3.1.0.
  - No spike, o documento 3.1.0 gerado passou na validação.
- **Alternatives considered**:
  - 3.0.3 (padrão do plugin): exigiria `target: 'openapi-3.0'` no Zod e perderia `const` (o plugin converte em `enum`).
  - 3.2.0: o validador ainda não aceita essa versão.

## R3. Como os schemas Zod viram documentação sem mudar o comportamento da API

Problema: as rotas validam o corpo à mão com `safeParse` e respostas próprias:

- `invalid-input` com `fields`;
- no cadastro, o limite de tentativas vem antes da validação do corpo (contrato da feature 004).

Por padrão, um `schema.body` faria o Fastify validar com Ajv antes do handler. Um `schema.response` faria o Fastify serializar com fast-json-stringify, que descarta campos. Qualquer um dos dois mudaria o comportamento, e a spec proíbe isso (Assumptions).

- **Decision**:
  1. Os `schema` das rotas recebem JSON Schema gerado dos schemas Zod do `shared` com `z.toJSONSchema(schema, { io: 'output' })`, sem a chave `$schema`.
  2. `buildApp` troca o compilador de validação por um que aceita tudo (`setValidatorCompiler(() => (data) => ({ value: data }))`) e o de serialização por `JSON.stringify` (`setSerializerCompiler(() => (data) => JSON.stringify(data))`).
  3. A validação de verdade continua nos `safeParse` das rotas, com os mesmos schemas Zod (FR-003, FR-010).
- **Rationale**:
  - Os dois compiladores são APIs documentadas do Fastify (Validation-and-Serialization: "Using other validation libraries" e "Serializer Compiler").
  - No spike, um corpo inválido com campo extra chegou intacto ao handler, e a resposta saiu com campos fora do schema. O comportamento ficou idêntico ao de hoje.
  - Os compiladores valem para a app inteira, inclusive em produção, onde a documentação não é registrada mas as rotas mantêm os `schema`.
- **Alternatives considered**:
  - `fastify-type-provider-zod` 7.0, com o `validatorCompiler`/`serializerCompiler` dele: passaria a validar antes do handler. Mudaria a ordem do cadastro (limite → corpo) e o formato do erro de 400, que hoje traz `fields`. Usá-lo só pelo `jsonSchemaTransform`, mantendo os compiladores neutros, traria uma dependência a mais para fazer o que `z.toJSONSchema` já faz.
  - Pôr o schema só no `transform` do `@fastify/swagger`, mapeado por URL, sem `schema` nas rotas: a cobertura ficaria num mapa à parte, fácil de esquecer, e a descrição se afastaria da rota.

## R4. Entrada (`io: 'input'`) ou saída (`io: 'output'`) do Zod nos corpos de requisição

O `emailSchema` é `z.string().trim().toLowerCase().pipe(z.email().max(254))`. Medido no projeto:

- Com `io: 'input'`, o e-mail sai só como `{ type: 'string' }`: o formato e o limite de 254 somem, e FR-002 não é atendido.
- Com `io: 'output'`, sai `format: email`, `maxLength: 254` e o `pattern` do Zod. Senha e `inviteCode` saem iguais nos dois modos.

- **Decision**: `io: 'output'` para corpos de requisição e respostas. O campo `email` ganha uma `description` dizendo que espaços nas pontas são removidos e que maiúsculas viram minúsculas antes da checagem. A `description` entra na camada de documentação da API; os schemas do `shared` não mudam.
- **Rationale**:
  - O modo de saída descreve as regras que a API de fato aplica.
  - Um corpo montado conforme o documento nunca é recusado por formato (SC-004).
  - A normalização prévia fica explicada por escrito, já que não tem equivalente em JSON Schema.
- **Alternatives considered**:
  - `io: 'input'`: perde as regras do e-mail.
  - Um `override` no `toJSONSchema` para fundir entrada e saída do `pipe`: complexo, e não ganha nada sobre a descrição em texto.

## R5. Sessão e "Try it out" com cookie

- **Decision**:
  - Declarar em `components.securitySchemes` um esquema `session` do tipo `apiKey`, `in: cookie`, `name: sid`.
  - Marcar `security: [{ session: [] }]` em `GET /api/auth/me`, `POST /api/invites` e `GET /api/invites` (FR-004).
  - A página fica sob `/api/docs` e chama a API na mesma origem, então o navegador guarda e reenvia o cookie `HttpOnly` sozinho, depois de um login executado pela página (FR-008).
- **Rationale**:
  - O cookie `sid` é `HttpOnly`, e o JavaScript da página não consegue lê-lo nem defini-lo. A Swagger UI não precisa fazer isso: na mesma origem, o `fetch` envia cookies por padrão (`credentials: 'same-origin'`).
  - O esquema `apiKey`/`cookie` serve só para documentar a exigência. Ninguém precisa colar o valor no botão "Authorize".
  - Fora de produção o cookie não é `Secure` (`session-cookie.ts`), então funciona em `http://localhost`.
- **Alternatives considered**: um esquema `http`/`bearer` não descreve o mecanismo real.

## R6. Caminho, proxy do Vite e desativação em produção

- **Decision**:
  - `routePrefix: '/api/docs'`: página em `/api/docs/`, documento em `/api/docs/json` e `/api/docs/yaml`, arquivos em `/api/docs/static/*`.
  - Os dois plugins são registrados só quando `config.nodeEnv !== 'production'` (FR-009: desenvolvimento e testes sim, produção nunca).
  - Não há variável de configuração para ligar a documentação.
- **Rationale**:
  - Sob `/api`, tudo passa pelo proxy do Vite (`/api` → API) sem configuração nova. Página, arquivos e chamadas ficam na mesma origem pelo `localhost:5173` ou direto pelo `localhost:3000`.
  - Sem o registro em produção, `/api/docs*` cai no 404 padrão, igual a qualquer caminho inexistente (Edge Cases).
  - O plugin de documentação entra por `app.register(import('./docs/docs.plugin'))`, então em produção os módulos do Swagger nem são carregados.
- **Alternatives considered**:
  - `/docs` fora de `/api`: exigiria regra nova no proxy do Vite e na implantação.
  - Uma variável `API_DOCS_ENABLED`: descartada pela clarificação da spec.

## R7. Ordem de registro

- **Decision**: registrar o plugin de documentação em `buildApp` antes de `healthRoutes`, `authRoutes` e `invitesRoutes`.
- **Rationale**:
  - O README do `@fastify/swagger` avisa que rotas registradas antes do plugin ficam fora do documento.
  - Os `app.register` entram na fila do avvio em ordem, então o hook `onRoute` do plugin já existe quando os plugins de rota carregam.
  - Todas as rotas do projeto vivem em plugins.
  - O plugin de documentação é envolvido em `fastify-plugin`. Sem isso, ele seria um contexto encapsulado, o hook `onRoute` do `@fastify/swagger` ficaria preso nele e não veria as rotas registradas como irmãs em `buildApp`.

## R8. Garantia de cobertura (FR-012) e validação do documento (FR-013)

- **Decision**:
  - Um teste unitário monta a app com `buildApp`, usando o banco que nunca conecta, como em `app.test.ts`.
  - Um hook `onRoute` registrado no teste antes do `ready()` coleta as rotas.
  - O teste exige que toda rota `/api/*` fora de `/api/docs` tenha `schema.tags`, `schema.summary` e `schema.response`, e que apareça em `app.swagger().paths`.
  - Outro teste passa uma cópia do documento (`structuredClone`) para `SwaggerParser.validate`.
- **Rationale**:
  - A lista vem das rotas reais, então uma rota nova sem schema quebra a suíte (SC-005).
  - O validador usa os schemas OpenAPI empacotados (`@apidevtools/openapi-schemas`) e o documento não tem `$ref` externo, então o teste não acessa rede (constitution, VII).
  - A cópia é necessária porque o parser altera o objeto que recebe.
- **Alternatives considered**: `@readme/openapi-parser` 9.1, um fork equivalente. Mantido o original, mais difundido.

## R9. Exemplos e respostas de erro

- **Decision**:
  - Os exemplos de corpo vão como `examples: [...]` no schema da rota. O `@fastify/swagger` os converte em `example` do OpenAPI, como visto no spike.
  - Os valores são fictícios: `ana@example.com`, `senha-de-exemplo`, `ABCD-EFGH-JKMN-PQRS`.
  - As respostas de erro reutilizam o JSON Schema de `apiErrorSchema`, com `description` em português por status, conforme o catálogo do contrato da feature 004.
  - O `Retry-After` do 429 e o `Set-Cookie` das respostas que abrem, renovam ou apagam a sessão entram como `headers` de resposta.
  - O 204 do logout usa `type: 'null'`.
- **Rationale**: atende FR-002, FR-005 e FR-006. Um teste procura no documento as credenciais do `.env.example` e padrões de segredo (SC-006).

## R10. Empacotamento e imagem

- **Decision**:
  - `@fastify/swagger`, `@fastify/swagger-ui` e `fastify-plugin` entram em `dependencies` da API; `@apidevtools/swagger-parser` em `devDependencies`. O `fastify-plugin` já vem como dependência transitiva, mas passa a ser declarado porque o plugin de documentação o importa direto (R7).
  - O `apps/api/package.json` ganha `"version": "0.0.0"`, origem do `info.version` do documento.
  - O `tsdown` mantém as `dependencies` como externas, então os arquivos estáticos da UI são lidos de `node_modules` em tempo de execução, sem `baseDir`.
  - A imagem de produção instala os pacotes, mas nunca os carrega (R6).
- **Rationale**: é o caminho sem configuração extra de build. A seção "Bundling" do README da UI só se aplica quando o próprio pacote é embutido no bundle.
- **Alternatives considered**: deixar os plugins em `devDependencies` e fora da imagem. Exigiria marcar o import como externo no `tsdown` e tratar a ausência do módulo, e só ganharia alguns MB na imagem.
