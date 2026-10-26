// Resposta dos pedidos que mandam e-mail (cadastro, reenvio e recuperação): o tempo até poder repetir.
export type EmailRequestResult = { retryAfter: number }
