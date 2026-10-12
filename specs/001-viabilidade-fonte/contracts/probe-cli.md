# Contract: probe CLI

Interface pública da ferramenta `tools/source-probe`.

## Comando

```text
npm run probe -- [--date <AAAA-MM-DD>] [--save-sample]
```

A ferramenta consulta apenas o nível diário.

| Opção | Padrão | Efeito |
|---|---|---|
| `--date` | último dia com puzzle, tentando datas anteriores | data a consultar |
| `--save-sample` | desligado | grava a amostra sanitizada em `fixtures/` |

## Ambiente

Variáveis lidas do ambiente; os valores nunca são impressos. Nomes e valores fictícios ficam em `.env.example`. Se uma variável opcional não existir, a ferramenta segue sem ela e registra isso na trilha.

## Saída (stdout)

Relatório legível com, nesta ordem: veredito e motivo; trilha das etapas; resumo do puzzle (se houver); datas do nível diário (se houver); recomendação de próximo passo.

## Código de saída

| Código | Significado |
|---|---|
| 0 | veredito `viable` |
| 1 | veredito `not-viable-login` |
| 2 | veredito `inconclusive` |
| 64 | uso incorreto (argumento inválido) |

## Garantias

- Nunca imprime nem grava credenciais, tokens, cookies ou dados pessoais.
- Faz no máximo 6 pedidos por execução, com pausa entre eles, e para ao detectar limite de uso.
- Termina sempre com um veredito e um motivo, mesmo em erro inesperado.
