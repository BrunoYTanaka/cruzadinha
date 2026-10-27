import { ForgotPasswordForm } from '../../features/account'
import { RequiresConnection } from '../../shared/components/RequiresConnection/RequiresConnection'

export function ForgotPasswordPage() {
  return (
    <RequiresConnection>
      <ForgotPasswordForm />
    </RequiresConnection>
  )
}
