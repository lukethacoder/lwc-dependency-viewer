import cytoscape from 'cytoscape'
import memoize from 'lodash.memoize'
import klay from 'cytoscape-klay'
import Fuse from 'fuse.js'

import data from './output.json'
import './style.css'

cytoscape.use(klay)

type FileType = 'js' | 'css' | 'html'

const EDGES_COLORS: { [key: FileType]: `#${string}` } = {
  js: '#f1e05a',
  css: '#563d7c',
  html: '#e34c26',
  apex: '#178600',
}

const DEFAULT_EDGE_OPACITY = 0.48

let hasActiveNode = false

const makeComponentSvg = memoize((node) => {
  const data = node.data()
  const { id, extensions } = data

  const width = 120
  const height = 20
  const lineWidth = 3

  const svg3 = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 120 20">
    <text transform="translate(${
      extensions.length * lineWidth + 4
    } 14.36)" style="font-family: system-ui, Avenir, Helvetica, Arial, sans-serif; font-size: 12px;fill: #abb2bf;">
      <tspan x="0" y="0">${id}</tspan>
    </text>
    ${extensions.map(
      (fileType, key) =>
        `<rect x="${
          key * lineWidth
        }" y="0" width="${lineWidth}" height="20" fill="${
          EDGES_COLORS[fileType]
        }"/>`
    )}
    <rect x="116" y="0" width="4" height="20" fill="${
      node.style()['background-color'] || '#303030'
    }"/>
  </svg>`

  return {
    svg: `data:image/svg+xml;base64,${btoa(svg3)}`,
    width,
    height,
  }
})

const getEdgeColorFromId = (id: string) => {
  const edgeType = id.split('_')[0]

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
        'background-image': (ele) => makeComponentSvg(ele).svg,
        width: (ele) => makeComponentSvg(ele).width,
        height: (ele) => makeComponentSvg(ele).height,
      },
    },
    {
      selector: 'edge',
      style: {
        'line-color': (edge) => getEdgeColorFromId(edge.id()),
        opacity: DEFAULT_EDGE_OPACITY,
        'transition-property': 'opacity',
        'curve-style': 'unbundled-bezier',
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

const handleClickComponentTreeItem = (e) => {
  const node = cy.filter(
    `#${e.currentTarget.dataset.id || e.target.dataset.id}`
  )

  if (!node) {
    console.warn(
      `Unable to find node with id ${
        e.currentTarget.dataset.id || e.target.dataset.id
      }`
    )
    return
  }

  handleNodeTap(node)
}

const handleNodeTap = (node) => {
  hasActiveNode = true

  console.log('node ', node)

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
    const targetNode = item
      .connectedNodes()
      .find((item) => item.id() !== node.id())?.[0]

    const nodeData = targetNode ? targetNode.data() : null

    return {
      edge: item.data(),
      node: nodeData,
    }
  })

  const references = edges.reduce(
    (acc, item) => {
      const { edge } = item
      if (edge.source === node.id()) {
        acc.referencedBy.push({
          component: edge.target,
          fileName: `${edge.target}.${edge.id.split('_')[0]}`,
        })
        console.log('is referenced by? ', edge.source, edge.target)
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
  console.log('nodeData ', nodeData)
  const extensions = nodeData.extensions || []

  const componentTitleEl: HTMLHeadingElement | null =
    document.querySelector(`#component h2`)
  if (componentTitleEl) {
    componentTitleEl.innerText = nodeData.id
    componentTitleEl.title = nodeData.id
  }

  const referencesEl = document.querySelector(`#component .references`)
  if (referencesEl) {
    // reset the references
    referencesEl.innerHTML = ''
    references.references.sort((a, b) => (a.fileName < b.fileName ? -1 : 1))

    if (references.references.length > 0) {
      references.references.forEach((ref) => {
        const li = document.createElement('li')
        const button = document.createElement('button')

        console.log('ref ', ref)
        button.innerText = ref.fileName
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
    // reset the references
    referencedByEl.innerHTML = ''
    references.referencedBy.sort((a, b) => (a.fileName < b.fileName ? -1 : 1))

    if (references.referencedBy.length > 0) {
      references.referencedBy.forEach((ref) => {
        const li = document.createElement('li')
        const button = document.createElement('button')

        button.innerText = ref.fileName
        button.dataset.type = ref.fileName.split('.').at(-1)
        button.dataset.id = ref.component
        button.onclick = handleClickComponentTreeItem

        li.appendChild(button)
        referencedByEl.appendChild(li)
      })
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

interface FuseItem {
  id: string
  extensions: string[]
}
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
  initOrphanModulesToggle()
})

const initKeyboardListener = () => {
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
      if (hasActiveNode) {
        handleNodeUnTap()
      }
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

const handleClickDialog = (e, dialog: HTMLDialogElement) => {
  console.log('click dialog? ')
  if (e.target === dialog) {
    dialog.close()
  }
}

const initSearchInput = () => {
  const elInput: HTMLInputElement | null =
    document.querySelector(`#input-search`)
  const elResults: HTMLUListElement | null =
    document.querySelector(`#search-results`)

  elInput?.addEventListener('input', (e) => {
    // toggle orphan node visibility
    const results = fuse?.search(e.target.value as string)
    console.log('search input ', e.target.value, results)

    if (elResults) {
      // reset the results
      elResults.innerHTML = ''

      results?.forEach((item) => {
        console.log('item.item ', item.item)
        const li = document.createElement('li')
        const button = document.createElement('button')
        button.innerText = item.item.id
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
