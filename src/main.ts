import cytoscape, { NodeSingular } from 'cytoscape'
import klay from 'cytoscape-klay'
import Fuse from 'fuse.js'

import data from '../output.json'
import { ComponentReference, FileType, FuseItem } from '../types'
import {
  EDGES_COLORS,
  DEFAULT_EDGE_OPACITY,
  EDGE_CURVE_STYLE,
} from './constants'
import { makeComponentSvg } from './utils'
import './style.css'

cytoscape.use(klay)

let hasActiveNode = false
let showApexReference = true
let showStaticResourceReference = true

const getEdgeColorFromId = (id: string) => {
  const edgeType = id.split('_')[0] as FileType

  if (Object.hasOwn(EDGES_COLORS, edgeType)) {
    return EDGES_COLORS[edgeType]
  }

  return 'grey'
}

let cy = cytoscape({
  container: document.getElementById('cy'), // container to render in
  elements: data,
  wheelSensitivity: 0.2,
  boxSelectionEnabled: false,
  autounselectify: true,
  layout: {
    name: 'klay',
  },
  style: [
    {
      selector: '.orphan',
      style: {
        display: 'none',
      },
    },
    {
      selector: 'node',
      style: {
        shape: 'rectangle',
        'background-color': '#282c34',
        'background-opacity': 1,
        'background-image-opacity': 1,
        'border-color': 'rgb(255, 255, 255)',
        'border-style': 'solid',
        'border-width': 0,
        'transition-property': 'background-image-opacity opacity',
        'transition-timing-function': 'ease-in-out',
        // order is important. We use the background-color in our SVG image
        'background-image': (node: NodeSingular) =>
          makeComponentSvg({
            node,
            showApexReference,
            showStaticResourceReference,
          }).svg,
        width: (node: NodeSingular) =>
          makeComponentSvg({
            node,
            showApexReference,
            showStaticResourceReference,
          }).width,
        height: (node: NodeSingular) =>
          makeComponentSvg({
            node,
            showApexReference,
            showStaticResourceReference,
          }).height,
      },
    },
    {
      selector: 'edge',
      style: {
        'line-color': (edge) => getEdgeColorFromId(edge.id()),
        opacity: DEFAULT_EDGE_OPACITY,
        'transition-property': 'opacity',
        'curve-style': EDGE_CURVE_STYLE,
        'source-arrow-shape': 'triangle',
        'source-arrow-color': '#fefefe',
        'source-arrow-fill': 'filled',
        'arrow-scale': 1,
      },
    },
  ],
})

cy.on('tap', (e) => {
  const eventTarget = e.target

  if (eventTarget === cy) {
    handleNodeUnTap()
  } else if (eventTarget.isNode()) {
    handleNodeTap(eventTarget)
  } else if (eventTarget.isEdge()) {
    // no-op
  }
})

const setAsActiveNode = (node: any) => {
  cy.nodes().style({ 'background-image-opacity': 0.2 })
  cy.edges().style({ opacity: 0.2 })

  const edges = node.connectedEdges()
  // neighborhood.style({ 'background-image-opacity': 1, opacity: 1 })
  edges.style({ opacity: 1 })
  edges.connectedNodes().style({ opacity: 1, 'background-image-opacity': 1 })
  node.style({ opacity: 1, 'background-image-opacity': 1 })
}

const handleNodeUnTap = () => {
  hasActiveNode = false

  // restore opacity
  cy.nodes().style({ 'background-image-opacity': 1, 'border-width': 0 })
  cy.edges().style({ opacity: DEFAULT_EDGE_OPACITY })

  // close the component sidebar
  const component: HTMLElement | null = document.querySelector(`#component`)
  if (component) {
    component.dataset.isOpen = 'false'
  }
}

const handleClickComponentTreeItem = (e: Event) => {
  const nodeId =
    (e.currentTarget as HTMLButtonElement).dataset.id ||
    (e.target as HTMLButtonElement).dataset.id

  // find the node to mark as active
  const node = cy.filter(`#${nodeId}`)

  if (!node) {
    console.warn(`Unable to find node with id ${nodeId}`)
    return
  }

  handleNodeTap(node)
}

