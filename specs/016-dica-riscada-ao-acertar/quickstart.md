# Quickstart: Dica riscada só ao acertar a palavra

## Pré-requisitos

- Node 24 (`nvm use`), `npm ci`.
- Para o roteiro manual e o e2e: Postgres local e a API com o seed (ver `CLAUDE.md`, "Commands"). Para não apagar os dados de desenvolvimento, rode o e2e contra o banco `cruzadinha_e2e` com uma API própria na porta 3001.

## Testes automáticos

```sh
cd apps/web && npx vitest run src/game-logic/clue-strike.test.ts src/features/game/ClueList.test.tsx src/features/game/ClueSheet.test.tsx
npm test -w @cruzadinha/web
npm run test:e2e -w @cruzadinha/web -- ajudas-e-retomada
npm run format:check && npm run lint && npm run typecheck && npm run build
```

Esperado: tudo verde; o caso novo do e2e roda o axe sem violações nos temas claro e escuro.

## Roteiro manual

Abra a cruzada de hoje (como visitante e com conta) em 1280 x 800 e em 360 x 640 (lista em "Dicas").

1. Preencha a palavra 1 horizontal com as letras certas: a dica "1." fica riscada e apagada ao digitar a última letra.
2. Troque uma letra dela: o risco some na hora. Corrija pela palavra vertical que cruza: volta a riscar.
3. Preencha outra palavra com uma letra errada: a dica fica normal.
4. Numa palavra cuja solução tem acento, digite a letra simples: a dica fica riscada.
5. Use "revelar palavra" numa palavra vazia: a dica fica riscada; os contadores de ajuda mudam só pela ajuda, não pelo risco.
6. Use "verificar": as marcas aparecem no tabuleiro e o risco das dicas não muda.
7. Recarregue a página: os riscos voltam iguais, calculados das letras guardadas.
8. Conclua a cruzada e abra em modo leitura: todas as dicas aparecem riscadas.
9. Com leitor de tela (ou o nome acessível no DevTools), a dica riscada termina em "resolvida"; uma completa e errada não diz nada a mais.
10. Confira na aba Rede que nenhum pedido novo sai por causa do risco.
