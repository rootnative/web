// Expo's `AppRegistry` for the web calls `createSheet(rootTag)` from
// `react-native-web/dist/exports/StyleSheet/dom` before the first render. In react-native-web, that
// sheet starts with a small reset of the document, and Expo's default `index.html` relies on it:
// without it, `body` keeps the 8 px margin of the browser, and the page scrolls. These are the
// same rules, in a sheet with the same id.
export const resetRules = [
  'html{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:rgba(0,0,0,0);}',
  'body{margin:0;}',
  'button::-moz-focus-inner,input::-moz-focus-inner{border:0;padding:0;}',
  'input::-webkit-search-cancel-button,input::-webkit-search-decoration,input::-webkit-search-results-button,input::-webkit-search-results-decoration{display:none;}',
]

export function createSheet(root, id = 'react-native-stylesheet') {
  if (typeof document === 'undefined') {
    const rules = [...resetRules]
    return {
      id,
      getTextContent: () => rules.join('\n'),
      insert: (cssText) => void rules.push(cssText),
    }
  }
  // The root can be in a shadow root, which has style sheets of its own.
  const rootNode = root?.getRootNode?.()
  const scope = typeof rootNode?.getElementById === 'function' ? rootNode : document
  let element = scope.getElementById(id)
  if (element === null) {
    element = document.createElement('style')
    element.id = id
    element.textContent = resetRules.join('\n')
    // First in its parent, so each style sheet after it wins over the reset.
    const parent = scope === document ? (document.head ?? document.documentElement) : scope
    parent.insertBefore(element, parent.firstChild)
  }
  const sheet = element
  return {
    id,
    getTextContent: () => sheet.textContent,
    insert: (cssText) => sheet.append(`\n${cssText}`),
  }
}
