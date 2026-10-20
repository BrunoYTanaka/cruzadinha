# Quickstart: Dica no meio da altura da barra, balão acima da barra e dica resolvida riscada

## Pré-requisitos

- Node 24 (`nvm use`), `npm ci`, Docker.
- Banco local com o seed (`docker compose up -d`, `npm run db:seed -w @cruzadinha/api`), API (`npm run dev -w @cruzadinha/api`) e site (`npm run dev -w @cruzadinha/web`).
- Para o e2e sem tocar os dados de desenvolvimento, use um banco separado, como em `specs/011-calendario-e-tamanho-tabuleiro/quickstart.md`.

## Automático

```sh
npm run lint && npm run typecheck && npm test
npm run test:e2e -w @cruzadinha/web -- sem-saltos tamanhos
```

Esperado: tudo verde, incluindo as garantias de [contracts/ui.md](contracts/ui.md).

## Manual (computador, janela com mais de 860 px)

1. Abra uma cruzada e ande pelas palavras com Tab. O texto da barra começa logo depois da seta anterior e fica no meio da altura da barra, na altura das setas. Ele não sobe nem desce ao trocar de palavra.
2. Na dica longa, o texto termina em reticências e continua na mesma altura.
3. Pare o mouse sobre uma dica cortada. Em cerca de meio segundo, o balão abre **acima** da barra, por cima do título e do relógio, e o tabuleiro fica todo à vista. Suba o mouse até o balão (continua aberto), tire o mouse (fecha), abra de novo e aperte Esc (fecha).
4. Diminua a altura da janela até a página rolar, role até a barra encostar no topo e pare o mouse sobre a dica cortada: o balão abre abaixo da barra.
5. Estreite a janela para cerca de 800 px (sem teclado na tela): a barra vai para baixo do tabuleiro, e o balão abre abaixo dela, sem cobrir nenhuma célula.
6. Complete uma palavra com as letras certas. A dica dela nas colunas Horizontais/Verticais fica riscada, com o fundo verde e o visto, e o texto não fica apagado. A barra acima do tabuleiro não fica riscada. Apague uma letra: o risco sai.
7. Termine a cruzada: no modo leitura, todas as dicas aparecem riscadas.
8. Repita os passos 1, 3 e 6 nos temas claro e escuro.
9. No Firefox, repita o passo 1. O e2e roda só no Chromium, e o deslocamento é o mesmo nos dois navegadores, porque a fonte é servida pelo site.
10. Num celular (ou com emulação de toque), abra o painel de dicas depois de completar uma palavra: a dica fica riscada. A barra acima do tabuleiro e a barra de letras ficam como hoje.
