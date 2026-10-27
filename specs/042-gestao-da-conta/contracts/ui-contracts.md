# Contrato de interface: gestão da conta

Textos em português; componentes da casa (`Button`, `Dialog`, `Notice`, `RequiresConnection`); tokens de tema, sem cores fixas.

## Cabeçalho (`app/AppLayout.tsx`)

- Com sessão, o e-mail do cabeçalho vira link de texto (sublinhado) para `/conta`, com rótulo acessível "Sua conta (<e-mail>)". Visitante não vê o link (FR-001).

## `/conta` (`pages/account/AccountPage.tsx`)

- Sem rede: `RequiresConnection` ("Esta tela precisa de conexão.").
- Visitante: `h1` "Sua conta" e "Entre para gerenciar sua conta." com link para `/login?next=/conta`. Nenhum formulário.
- Com sessão: `h1` "Sua conta", e-mail atual, e quatro seções (`h2`) na ordem abaixo. Cada envio desativa só o próprio botão (`isPending`) e mostra o resultado num `Notice` com `role="status"` (sucesso) ou `role="alert"` (erro) num espaço já reservado, sem deslocar o layout (FR-014).
- `404` de API antiga em qualquer ação: "Esta ação não está disponível agora."

### Trocar senha (`ChangePasswordForm`)

- Campos: "Senha atual" (`autocomplete="current-password"`), "Nova senha" (`autocomplete="new-password"`, mesma dica de regras do cadastro). Botão `primary` "Trocar senha".
- Sucesso: "Senha trocada. Os outros aparelhos saíram da conta." e campos limpos.
- `wrong-password`: erro no campo "Senha atual". `invalid-input`: erro no campo apontado. `429`: "Muitas tentativas. Tente de novo em N minutos."

### Trocar e-mail (`ChangeEmailForm`)

- Campos: "Novo e-mail" (`type="email"`), "Senha atual". Botão `secondary` "Enviar link".
- Igual ao e-mail atual: recusado no próprio site com "Esse já é o seu e-mail." (o servidor também recusa).
- `202`: "Enviamos um link para <novo e-mail>. Ele vale por 60 minutos. Até lá, continue entrando com o e-mail atual." e contagem de reenvio com `useCountdown` a partir de `retryAfter`.
- `503 email-unavailable`: "Não foi possível enviar o e-mail agora." O e-mail da conta não muda.

### Sair de todos os aparelhos (`LogoutOthersButton`)

- Texto: "Encerra a conta em todos os outros aparelhos. Este continua conectado." Botão `secondary` "Sair dos outros aparelhos". Sem senha.
- Sucesso: "Os outros aparelhos saíram da conta."

### Excluir conta (`DeleteAccountDialog`)

- Botão `secondary` "Excluir conta" abre um `Dialog` (`closeOnBackdrop` desligado) com título "Excluir a conta?", a lista do que é apagado (conta, sessões em todos os aparelhos, progresso salvo, ajustes da conta, cruzadas guardadas para jogar sem rede neste aparelho) e "Não há como desfazer. O progresso de visitante deste aparelho fica.". Campo "Senha atual" e botões "Cancelar" (`quiet`) e "Excluir para sempre" (`primary`). Foco inicial no campo de senha; `Esc` cancela.
- `wrong-password`: erro no campo, nada apagado.
- Sucesso: a página chama `onDeleted` (que roda `clearAccountData(userId)`), depois `endLocalSession` leva a `/` como visitante com o aviso "Sua conta foi excluída.".

## `/confirmar-email` (`pages/confirm-email/ConfirmEmailPage.tsx`)

- Lê o token do fragmento uma vez (`token-fragment`, apaga o fragmento da URL) e envia `confirm-email-change` ao abrir, sem clique (clarificação da spec).
- Enquanto envia: "Confirmando seu novo e-mail…".
- `200`: "E-mail trocado." Com sessão neste navegador: invalida `queryKeys.session` (o cabeçalho mostra o novo e-mail) e oferece "Ir para sua conta". Sem sessão: "Entrar" para `/login`.
- `invalid-token` ou sem token: "Link inválido ou vencido." e, com sessão, link "Pedir outro" para `/conta`; sem sessão, "Entrar".
- `public/_headers`: `/confirmar-email` com `Referrer-Policy: no-referrer`; a rota entra em `ACCOUNT_PATHS`.

## Outros aparelhos

Nada novo: o `401` na próxima ação mostra o aviso de sessão encerrada já existente e não interrompe o jogo (FR-013, SC-006).
