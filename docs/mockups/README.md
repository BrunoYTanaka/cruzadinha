# Mockups do front

Referências visuais estáticas da feature do front (tom visual, telas e comportamento). Abrir o arquivo
no navegador. Não têm ligação com a API: textos, tempos, datas e códigos são inventados.

- `game.html`: tela de jogo (grade 11 x 11, faixa de ferramentas, ajudas, legenda), em computador e
  celular, nos temas claro e escuro.
- `library.html`: biblioteca em calendário mensal e telas de entrar e criar conta.
- `finish.html`: janela de cruzada concluída, modo leitura e convite criado pelo Konami.

## Divergências assumidas entre os mockups e a spec

- `finish.html` mostra "2 de 3 convites ativos" e "Você já tem 3 convites ativos". A implementação mostra só "N convites ativos" e, na cota cheia, uma frase sem o número, porque a cota é uma constante da API.
- Os mockups não mostram a folha de dicas do celular (tecla "Dicas"), o aviso de sessão expirada com a janela de login, o indicador de salvamento nem os avisos que não bloqueiam; a spec os define (FR-031, FR-032).
- Os valores de cor dos estados do tabuleiro são os dos mockups; o contraste entre eles tem uma exceção aprovada (ver `specs/010-front-basico/contracts/ui-contracts.md`).
