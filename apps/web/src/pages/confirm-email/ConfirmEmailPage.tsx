import { ConfirmEmailChange } from '../../features/account'
import { RequiresConnection } from '../../shared/components/RequiresConnection/RequiresConnection'

export function ConfirmEmailPage() {
  return (
    <RequiresConnection>
      <ConfirmEmailChange />
    </RequiresConnection>
  )
}
