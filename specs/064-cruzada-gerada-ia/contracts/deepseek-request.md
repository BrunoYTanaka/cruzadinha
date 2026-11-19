# Contract: pedido à DeepSeek (saída da API, só na coleta)

> **Substituído pela 065**: o pedido agora só pede dicas; ver `specs/065-cruzada-densa/contracts/clue-request.md`.

Fonte: doc oficial (Context7 `/websites/api-docs_deepseek`, consultada em 2026-11-17). Confirmar o nome do modelo ao implementar.

## Pedido

```http
POST https://api.deepseek.com/chat/completions
Authorization: Bearer <DEEPSEEK_API_KEY>
Content-Type: application/json
```

```json
{
  "model": "<DEEPSEEK_MODEL>",
  "messages": [
    { "role": "system", "content": "<mensagem system abaixo>" },
    { "role": "user", "content": "<mensagem user abaixo>" }
  ],
  "response_format": { "type": "json_object" },
  "temperature": 1.3,
  "max_tokens": 6000,
  "stream": false
}
```

Timeout: 180 s. No máximo 3 pedidos por fonte e por dia, entre execuções (research R12); nenhum pedido se a cruzada do dia já está salva, se não há chave ou se o limite do dia acabou. `max_tokens` 6000 cobre a maior lista (15 x 15: 80 palavras com dicas).

## Mensagens (montadas por `buildPrompt({ size, difficulty, date, avoid })`, `sources/generated/prompt.ts`)

### system (fixa)

```text
Você cria listas de palavras e dicas para palavras cruzadas em português do Brasil.
Regras:
- Tema: conhecimentos gerais variados (vocabulário, geografia, ciência, cultura, esportes, natureza).
- Cada resposta é UMA palavra que existe no dicionário ou um nome próprio conhecido.
  Sem espaços, hífens, números, siglas ou abreviações. Pode ter acento e cedilha.
- Cada dica é curta (até 120 caracteres), em texto puro, e não contém a resposta nem parte dela.
- Evite política partidária, religião, violência, sexo, tragédias, doenças graves e linguagem ofensiva.
- Não repita respostas.
Responda só com JSON neste formato:
{"words":[{"answer":"BRASIL","clue":"País de língua portuguesa na América do Sul"},
          {"answer":"ÁGUA","clue":"Líquido incolor essencial à vida"}]}
```

### user (por dia; exemplo 11 x 11, Médio)

```text
Data: 2026-11-18.
Dificuldade: Médio — vocabulário geral e conhecimentos comuns, dicas claras.
Gere 64 palavras com 3 a 11 letras, variando os tamanhos.
Não use estas respostas: SOL, MARTE, OCEANO, PIANO, ...
```

| Parte        | Origem                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Data         | dia corrente (Brasília); só para variar o resultado                                                      |
| Dificuldade  | `generated_source_settings.difficulty` → texto da tabela abaixo                                          |
| Quantidade   | `4 * N + 20` (N = `grid_size`): 56 (9), 64 (11), 72 (13), 80 (15)                                        |
| Tamanho      | 3 a N letras                                                                                             |
| "Não use"    | respostas da mesma fonte nos últimos 30 dias (research R14); linha omitida se a lista estiver vazia     |

| Dificuldade | Texto                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------- |
| `easy`      | `Fácil — palavras comuns do dia a dia, dicas diretas e curtas.`                               |
| `medium`    | `Médio — vocabulário geral e conhecimentos comuns, dicas claras.`                             |
| `hard`      | `Difícil — palavras menos frequentes e conhecimentos mais específicos, dicas indiretas.`      |

A lista "Não use" com 900 palavras soma ~3 a 4 mil tokens de entrada por pedido.

## Resposta usada

`choices[0].message.content` (string JSON) e `choices[0].finish_reason`. Todo o resto é ignorado (esquema tolerante). `finish_reason !== 'stop'` ou conteúdo vazio/só espaços = tentativa falha.

## JSON esperado no conteúdo (validado por esquema estrito, research R8)

```json
{
  "words": [
    { "answer": "BRASIL", "clue": "País de língua portuguesa na América do Sul" },
    { "answer": "ÁGUA", "clue": "Líquido incolor essencial à vida" }
  ]
}
```

## Erros HTTP

| Status       | Tratamento                                   |
| ------------ | -------------------------------------------- |
| 402          | para; `unavailable` + `sem créditos` (quieto) |
| 401          | para; `refused` (falha, abre issue)          |
| 400, 422     | tentativa falha (`unexpected-format`)        |
| 429, 500, 503, rede, timeout | tentativa falha (`source-down`) |

Nenhuma mensagem guarda corpo de resposta, prompt, palavras, dicas ou a chave.
