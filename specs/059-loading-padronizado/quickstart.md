# Quickstart: validar o carregamento padronizado

Pré-requisitos: `nvm use`, `npm ci`.

## Automático

```sh
npm run typecheck && npm run lint && npm test
npm run test:e2e -w @cruzadinha/web -- sem-saltos   # API e Postgres locais com o seed
```

## Manual (servidor lento)

1. `npm run dev -w @cruzadinha/web` e, no DevTools, deixe `/api/health` em "Slow 3G" ou bloqueie-o.
2. Abra `/`, clique em "Jogar a cruzada de hoje": o botão vira "Abrindo…" na hora; depois de 2 s aparece
   a mensagem da soneca embaixo, sem nada se mexer. "Experimentar aqui" só rola até a mini cruzada.
3. Abra `/calendario`, `/estatisticas`, um `/jogo/:id` e `/dia/:data` com a API lenta: mesma tela, título
   e palavra de cada uma, mensagem + barra + contador depois de 2 s.
4. Em `/login`, envie o formulário com a API lenta: botão com spinner e largura igual, aviso depois de 2 s.
5. Ligue "Reduzir movimento" no sistema: casas e barra paradas. Alterne tema claro e escuro.
6. Com a API rápida nada disso aparece.
