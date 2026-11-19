# Contract: tela `/admin`

Contrato visual: `docs/mockups/design-system.html`, grupo "Administração" (`admin*`, `admin-casa*`), com "Médio" no lugar de "Média".

## URL

| Endereço | Aba aberta |
|----------|------------|
| `/admin` | Fontes |
| `/admin?aba=fontes` | Fontes |
| `/admin?aba=<fonte gerada existente>` (ex.: `casa`) | essa fonte |
| `/admin?aba=<qualquer outro valor>` | Fontes (a URL não é reescrita) |

Trocar de aba grava `?aba=<id>` substituindo a entrada do histórico. Visitante e conta comum: `NotFoundPage` para qualquer `aba`. Sem rede: `RequiresConnection`.

## Papéis e nomes acessíveis

```text
h1 "Administração"
tablist "Seções da administração"
  tab "Fontes ordem e visibilidade"      aria-selected, tabIndex 0 só na escolhida
  tab "Casa fonte gerada"
tabpanel (aria-labelledby = aba)         inativos com hidden
```

Teclado nas abas: ← → (com volta), Home, End trocam e focam; Tab entra só na escolhida.

### Painel Fontes

- `h2` "Fontes de cruzadas"; texto "A ordem vale para as abas do calendário; a primeira fonte visível abre por padrão. Uma fonte escondida some das listas para todos, mas guarda tudo e pode voltar."
- Cada linha: checkbox com nome contendo o nome da fonte e "Visível"/"Escondida"; selo visível `✓ Visível` (ok) ou `Escondida` (neutro); alça "Arrastar <fonte>".
- `button` "Salvar" (desligado sem alterações); `button` "Descartar alterações" só com alterações.

### Painel de fonte gerada

- `h2` nome da fonte; texto "Fonte gerada. O jogador vê só o nome da fonte e a dificuldade."
- `h3` "Configuração": `group` "Tamanho da grade" com `button` "Diminuir a grade" / "Aumentar a grade" (desligados em 9 / 15) e `status` `N × N`; `group` (fieldset) "Dificuldade" com `radio` Fácil, Médio, Difícil.
- `button` "Salvar configuração" (desligado sem alterações); "Descartar alterações" só com alterações; aviso de resultado na mesma linha (`status` ok "Salvo. Vale a partir da próxima cruzada gerada." ou `alert` de erro).
- `h3` "Cruzada de hoje":
  - com cruzada: termos Grade, Dificuldade (rótulo ou "—"), Palavras, Chamadas restantes (`n de 3`); `table` "Horizontais" e "Verticais" com colunas Nº, Resposta, Dica; `h3` "Descartar a cruzada de hoje" na zona de perigo, texto conforme chamadas, selo de alerta "Uma conta já começou esta cruzada." / "Um x1 usa esta cruzada." e `button` "Descartar" (desligado em uso) → `dialog` "Descartar a cruzada de hoje?" (inalterado).
  - sem cruzada: só Chamadas restantes e "Sem cruzada hoje.".
  - depois do descarte: aviso info. Com chamadas: "Cruzada descartada. A próxima coleta gera outra. Para gerar agora:", `textbox` só de leitura "Comando para gerar agora" (`gh workflow run collect.yml`) e `button` "Copiar" → `status` "Comando copiado." ou "Não foi possível copiar. Selecione o comando.". Sem chamadas: "Cruzada descartada. As chamadas de hoje acabaram: o dia ficará sem cruzada.", sem campo.
- Nenhum aviso reserva espaço vazio neste painel.
