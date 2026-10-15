# Quickstart: validar a feature 011

## Pré-requisitos

Os mesmos da feature 010: Node 24, Docker e o ambiente local com seed.

```sh
nvm use && npm ci
cp .env.example .env            # se ainda não existir
docker compose up -d            # Postgres 17 e API
npm run db:seed -w @cruzadinha/api
npm run dev -w @cruzadinha/web
```

## Testes automáticos

```sh
npm run typecheck && npm run lint && npm test
cd apps/web && npx vitest run src/components/ResizeHandle.test.tsx src/features/game/board-size.test.ts src/features/library/library-width.test.ts
npm run test:e2e -w @cruzadinha/web      # inclui as medidas de contracts/ui-contracts.md
```

O e2e esvazia as tabelas do banco em `DATABASE_URL`. Para não perder as cruzadas e o progresso do banco de desenvolvimento, rode-o num banco à parte, com uma API própria:

```sh
docker compose exec db createdb -U cruzadinha cruzadinha_e2e   # uma vez
E2E_DB=postgres://cruzadinha:<senha>@localhost:5432/cruzadinha_e2e
DATABASE_URL=$E2E_DB PORT=3001 npm run dev -w @cruzadinha/api &   # aplica as migrações ao subir
DATABASE_URL=$E2E_DB API_PROXY_TARGET=http://localhost:3001 E2E_WEB_PORT=4174 \
  npm run test:e2e -w @cruzadinha/web
```

## Roteiro manual (navegador em janela de 1920 × 1080)

Antes de começar, rode no console `localStorage.removeItem('cruzadinha:board-size'); localStorage.removeItem('cruzadinha:library-width')`.

1. **Layout do jogo (história 1).** Abra uma cruzada e confira:
   - O tabuleiro e as dicas formam um bloco centralizado.
   - A barra da dica ativa fica acima do tabuleiro, com ‹ ›.
   - Horizontais e verticais ficam lado a lado, com a altura do tabuleiro.
   - Nada rola.
2. **Navegação.** Use ‹ › e Tab. A dica ativa muda, a lista rola por dentro até ela e a página não se mexe. Clique na última linha do tabuleiro e depois na primeira: a dica ativa aparece inteira, abaixo do título "Horizontais".
3. **Alça do tabuleiro (história 2).**
   - Passe o mouse no canto inferior direito da grade. O cursor muda para o de redimensionar.
   - Arraste. O canto acompanha o mouse e as letras continuam onde estavam.
   - Arraste até o máximo. A página rola e as dicas continuam ao lado.
   - Solte o mouse e digite uma letra. Ela vai para o tabuleiro.
   - Leve a seleção com as setas até a última linha. A página rola até a célula.
4. **Persistência e padrão.**
   - Recarregue a página e abra outra cruzada. O tamanho continua.
   - Clique em "Tamanho padrão" na barra de ferramentas. O tabuleiro volta ao padrão, a chave some e o botão fica indisponível.
   - Escolha outro tamanho e dê um clique duplo na alça. O efeito é o mesmo.
5. **Teclado no tabuleiro.** Com o foco no tabuleiro, aperte Esc e depois Tab para chegar à alça (só Tab muda de palavra, ver passo 11). As setas mudam o tamanho de 10 em 10: ← e ↓ diminuem, → e ↑ aumentam. Home e End vão aos limites, cada tecla grava a escolha (confira recarregando) e o leitor anuncia "Tamanho do tabuleiro N de M".
6. **Biblioteca (história 3).**
   - Abra a biblioteca. O calendário fica bem mais largo, até 1600 px, e um mês de seis semanas cabe sem rolar.
   - Arraste a borda direita, ou o canto inferior direito, até o mínimo. Ele para em 720 px, e o título e a legenda acompanham.
   - Recarregue. A largura continua.
   - Dê um clique duplo na alça. Ele volta ao ajuste automático.
   - Repita só com o teclado: Tab até a alça, setas, Home e End.
7. **Limites e janela.**
   - Com o tabuleiro no máximo e o calendário em 1600 px, estreite a janela para 900 px. Nada rola na horizontal e as chaves no `localStorage` continuam iguais.
   - Ao alargar de novo, voltam os tamanhos escolhidos.
   - Abra a cruzada já numa janela estreita (menos de 861 px) e depois alargue. O tamanho guardado passa a valer.
   - Com o calendário em 720 px, confira que o texto de cada dia (tempo, "Em jogo", "Jogar") aparece inteiro.
8. **Valor inválido.** Rode `localStorage.setItem('cruzadinha:board-size', '{"cellSize":999}')` e `localStorage.setItem('cruzadinha:library-width', '"x"')` e recarregue. As duas telas abrem no padrão, sem erro.
9. **Celular.** No DevTools, use 360 × 740 com toque. A tela de jogo e a biblioteca mantêm o layout da feature 010 e não aparecem alças. Os ajustes visuais do passo 11 aparecem também aqui.
10. **Temas.** Repita os passos 1, 3, 6 e 11 no tema escuro. A alça e a barra de rolagem ficam visíveis, e o foco fica nítido.
11. **Ajustes visuais e teclado (FR-023 a FR-027).**
    - Delete apaga a letra da célula sem mover o cursor; Home vai à primeira célula da palavra ativa e End à última, e a página não rola.
    - Nas dicas, o número aparece em negrito com ponto ("10."), na cor do texto, e a segunda linha de uma dica longa começa embaixo do número. Os títulos "Horizontais" e "Verticais" estão em negrito, na cor do texto.
    - A letra da célula ocupa boa parte da casa, centralizada, sem encostar no número do canto; os números do tabuleiro estão em negrito. Numa cruzada com casa aberta no canto (por exemplo, a de 14/10), a moldura tem a mesma espessura no canto.
    - As barras de rolagem (página, dicas) são finas e na cor do tema, no Chrome, no Edge, no Firefox e no Safari.
    - Com o foco no tabuleiro, Tab na última palavra volta à primeira e Shift+Tab na primeira vai à última, sem sair do tabuleiro. Esc e depois Tab sai para a alça; Esc, uma seta e Tab continua no tabuleiro. O leitor de tela lê na grade "Tab e Shift+Tab mudam de palavra. Delete apaga a letra sem mover; Home e End vão ao início e ao fim da palavra. Para sair do tabuleiro, aperte Esc e depois Tab."
