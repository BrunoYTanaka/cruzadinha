# Contrato: `/api/settings` (mudança aditiva)

- `GET /api/settings`: `settings` pode trazer `copyClue` (boolean). Sites anteriores descartam a chave.
- `PUT /api/settings`: o corpo `settings` pode trazer `copyClue`; ausente é aceito (site anterior). Chaves desconhecidas continuam descartadas.
- Sem rota nova, sem mudança de status ou códigos de erro.

## Contrato de interface (site)

- Ajustes: uma linha com Switch, título "Copiar a dica" e dica "Dois cliques numa dica copiam o texto, o tamanho da palavra e as letras já preenchidas.", entre as ajudas do jogo; desligada por padrão.
- Dica: duplo clique copia `Ter opinião (5): A___R`; toast "Dica copiada" / "Não foi possível copiar".
- Ajustes fecham no `pointerdown` fora do painel.
