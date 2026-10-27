import { ResetPasswordForm } from '../../features/account'
import { RequiresConnection } from '../../shared/components/RequiresConnection/RequiresConnection'

export function ResetPasswordPage() {
  return (
    <RequiresConnection>
      <ResetPasswordForm />
    </RequiresConnection>
  )
}