const handleNodeTap = (node: NodeSingular) => {
  hasActiveNode = true

  node.style({
    'border-width': 2,
  })

  // restore opacity to other nodes
  cy.elements(`node[id != "${node.id()}"]`).style({
    'background-image-opacity': 1,
    'border-width': 0,
  })
  cy.edges().style({ opacity: DEFAULT_EDGE_OPACITY })

  setAsActiveNode(node)

  const edges = node.connectedEdges().map((item) => {
    // double check for lone edges?
    const targetNode = Array.from(item.connectedNodes()).find(
      (item) => item.id() !== node.id()
    )?.[0]

    const nodeData = targetNode ? targetNode.data() : null

    return {
      edge: item.data(),
      node: nodeData,
    }
  })

  const references = edges.reduce<{
    referencedBy: ComponentReference[]
    references: ComponentReference[]
  }>(
    (acc, item) => {
      const { edge } = item
      if (edge.source === node.id()) {
        acc.referencedBy.push({
          component: edge.target,
          fileName: `${edge.target}.${edge.id.split('_')[0]}`,
        })
      } else {
        acc.references.push({
          component: edge.source,
          fileName: `${edge.source}.${edge.id.split('_')[0]}`,
        })
      }

      return acc
    },
    { referencedBy: [], references: [] }
  )

  // push data to the DOM
  const nodeData = node.data()
  const extensions = nodeData.extensions || []
  const apexReferences = nodeData.apexReferences || {}
  const staticResourceReferences = nodeData.staticResourceReferences || []

  const componentTitleEl: HTMLHeadingElement | null =
    document.querySelector(`#component h2`)
  if (componentTitleEl) {
    componentTitleEl.innerText = nodeData.id
    componentTitleEl.title = nodeData.id
  }

  const referencesEl = document.querySelector(`#component .references`)
  if (referencesEl) {
    // reset the list
    referencesEl.innerHTML = ''
    references.references.sort((a, b) => (a.fileName < b.fileName ? -1 : 1))

    if (references.references.length > 0) {
      references.references.forEach((ref) => {
        const li = document.createElement('li')
        const button = document.createElement('button')

        button.innerText = ref.fileName
        button.title = ref.fileName
        button.dataset.type = ref.fileName.split('.').at(-1)
        button.dataset.id = ref.component
        button.onclick = handleClickComponentTreeItem

        li.appendChild(button)
        referencesEl.appendChild(li)
      })
    }
  }

  const referencedByEl = document.querySelector(`#component .referenced-by`)
  if (referencedByEl) {
    // reset the list
    referencedByEl.innerHTML = ''
    references.referencedBy.sort((a, b) => (a.fileName < b.fileName ? -1 : 1))

    if (references.referencedBy.length > 0) {
      references.referencedBy.forEach((ref) => {
        const li = document.createElement('li')
        const button = document.createElement('button')

        button.innerText = ref.fileName
        button.title = ref.fileName
        button.dataset.type = ref.fileName.split('.').at(-1)
        button.dataset.id = ref.component
        button.onclick = handleClickComponentTreeItem

        li.appendChild(button)
        referencedByEl.appendChild(li)
      })
    }
  }

  // Apex Method References
  const apexReferencesTitleEl: HTMLElement | null = document.querySelector(
    `#component #apex-references`
  )
  const apexReferencesUlEl: HTMLUListElement | null = document.querySelector(
    `#component .apex-references`
  )
  if (apexReferencesTitleEl && apexReferencesUlEl) {
    apexReferencesTitleEl.dataset.hasData = 'false'
    // reset the list
    apexReferencesUlEl.innerHTML = ''

    // only render the list if the user would like to see it
    if (showApexReference) {
      const apexClasses = Object.keys(apexReferences)
      apexClasses.sort((a, b) => (a < b ? -1 : 1))

      if (apexClasses.length > 0) {
        apexReferencesTitleEl.dataset.hasData = 'true'
        apexClasses.forEach((apexClass) => {
          const li = document.createElement('li')
          const button = document.createElement('button')

          button.innerText = `${apexClass}.cls`
          button.title = `${apexClass}.cls`
          button.dataset.type = 'apex'

          li.appendChild(button)
          apexReferencesUlEl.appendChild(li)
        })
      }
    }
  }

  // Static Resource References
  const staticResourceReferencesTitleEl: HTMLElement | null =
    document.querySelector(`#component #static-resources`)
  const staticResourceReferencesUlEl: HTMLUListElement | null =
    document.querySelector(`#component .static-resources`)
  if (staticResourceReferencesTitleEl && staticResourceReferencesUlEl) {
    staticResourceReferencesTitleEl.dataset.hasData = 'false'
    // reset the list
    staticResourceReferencesUlEl.innerHTML = ''

    // only render the list if the user would like to see it
    if (showStaticResourceReference) {
      if (staticResourceReferences.length > 0) {
        staticResourceReferences.sort((a: string, b: string) =>
          a < b ? -1 : 1
        )
        staticResourceReferencesTitleEl.dataset.hasData = 'true'

        staticResourceReferences.forEach((staticResource: string) => {
          const li = document.createElement('li')
          const button = document.createElement('button')

          button.innerText = staticResource
          button.title = staticResource
          button.dataset.type = 'staticResource'

          li.appendChild(button)
          staticResourceReferencesUlEl.appendChild(li)
        })
      }
    }
  }

  const component: HTMLElement | null = document.querySelector(`#component`)
  if (component) {
    component.dataset.typeJs = extensions.includes('js')
    component.dataset.typeHtml = extensions.includes('html')
    component.dataset.typeCss = extensions.includes('css')
    component.dataset.isOpen = 'true'
  }
}

