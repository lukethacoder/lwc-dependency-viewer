# lwc-dependency-viewer

Scan your LWC files to see the dependencies - displayed on to a cytoscape powered UI

## Getting Started

```bash
pnpm install

# (for now) copy your LWC folder into this repo and run
pnpm walk

# run the dev server
```

## TODO:

Functional
- [ ] setup as cli to run from an `lwc` based project
- [ ] read module paths from `lwc.config.json`
- [ ] add Apex Class dependencies
- [ ] add Static Resource dependencies

UI
- [ ] consider bringing in a framework (SolidJS/Astro)
- [ ] dependency type toggle
- [ ] hide orphan components
- [ ] filter by string
- [ ] style nodes
- [ ] style edges
- [ ] option to open in file explorer