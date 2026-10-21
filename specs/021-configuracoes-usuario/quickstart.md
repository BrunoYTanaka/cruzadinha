# Quickstart: validar as configurações do usuário

## Preparação

```sh
nvm use && npm ci
cp .env.example .env          # se ainda não existir
docker compose up -d          # Postgres 17 e a imagem da API
npm run db:migrate -w @cruzadinha/api   # aplica a 0005 (user_settings)
npm run db:seed -w @cruzadinha/api      # conta de teste e cruzada de exemplo
npm run dev -w @cruzadinha/api
npm run dev -w @cruzadinha/web
```

## Verificações automáticas

```sh
npm run lint && npm run typecheck && npm test
npm run test:int          # user_settings, gatilho, cascata, PUT/GET, 429
npm run test:e2e -w @cruzadinha/web   # configuracoes.spec.ts + suítes antigas
```

## Roteiro manual

1. **Visitante.** Abrir o site sem sessão.
   - A engrenagem aparece no cabeçalho e o botão de tema antigo sumiu.
   - Tab até a engrenagem mostra o tooltip "Configurações".
2. **Tema.** Abrir a modal e clicar no botão de tema três vezes.
   - A ordem é claro → escuro → automático, com o ícone girando e a página revelada em círculo a partir do botão.
   - Com "reduzir movimento" no sistema, a troca é instantânea.
   - Recarregar: o tema continua.
3. **Ajudas.** Mudar letras para 6 e marcar "Sem limite" em palavras.
   - No jogo, os botões de ajuda mostram `0/6` e "Sem limite".
   - Revelar 3 letras e baixar o limite para 2: as letras continuam e a ajuda fica esgotada.
4. **Riscar.** Desligar "Riscar a dica só quando acerta".
   - Preencher uma palavra errada: a dica fica só riscada, sem verde e sem visto.
   - Religar: a dica errada volta ao normal e a certa ganha verde e visto.
5. **Cruzada padrão.** Escolher Cruzada Online.
   - Voltar ao calendário: a aba Cruzada Online está selecionada.
   - Trocar de aba e recarregar: volta para Cruzada Online.
6. **Ir direto.** Ligar a opção e abrir `/`.
   - Abre o jogo de hoje da Cruzada Online, sem o calendário aparecer antes.
   - Concluir essa cruzada e abrir `/` de novo: aparece o calendário com o aviso "já foi concluída".
7. **Conta, primeiro login.** Entrar com a conta do seed.
   - A conta não tinha configurações, então as do aparelho sobem: `GET /api/settings` no Swagger mostra os valores.
8. **Outro aparelho.** Abrir uma janela anônima e entrar com a mesma conta: as configurações da conta valem.
9. **Saída.** Sair da conta: as configurações continuam no aparelho.
10. **Várias abas.** Com duas abas abertas, mudar o tema numa: a outra muda sem animação.
11. **Falha de rede.** Logado, desligar a API e mudar uma configuração.
    - A mudança vale e o aviso aparece na modal.
    - Ligar a API: o envio acontece e o aviso some.
12. **Celular de 360 px** (DevTools): a modal cabe e rola por dentro, sem rolagem lateral.

## Esperado

- Nenhuma mudança de comportamento para quem não abre a modal (SC-005).
- O axe não encontra violações na engrenagem nem na modal, nos dois temas (SC-006).
