# Contrato de interface: título do `ErrorState`

Interface exposta aos outros componentes do site (nenhum contrato externo muda).

```ts
type ErrorStateProps = {
  level: 1 | 2        // novo, obrigatório
  title?: string      // padrão "Algo deu errado"
  message?: string
  onRetry?: () => void
  retryLabel?: string
  waitSeconds?: number
  children?: ReactNode
}
```

Regras:

1. `level` 1 renderiza o título como `<h1>`; `level` 2, como `<h2>`. A classe do título é a mesma nos dois, então a aparência não depende do nível.
2. O bloco continua `role="alert"` e com a mesma ordem de conteúdo (título, mensagem, espera, botão, filhos).
3. Uso por tela:

| Uso | `level` |
|---|---|
| `DayRoute` (todos) | 1 |
| `GamePage` (404, falha) | 1 |
| `RouteError` (todos) | 1 |
| `LibraryPage`, pedido de login (API antiga) | 1 |
| `LibraryPage`, falha do calendário | 2 |

4. Regra para telas novas: uma página tem um único `h1`. Se o erro for o conteúdo da página, `level={1}`; se houver outro `h1` na página, `level` 2 (ou o nível que continuar a hierarquia).
5. `ServerWake` não usa `ErrorState`; o título dele é `h1`, com o mesmo `id`, a mesma classe e o mesmo foco.
