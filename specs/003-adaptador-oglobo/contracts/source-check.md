# Contrato: verificação sob demanda contra a fonte real

Fora da suíte automática (FR-017). Faz pedidos reais ao O Globo.

## Comando

```sh
npm run source:check -w @cruzadinha/api -- [AAAA-MM-DD] [--save]
```

- Script `source:check` em `apps/api/package.json`: `tsx src/sources/oglobo/check.ts`.
- Data padrão: hoje no fuso `America/Sao_Paulo`. Data inválida: mensagem de uso e código de saída 2, sem pedidos.
- `--save`: grava cada corpo recebido em `apps/api/.source-samples/<level>-<date>.json` (diretório ignorado pelo git) e indica se alguma dica contém `<` ou `&`.

## Comportamento

- Níveis na ordem de `levelSchema.options` (hoje só `daily`), um pedido por nível pelo adaptador (mais a nova tentativa por recusa), com 2 s de pausa entre níveis.
- Ao primeiro `rate-limited`, para e lista os níveis não consultados.

## Saída (uma linha por nível, SC-006)

```text
daily     ok                 11x11  32 palavras
```

- Nunca imprime o token, cabeçalhos ou conteúdo das respostas (dicas, letras).
- Código de saída: 0 se todos os níveis consultados deram `ok` ou `unavailable`; 1 caso contrário.
