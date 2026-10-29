# Research: Menos avisos e botões no calendário e no jogo

Sem incógnitas técnicas. Decisões:

## Aviso ao visitante

- **Decisão**: remover o aviso, manter a fila de saves e o aviso de descarte para contas.
- **Motivo**: o aviso atrapalha em todas as telas; o envio na entrada não depende dele.
- **Alternativas**: dispensável com "Fechar" (rejeitada: ainda aparece a cada visita); mover para a tela de login (adiada).

## Botão "Ajudas"

- **Decisão**: manter o estilo de pílula do `Menu` (igual ao `Pill` de "Letra" e "Palavra": raio 999px, 14px, peso 700) e pôr o ponto em posição absoluta no canto, sem largura reservada.
- **Motivo**: o espaço reservado do ponto deixava o texto fora do centro; os vizinhos já são pílulas, então o estilo não muda. `HelpsMenu` é o único uso do `Menu`.
- **Alternativas**: trocar para o estilo padrão de `Button` (rejeitada: deixaria "Ajudas" diferente dos vizinhos); manter o espaço reservado e centralizar (rejeitada: o ponto continuaria ocupando largura).

## Botão "Baixar as cruzadas de hoje"

- **Decisão**: remover o botão e o resumo; manter o cache de cruzadas abertas e o selo "Disponível sem rede".
- **Motivo**: simplifica o cabeçalho "Hoje"; o uso sem rede segue possível.
- **Alternativas**: apagar também `downloadToday` e `hasAnyOutbox` (adiada; funções sem uso na interface). O teste e2e passa a abrir a cruzada com rede antes de ficar sem rede.
