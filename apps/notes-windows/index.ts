// notes-windows — a real Windows notes app written declaratively over Win32
// controls.
//
// The UI lives in src/app.tsx as JSX over @geastack/windows/Controls classes
// (WinSplitView / WinStackView / WinLabel / WinTextField). The Windows-native
// compiler plugin lowers each element to `new Win…()` + `addArrangedSubview`
// and the stack views lay everything out — the same shape as the macOS
// notes-native app, on the Windows control set.
import { mountNotes } from './src/app'

mountNotes()
