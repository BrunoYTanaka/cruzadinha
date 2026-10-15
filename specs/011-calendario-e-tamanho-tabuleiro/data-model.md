# Data Model: Calendário mais largo e tamanho ajustável do tabuleiro

Sem mudança no servidor, no banco nem em `packages/shared`. Os únicos dados novos vivem no navegador (`localStorage`). Nenhum deles contém dados pessoais, solução, senha nem token.

## Preferência de tamanho do tabuleiro

| Campo | Tipo | Regra |
|---|---|---|
| `cellSize` | inteiro | 30 a 110 (px por célula), inclusive |

- **Chave**: `cruzadinha:board-size`, valor JSON `{"cellSize": 90}`. Dono: `apps/web/src/features/game/board-size.ts`.
- **Escopo**: o navegador do aparelho. Vale para todas as cruzadas e contas daquele navegador.
- **Ausente**: "tamanho padrão" (FR-004).
- **Leitura**: o valor bruto entra como `unknown` e passa por Zod. JSON inválido, campo ausente, tipo errado, número não inteiro, valor fora de 30 a 110 ou armazenamento indisponível resultam em `null` (padrão), sem erro na tela.
- **Escrita**: ao soltar o mouse depois de um arraste da alça, num arraste interrompido (último valor válido) e a cada tecla usada na alça. Uma falha na escrita é ignorada e o tamanho continua valendo na visita atual.
- **Remoção**: botão "Tamanho padrão" ou clique duplo na alça.

## Preferência de largura do calendário

| Campo | Tipo | Regra |
|---|---|---|
| `width` | inteiro | 720 a 1600 (px de largura do calendário), inclusive |

- **Chave**: `cruzadinha:library-width`, valor JSON `{"width": 1200}`. Dono: `apps/web/src/features/library/library-width.ts`.
- **Escopo**: o navegador do aparelho, para todas as contas dele.
- **Ausente**: "ajuste automático" (FR-015).
- **Leitura**: mesmas regras da preferência do tabuleiro, com os limites 720 e 1600.
- **Escrita**: ao soltar o mouse, num arraste interrompido e a cada tecla usada na alça.
- **Remoção**: clique duplo na alça.

## Valores calculados (não guardados)

| Valor | Definição |
|---|---|
| `fit` (tabuleiro) | maior célula, entre 30 e 110, com o tabuleiro e a barra da dica ativa inteiros na largura e na altura disponíveis |
| `max` (tabuleiro) | maior célula, entre 30 e 110, que cabe na largura disponível |
| célula efetiva | `fit` sem escolha; com escolha, a escolha limitada a 30..`max` |
| `max` (calendário) | o menor entre 1600 e a largura disponível na janela |
| largura efetiva | ajuste automático sem escolha; com escolha, a escolha limitada a 720..`max` |

## Transições (iguais para as duas preferências)

```text
padrão (sem chave) ──arraste ou tecla na alça──▶ escolhido (chave = valor limitado)
escolhido ──arraste ou tecla──▶ escolhido (novo valor)
escolhido ──clique duplo na alça / "Tamanho padrão" (só tabuleiro)──▶ padrão (chave removida)
```

Mudar a janela recalcula os valores calculados, mas nunca altera a chave.
