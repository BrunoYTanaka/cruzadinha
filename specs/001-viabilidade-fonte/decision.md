# Decisão: viabilidade da fonte de puzzles

**Data**: 2026-10-12
**Feature**: [spec.md](./spec.md)

## Termos de uso (T028)

**Não lidos.** O autor decidiu executar a verificação real sem passar pelo gate de conformidade (princípio VIII). A leitura dos termos de uso do O Globo e da Agilmente continua pendente e deve acontecer antes de automatizar o acesso no site (feature 004). Se os termos proibirem acesso automatizado, esta decisão deve ser revista.

## Veredito (T029)

| Item | Resultado |
|---|---|
| Veredito | **viable** (código de saída 0) |
| Execução | 2026-10-12, 2 pedidos de no máximo 6 |
| Acesso | sem credencial: negado (`NO-USER`, HTTP 200); com token anônimo gerado no formato do widget: aceito |
| Puzzle | nível diário de 2026-10-12, grade 11 x 11, 32 palavras, 32 dicas, solução incluída |
| Datas | 31 datas disponíveis, de 2026-09-12 a 2026-10-12; a fonte também lista datas futuras, marcadas como tais |

A primeira execução terminou como `inconclusive/unexpected-format`, porque o schema presumido não correspondia à resposta real. A amostra gravada mostrou que o puzzle vem no formato aberto **ipuz v2** (`ipuzData`), e o schema foi ajustado. A segunda execução deu o veredito acima.

## Achados

- O servidor aceita qualquer token no formato `ANONYMOUS-<32 hexadecimais>-ANONYMOUS`; ele identifica o visitante, não o autentica.
- A resposta inclui a solução (`ipuzData.solution`), as dicas (`ipuzData.clues.Across` e `Down`, como `[número, texto]`) e as respostas por palavra (`fromIpuz`).
- A `x-key` estava definida no ambiente nas duas execuções; um pedido manual do autor sem ela também funcionou, então ela não parece necessária.
- O formato ipuz é um padrão aberto, o que simplifica o adaptador da feature 004 e a eventual entrada de outras fontes.

## Amostra (T031)

A amostra gravada pela ferramenta foi revisada: a verificação automática de valores suspeitos e uma busca por padrões de token, cookie, e-mail e senha não encontraram nada. Ela contém o puzzle completo do O Globo e, como o código, **não foi versionada** (ver abaixo).

## Código da verificação

Por decisão do autor, o código da ferramenta (`tools/source-probe/`) e a amostra **não foram versionados**: esta feature respondia a uma pergunta, e a resposta está neste documento. A feature 004 escreve o adaptador definitivo a partir dos dados abaixo e grava as próprias fixtures, reduzidas ao mínimo necessário (princípio VIII).

### Dados técnicos para a feature 004

- **Endpoint**: `GET https://oglobo-api.agilmenteapp.com/api/games/crossword/daily/{AAAA-MM-DD}`.
- **Acesso**: cabeçalho `x-access-token: ANONYMOUS-<32 hexadecimais>-ANONYMOUS`, gerado localmente com valor aleatório. A `x-key` não foi necessária.
- **Recusa**: sem o token, a fonte responde HTTP 200 com corpo `{"error":"NO-USER"}`; tratar pelo corpo, não só pelo status.
- **Resposta**: objeto com `id` (string), `dates`, `ipuzData` e `fromIpuz`.
  - `dates`: lista de `{ date, fomattedDate, day, inTheFuture, status }` (o campo `fomattedDate` vem com esse erro de grafia; `status` vale, por exemplo, `NOT-PLAYED`).
  - `ipuzData` (ipuz v2, `kind` `http://ipuz.org/crossword#1`): `dimensions { width, height }`, `puzzle` (linhas de células: `#` para bloco, número da palavra ou o marcador vazio `:`), `solution` (linhas com as letras e `#`), `clues.Across` e `clues.Down` como pares `[número, texto]`, além de `title`, `author`, `copyright`, `intro` e `notes`.
  - `fromIpuz`: `across` e `down` indexados pelo número da palavra, cada um com `{ clue, answer, row, col }`.
- **Cuidados**: no máximo poucos pedidos por execução, com pausa entre eles, e parada ao receber limite de uso; a solução fica só no servidor (princípio VI).

## Decisão

**proceed**: seguir com o O Globo como fonte e avançar para a feature `002-fundacao`, com duas pendências:

1. Ler os termos de uso antes da feature 004 (ver acima).
2. Confirmar na feature 004 os demais níveis (mini, express, expert, temático), que esta verificação não consultou.
