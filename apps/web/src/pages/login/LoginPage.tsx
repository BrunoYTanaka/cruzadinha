import { LoginForm } from '../../features/account'
import { RequiresConnection } from '../../shared/components/RequiresConnection/RequiresConnection'

export function LoginPage() {
  return (
    <RequiresConnection>
      <LoginForm />
    </RequiresConnection>
  )
}
