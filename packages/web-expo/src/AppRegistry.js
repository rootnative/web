import { createStyleRegistry, renderStyleTags, StyleRegistryProvider } from '@rootnative/web/server'
import { cloneElement, createElement } from 'react'
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
  // For a render on a server. The styles of this render go into a registry of its own, so two
  // requests never share CSS. Expo Router renders `element` first and then asks for the style
  // element, which it puts in `<head>`. The runtime has three style groups, so the "element" is
  // a fragment of three, and the browser adopts them by their `data-precedence` on hydration.
  // React writes a hoisted style with the nonce of the render, not of the element, so only the
  // key of `props` has a use. It goes on the fragment, because three children with the same key
  // are an error.
  getApplication(appKey, parameters) {
    const registry = createStyleRegistry()
    return {
      element: createElement(StyleRegistryProvider, { registry }, elementOf(appKey, parameters)),
      getStyleElement: (props) => {
        const tags = renderStyleTags(registry)
        return props?.key === undefined ? tags : cloneElement(tags, { key: props.key })
      },
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
