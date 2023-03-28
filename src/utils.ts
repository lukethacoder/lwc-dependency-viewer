import { NodeSingular } from 'cytoscape'
import memoize from 'lodash.memoize'
import { FileType } from '../types'
import { EDGES_COLORS } from './constants'

interface IMakeComponentSvg {
  node: NodeSingular
  showApexReference?: boolean
  showStaticResourceReference?: boolean
}

interface IMakeComponentSvgReturn {
  svg: string
  width: number
  height: number
}

export const makeComponentSvg: any = memoize(
  ({
    node,
    showApexReference,
    showStaticResourceReference,
  }: IMakeComponentSvg): IMakeComponentSvgReturn => {
    const data = node.data()
    const { id, extensions } = data

    const width = 120
    const height = 20
    const lineWidth = 3

    const hasApexReference = showApexReference && !!data.apexReferences
    const hasStaticResourceReference =
      showStaticResourceReference && !!data.staticResourceReferences

    /* make the extension array unique, there could be duplicates in here */
    const uniqueExtensions = [...new Set(extensions)]

    const lineLength =
      extensions.length * lineWidth +
      (hasApexReference ? lineWidth : 0) +
      (hasStaticResourceReference ? lineWidth : 0)

    const svg3 = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 120 20">
      <text transform="translate(${
        lineLength + 4
      } 14.36)" style="font-family: system-ui, Avenir, Helvetica, Arial, sans-serif; font-size: 12px;fill: #abb2bf;">
        <tspan x="0" y="0">${id}</tspan>
      </text>
      ${uniqueExtensions.map(
        (fileType, key) =>
          `<rect x="${
            key * lineWidth
          }" y="0" width="${lineWidth}" height="20" fill="${
            EDGES_COLORS[fileType as FileType]
          }"/>`
      )}
      ${
        hasApexReference
          ? `<rect x="${
              uniqueExtensions.length * lineWidth
            }" y="0" width="${lineWidth}" height="20" fill="${
              EDGES_COLORS.staticResource
            }"/>`
          : ''
      }
      ${
        hasStaticResourceReference
          ? `<rect x="${
              uniqueExtensions.length * lineWidth +
              (hasApexReference ? lineWidth : 0)
            }" y="0" width="${lineWidth}" height="20" fill="${
              EDGES_COLORS.apex
            }"/>`
          : ''
      }
      <rect x="116" y="0" width="4" height="20" fill="${
        node.style()['background-color'] || '#303030'
      }"/>
    </svg>`

    return {
      svg: `data:image/svg+xml;base64,${btoa(svg3)}`,
      width,
      height,
    }
  }
)
