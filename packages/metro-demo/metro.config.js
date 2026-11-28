// React Native's Metro config, with `withRootNative`. On the web, it runs the app on
// `@rootnative/web`.

const { join } = require('node:path')

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { withRootNative } = require('@rootnative/web-metro/metro.cjs')

module.exports = withRootNative(
  mergeConfig(getDefaultConfig(__dirname), {
    // pnpm links the workspace packages from the workspace root.
    watchFolders: [join(__dirname, '..', '..')],
    // React Native's Babel preset adds imports of `@babel/runtime` to each file, also to the files
    // of a workspace package, which doesn't list it. So Metro also looks in the app, as Expo's
    // config does in a monorepo.
    resolver: { nodeModulesPaths: [join(__dirname, 'node_modules')] },
  }),
)
