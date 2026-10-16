# Versionamento

Como a Cruzadinha numera, lança e publica versões. O roteiro de implantação está em [docs/deploy.md](deploy.md).

## Índice

1. [As versões](#1-as-versões)
2. [O que conta para cada parte](#2-o-que-conta-para-cada-parte)
3. [O tipo do commit decide o número](#3-o-tipo-do-commit-decide-o-número)
4. [Lançar uma versão](#4-lançar-uma-versão)
5. [Tags, registros de mudanças e releases](#5-tags-registros-de-mudanças-e-releases)
6. [Ver a versão no ar](#6-ver-a-versão-no-ar)
7. [Reverter e republicar](#7-reverter-e-republicar)
8. [Compatibilidade entre versões](#8-compatibilidade-entre-versões)
9. [O que não fazer](#9-o-que-não-fazer)

## 1. As versões

A **API** e o **site** têm números próprios, no formato `MAJOR.MINOR.PATCH`, começando em `0.1.0`. O código compartilhado (`packages/shared`) tem uma versão interna, só para propagar mudanças; ele nunca é publicado sozinho.

A versão de cada parte aparece em:

| Onde                 | API                           | Site                            |
| -------------------- | ----------------------------- | ------------------------------- |
| Arquivo de pacote    | `apps/api/package.json`       | `apps/web/package.json`         |
| Tag no histórico     | `api-vX.Y.Z`                  | `web-vX.Y.Z`                    |
| Registro de mudanças | `apps/api/CHANGELOG.md`       | `apps/web/CHANGELOG.md`         |
| Página de lançamento | Releases do GitHub            | Releases do GitHub              |
| No ar                | `GET /api/health` → `version` | `GET /version.json` → `version` |

Ninguém edita esses números à mão: a [release-please](https://github.com/googleapis/release-please) cuida deles.

## 2. O que conta para cada parte

A versão de uma parte muda quando um commit toca a pasta dela:

- **API**: `apps/api/` (inclusive o `Dockerfile` e as migrações).
- **Site**: `apps/web/` (inclusive a função de repasse `functions/` e os arquivos públicos).
- **Código compartilhado** (`packages/shared/`): gera uma versão interna do `shared` e sobe o **patch** da API e do site, com a entrada "dependências atualizadas" no registro de cada um. Para subir o minor de uma parte, o commit precisa tocar a pasta dela.
- **Nada conta** fora dessas pastas: `docs/`, `specs/`, `.github/`, `render.yaml` (aplicado pelo próprio Render ao sincronizar o Blueprint), arquivos da raiz.

## 3. O tipo do commit decide o número

Os commits seguem [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) (veja `CLAUDE.md`). O **tipo** decide quanto a versão sobe e a **pasta** decide qual parte sobe; o escopo da mensagem (`(web)`, `(api)`) é só para leitura.

| Commit                                             | Efeito                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `fix: ...` ou `perf: ...`                          | sobe o **patch** (`0.3.1` → `0.3.2`)                                      |
| `feat: ...`                                        | sobe o **minor** (`0.3.1` → `0.4.0`)                                      |
| `feat!: ...` ou rodapé `BREAKING CHANGE:`          | sobe o **major** a partir de `1.0.0`; abaixo de `1.0.0`, sobe o **minor** |
| `docs`, `chore`, `ci`, `test`, `style`, `refactor` | nenhum                                                                    |

Vários commits antes de um lançamento se somam pela maior subida: um `feat` e três `fix` resultam num minor.

Exemplos, com a API e o site em `0.3.1`:

| Mensagem                   | Pasta tocada       | Resultado                      |
| -------------------------- | ------------------ | ------------------------------ |
| `fix(web): corrige foco`   | `apps/web/`        | site `0.3.2`                   |
| `feat(api): adiciona rota` | `apps/api/`        | API `0.4.0`                    |
| `feat(shared): novo campo` | `packages/shared/` | API `0.3.2` e site `0.3.2`     |
| `docs: ajusta roteiro`     | `docs/`            | nada                           |
| `feat(web)!: muda rotas`   | `apps/web/`        | site `0.4.0` (abaixo de 1.0.0) |

A `1.0.0` é uma decisão do autor: quando quiser, use o rodapé `Release-As: 1.0.0` num commit da parte.

## 4. Lançar uma versão

1. A cada merge na `main`, o workflow **Release** abre ou atualiza um único **pedido de lançamento** (um pull request da release-please, com título como `chore: release main`). Ele traz os números novos, os `package.json` atualizados e os registros de mudanças. A CI roda nele como em qualquer pull request.
2. Quando quiser lançar, **aceite** esse pull request com "Squash and merge" ou "Merge", sem editar o título nem o corpo.
3. O Release cria as tags e as releases. Depois da CI verde, o workflow **Deploy** publica só as partes que ganharam versão nova (primeiro a API, depois o site). Em até 15 minutos a versão está no ar.

Merges que não são o aceite do pedido de lançamento não publicam nada: o Deploy termina com "nada a publicar".

## 5. Tags, registros de mudanças e releases

- Tags: `api-vX.Y.Z`, `web-vX.Y.Z` e `shared-vX.Y.Z` (esta sem página de lançamento).
- Registros: `apps/api/CHANGELOG.md`, `apps/web/CHANGELOG.md`, `packages/shared/CHANGELOG.md`, gerados e fora do Prettier.
- Releases: uma página por versão da API e do site em **Releases** no GitHub, com o registro de mudanças.

## 6. Ver a versão no ar

```sh
curl -s https://<projeto>.pages.dev/api/health   # {"status":"ok","database":"up","version":"0.4.0","commit":"…"}
curl -s https://<projeto>.pages.dev/version.json # {"version":"0.3.2","commit":"…"}
```

## 7. Reverter e republicar

- **Pelo workflow** (publica mesmo que a versão já esteja no ar):

  ```sh
  gh workflow run deploy.yml -f api=0.3.1 -f web=atual   # volta a API para 0.3.1, não mexe no site
  gh workflow run deploy.yml -f api=ultima -f web=ultima # republica as últimas versões
  ```

  Cada entrada aceita uma versão lançada, `ultima` (padrão) ou `atual` (não publica a parte).

- **Pelo painel**: rollback no Render e no Cloudflare Pages ([docs/deploy.md](deploy.md#reversão)).

**A reversão vale até o próximo merge na `main`.** O Deploy compara a última versão lançada com a que está no ar e publica de novo a última. Para manter a reversão, lance logo uma versão de correção (por exemplo, revertendo o commit com defeito com `fix: ...`).

Nenhuma reversão desfaz migração de banco (próxima seção).

## 8. Compatibilidade entre versões

A API é publicada antes do site, e abas abertas continuam usando o site anterior por tempo indeterminado. Por isso cada versão precisa funcionar com a versão anterior da outra parte:

- **Acrescentar um campo numa resposta da API**: livre. O site descarta campos que não conhece.
- **Acrescentar um campo obrigatório num pedido**: só depois que o site que o envia estiver no ar (dois lançamentos: primeiro o site, depois a API passa a exigir).
- **Remover ou renomear** um campo, uma rota ou uma coluna: em dois lançamentos. Primeiro pare de usar; depois que nenhuma versão no ar depender disso, remova.
- **Migrações**: só aditivas no mesmo lançamento (criar tabela ou coluna, acrescentar índice). Remoções seguem a regra anterior. O banco nunca é alterado à mão.
- **Formato interno do puzzle e da solução**: continua estrito; qualquer mudança nele é incompatível e segue o procedimento em dois lançamentos.
- **Códigos de erro novos**: o site anterior não os conhece e mostra a mensagem genérica. Lance o código novo junto com o site que o trata.

## 9. O que não fazer

- Editar os números de versão, os `CHANGELOG.md` ou o `.release-please-manifest.json` à mão.
- Editar o título ou o corpo do pedido de lançamento antes de aceitá-lo.
- Criar tags `api-v*` ou `web-v*` à mão.
- Usar um tipo de commit que não corresponde à mudança (um `feat` para uma correção sobe o minor sem motivo).
