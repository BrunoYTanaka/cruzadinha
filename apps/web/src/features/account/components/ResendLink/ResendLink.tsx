import { formatWait } from '../../../../shared/helpers/time/time'
import { Button } from '../../../../shared/components/Button/Button'
import { VisuallyHidden } from '../../../../shared/components/VisuallyHidden/VisuallyHidden'
import type { useCountdown } from '../../hooks/useCountdown'

type Props = {
  label: string
  countdown: ReturnType<typeof useCountdown>
  onResend: () => void
  pending: boolean
}

// Botão de reenvio com a contagem regressiva do `retryAfter` da API. O anúncio para leitores de
// tela muda só no início e no fim da espera, não a cada segundo.
export function ResendLink({ label, countdown, onResend, pending }: Props) {
  const waiting = countdown.secondsLeft > 0
  return (
    <div>
      <Button
        type="button"
        block
        aria-disabled={waiting || pending}
        onClick={() => {
          if (!waiting && !pending) onResend()
        }}
      >
        {waiting && !countdown.hidden ? `${label} em ${formatWait(countdown.secondsLeft)}` : label}
      </Button>
      <VisuallyHidden role="status">
        {waiting && countdown.hidden
          ? ''
          : waiting
            ? `Você poderá reenviar o link em ${formatWait(countdown.total)}.`
            : countdown.total > 0
              ? 'Já é possível reenviar o link.'
              : ''}
      </VisuallyHidden>
    </div>
  )
}
