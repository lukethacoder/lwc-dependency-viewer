export interface IFileTypes {
  js: `#${string}`
  css: `#${string}`
  html: `#${string}`
  apex: `#${string}`
  staticResource: `#${string}`
}

export type FileType = keyof IFileTypes

export interface ComponentReference {
  component: string
  fileName: string
}

export interface FuseItem {
  id: string
  extensions: string[]
}
