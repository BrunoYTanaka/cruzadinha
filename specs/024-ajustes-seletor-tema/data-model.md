# Data Model: Ajustes de layout e animação nas configurações e no botão de tema

Esta feature não cria nem altera dados. O registro de configurações (`settingsSchema` em `shared`, `cruzadinha:settings` no aparelho, `user_settings` na conta) fica como está, inclusive `defaultSource`, `helpLetters`, `helpWords` e `theme`.

O único estado novo é local e transitório, e não é salvo:

| Estado | Onde | Para quê |
|---|---|---|
| `--tip-shift` (px) | estilo do balão aberto | deslocamento horizontal que mantém o balão dentro da janela; recalculado a cada abertura |
| `--i` (índice) | estilo do seletor | posição do destaque; derivado da cruzada padrão salva |
| `--count` (número) | estilo do seletor | quantidade de fontes, para a largura do destaque |
