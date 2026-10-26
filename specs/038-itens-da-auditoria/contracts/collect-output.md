# Contrato: saída de `puzzles collect`

O workflow `collect.yml` depende destas linhas (já existentes, agora estáveis; mudar o formato exige mudar o passo da issue e o teste):

- `stderr`: `[<Nome da fonte>] Falhou em <AAAA-MM-DD>: <motivo>` - uma por data com falha. Só esta linha acusa uma fonte.
- `stderr`: `[<Nome da fonte>] Interrompido por limite de uso da fonte; pendentes: ...` - não acusa fonte (não abre issue).
- `stderr` (novo): `[<Nome da fonte>] Erro em <AAAA-MM-DD>: <descrição>` - causa de um erro inesperado de adaptador; a descrição vem de `describeError` (nomes e códigos).
- Saída `1` se qualquer fonte falhou ou parou; `0` caso contrário.

Nomes de fonte vêm de `puzzleSourceNames` (O Globo, Cruzada Online, Cruzadas Brasil, Cruzadas Clube).
