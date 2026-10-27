import { VerifyEmailForm } from '../../features/account'
import { RequiresConnection } from '../../shared/components/RequiresConnection/RequiresConnection'

export function VerifyEmailPage() {
  return (
    <RequiresConnection>
      <VerifyEmailForm />
    </RequiresConnection>
  )
}
