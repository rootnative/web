// A Metro helper, so an Expo app can install this package under its own name, in place of the
// alias `"react-native-web": "npm:@rootnative/web-expo"`. On the web, it sends each name of
// react-native and react-native-web to the files of this package.

const { join } = require('node:path')

const FACADE = '@rootnative/web-expo'
const REGISTRY = `${FACADE}/asset-registry`

// Expo maps these names to react-native-web, and resolves the target without the
// `resolveRequest` of the app. So the helper must catch these names, not their target.
const EXACT = new Map([
  ['react-native', FACADE],
  ['react-native/index', FACADE],
  ['react-native/asset-registry', REGISTRY],
  ['react-native/Libraries/Image/AssetRegistry', REGISTRY],
  ['@react-native/assets-registry/registry', REGISTRY],
  ['react-native-web', FACADE],
])

const PREFIX = 'react-native-web/'

const targetOf = (moduleName) => {
  const exact = EXACT.get(moduleName.replace(/\.js$/, ''))
  if (exact !== undefined) return exact
  if (moduleName.startsWith(PREFIX)) return `${FACADE}/${moduleName.slice(PREFIX.length)}`
  return undefined
}

exports.withRootNative = (config) => {
  if (typeof config.projectRoot !== 'string') {
    throw new Error(
      'withRootNative needs the projectRoot of the Metro config. Pass it the config from getDefaultConfig of expo/metro-config.',
    )
  }
  // A library deep in node_modules can't always see this package. So the helper resolves it from
  // the app, as Expo does for react-native-web.
  const appOrigin = join(config.projectRoot, 'package.json')
  const upstream = config.resolver?.resolveRequest
  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest(context, moduleName, platform) {
        const next = upstream ?? context.resolveRequest
        const target = platform === 'web' ? targetOf(moduleName) : undefined
        if (target === undefined) return next(context, moduleName, platform)
        return next({ ...context, originModulePath: appOrigin }, target, platform)
      },
    },
  }
}
