# Contrato de interface: confirmar e-mail e recuperar senha

Só `apps/web`, no lançamento B. Cada tela tem uma `h1`, usa os componentes `Button`, `Notice`, `ErrorState` e os tokens de tema, e passa no axe nos dois temas.

## Rotas

| Rota                | Tela                          | `h1`                         |
| ------------------- | ----------------------------- | ---------------------------- |
| `/cadastro`         | formulário e, depois do envio, "enviamos um link" | "Criar conta" e, depois do envio, "Confira seu e-mail" |
| `/verificar-email`  | confirma o token do fragmento | "Escolha sua senha" / "Conta criada" / "Este link não vale mais" |
| `/esqueci-a-senha`  | pede o link de recuperação    | "Esqueci a senha"            |
| `/redefinir-senha`  | nova senha com o token do fragmento | "Nova senha"           |

`/login` ganha o link "Esqueci a senha" (e o `AppLayout` limpa o estado do calendário como já faz em `/login` e `/cadastro`).

## Cadastro

1. Só o campo e-mail. Envio válido → a tela vira "Enviamos um link para **e-mail**. Abra-o para escolher a senha e ativar a conta." com o botão "Reenviar link", desativado enquanto a contagem regressiva do `retryAfter` da resposta corre ("Reenviar em 42 s"; anúncio em região `status`, só a cada mudança de faixa para não ser ruidoso).
2. Reenvio → `POST /api/auth/resend-verification`; a contagem reinicia com o novo `retryAfter`.
3. `429 too-many-attempts` → a contagem usa o `retryAfter` do corpo.
4. `503 email-unavailable` → `Notice` `role="alert"`: "Não foi possível enviar o e-mail agora. Tente novamente mais tarde." O formulário (ou a tela "enviamos um link") continua como estava, com o campo preenchido, e o `retryAfter` não aparece. No reenvio o botão fica parado durante a espera, **sem mostrar o tempo**.
5. Cadastro fechado (`registration` devolve `open: false`) → comportamento atual da feature 013.

## Confirmação do e-mail

- Lê `#token=` uma vez na carga, guarda em memória e chama `history.replaceState(null, '', pathname)` antes de qualquer outra coisa.
- Mostra o formulário "Escolha sua senha" (senha e confirmação, mínimo de 8 caracteres). Abrir o link **não** chama a API: só o envio do formulário gasta o token.
- Sucesso → "Conta criada", "Agora é só entrar." e link para `/login` (`Button` primário).
- `invalid-token` ou fragmento ausente → "Este link não vale mais" + link para `/cadastro` para pedir outro.
- Nenhuma sessão é aberta; o cabeçalho continua "Visitante".

## Esqueci a senha / redefinir

- `/esqueci-a-senha`: um campo de e-mail; qualquer `202` mostra "Se o e-mail tem conta, enviamos um link para redefinir a senha" (texto igual existindo ou não a conta) e o mesmo reenvio com contagem; `503` mostra o `Notice` genérico acima.
- `/redefinir-senha`: nova senha (e confirmação); sucesso → "Senha alterada. Entre com a nova senha." + link para `/login`; `invalid-token` → "Este link não vale mais" + link para `/esqueci-a-senha`; senha inválida mostra a validação do campo sem consumir o link. O fragmento é limpo na carga, como acima.
- Depois da redefinição o site descarta o usuário em cache (a sessão do navegador foi encerrada na API) e o cabeçalho volta a "Visitante".

## Textos e acessibilidade

- Nunca citar cota, provedor, Resend ou "limite".
- Erros em `role="alert"`, resultados em `role="status"`, foco no `h1` ao trocar de estado.
- A contagem regressiva é um `<time>`/texto atualizado a cada segundo, sem prender o foco; o botão desativado usa `aria-disabled` como os demais botões (feature 023).
