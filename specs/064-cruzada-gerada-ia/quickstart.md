# Quickstart: validar a feature 064

Pré-requisitos: Node 24, Docker, `.env` local, `docker compose up -d`.

## 1. Testes automáticos (sem rede)

```sh
npm test                 # layout, validação da saída do modelo, adaptador com fetch injetado, coleta, CLI
npm run test:int         # migração: 'casa' aceito; linha escondida; generated_source_settings (uma linha, CHECKs, trigger); rotas de admin
npm run typecheck        # todo Record<PuzzleSourceId, ...> precisa do texto da fonte nova
```

Casos que precisam existir (ver `data-model.md`, tabela de desfechos): saída válida monta grade coerente em 9, 11 e 15; mínimo de palavras por tamanho; prompt muda por dificuldade; `attribution.title` com a dificuldade; cruzamento com acento diferente recusado; dica com a resposta descartada; `402` faz 1 chamada e termina quieto; sem chave faz 0 chamadas; `401` falha; 3 conteúdos inválidos = 3 chamadas e falha; dia já salvo = 0 chamadas; limite de 3 vale entre duas coletas no mesmo dia; termo bloqueado e resposta dos últimos 30 dias descartados e listados no prompt; descarte recusado com progresso de conta ou x1 (`409`), aceito sem uso; rotas `/api/admin/generated*` dão `404` a quem não é admin.

## 2. Geração real (manual, gasta crédito; nunca na CI)

```sh
DEEPSEEK_API_KEY=... npm run source:check:generated -w @cruzadinha/api -- --save
```

Esperado: imprime número de palavras postas e as tentativas; com `--save` grava o JSON em `apps/api/.source-samples/` (git-ignored). Nunca imprime a chave.

## 2b. Ambiente local sem crédito

```sh
npm run db:seed -w @cruzadinha/api
```

Esperado: cruzada de exemplo da Casa para hoje, Casa visível nas abas e a conta de teste (`SEED_USER_EMAIL`) com acesso a `/admin` quando o seed a cria (conta antiga: `npm run cli -w @cruzadinha/api -- users set-admin --email <e>`). Nenhuma chamada à DeepSeek.

## 3. Coleta local

```sh
DEEPSEEK_API_KEY=... GENERATION_ENABLED=true npm run cli -w @cruzadinha/api -- puzzles collect   # gasta crédito real
npm run cli -w @cruzadinha/api -- puzzles collect   # de novo: "1 já existentes", nenhuma chamada
```

Sem `GENERATION_ENABLED=true` (padrão local): `[Casa] Pulado em <hoje>: geração desligada`, exit 0, nenhuma chamada. Sem a chave: `sem chave`.

## 4. No site

1. Entrar como admin, abrir `/admin`: a seção "Fontes geradas" mostra Casa com 11 e Médio. Salvar 13 e Difícil; recarregar e conferir. Tentar 16 pelo `curl`: `400 invalid-input`. Sem ser admin: `404`.
2. Rodar a coleta (seção 3) num dia sem cruzada: a nova sai 13 x 13 com "Dificuldade: Difícil".
3. Em "Fontes geradas", conferir respostas e dicas de hoje e "Chamadas restantes hoje". Descartar; o dia fica sem cruzada; rodar `gh workflow run collect.yml` (ou a coleta local) e conferir a nova. Jogar com uma conta e conferir que "Descartar" fica desabilitado com o motivo.
3a. Ligar "Casa" no painel de fontes.
4. Abrir `/calendario?fonte=casa` e o dia de hoje; jogar até concluir.
5. Conferir atribuição "Casa · Dificuldade: …" sem menção a IA ou modelo; estatísticas e x1 com a fonte.
6. Abrir um dia passado sem cruzada: aviso de dia sem cruzada; nenhuma chamada à DeepSeek (só a coleta gera).

## 5. Compatibilidade (release A antes da B)

Com a release A no ar no site, simular API com `casa` em `GET /api/sources` e `GET /api/stats`: o site ignora o id desconhecido e continua funcionando.
