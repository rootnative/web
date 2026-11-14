import { createElement } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

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
  getApplication(appKey, parameters) {
    return {
      element: elementOf(appKey, parameters),
      getStyleElement: (props) => createElement('style', props),
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
