// The dev client of Metro on the web: Fast Refresh, and the updates of the dev server. It runs in
// development only, before the app, because `withRootNative` puts it first. React Native's own
// dev client needs native modules. `withRootNative` resolves the two imports from the app, so they
// match its Babel plugin and its Metro.
import HMRClient from 'metro-runtime/src/modules/HMRClient'
import * as Refresh from 'react-refresh/runtime'

const PREFIX = '[@rootnative/web-metro]'

// Before React DOM loads, so that React Refresh sees each root.
Refresh.injectIntoGlobalHook(globalThis)

// Metro's require polyfill reads this object, as React Native's `setUpReactRefresh` sets it. The
// polyfill reloads the page itself when an edit can't refresh.
// oxlint-disable-next-line no-underscore-dangle -- the name of the global that Metro sets
globalThis[`${globalThis.__METRO_GLOBAL_PREFIX__ ?? ''}__ReactRefresh`] = {
  performFullRefresh: () => location.reload(),
  createSignatureFunctionForTransform: Refresh.createSignatureFunctionForTransform,
  isLikelyComponentType: Refresh.isLikelyComponentType,
  getFamilyByType: Refresh.getFamilyByType,
  register: Refresh.register,
  performReactRefresh: Refresh.performReactRefresh,
}

// The bundle of this page is the script that runs now.
const bundleURL = document.currentScript?.src

if (bundleURL) {
  const client = new HMRClient(
    `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/hot`,
  )
  client.on('error', (error) => {
    console.error(`${PREFIX} The dev server can't update the page: ${error.message ?? error.type}`)
  })
  client.on('connection-error', () => {
    console.warn(`${PREFIX} No connection to the dev server. An edit won't update the page.`)
  })
  client.on('close', () => {
    console.warn(`${PREFIX} The dev server closed the connection. Reload the page when it runs.`)
  })
  client.send(JSON.stringify({ type: 'register-entrypoints', entryPoints: [bundleURL] }))
  client.enable()
}
