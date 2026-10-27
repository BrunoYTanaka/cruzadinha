import { RegisterForm } from '../../features/account'
import { RequiresConnection } from '../../shared/components/RequiresConnection/RequiresConnection'

export function RegisterPage() {
  return (
    <RequiresConnection>
      <RegisterForm />
    </RequiresConnection>
  )
}
