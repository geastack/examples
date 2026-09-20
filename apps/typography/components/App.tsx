import { Component } from '@geastack/core'
import './App.css'
import { BebasNeueSpecimen } from './BebasNeueSpecimen'
import { CossetteSpecimen } from './CossetteSpecimen'
import { HeadingSpecimen } from './HeadingSpecimen'
import { InterSpecimen } from './InterSpecimen'
import { IntroBlock } from './IntroBlock'
import { LiterataSpecimen } from './LiterataSpecimen'
import { MixedComposition } from './MixedComposition'
import { OswaldSpecimen } from './OswaldSpecimen'

export class App extends Component {
  template() {
    return (
      <div class="typography-app" momentum>
        <MixedComposition />
        <IntroBlock />
        <HeadingSpecimen />
        <InterSpecimen />
        <OswaldSpecimen />
        <BebasNeueSpecimen />
        <CossetteSpecimen />
        <LiterataSpecimen />
      </div>
    )
  }
}
