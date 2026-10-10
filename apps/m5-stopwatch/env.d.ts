declare module '*.css'

declare module '*.png' {
  const src: string

  export default src
}

declare module '*.wav' {
  const url: string

  export default url
}
declare module '*.html?raw' {
  const text: string

  export default text
}
