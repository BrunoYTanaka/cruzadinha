# Contract: saída de `puzzles collect` para a fonte `casa`

`collect.yml` só abre issue `fonte-quebrada` para linhas `[<Fonte>] Falhou em` (stderr). A fonte `casa` mantém essa regra.

| Caso                 | stdout                                                                 | stderr                                   | exit |
| -------------------- | ---------------------------------------------------------------------- | ---------------------------------------- | ---- |
| gerada               | `Coleta Casa: 1 gravados, ...` e `Gravados: <hoje>`           | —                                        | 0    |
| já existia           | `Coleta Casa: 0 gravados, 1 já existentes, ...`               | —                                        | 0    |
| sem créditos         | `Coleta Casa: ... 1 indisponíveis ...` e `[Casa] Pulado em <hoje>: sem créditos` | —            | 0    |
| sem chave            | idem, `sem chave`                                                      | —                                        | 0    |
| geração desligada    | idem, `geração desligada` (padrão fora de produção)                    | —                                        | 0    |
| chave recusada       | resumo                                                                 | `[Casa] Falhou em <hoje>: refused` | 1 |
| 3 tentativas falhas  | resumo                                                                 | `[Casa] Falhou em <hoje>: source-down` ou `unexpected-format` | 1 |

O exit 0 dos casos quietos vale quando as outras fontes deram certo.

## Ambiente de `collect.yml`

Passo "Coletar": `DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}` (segredo opcional; ausente = "sem chave") e `GENERATION_ENABLED: 'true'` (o workflow não define `NODE_ENV`; sem isso a geração ficaria desligada). `DEEPSEEK_MODEL` opcional em `vars`.
