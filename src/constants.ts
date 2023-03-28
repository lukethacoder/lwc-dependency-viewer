import { IFileTypes } from '../types'

export const EDGES_COLORS: IFileTypes = {
  js: '#f1e05a',
  css: '#563d7c',
  html: '#e34c26',
  apex: '#1797c0',
  staticResource: '#589059',
}

export const EDGE_CURVE_STYLE:
  | 'haystack'
  | 'straight'
  | 'bezier'
  | 'unbundled-bezier'
  | 'segments'
  | 'taxi' = 'bezier'
export const DEFAULT_EDGE_OPACITY = 0.48
