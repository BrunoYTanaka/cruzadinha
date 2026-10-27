import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '../../../../shared/components/Button/Button'
import { Notice } from '../../../../shared/components/Notice/Notice'
import { logoutOthers } from '../../../../shared/services/api/account/account'
import { accountErrorMessage } from '../../helpers/messages'
import { AccountSection } from '../AccountSection/AccountSection'

export function LogoutOthersButton() {
  const mutation = useMutation({ mutationFn: logoutOthers })
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  async function onClick() {
    setResult(null)
    try {
      await mutation.mutateAsync()
      setResult({ ok: true, text: 'Os outros aparelhos saíram da conta.' })
    } catch (failure) {
      setResult({ ok: false, text: accountErrorMessage(failure) })
    }
  }

  return (
    <AccountSection
      title="Sair de todos os aparelhos"
      lead="Encerra a conta em todos os outros aparelhos. Este continua conectado."
      status={result ? <Notice variant={result.ok ? 'info' : 'error'}>{result.text}</Notice> : null}
    >
      <div>
        <Button variant="secondary" onClick={() => void onClick()} disabled={mutation.isPending}>
          Sair dos outros aparelhos
        </Button>
      </div>
    </AccountSection>
  )
}
