// JSX over @geastack/windows/Controls classes. An element IS the control it
// constructs (the Windows-native compiler plugin lowers `<WinStackView
// spacing={8}/>` to `new WinStackView()` + property writes before the checker
// runs), so attributes are checked against the control's own properties
// through the declaration-only `props` each control declares. No intrinsic
// elements exist on this target: every tag names a class.
declare namespace JSX {
  type Element = any
  interface ElementClass {}
  interface ElementAttributesProperty {
    props: {}
  }
  interface ElementChildrenAttribute {
    children: {}
  }
  interface IntrinsicAttributes {}
  interface IntrinsicElements {}
}
