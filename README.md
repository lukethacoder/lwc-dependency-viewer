<p align="center">
  <a href="https://ldv.lukesecomb.digital" target="_blank" rel="noopener noreferrer">
    <img width="180" src="./public/favicon.svg" alt="LWC Dependency Viewer logo">
  </a>
</p>
<h1 align="center">LWC Dependency Viewer</h1>
<br/>

- 🖼️ Visual representation of your LWCs
- 🔎 Component Search
- 💡 Highlight linked components
- 🔩 Indicators for LWC file types (HTML/JS/CSS)
- 📦 See which LWC are referencing Apex/StaticResources
- 🔑 Run locally without needing to install anything into your org

## Getting Started

```bash
pnpm install

# before running, open the `scripts/walk-files.ts` script and replace the 
# FOLDER_TO_SEARCH` value with your project path.
#
# pending https://github.com/lukethacoder/lwc-dependency-viewer/issues/1
pnpm walk

# run the dev server
pnpm dev

# this should open at http://localhost:5173/ 
```

> Default `output.json` has been generated from the [trailheadapps/lwc-recipes](https://github.com/trailheadapps/lwc-recipes) repository as an example usage.

## Screenshots

Hover LWC to see its neighbours

[![](./docs/lwc-dependency-viewer-01.gif)](https://ldv.lukesecomb.digital)

Click an LWC to open up a file view and to see any related Apex Classes and/or StaticResource references

[![](./docs/lwc-dependency-viewer-02.gif)](https://ldv.lukesecomb.digital)

Open up the search (keyboard shortcut `/`) and easily search for the LWC you're looking for.

[![](./docs/lwc-dependency-viewer-03.gif)](https://ldv.lukesecomb.digital)

Hide orphan LWCs that exist on their own and don't relate to other LWCs

[![](./docs/lwc-dependency-viewer-04.gif)](https://ldv.lukesecomb.digital)


Adjust the `curve-style` to your liking

[![](./docs/lwc-dependency-viewer-05.gif)](https://ldv.lukesecomb.digital)


## Contribution

See [Contributing Guide](CONTRIBUTING.md).

## License

[MIT](LICENSE).
