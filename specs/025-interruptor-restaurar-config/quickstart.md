# Quickstart: validar a feature 025

Pré-requisitos: Node.js 24 (`nvm use`), `npm ci`, Chromium do Playwright (`npx playwright install chromium`) e, para o e2e, API e Postgres locais com a seed (ver `specs/011-calendario-e-tamanho-tabuleiro/quickstart.md` e a seção Commands de `CLAUDE.md`).

## 1. Ver o defeito antes da correção

1. `npm run test:e2e -w @cruzadinha/web -- ajustes-configuracoes` com só os testes novos escritos: devem **falhar** (trilho com 44 px, bolinha fora do centro, caixa de "Restaurar padrões" 19 px antes da margem).
2. Opcional, no navegador: `npm run dev -w @cruzadinha/web`, abrir as configurações (engrenagem) e olhar os interruptores e o botão do rodapé.

## 2. Validar depois da correção

1. Unitários: `cd apps/web && npx vitest run src/features/settings` e `npm test`.
2. e2e: `npm run test:e2e -w @cruzadinha/web -- ajustes-configuracoes`. Esperado:
   - trilho de 30 × 52 px nos dois interruptores, ligados e desligados, em 320, 360 e 1280 px e nos dois temas;
   - centro da bolinha no centro do trilho; mesma posição vertical ligada e desligada;
   - clique a 20 px do centro alterna o interruptor; a 24 px não;
   - esquerda da caixa de "Restaurar padrões" na esquerda do conteúdo (até 1 px), altura ≥ 44 px;
   - sem rolagem lateral; axe sem violações; os testes das features 021, 023 e 024 seguem verdes.
3. Qualidade: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.
4. Olhada manual (celular de 360 px e zoom de 200 %, claro e escuro, cores forçadas): bolinha centralizada, foco visível em volta do trilho, botão do rodapé dentro da margem.

## 3. Documentação

Conferir a linha da feature 025 e a da 024 em `CLAUDE.md` e a nota na spec 024.
