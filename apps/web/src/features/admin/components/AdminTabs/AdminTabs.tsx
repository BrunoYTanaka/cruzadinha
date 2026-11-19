import { puzzleSourceNames } from '@cruzadinha/shared'
import type { ReactNode } from 'react'
import { ErrorState } from '../../../../shared/components/ErrorState/ErrorState'
import { LoadingState } from '../../../../shared/components/LoadingState/LoadingState'
import { Tabs, type TabItem } from '../../../../shared/components/Tabs/Tabs'
import { useAdminTab, type AdminTabId } from '../../hooks/useAdminTab/useAdminTab'
import { useGeneratedSources } from '../../hooks/useGeneratedSources/useGeneratedSources'
import { GeneratedSourcePanel } from '../GeneratedSourcesAdmin/GeneratedSourcesAdmin'
import { SourcesAdmin } from '../SourcesAdmin/SourcesAdmin'
import styles from './AdminTabs.module.css'

const tabId = (id: AdminTabId) => `admin-tab-${id}`
const panelId = (id: AdminTabId) => `admin-panel-${id}`

// Administração em abas (feature 066): "Fontes" e uma aba por fonte gerada, coladas no painel.
// Todos os painéis ficam montados, o inativo com `hidden`: trocar de aba não perde rascunho.
export function AdminTabs() {
  const { query } = useGeneratedSources()
  const views = query.data ?? []
  const [tab, setTab] = useAdminTab(views.map((view) => view.source))

  // Espera a lista para `?aba=casa` não abrir "Fontes" e pular de aba ao terminar.
  if (query.isPending) return <LoadingState screen="library" level={2} />

  const tabs: TabItem<AdminTabId>[] = [
    { id: 'fontes', name: 'Fontes', caption: 'ordem e visibilidade' },
    ...views.map((view) => ({
      id: view.source,
      name: puzzleSourceNames[view.source],
      caption: 'fonte gerada',
    })),
  ]

  const panel = (id: AdminTabId, content: ReactNode) => (
    <div
      key={id}
      id={panelId(id)}
      role="tabpanel"
      aria-labelledby={tabId(id)}
      hidden={id !== tab}
      className={styles.panel}
    >
      {content}
    </div>
  )

  return (
    <div className={styles.tabs}>
      <div>
        <Tabs
          label="Seções da administração"
          tabs={tabs}
          value={tab}
          onChange={setTab}
          tabId={tabId}
          panelId={panelId}
        />
        {panel('fontes', <SourcesAdmin />)}
        {views.map((view) => panel(view.source, <GeneratedSourcePanel view={view} />))}
      </div>
      {query.isError ? (
        <ErrorState
          level={2}
          message="Não foi possível carregar as fontes geradas agora."
          onRetry={() => void query.refetch()}
        />
      ) : null}
    </div>
  )
}
