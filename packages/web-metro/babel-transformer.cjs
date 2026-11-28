// The Babel transformer that `withRootNative` gives Metro. It runs the app's own transformer. On
// the web, it adds two plugins:
// - The plugin of Expo's Babel preset: a named import of `react-native` becomes an import of one
//   file of react-native-web, which `withRootNative` sends to this package. Metro has no tree
//   shaking, so without the plugin each import loads all of `@rootnative/web`.
// - React Refresh, in development, for Fast Refresh.

const { dirname } = require('node:path')

const TRANSFORMER_ENV = 'ROOTNATIVE_WEB_METRO_BABEL_TRANSFORMER'
const REWRITE = require.resolve('babel-plugin-react-native-web')
const REWRITE_VERSION = require('babel-plugin-react-native-web/package.json').version

// With no path from `withRootNative`, React Native's transformer, found as React Native finds it:
// through the app's `@react-native/metro-config`.
const defaultPath = (projectRoot) => {
  const metroConfig = require.resolve('@react-native/metro-config/package.json', {
    paths: [projectRoot],
  })
  return require.resolve('@react-native/metro-babel-transformer', {
    paths: [dirname(metroConfig)],
  })
}

const upstreamPath = (projectRoot) => process.env[TRANSFORMER_ENV] ?? defaultPath(projectRoot)

// A transformer that an ES module build compiled to CommonJS has its functions on `default`.
const upstreamOf = (projectRoot) => {
  const mod = require(upstreamPath(projectRoot))
  return typeof mod.transform === 'function' ? mod : mod.default
}

// The React Refresh plugin of the app's Babel preset. The dev client takes the runtime of the same
// version.
const refreshPlugin = (projectRoot) => {
  const preset = require.resolve('@react-native/babel-preset/package.json', {
    paths: [projectRoot],
  })
  return require.resolve('react-refresh/babel', { paths: [dirname(preset)] })
}

const refreshVersion = (projectRoot) => {
  try {
    return require(`${dirname(refreshPlugin(projectRoot))}/package.json`).version
  } catch {
    return 'none'
  }
}

// React Native's transformer adds React Refresh when Metro sets `hot`, which Metro 0.87 doesn't
// do. So this transformer adds it, as React Native does: to the files outside node_modules.
// `skipEnvCheck`, because Metro's `dev` decides, not `NODE_ENV`.
const needsRefresh = ({ filename, options }) =>
  options.dev === true && options.hot !== true && !filename.includes('node_modules')

exports.transform = (args) => {
  const upstream = upstreamOf(args.options.projectRoot)
  if (args.options.platform !== 'web') return upstream.transform(args)
  const plugins = [...(args.plugins ?? []), REWRITE]
  if (needsRefresh(args)) {
    plugins.push([refreshPlugin(args.options.projectRoot), { skipEnvCheck: true }])
  }
  return upstream.transform({ ...args, plugins })
}

// Metro hashes this file, but not the app's transformer or the plugins.
exports.getCacheKey = (options) => {
  const upstream = upstreamOf(options.projectRoot)
  return [
    upstreamPath(options.projectRoot),
    upstream.getCacheKey?.(options) ?? '',
    `babel-plugin-react-native-web@${REWRITE_VERSION}`,
    `react-refresh@${refreshVersion(options.projectRoot)}`,
  ].join('$')
}
