# Contrato: verificação sob demanda

`npm run source:check:cruzadasbrasil -w @cruzadinha/api -- [AAAA-MM-DD ...] [--save]`

Mesmo contrato do `source:check:cruzadaonline` (feature 014): até 10 datas (padrão: hoje em Brasília), pausa de 2 s entre pedidos que chegaram à fonte, uma linha por data (`ok  13x8  41 palavras` ou `<motivo>  <detalhe>`), cabeçalho com o nome da fonte, data futura recusada sem pedido, `--save` grava `cruzadasbrasil-<data>.html` em `apps/api/.source-samples/` (ignorada pelo git). Saída 0 se cada data foi `ok` ou `unavailable`; 1 se houve outra falha; 2 para uso inválido. Nunca imprime o conteúdo da página. Fora da suíte e do CI.
