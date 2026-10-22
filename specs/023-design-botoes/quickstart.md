# Quickstart: Botões que parecem botões, distintos dos links

## Pré-requisitos

- Node.js 24 (`nvm use`), `npm ci` na raiz.
- Para o e2e e a conferência manual: Postgres local com o seed e a API rodando (ver `CLAUDE.md`, comandos `docker compose up -d`, `db:seed`). Uma vez: `npx playwright install chromium`.

## Testes automáticos

```sh
npm run lint && npm run typecheck && npm test
cd apps/web && npx vitest run src/themes/contrast.test.ts src/components/button-states.test.ts src/components/Button.test.tsx src/components/touch-targets.test.tsx
npm run build -w @cruzadinha/web
DATABASE_URL=<banco local> npm run test:e2e -w @cruzadinha/web -- botoes.spec.ts sem-saltos.spec.ts configuracoes.spec.ts
```

Esperado: tudo verde. O e2e roda contra `vite preview`, ou seja, contra o build de produção, e assim confere também a ordem das camadas depois da minificação (R2). Os pontos verificados estão em [contracts/ui.md](contracts/ui.md).

## Conferência manual

Rodar `npm run dev -w @cruzadinha/web` e abrir o site no computador, nos temas claro e escuro. Repetir no Firefox.

1. **Configurações** (engrenagem):
   - a engrenagem ganha fundo ao passar o mouse e um fundo mais forte ao pressionar;
   - "Restaurar padrões" tem contorno e parece um botão;
   - os passos − e + mudam com o mouse;
   - o − desativado (limite 0) não muda;
   - os segmentos e a chave mantêm a marca do selecionado com o mouse por cima;
   - na versão de visitante, o link "Entre" é sublinhado e engrossa com o mouse.
2. **Entrar e cadastro**: "Entrar" é o único preenchido. "Criar conta" e "Jogar sem entrar" são links sublinhados. Tab mostra o contorno de foco inteiro.
3. **Biblioteca**:
   - o "Entrar" do cabeçalho (visitante) e o "Sair" (com conta) têm contorno;
   - ‹ › do calendário são secundários;
   - cartões "Hoje" e dias ganham borda azul com o mouse;
   - a aba selecionada continua marcada com o mouse.
4. **Jogo**:
   - os botões de ícone da barra e as setas da dica ganham fundo com o mouse;
   - "Tamanho padrão" tem texto na cor normal e não muda quando já está no padrão;
   - uma ajuda esgotada não muda com o mouse;
   - nada se move ao passar o mouse, pressionar ou focar.
5. **Conclusão**: no máximo um botão preenchido. "Voltar à biblioteca" e "Ver o tabuleiro" são secundários.
6. **Página não encontrada** (`/qualquer-coisa`) e **erro** (parar a API com a biblioteca aberta e recarregar): "Voltar à biblioteca" é link sublinhado; "Tentar de novo" é secundário, com contorno e estados.
7. **Menos movimento**: com a preferência do sistema ligada, os estados trocam sem transição.
8. **Toque** (DevTools, modo de aparelho com toque): tocar num botão não deixa o fundo de mouse preso.
9. **Cores forçadas** (DevTools → Rendering → Emulate forced-colors): todo botão tem contorno visível.
