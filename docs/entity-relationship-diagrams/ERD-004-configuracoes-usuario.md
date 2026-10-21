```mermaid
erDiagram
    USER {
        uuid user_id PK
        string email UK
        string password_hash
        datetime created_at
        datetime updated_at
    }

    USER_SETTINGS {
        uuid user_id PK, FK
        json settings
        datetime saved_at
        datetime created_at
        datetime updated_at
    }

    USER ||--o| USER_SETTINGS : "configura"
```
