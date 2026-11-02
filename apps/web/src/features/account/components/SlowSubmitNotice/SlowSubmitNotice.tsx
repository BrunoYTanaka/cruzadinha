import { SlowNotice } from '../../../../shared/components/SlowNotice/SlowNotice'
import { useSlowAfter } from '../../../../shared/hooks/useSlowAfter/useSlowAfter'

// Abaixo do botão de envio dos formulários de conta (feature 059): se o pedido passar de 2 s, explica
// que o servidor pode estar acordando. O espaço fica reservado, então o formulário não se mexe.
export function SlowSubmitNotice({ pending }: { pending: boolean }) {
  const { slow } = useSlowAfter(pending)
  return <SlowNotice active={slow} />
}
