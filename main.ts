import cytoscape from 'cytoscape'
import data from './test-input.json'
import './style.css'

const EDGES_COLORS = {
  js: '#f1e05a',
  css: '#563d7c',
  html: '#e34c26',
}

const cy = cytoscape({
  container: document.getElementById('cy'), // container to render in
  elements: data,
  layout: {
    name: 'breadthfirst',
    grid: true,
  },
  style: [
    {
      selector: 'edge',
      style: {
        'line-color': (edge) => {
          const edgeType = edge.data('id').split('_')[0]

          if (Object.hasOwn(EDGES_COLORS, edgeType)) {
            return EDGES_COLORS[edgeType]
          }

          return 'grey'
        },
      },
    },
  ],
})
