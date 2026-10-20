# Quickstart: Barra da dica com a largura do tabuleiro

## Pré-requisitos

- Node 24 (`nvm use`), `npm ci`, Docker.
- Banco local com o seed (`docker compose up -d`, `npm run db:seed -w @cruzadinha/api`), API (`npm run dev -w @cruzadinha/api`) e site (`npm run dev -w @cruzadinha/web`).
- Para o e2e sem tocar os dados de desenvolvimento, use um banco separado, como em `specs/011-calendario-e-tamanho-tabuleiro/quickstart.md`.

## Automático

```sh
npm run lint && npm run typecheck && npm test
npm run test:e2e -w @cruzadinha/web -- sem-saltos tamanhos
```

Esperado: tudo verde, incluindo os casos de largura da barra descritos em [contracts/ui.md](contracts/ui.md).

## Manual (computador, janela com mais de 860 px)

1. Abra uma cruzada do Cruzada Online e ande pelas palavras com Tab, das curtas às longas. A barra acima do tabuleiro tem sempre a largura do tabuleiro, e as colunas de dicas não se mexem.
2. Na dica longa, o texto termina em reticências; "N Horizontal"/"N Vertical" e as setas aparecem inteiros.
3. Arraste a alça do canto até o mínimo e até o máximo, e use "Tamanho padrão": a barra acompanha o tabuleiro.
4. Abra a cruzada de amostra 5 × 5 do seed e leve a alça ao mínimo: a barra fica com 320 px, centralizada sobre o tabuleiro, sem cortar o número.
5. Termine uma cruzada: a faixa de modo leitura segue a mesma largura.
6. Com uma dica cortada ativa, pare o mouse sobre ela: em cerca de meio segundo aparece o balão com a dica inteira, por cima do tabuleiro, sem mover nada. Leve o mouse para o balão (continua aberto), tire o mouse (fecha), abra de novo e aperte Esc (fecha), abra de novo e troque de palavra (fecha).
7. Numa dica que cabe inteira, pare o mouse sobre ela: nenhum balão.
8. Repita os passos 1, 3 e 6 nos temas claro e escuro.
9. Num celular (ou com emulação de toque): tocar na dica não abre balão, e o resto fica igual à feature 017. Numa janela de 800 px com mouse: a barra fica na coluna de dicas e o balão funciona como no passo 6.
