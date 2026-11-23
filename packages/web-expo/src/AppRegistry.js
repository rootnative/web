import { createElement } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

import { resetRules } from './createSheet.js'

const providers = new Map()

const elementOf = (appKey, parameters) => {
  const provider = providers.get(appKey)
  if (provider === undefined) {
    throw new Error(
      `Application "${appKey}" has not been registered. Call AppRegistry.registerComponent first.`,
    )
  }
  return createElement(provider(), parameters?.initialProps ?? {})
}

// The three methods that Expo calls on the web. `registerRootComponent` from `expo` registers
// the app and runs it, and the static export of Expo Router reads `getApplication`.
export const AppRegistry = {
  registerComponent(appKey, componentProvider) {
    providers.set(appKey, componentProvider)
    return appKey
  },
  // For a render on a server. Each component of the runtime renders its CSS as React 19
  // `<style href precedence>` elements, and Expo Router renders the whole document with React,
  // so React puts them in `<head>`. The browser adopts the three style groups by their
  // `data-precedence` on hydration.
  // The style element that Expo Router asks for is the reset sheet of `createSheet`. With it in
  // the server HTML, `body` has no margin before the script runs, and `createSheet` finds the
  // element in the browser. An insert there makes the browser restyle the whole document.
  getApplication(appKey, parameters) {
    return {
      element: elementOf(appKey, parameters),
      getStyleElement: (props) =>
        createElement('style', {
          ...props,
          id: 'react-native-stylesheet',
          dangerouslySetInnerHTML: { __html: resetRules.join('\n') },
        }),
    }
  },
  runApplication(appKey, parameters) {
    const { rootTag, hydrate } = parameters
    if (!rootTag) throw new Error(`"rootTag" was not provided for appKey "${appKey}".`)
    const element = elementOf(appKey, parameters)
    if (hydrate) return hydrateRoot(rootTag, element)
    const root = createRoot(rootTag)
    root.render(element)
    return root
  },
}