cy.on('unselect', 'node', (e) => {
  handleNodeUnTap()
})

cy.on('mouseover', 'node', (e) => {
  if (!hasActiveNode) {
    setAsActiveNode(e.target)
  }
})

cy.on('mouseout', 'node', (e) => {
  if (!hasActiveNode) {
    const node = e.target

    // restore opacity
    cy.nodes().style({ 'background-image-opacity': 1 })
    cy.edges().style({ opacity: DEFAULT_EDGE_OPACITY })

    node.connectedEdges().style({
      opacity: DEFAULT_EDGE_OPACITY,
    })
  }
})

let fuse: Fuse<FuseItem> | null = null
const handleOpenSearchOverlay = () => {
  const settingsDialogEl: HTMLDialogElement | null =
    document.querySelector(`#search`)
  if (settingsDialogEl) {
    settingsDialogEl.showModal()
    settingsDialogEl.addEventListener('click', (e) =>
      handleClickDialog(e, settingsDialogEl)
    )
    settingsDialogEl.addEventListener('close', resetSearchOverlay)

    // if fuse hasnt been setup yet, set it up
    if (!fuse) {
      const data: FuseItem[] = cy.nodes().map((item) => ({
        id: item.id(),
        extensions: item.data().extensions,
      }))

      fuse = new Fuse(data, {
        keys: ['id', 'extensions'],
      })
    }
  }
}

const handleOpenSettings = () => {
  const settingsBtnEl: HTMLButtonElement | null =
    document.querySelector(`#settings`)
  if (settingsBtnEl) {
    settingsBtnEl.dataset.isOpen = 'true'
  }
}
const handleCloseSettings = () => {
  const settingsBtnEl: HTMLButtonElement | null =
    document.querySelector(`#settings`)
  if (settingsBtnEl) {
    settingsBtnEl.dataset.isOpen = 'false'
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initKeyboardListener()

  /* Button listeners */
  initOpenSearchOverlay()
  initOpenSettingsSidebar()
  initCloseSettingSidebar()
  initCloseComponentSidebar()

  /* Input listeners */
  initSearchInput()
  initCurveTypeInput()
  initOrphanModulesToggle()
  initApexReferencesToggle()
  initStaticResourceReferencesToggle()
})

const initKeyboardListener = () => {
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
      if (hasActiveNode) {
        handleNodeUnTap()
      }
    } else if (e.key === '/') {
      handleOpenSearchOverlay()
    }
  })
}

const initOrphanModulesToggle = () => {
  const el = document.querySelector(`#toggle-orphan-modules`)
  el?.addEventListener('input', () => {
    // toggle orphan node visibility
    cy.nodes()
      .filter((n) => n.connectedEdges().length === 0)
      .toggleClass('orphan')
  })
}

