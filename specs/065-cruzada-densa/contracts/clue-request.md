# Contract: pedido de dicas à DeepSeek (saída da API, só na coleta)

Substitui o pedido de palavras de `specs/064-cruzada-gerada-ia/contracts/deepseek-request.md`. Endpoint, cabeçalhos, `response_format`, timeout de 180 s, limite de 3 pedidos por fonte e dia e tratamento de `402` continuam iguais. Conferir a doc atual da DeepSeek no Context7 ao implementar.

## Pedido

```json
{
  "model": "<DEEPSEEK_MODEL>",
  "messages": [
    { "role": "system", "content": "<system abaixo>" },
    { "role": "user", "content": "<user abaixo>" }
  ],
  "response_format": { "type": "json_object" },
  "temperature": 1.0,
  "max_tokens": 6000,
  "stream": false
}
```

`max_tokens` 6000 cobre ~85 dicas de até 120 caracteres (15 x 15).

### system (fixa, `buildCluePrompt`)

```text
Você escreve dicas para palavras cruzadas em português do Brasil.
Regras:
- Uma dica para cada palavra da lista, pelo número dela. Não troque, corrija nem pule palavras.
- A palavra pode ser forma flexionada (plural, feminino, verbo conjugado): a dica deve levar a essa forma exata.
- Cada dica é curta (até 120 caracteres), em texto puro, e não contém a palavra nem parte dela.
- A dica não pode conter a palavra nem outra forma dela (conjugada, infinitivo, plural, feminino): descreva o sentido com outras palavras.
- Evite política partidária, religião, violência, sexo, tragédias, doenças graves e linguagem ofensiva.
Responda só com JSON neste formato:
{"clues":[{"n":1,"clue":"Líquido incolor essencial à vida"},{"n":2,"clue":"Estrela do nosso sistema"}]}
```

### user

```text
Dificuldade: <DIFFICULTY_TEXT da 064>
Palavras:
1. água
2. sol
…
```

A data e as respostas dos últimos 30 dias não vão no pedido.

## Resposta (`content`, validada com Zod)

```json
{ "clues": [{ "n": 1, "clue": "…" }] }
```

- `clues`: array com exatamente um item por número pedido; número fora da lista, repetido ou faltando → tentativa falha (`unexpected-format`, detalhe `dicas incompletas`).
- `clue`: depois de `trim` e espaços colapsados, 3 a 120 caracteres, sem `<`, `>`, `http`, `www`; sem a resposta (comparação sem acento, como na 064); sem termo da lista de bloqueio. Uma dica inválida → tentativa falha (detalhe `dica inválida`), depois do reparo abaixo.
- Chaves extras são ignoradas. Nem a resposta bruta nem as respostas da grade entram em erro ou relatório (FR-015 da 064).

## Reparo

Se, no primeiro pedido, faltar dica ou houver dica inválida, `generate` reserva mais uma chamada do dia e:

1. **Troca local** (`refillRegion`): proíbe essas palavras, solta elas e as corridas que as cruzam e preenche só essa região, abrindo até 4 níveis de cruzamento, com o resto da grade travado. Medido em grades reais: fecha em 84–100% dos casos, trocando ~7–10 palavras em milissegundos. O pedido leva só as palavras novas (números delas na grade), sem aviso extra; as dicas boas das palavras que ficaram são mantidas.
2. **Se a região não fechar**: repete o pedido só com as mesmas palavras, com um aviso de que a dica anterior foi recusada por conter a palavra.

A resposta passa pelas mesmas regras. Sem chamada sobrando ou com nova falha, a tentativa falha e a seguinte preenche outra grade. `source:check:generated` sorteia palavras sem grade, então só exercita o passo 2.

Cada tentativa imprime no log da coleta uma linha de diagnóstico, só com passos e contagens, nunca palavras nem dicas: `[Casa] tentativa 1: dica inválida (1 de 44) → troca local (8 palavras) → dicas ok → gravada`.
