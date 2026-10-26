```mermaid
erDiagram
    USER {
        uuid user_id PK
        string email UK
        string password_hash
        datetime created_at
        datetime updated_at
    }

    PENDING_REGISTRATION {
        uuid pending_id PK
        string email UK "ainda não é usuário, sem senha; um por e-mail"
        string token_hash UK "SHA-256 do token do link"
        datetime expires_at "envio + 24 horas"
        datetime created_at
        datetime updated_at
    }

    PASSWORD_RESET_TOKEN {
        uuid token_id PK
        uuid user_id FK
        string token_hash UK "SHA-256 do token do link"
        datetime expires_at "emissão + 1 hora"
        datetime used_at "nulo até o uso ou a invalidação por um pedido novo"
        datetime created_at
        datetime updated_at
    }

    EMAIL_SEND_BLOCK {
        smallint block_id PK "sempre 1: linha única"
        datetime blocked_until "até quando o provedor está sem cota"
        string reason "daily_quota_exceeded | monthly_quota_exceeded"
        datetime created_at
        datetime updated_at
    }

    USER ||--o{ PASSWORD_RESET_TOKEN : "pede redefinição"
```

`PENDING_REGISTRATION` não tem chave estrangeira: vira um `USER` quando o link é aberto (a linha é apagada na mesma transação em que o usuário é criado). `EMAIL_SEND_BLOCK` também não se liga a nenhuma entidade.
