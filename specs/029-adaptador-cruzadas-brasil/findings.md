# Achados da fonte real: Cruzadas Brasil

**Feature**: [spec.md](./spec.md) | **Data das verificações**: 2026-10-23

Pedidos manuais e `npm run source:check:cruzadasbrasil` (um pedido por data, pausa de 2 s). Nenhum conteúdo de puzzle foi guardado no repositório.

## Formato

- Uma página HTML por dia em `https://cruzadasbrasil.com.br/palavras-cruzadas/AAAAMMDD`, `content-type: text/html; charset=utf-8`, cerca de 45 kB, Next.js.
- Os dados do jogo estão no estado do React embutido: literais de `self.__next_f.push([1,"..."])`. O objeto `dadosJogo` tem `id`, `titulo`, `nivel` ("Diário"), `dimensoes` (`linhas`, `colunas`), `dicas` (`horizontais`, `verticais`), `posicoes_num` (`numero`, `x` coluna, `y` linha, base 0) e `gabarito` (matriz, `#` nos blocos).
- O payload chega em vários trechos: ler cada literal com `JSON.parse` e concatenar antes de procurar `"dadosJogo":` (um regex sobre o HTML cru perdeu a página de 2026-08-01).
- Não há API nem endpoint JSON. O formato interno do Next.js não tem contrato e pode mudar sem aviso.
- Grades vistas: 13 linhas x 8 colunas (a maioria) e 11 x 11 (2026-07-13). Gabarito em letras maiúsculas ASCII nas páginas vistas; as dicas têm acentos.
- Aplicando a numeração clássica à grade, os números, as direções e as posições batem com `dicas` e `posicoes_num` em todas as datas verificadas.

## Histórico e erros

- Início em 2026-07-13 (cerca de 103 dias em 2026-10-23); o `sitemap.xml` lista 103 datas.
- Data sem página (antes do início): 404, tratado como `unavailable`.
- Data futura: 200 com título "Em breve" e sem dados do jogo (o adaptador nunca pede datas futuras).
- Só o nível "Diário" apareceu; outro valor de `nivel` é `unsupported`.
- `robots.txt` permite tudo, exceto `/data/*.pdf`.

## Verificação sob demanda (2026-10-23)

26 datas entre 2026-07-13 e 2026-10-23 convertidas sem erro (`ok`), incluindo 2026-07-13 (11 x 11) e 2026-08-01; 2026-07-12 respondeu 404 (`unavailable`) e a data futura foi recusada sem pedido. Todas de uma máquina local.

## Pendências do autor

- Cloudflare: os pedidos acima saíram de uma máquina local. Falta conferir a coleta no ambiente publicado (Render): um bloqueio aparece como `source-down` com HTTP 403 (FR-019, T033).
- Pedir à Cruzadas Brasil um endpoint JSON estável, em vez de ler o estado interno do Next.js.
- Registrar a permissão por escrito e combinar a atribuição: o site vive de anúncios e vende uma coletânea em PDF. Não há link para a fonte nesta feature.
- Com `COLLECT_HISTORY_DAYS` acima de cerca de 103, a coleta pede datas 404 sem necessidade (2 s de pausa cada); guardar a primeira data disponível fica para uma feature própria.
