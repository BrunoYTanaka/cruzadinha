# Quickstart: Calendário volta na fonte do jogo

Pré-requisitos: `nvm use`, `npm ci`, API e Postgres locais com seed (ver CLAUDE.md, seção Commands).

## Testes unitários

```sh
cd apps/web && npx vitest run src/features/library/source-choice.test.ts src/features/library
npm run typecheck && npm run lint
```

Esperado: inicial = fonte lembrada quando há; padrão quando não há ou é inválida; a memória é apagada após a montagem.

## e2e

```sh
npm run test:e2e -w @cruzadinha/web -- fontes.spec.ts
```

Esperado (cenários da spec):
1. Padrão O Globo → aba Cruzada Online → abrir jogo → "Voltar à biblioteca": aba Cruzada Online selecionada.
2. Mesmo caminho com o botão "Voltar" do navegador, o link do cabeçalho e o diálogo de conclusão.
3. Jogo aberto por cartão "Hoje" de outra fonte: volta nessa fonte.
4. Depois de voltar, recarregar a página: aba da cruzada padrão.
5. Do jogo ir ao login e voltar pelo cabeçalho: cruzada padrão.
6. Trocar de aba não muda `cruzadinha:settings`.

## Manual

`npm run dev -w @cruzadinha/web`, repetir 1 e 4 no navegador.
