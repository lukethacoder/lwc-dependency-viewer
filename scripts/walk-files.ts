import * as fs from 'fs'
import * as path from 'path'

// TODO: move to config/cli options
const folderToSearch = './modules'
const namespace = 'c'

interface FileMetadata {
  name: string
  path: string
  component: string
  content?: string
  references?: string[]
}

interface LwcAdvancedFile {
  name: string
  path: string
  references: CytoscapeEdge[]
}

interface LwcAdvanced {
  id: string
  path: string
  extensions: FileType[]
}

type FileType = 'js' | 'html' | 'css'

interface CytoscapeEdge {
  id: `${FileType}_${string}`
  source: string
  target: string
}

// Function to check if a file is a JavaScript file
function isJavaScriptFile(file: string) {
  return path.extname(file) === '.js'
}

// Function to check if a file is an HTML file
function isHtmlFile(file: string) {
  return path.extname(file) === '.html'
}

// Function to check if a file is a CSS file
function isCssFile(file: string) {
  return path.extname(file) === '.css'
}

// Function to check if a file imports another file
function hasImport(content: string, target: string) {
  const importName = `${namespace}/${target}`
  const importRegex = new RegExp(
    `\\bimport\\s*(?:{[^{}]*}|\\w+)\\s*from\\s*['"]${importName}['"]`
  )
  return importRegex.test(content)
}

const camelToSnakeCase = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

// Function to check if an HTML component references another file
function hasHtmlComponent(content: string, target: string) {
  const htmlComponentName = `${namespace}-${camelToSnakeCase(target)}`
  // TODO: fix for non-single lined HTML references
  const componentRegex = new RegExp(
    `<${htmlComponentName}\\b[^>]*[\\s\\S]*?\\/${htmlComponentName}>`
  )
  return componentRegex.test(content)
}

function removeNewlines(str: string) {
  return str.replace(/(\r\n|\n|\r)/gm, '')
}

// Function to check if a CSS component references another file
function hasCssComponent(content: string, target: string) {
  const componentRegex = new RegExp(`@import "${namespace}/${target}"`)
  return componentRegex.test(content)
}

const getIsFile = (fileName: string) => ({
  js: isJavaScriptFile(fileName),
  html: isHtmlFile(fileName),
  css: isCssFile(fileName),
})

const createEdge = (
  type: FileType,
  source: string,
  target: string
): CytoscapeEdge => ({
  id: `${type}_${source}_${target}`,
  source: source,
  target: target,
})

// Function to search for imports/references in all files
function searchForReferences(
  files: FileMetadata[]
): [LwcAdvanced[], CytoscapeEdge[]] {
  // Create an object to hold the references for each file
  // const references: { [key: string]: string[] } = {}
  const filesConst = files

  const references: CytoscapeEdge[] = []

  const dataByLwcComponentName = files.reduce<{ [key: string]: LwcAdvanced }>(
    (acc, item) => {
      const { component, path: componentPath } = item

      const componentExists = Object.hasOwn(acc, component)
      let baseObject: LwcAdvanced = componentExists
        ? (acc[component] as LwcAdvanced)
        : {
            id: component,
            path: componentPath.split('.')[0],
            extensions: [],
          }

      const isCurrentFile = getIsFile(item.name)
      const parentFileRef = item.name
      const parentComponent = item.component
      const parentFileContentRef = item.content || ''

      baseObject.extensions = [
        ...baseObject.extensions,
        ...Object.keys(isCurrentFile)
          .filter((ext) => isCurrentFile[ext as FileType])
          .map((item) => item as FileType),
      ]

      // Loop through all files in the list
      for (const file of filesConst) {
        // Skip the current file
        if (parentFileRef === file.name) {
          continue
        }

        const childComponentName = file.component
        const isChildFile = getIsFile(file.name)

        // files can only reference their own file types
        if (
          isCurrentFile.js &&
          isChildFile.js &&
          hasImport(parentFileContentRef, childComponentName)
        ) {
          references.push(createEdge('js', parentComponent, childComponentName))
        } else if (
          isCurrentFile.html &&
          isChildFile.html &&
          hasHtmlComponent(parentFileContentRef, childComponentName)
        ) {
          references.push(
            createEdge('css', parentComponent, childComponentName)
          )
        } else if (
          isCurrentFile.css &&
          isChildFile.css &&
          hasCssComponent(parentFileContentRef, childComponentName)
        ) {
          references.push(
            createEdge('html', parentComponent, childComponentName)
          )
        }
      }

      acc[component] = baseObject

      return acc
    },
    {}
  )

  return [Object.values(dataByLwcComponentName), references]
}

// Function to get all files in a folder (including subfolders)
function getAllFiles(folder: string) {
  const files: string[] = []

  function walkDirectory(currentPath: string) {
    const filesInFolder = fs.readdirSync(currentPath)

    for (const file of filesInFolder) {
      const fullPath = path.join(currentPath, file)

      if (fs.statSync(fullPath).isDirectory()) {
        walkDirectory(fullPath)
      } else {
        files.push(fullPath)
      }
    }
  }

  walkDirectory(folder)

  return files
}

// Get all files in the folder
const allFiles = getAllFiles(folderToSearch)

// Filter the list to only include JavaScript, HTML, and CSS files
const filteredFiles: FileMetadata[] = allFiles
  .filter((file) => {
    return isJavaScriptFile(file) || isHtmlFile(file) || isCssFile(file)
  })
  .map((filePath) => {
    const name = filePath.split('\\').at(-1) || 'invalidComponent'
    return {
      name,
      path: filePath,
      component: name?.split('.')[0],
      content: removeNewlines(fs.readFileSync(filePath, 'utf-8') || ''),
    }
  })

// Search for references in all files
const outputData = searchForReferences(filteredFiles)
  .flat()
  .map((item) => ({ data: item }))

fs.writeFileSync(`output-v2.json`, JSON.stringify(outputData, undefined, 2))
