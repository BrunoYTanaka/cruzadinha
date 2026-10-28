import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useOnline } from '../../hooks/useOnline/useOnline'
import { ErrorState } from '../ErrorState/ErrorState'

// Telas que só funcionam com a API (entrar, cadastro, recuperação, status) dizem isso sem rede em vez
// de mostrar um formulário que falharia (feature 041, FR-005).
export function RequiresConnection({ children }: { children: ReactNode }) {
  return useOnline() ? (
    children
  ) : (
    <ErrorState level={1} title="Esta tela precisa de conexão.">
      <Link to="/calendario">Voltar à biblioteca</Link>
    </ErrorState>
  )
}
