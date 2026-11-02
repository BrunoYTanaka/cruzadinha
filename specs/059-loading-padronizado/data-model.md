# Data Model: Carregamento padronizado e amigável

Sem dados persistidos, sem schema, sem contrato de API. Só tipos e uma tabela de texto no site.

## Tela de espera (`LoadingScreen`)

`'entry' | 'game' | 'day' | 'library' | 'stats'`

| Tela | Título | Palavra |
|---|---|---|
| `entry` | Preparando as palavras… | CRUZADA |
| `game` | Montando a grade… | GRADE |
| `day` | Procurando a cruzada de hoje… | BUSCANDO |
| `library` | Folheando o calendário… | CALENDÁRIO |
| `stats` | Contando seus acertos… | ACERTOS |

Regra: `Record<LoadingScreen, { title: string; word: string }>`; acrescentar um valor a `LoadingScreen` sem entrada na tabela falha no `typecheck`. `LoadingState` sem a prop `screen` usa `entry`.

## Estado de espera (derivado, só em memória)

- `slow`: `true` depois de `WAKE_NOTICE_DELAY_MS` (2 s) de espera; some quando a espera termina.
- `elapsedSeconds`: segundos desde o início da espera, para o contador.
- Botão e `PlayLink`: `pending` (booleano local) e `slow` contado desde o clique.

Mensagem única (constante): "O servidor tirou uma soneca. Já estamos acordando ele, pode levar até um minuto."
