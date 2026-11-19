import type { PuzzleSourceId } from '@cruzadinha/shared'
import { Tabs } from '../../../../shared/components/Tabs/Tabs'
import { completedLabel } from '../../helpers/today-cards'

export type SourceTab = {
  source: PuzzleSourceId
  name: string
  // Concluídas no mês exibido; `null` enquanto a biblioteca da fonte carrega ou se falhou.
  count: number | null
}

export type SourceTabsProps = {
  value: PuzzleSourceId
  tabs: readonly SourceTab[]
  onChange: (source: PuzzleSourceId) => void
}

// Abas de fonte do calendário: um painel só (`source-panel`) para todas; as setas trocam e já
// mostram o calendário da fonte, que está em cache (feature 015, research R4).
export function SourceTabs({ value, tabs, onChange }: SourceTabsProps) {
  return (
    <Tabs<PuzzleSourceId>
      label="Fonte do calendário"
      tabs={tabs.map((tab) => ({
        id: tab.source,
        name: tab.name,
        caption: tab.count === null ? undefined : completedLabel(tab.count),
      }))}
      value={value}
      onChange={onChange}
      tabId={(source) => `source-tab-${source}`}
      panelId={() => 'source-panel'}
    />
  )
}
