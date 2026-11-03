# Quickstart: validar a administração das fontes

Pré-requisitos: `cp .env.example .env`, `docker compose up -d`, `npm run db:migrate -w @cruzadinha/api`, `npm run db:seed -w @cruzadinha/api`.

1. **Designar admin**: `npm run cli -w @cruzadinha/api -- users set-admin --email <SEED_USER_EMAIL>` → "admin". Repetir com e-mail inexistente → exit 1 e nenhuma conta criada.
2. **Sem acesso**: sem login e com a conta comum, `curl -i localhost:3000/api/admin/sources` e `curl -i -X PUT -H 'content-type: application/json' -d '{' localhost:3000/api/admin/sources` → o mesmo `404` de `curl -i localhost:3000/api/qualquer-coisa`. No site, `/admin` mostra a página "não encontrada" e `/conta` não tem o link.
3. **Com acesso**: logar com a conta promovida; `/conta` mostra "Administração"; `/admin` lista as quatro fontes.
4. **Esconder**: desmarcar uma fonte, salvar; em outra janela anônima, `/calendario` não mostra a aba nem o cartão de "Hoje" dela em até 1 minuto; `curl 'localhost:3000/api/library?source=<id>'` → `400 invalid-input`.
5. **Última visível**: esconder todas → recusa com `no-visible-source`; nada muda.
6. **Reordenar**: subir uma fonte ao topo, salvar; o calendário abre nela por padrão.
7. **Reativar**: marcar de novo; o histórico e o progresso aparecem como antes.
8. **Registro**: `select user_id, before, after, created_at from source_setting_changes order by created_at;` → uma linha por salvamento que mudou algo.
9. **Retirar acesso**: `users set-admin --email <e> --remove`; sem novo login, `/admin` passa a mostrar "não encontrada".
10. **Link direto**: com uma fonte escondida, `/jogo/<id>` de uma cruzada dela abre normalmente numa janela anônima; `/dia/<data>?fonte=<id>` mostra "Esta fonte não está disponível agora".
11. **Convite de x1**: criar um x1 com uma cruzada da fonte, esconder a fonte e abrir o link do convite em outra janela: as regras aparecem, o convidado começa, joga e vê o resultado. Criar um x1 novo não oferece a fonte escondida.
12. **Fonte padrão escondida**: em Configurações, escolher uma fonte como "Cruzada padrão" e ligar "Ir direto ao jogo"; esconder essa fonte no `/admin`; abrir `/`: o jogo abre na primeira fonte visível, sem aviso. As configurações ainda guardam a escolha antiga; reativar a fonte e abrir `/` de novo leva a ela.

Testes: `npm test`, `npm run test:int`, `npm run test:e2e -w @cruzadinha/web`, `npm run check:deps`.
