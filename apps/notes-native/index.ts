// notes-native — a real macOS Notes app written declaratively over AppKit.
//
// The UI lives in src/app.tsx as JSX over real AppKit classes (NSSplitView /
// NSStackView / NSTextField). The apple-native JSX plugin lowers each element to
// `new NS…()` + `addArrangedSubview`, and the stack/split views lay everything
// out with Auto Layout — no manual frames, no addSubview chains, no magic tags.
import { mountNotes } from './src/app'

mountNotes()
