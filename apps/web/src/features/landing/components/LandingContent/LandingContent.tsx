import { FeatureCards } from '../FeatureCards/FeatureCards'
import { FinalBand } from '../FinalBand/FinalBand'
import { Hero } from '../Hero/Hero'
import { MiniCrossword } from '../MiniCrossword/MiniCrossword'
import { SourcesSection } from '../SourcesSection/SourcesSection'
import styles from './LandingContent.module.css'

// O texto da landing (feature 048). Vai no HTML pré-gerado pelo build, então não pode depender da
// API nem de dados do navegador.
export function LandingContent() {
  return (
    <div className={styles.wrap}>
      <Hero />
      <FeatureCards />
      <MiniCrossword />
      <SourcesSection />
      <FinalBand />
    </div>
  )
}
