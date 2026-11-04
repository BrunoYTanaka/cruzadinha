import type { YearMonth } from '../../../../shared/helpers/dates/dates'
import { JumpToDate } from '../JumpToDate/JumpToDate'
import { SourceTabs, type SourceTabsProps } from '../SourceTabs/SourceTabs'
import styles from './SourceBar.module.css'

type SourceBarProps = SourceTabsProps & {
  today: string
  // Mês exibido na grade.
  month: YearMonth
  onJumpMonth: (month: YearMonth) => void
  onJumpDate: (date: string, month: YearMonth) => void
}

// A linha das abas de fonte com o filtro de data na ponta oposta (feature 061). A borda de baixo é
// da linha: a aba escolhida a cobre e se funde ao calendário.
export function SourceBar({ today, month, onJumpMonth, onJumpDate, ...tabs }: SourceBarProps) {
  return (
    <div className={styles.bar}>
      <SourceTabs {...tabs} />
      <JumpToDate today={today} month={month} onJumpMonth={onJumpMonth} onJumpDate={onJumpDate} />
    </div>
  )
}
