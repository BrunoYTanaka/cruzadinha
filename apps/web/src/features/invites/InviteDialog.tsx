import { useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { formatWait } from '../../lib/time'
import styles from './InviteDialog.module.css'

export type InviteResult =
  | { kind: 'creating' }
  | { kind: 'created'; code: string; expiresAt: string }
  | { kind: 'quota' }
  | { kind: 'limited'; retryAfterSeconds: number | undefined }
  | { kind: 'failed' }

type InviteDialogProps = {
  result: InviteResult | null
  // De `GET /api/invites`; `null` enquanto não veio (ou se a consulta falhou).
  activeCount: number | null
  oldestExpiresAt: string | null
  onClose: () => void
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'America/Sao_Paulo',
})

const formatDay = (iso: string) => dateFormatter.format(new Date(iso))

function countText(count: number): string {
  return count === 1 ? '1 convite ativo' : `${count} convites ativos`
}

// O código aparece só aqui, só uma vez: vive na memória enquanto a janela está aberta e nunca vai a
// `localStorage`, ao console nem a log.
export function InviteDialog({ result, activeCount, oldestExpiresAt, onClose }: InviteDialogProps) {
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLElement>(null)
  const primary = useRef<HTMLButtonElement>(null)

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      // Sem área de transferência: seleciona o texto para a pessoa copiar à mão.
      const node = codeRef.current
      if (node) {
        const range = document.createRange()
        range.selectNodeContents(node)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
      setCopied(false)
    }
  }

  if (!result) return null

  if (result.kind === 'created') {
    return (
      <Dialog
        open
        onClose={onClose}
        title="Convite criado"
        description="Mostramos o código só desta vez. Copie agora."
        initialFocusRef={primary}
      >
        <p className={styles.code}>
          <code ref={codeRef}>{result.code}</code>
        </p>
        <div className={styles.row}>
          <Button onClick={() => void copy(result.code)}>Copiar</Button>
          <span role="status" className={styles.copied}>
            {copied ? 'Copiado' : ''}
          </span>
        </div>
        <ul className={styles.facts}>
          <li>Uso único</li>
          <li>Válido até {formatDay(result.expiresAt)}</li>
          {activeCount !== null ? <li>{countText(activeCount)}</li> : null}
        </ul>
        <Button ref={primary} variant="primary" block onClick={onClose}>
          Pronto
        </Button>
      </Dialog>
    )
  }

  if (result.kind === 'quota') {
    return (
      <Dialog
        open
        onClose={onClose}
        title="Convites no limite"
        description="Você já tem convites ativos demais. Abre uma vaga quando um deles for usado ou expirar."
        initialFocusRef={primary}
      >
        {oldestExpiresAt ? (
          <p className={styles.note}>O mais antigo vale até {formatDay(oldestExpiresAt)}.</p>
        ) : null}
        <Button ref={primary} variant="primary" block onClick={onClose}>
          Entendi
        </Button>
      </Dialog>
    )
  }

  const message =
    result.kind === 'creating'
      ? 'Criando o convite…'
      : result.kind === 'limited'
        ? `Muitas tentativas. Tente de novo em ${formatWait(result.retryAfterSeconds ?? 60)}.`
        : 'Não foi possível criar o convite. Tente de novo mais tarde.'
  return (
    <Dialog open onClose={onClose} title="Convite" description={message} initialFocusRef={primary}>
      <Button ref={primary} variant="primary" block onClick={onClose}>
        {result.kind === 'creating' ? 'Cancelar' : 'Entendi'}
      </Button>
    </Dialog>
  )
}
