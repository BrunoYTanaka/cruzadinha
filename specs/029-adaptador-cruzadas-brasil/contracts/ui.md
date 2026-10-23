# Contrato: site

A lista de fontes vem de `puzzleSourceIdSchema.options`; nada é enumerado à mão.

- **Abas e cartões**: três abas (`SourceTabs`) e três cartões em "Hoje", na ordem do enum. O nome "Cruzadas Brasil" nunca quebra o layout a 360 px (abas rolam ou encolhem sem sobrepor; o contador de concluídos continua visível) nem a ≥ 861 px.
- **Seletor de fonte padrão** (configurações): três segmentos de colunas iguais, com o indicador deslizante (feature 024); o nome longo cabe sem cortar o foco.
- **Dia buscável**: `/dia/:date?fonte=cruzadasbrasil`; fonte desconhecida segue caindo na primeira.
- **Jogo**: `h1` e título da aba mostram "Cruzadas Brasil" e a data; a linha de atribuição não repete o nome quando título ou direitos coincidem com ele.
- **Conclusão**: oferece o puzzle de outra fonte do mesmo dia (a próxima da lista que exista e não esteja concluída); com três fontes a regra de "próxima" continua circular.
- **API antiga**: se `source=cruzadasbrasil` responder `400` (versão anterior da API), a biblioteca dessa fonte falha sozinha e as demais seguem (cada fonte carrega e falha sozinha, feature 015); a aba mostra o erro da fonte, não quebra a página.
- **Avisos**: "fonte fora do ar" e "sem puzzle" por fonte usam `puzzleSourceNames`.

Acessibilidade: abas e segmentos mantêm WAI-ARIA, `axe` sem violações nos dois temas.
