import { useQuery } from '@tanstack/react-query'
import { useViewer, viewerKey } from '../../session'
import { getMyDuels } from '../services/duel-api'
import { duelTokens } from '../services/duel-tokens'

const POLL_MS = 15_000

// "Meus x1": a conta lista pelo servidor; o visitante, pelos tokens deste aparelho, enviados no corpo.
// Só pergunta depois de a sessão ser conhecida (o servidor já acordou). Com `poll` (a página "Meus x1")
// atualiza a cada 15 s com a aba visível; o contador do cabeçalho não repete, só consulta no
// carregamento, no foco e quando uma ação do x1 invalida a lista. Sem tokens, o visitante nem pergunta.
export function useMyDuels({ poll = false }: { poll?: boolean } = {}) {
  const viewer = useViewer()
  const who = viewer ? viewerKey(viewer) : null
  const tokens = useQuery({
    queryKey: ['duel-tokens'],
    queryFn: async () => (await duelTokens.list()).map((record) => record.participantToken),
    enabled: viewer?.kind === 'guest',
    staleTime: 10_000,
  })
  const guestReady = viewer?.kind === 'guest' && tokens.isSuccess && tokens.data.length > 0
  const enabled = viewer?.kind === 'user' || guestReady
  const query = useQuery({
    queryKey: ['my-duels', who, viewer?.kind === 'guest' ? tokens.data : null],
    queryFn: () => getMyDuels(viewer?.kind === 'guest' ? (tokens.data ?? []) : []),
    enabled,
    refetchInterval: poll ? POLL_MS : false,
    refetchIntervalInBackground: false,
    retry: false,
  })
  const duels = query.data?.duels ?? []
  return {
    viewer,
    query,
    duels,
    attention: duels.filter((duel) => duel.attention).length,
    guestWithoutTokens: viewer?.kind === 'guest' && tokens.isSuccess && tokens.data.length === 0,
  }
}
