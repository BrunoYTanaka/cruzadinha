# Quickstart: Aviso de versão nova no calendário

## Automático

```sh
npm run lint && npm run typecheck
cd apps/web && npx vitest run src/features/offline src/shared/components/Notice src/pages/library
```

Esperado: testes do store (transições de [data-model.md](./data-model.md), guarda de `onNeedReload`, recarga de segurança em 10 s, `update()` ao voltar para a aba), do `UpdateNotice` (textos, botão em espera, axe), do `Notice` (`action.pending`) e do calendário passando.

## Manual (service worker real)

Pré-requisitos: API e banco locais rodando (ver `CLAUDE.md`, Commands).

1. `npm run build -w @cruzadinha/web && (cd apps/web && npx vite preview)`; abrir o site e esperar o SW instalar (DevTools → Application → Service workers).
2. Abrir uma segunda aba no jogo (`/jogar`) e digitar algumas letras.
3. Mudar qualquer texto do site, rodar o build de novo (o preview serve o `dist/` novo).
4. Na aba do calendário, trocar de aba do navegador e voltar (força a checagem). Esperado: aviso "Saiu uma versão nova do Cruzadinha." com "Atualizar" e "Fechar". Na aba do jogo: nada aparece.
5. "Fechar" → aviso some; ir a Estatísticas e voltar ao calendário → continua fechado; recarregar → aparece de novo.
6. "Atualizar" → botão "Atualizando…" em espera, a aba do calendário recarrega já com o texto novo, sem aviso, em menos de 5 s (SC-001).
7. Aba do jogo: não recarregou; letras e relógio intactos; seguir jogando e concluir salva normalmente.
8. Repetir 3–4 com rede até o aviso aparecer; só então desligar a rede (DevTools → Offline; sem rede o site não procura versão nova) e tocar "Atualizar": a página recarrega e o calendário reabre com o que está guardado.
9. Largura 390 px: aviso sem rolagem lateral, botões juntos.
10. Entrar com uma conta, desligar a rede, digitar letras numa cruzada (fica na fila local), voltar ao calendário com versão nova esperando e tocar "Atualizar"; depois religar a rede: a fila é enviada e o progresso aparece na conta (FR-009, SC-003).
