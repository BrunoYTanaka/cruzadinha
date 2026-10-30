# Quickstart: Imprimir a cruzada

Pré-requisitos: `nvm use`, `npm ci`; para o e2e, API e Postgres locais com seed (ver CLAUDE.md).

## Automático

```sh
npm run lint && npm run typecheck && npm test
npm run test:e2e -w @cruzadinha/web -- imprimir.spec.ts sem-saltos.spec.ts
```

Esperado: a folha não tem letras (unidade e e2e); em mídia `print` só ela fica visível, também no tema escuro; o botão não desloca o layout.

## Manual

1. `npm run dev -w @cruzadinha/web` (com a API), abrir uma cruzada e digitar algumas letras.
2. Tocar em "Imprimir": a pré-visualização mostra fonte, data, grade vazia numerada, dicas e atribuição; nada do site em volta.
3. Repetir com tema escuro, com o teclado na tela (janela estreita) e com Ctrl+P direto.
4. Escolher "Salvar como PDF": mesmo conteúdo. Cancelar: tempo e letras ficam como estavam.
