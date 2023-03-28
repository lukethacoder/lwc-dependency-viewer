import fs from 'fs'
import path from 'path'
import { FileType } from '../types'

// TODO: move to config/cli options
const FOLDER_TO_SEARCH =
  'C:\\Users\\USER_NAME\\Github\\lwc-dependency-viewer\\sfdx-project\\force-app\\main\\default\\lwc'

const namespace = 'c'

interface FileMetadata {
  name: string
  path: string
  component: string
  content?: string
  references?: string[]
}

interface LwcAdvanced {
  id: string
  path: string
  extensions: FileType[]
  apexReferences?: { [key: string]: string[] }
  staticResourceReferences?: string[]
}

interface CytoscapeEdge {
  id: `${FileType}_${string}`
  source: string
  target: string
}

const camelToSnakeCase = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

// Function to check if an HTML component references another file
function hasHtmlComponent(content: string, target: string) {
  const htmlComponentName = `${namespace}-${camelToSnakeCase(target)}`
  const componentRegex = new RegExp(
    `<${htmlComponentName}\\b[^>]*[\\s\\S]*?\\/${htmlComponentName}>`,
    's'
  )
  return componentRegex.test(content)
}

function removeNewlines(str: string) {
  return str.replace(/(\r\n|\n|\r)/gm, '')
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
function hasJavaScriptImport(content: string, target: string) {
  const importName = `${namespace}/${target}`
  const importRegex = new RegExp(
    `\\bimport\\s*(?:{[^{}]*}|\\w+)\\s*from\\s*['"]${importName}['"]`
  )
  return importRegex.test(content)
}

// Function to check if a CSS component references another file
function hasCssComponent(content: string, target: string) {
  // check for CSS import
  const importRegex = new RegExp(`@import "${namespace}/${target}"`)
  const hasImportRef = importRegex.test(content)

  // check for reference in CSS (styling top level of component)
  const styleReference = new RegExp(`${namespace}-${camelToSnakeCase(target)}`)
  const haseStyleRef = styleReference.test(content)

  return hasImportRef || haseStyleRef
}

/**
 * Fetch apex references for content
 * @param content - JavaScript Content to check
 * @returns Array of apex import strings
 */
function getApexImports(content: string): { [key: string]: string[] } {
  const apexReferences: { [key: string]: string[] } = {}
  const regex = /import\s+(?:.+?\s+from\s+)?'@salesforce\/apex\/(\w+)\.(\w+)'/g

  let match
  while ((match = regex.exec(content))) {
    const [fullMatch, apexClass, apexMethod] = match
    if (!apexReferences[apexClass]) {
      apexReferences[apexClass] = []
    }
    apexReferences[apexClass].push(apexMethod)
  }

  return apexReferences
}

/**
 * Fetch apex references for content
 * @param content - JavaScript Content to check
 * @returns Array of static resource import strings
 */
function getStaticResourceImports(content: string): string[] {
  const references: string[] = []
  const regex =
    /import\s+(?:.+?\s+from\s+)?['"]@salesforce\/resourceUrl\/(\w+)['"]/g

  let match
  while ((match = regex.exec(content))) {
    const [fullMatch, staticResource] = match
    references.push(staticResource)
  }

  return references
}

const getIsFile = (fileName: string) => ({
  js: isJavaScriptFile(fileName),
  html: isHtmlFile(fileName),
  css: isCssFile(fileName),
  apex: false,
  staticResource: false,
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

      /**
       * only js files can reference apex or static resources
       * import apex_getUserData from '@salesforce/apex/CommunityUserController.getUserData'
       * import images from "@salesforce/resourceUrl/communityResources";
       */
      if (item.content && isCurrentFile.js) {
        const apexReferences = getApexImports(item.content)
        if (Object.keys(apexReferences).length > 0) {
          baseObject.apexReferences = apexReferences
        }

        const staticResourceReferences = getStaticResourceImports(item.content)
        if (staticResourceReferences.length > 0) {
          baseObject.staticResourceReferences = staticResourceReferences
        }
      }

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
          hasJavaScriptImport(parentFileContentRef, childComponentName)
        ) {
          references.push(createEdge('js', childComponentName, parentComponent))
        }
        if (
          isCurrentFile.html &&
          isChildFile.html &&
          hasHtmlComponent(parentFileContentRef, childComponentName)
        ) {
          references.push(
            createEdge('html', childComponentName, parentComponent)
          )
        }
        if (
          isCurrentFile.css &&
          isChildFile.css &&
          hasCssComponent(parentFileContentRef, childComponentName)
        ) {
          references.push(
            createEdge('css', childComponentName, parentComponent)
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
const allFiles = getAllFiles(FOLDER_TO_SEARCH)

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

fs.writeFileSync(`output.json`, JSON.stringify(outputData, undefined, 2))
