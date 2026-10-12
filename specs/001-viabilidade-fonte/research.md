# Research: Viabilidade da fonte de puzzles

Documentação das bibliotecas consultada via Context7 em 2026-10-12.

## Decisões

### 1. Execução da ferramenta
- **Decision**: `tsx` como dev dependency, com scripts do `package.json` chamando `tsx ./src/cli.ts`.
- **Rationale**: executa TypeScript direto, sem etapa de compilação, o que basta para uma ferramenta de uso único. A documentação confirma a instalação com `npm install -D tsx` e o uso em scripts.
- **Alternatives considered**: compilar com `tsc` antes de rodar (etapa extra sem ganho); `ts-node` (mais lento e com mais atrito com módulos ES).

### 2. Pedidos HTTP
- **Decision**: `fetch` nativo do Node 22, sem biblioteca HTTP.
- **Rationale**: evita uma dependência e basta para poucos pedidos; facilita simular nos testes.
- **Alternatives considered**: `axios`/`undici` (dependência sem necessidade aqui).

### 3. Validação do formato recebido
- **Decision**: Zod 4, com `safeParse` sobre a resposta desconhecida e `error.issues` para explicar o que divergiu. Objetos de resposta externa usam `object()` (que descarta chaves desconhecidas), para tolerar campos novos da fonte.
- **Rationale**: `safeParse` não lança exceção e devolve a lista de problemas por caminho, o que alimenta o veredito "formato inesperado" com uma explicação legível. Alinha com a constitution (Zod já é padrão do projeto).
- **Alternatives considered**: checagem manual de campos (frágil e sem mensagens úteis); `strictObject` (quebraria à toa se a fonte acrescentar campos).

### 4. Testes
- **Decision**: Vitest, com `vi.spyOn(globalThis, 'fetch')` ou `vi.stubGlobal('fetch', ...)` e `vi.unstubAllGlobals()` após cada teste, devolvendo `new Response(...)` com JSON gravado à mão.
- **Rationale**: confirma a abordagem documentada de simular `fetch` global sem rede, como exige o princípio VII.
- **Alternatives considered**: servidor HTTP local de teste (mais peças que o necessário); Jest (configuração extra para ESM e TypeScript).

### 5. Entrega de credenciais
- **Decision**: leitura por variáveis de ambiente (nomes em `.env.example`, valores nunca versionados). A ferramenta nunca imprime o valor, só se está definido.
- **Rationale**: atende a FR-010 e ao princípio VI.
- **Alternatives considered**: argumentos de linha de comando (aparecem no histórico do shell); arquivo de configuração versionado (proibido).

### 6. Descoberta do acesso anônimo
- **Decision**: a ferramenta executa a descoberta em etapas e registra cada uma no relatório: (a) tentar o pedido sem nada; (b) usar credenciais de visitante (permitido pela clarificação de 2026-10-12; login e contas de terceiros continuam proibidos): o token anônimo é gerado no formato do widget, `ANONYMOUS-<32 hex>-ANONYMOUS`, ou lido de `OGLOBO_VISITOR_TOKEN` se definido; a `x-key` vem de `OGLOBO_CLIENT_KEY`, copiada da página pública; (c) repetir o pedido com elas. O veredito decide pela etapa em que o acesso passa ou falha.
- **Rationale**: o desenho já registra que a API recusa pedidos sem credenciais, e a pergunta da feature é justamente se existe um caminho anônimo. Isso só se confirma observando o comportamento real, por isso é o que o spike entrega, e não uma pergunta de pesquisa em escritório.
- **Alternatives considered**: concluir "não viável" sem tentar (descartaria a hipótese central); usar uma conta pessoal (proibido por FR-002).

### 7. Controle de ritmo
- **Decision**: no máximo 6 pedidos por execução, com pausa de 1 segundo entre eles, e parada imediata ao receber sinal de limite de uso ou bloqueio. Orçamento previsto: 1 pedido sem credencial, 1 para obter a credencial de visitante, 1 repetição com credencial, até 2 datas anteriores e 1 listagem de datas. Esgotar o orçamento termina como `inconclusive` (`rate-limited`).
- **Rationale**: atende a FR-007 e ao princípio VIII (baixa frequência, respeito à fonte).
- **Alternatives considered**: sem limite (arrisca bloqueio e abuso da fonte).

## Observação manual do autor (2026-10-12)

Um pedido manual ao endpoint do puzzle diário funcionou só com o cabeçalho `x-access-token` no formato `ANONYMOUS-<32 hex>-ANONYMOUS`, sem `x-key`. Trocar os 32 hexadecimais por qualquer valor também funcionou. Conclusões provisórias, a confirmar pela T029: o token anônimo não é validado pelo servidor além do formato, gerá-lo localmente é suficiente e a `x-key` não é necessária para o puzzle diário. O formato da resposta (`schema.ts`) continua sem confirmação.

## Pontos em aberto
Nenhum bloqueia o plano. A forma exata de obter o acesso anônimo será conhecida na execução da ferramenta, que é o objetivo da feature.
