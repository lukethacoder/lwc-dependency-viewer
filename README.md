# lwc-dependency-viewer

Scan your LWC files to see the dependencies - displayed on to a cytoscape powered UI

## Getting Started

```bash
pnpm install

# before running, open the `scripts/walk-files.ts` script and replace the 
# FOLDER_TO_SEARCH` value with your project path.
# (until we hookup cli args)
pnpm walk


# run the dev server
pnpm dev

# this should open at http://localhost:5173/ 
```

> output.json here has been generated from the [lightning-base-components](https://www.npmjs.com/package/lightning-base-components) package as an example usage.


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