const updateNodeSvg = () => {
  // force update the svg bg images
  cy.startBatch()
  cy.nodes().style({
    'background-image': (node: NodeSingular) =>
      makeComponentSvg({
        node,
        showApexReference,
        showStaticResourceReference,
      }).svg,
  })
  cy.endBatch()
}

const initCurveTypeInput = () => {
  const elSelect: HTMLSelectElement | null =
    document.querySelector(`#set-curve-type`)
  elSelect?.addEventListener('input', (e: Event) => {
    // batch the curve-style for edges (could be expensive on larger graphs)
    cy.startBatch()
    cy.edges().style({
      'curve-style': (e.target as HTMLSelectElement).value,
    })
    cy.endBatch()
  })
}

const initApexReferencesToggle = () => {
  const el = document.querySelector(`#toggle-apex-references`)
  el?.addEventListener('input', (e: Event) => {
    showApexReference = !(e.target as HTMLInputElement).checked

    const apexLegendEl: HTMLElement | null =
      document.querySelector(`#key [data-apex]`)
    if (apexLegendEl) {
      apexLegendEl.style.display = showApexReference ? '' : 'none'
    }

    updateNodeSvg()
  })
}

const initStaticResourceReferencesToggle = () => {
  const el = document.querySelector(`#toggle-static-resource-references`)
  el?.addEventListener('input', (e) => {
    showStaticResourceReference = !(e.target as HTMLInputElement).checked

    const staticResourceLegendEl: HTMLElement | null = document.querySelector(
      `#key [data-static-resource]`
    )
    if (staticResourceLegendEl) {
      staticResourceLegendEl.style.display = showStaticResourceReference
        ? ''
        : 'none'
    }

    updateNodeSvg()
  })
}

const resetSearchOverlay = () => {
  const elInput: HTMLInputElement | null =
    document.querySelector(`#input-search`)
  if (elInput) {
    elInput.value = ''
  }

  const elResults: HTMLUListElement | null =
    document.querySelector(`#search-results`)
  if (elResults) {
    elResults.innerHTML = ''
  }
}

const handleClickDialog = (e: MouseEvent, dialog: HTMLDialogElement) => {
  if (e.target === dialog) {
    dialog.close()
  }
}

const initSearchInput = () => {
  const elInput: HTMLInputElement | null =
    document.querySelector(`#input-search`)
  const elResults: HTMLUListElement | null =
    document.querySelector(`#search-results`)

  elInput?.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLInputElement

    // search over all nodes
    const results = fuse?.search(target.value)

    if (elResults) {
      // reset the results
      elResults.innerHTML = ''

      results?.forEach((item) => {
        const li = document.createElement('li')
        const button = document.createElement('button')
        button.innerText = item.item.id
        button.title = item.item.id
        button.dataset.id = item.item.id

        const buttonSpan = document.createElement('span')
        if (item.item.extensions.includes('js')) {
          const fileSvg = document.createElement('img')
          fileSvg.src = './javascript.svg'
          buttonSpan.appendChild(fileSvg)
        }
        if (item.item.extensions.includes('html')) {
          const fileSvg = document.createElement('img')
          fileSvg.src = './html.svg'
          buttonSpan.appendChild(fileSvg)
        }
        if (item.item.extensions.includes('css')) {
          const fileSvg = document.createElement('img')
          fileSvg.src = './css.svg'
          buttonSpan.appendChild(fileSvg)
        }

        button.appendChild(buttonSpan)
        button.onclick = handleClickComponentTreeItem

        li.appendChild(button)
        elResults.appendChild(li)
      })
    }
  })
}

const initOpenSearchOverlay = () => {
  const el = document.querySelector(`#btn-open-search`)
  el?.addEventListener('click', () => {
    handleOpenSearchOverlay()
  })
}

const initOpenSettingsSidebar = () => {
  const el = document.querySelector(`#btn-open-settings`)
  el?.addEventListener('click', () => {
    handleOpenSettings()
  })
}

const initCloseSettingSidebar = () => {
  const el = document.querySelector(`#btn-settings-close`)
  el?.addEventListener('click', () => {
    handleCloseSettings()
  })
}

const initCloseComponentSidebar = () => {
  const el = document.querySelector(`#btn-component-close`)
  el?.addEventListener('click', () => {
    handleNodeUnTap()
  })
}
