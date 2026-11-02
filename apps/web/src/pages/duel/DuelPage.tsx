import { useParams } from 'react-router'
import { DuelScreen } from '../../features/duel'
import { RequiresConnection } from '../../shared/components/RequiresConnection/RequiresConnection'

// Rota do duelo (feature 058): o endereço do convite e o de volta do participante. O corpo é do
// `DuelScreen`, que decide entre convite, partida, espera e resultado.
export function DuelPage() {
  const { linkToken = '' } = useParams()
  return (
    <RequiresConnection>
      <DuelScreen key={linkToken} linkToken={linkToken} />
    </RequiresConnection>
  )
}
