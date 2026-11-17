import type { ChatMessage } from './prompt'
import { chatCompletionSchema, modelOutputSchema } from './schema'

// Feature 064: pedido compatível com `POST /chat/completions` (DeepSeek, OpenAI, OpenRouter...).
// Nenhuma mensagem leva o corpo da resposta, o pedido nem a chave (FR-014, FR-015): só o status
// HTTP e um motivo curto.

export type Provider = { baseUrl: string; model: string; apiKey: string | undefined }

export type WordsResult =
  | { ok: true; items: { answer: unknown; clue: unknown }[] }
  | { ok: false; kind: 'no-credits' | 'refused' | 'bad-content' | 'down'; detail: string }

const TIMEOUT_MS = 180_000
const MAX_BYTES = 1_048_576

export async function requestWords(options: {
  provider: Provider & { apiKey: string }
  messages: ChatMessage[]
  fetch: typeof globalThis.fetch
  timeoutMs?: number
}): Promise<WordsResult> {
  const { provider } = options
  let response: Response
  try {
    response = await options.fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${provider.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        messages: options.messages,
        response_format: { type: 'json_object' },
        temperature: 1.3,
        max_tokens: 6000,
        stream: false,
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
    })
  } catch (error) {
    const timeout = error instanceof Error && error.name === 'TimeoutError'
    return { ok: false, kind: 'down', detail: timeout ? 'tempo esgotado' : 'falha de rede' }
  }

  const status = `HTTP ${response.status}`
  if (response.status === 402) return { ok: false, kind: 'no-credits', detail: status }
  if (response.status === 401) return { ok: false, kind: 'refused', detail: status }
  if (response.status === 429 || response.status >= 500) {
    return { ok: false, kind: 'down', detail: status }
  }
  if (!response.ok) return { ok: false, kind: 'bad-content', detail: status }
  if (Number(response.headers.get('content-length') ?? 0) > MAX_BYTES) {
    return { ok: false, kind: 'bad-content', detail: 'corpo grande demais' }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { ok: false, kind: 'bad-content', detail: 'resposta não é JSON' }
  }
  const completion = chatCompletionSchema.safeParse(body)
  if (!completion.success) return { ok: false, kind: 'bad-content', detail: 'formato inesperado' }
  const choice = completion.data.choices[0]!
  if (choice.finish_reason !== 'stop') {
    return { ok: false, kind: 'bad-content', detail: `fim: ${choice.finish_reason ?? 'nenhum'}` }
  }
  // Com JSON Output, conteúdo que não é JSON vira só espaços (doc da DeepSeek).
  const content = choice.message.content?.trim() ?? ''
  if (content === '') return { ok: false, kind: 'bad-content', detail: 'conteúdo vazio' }
  let output: unknown
  try {
    output = JSON.parse(content)
  } catch {
    return { ok: false, kind: 'bad-content', detail: 'conteúdo não é JSON' }
  }
  const parsed = modelOutputSchema.safeParse(output)
  if (!parsed.success) return { ok: false, kind: 'bad-content', detail: 'lista inválida' }
  return { ok: true, items: parsed.data.words }
}
