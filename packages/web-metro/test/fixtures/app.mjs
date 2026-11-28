import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

// A React Native app folder with fakes of the toolchain packages that the helper looks up: the
// Metro config with its Babel transformer and its Metro runtime, and the Babel preset with
// React Refresh.
export const makeApp = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'web-metro-app-')))
  const modules = join(root, 'node_modules')
  const files = {
    '@react-native/metro-config/package.json': '{"name":"@react-native/metro-config"}',
    '@react-native/metro-babel-transformer/index.js':
      "exports.transform = () => 'react-native'\nexports.getCacheKey = () => 'react-native-key'\n",
    '@react-native/babel-preset/package.json': '{"name":"@react-native/babel-preset"}',
    'react-refresh/package.json': '{"name":"react-refresh","version":"0.14.2"}',
    'react-refresh/babel.js': 'module.exports = () => ({})\n',
    'react-refresh/runtime.js': 'exports.register = () => {}\n',
    'metro-runtime/src/modules/HMRClient.js': 'module.exports = class HMRClient {}\n',
  }
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(modules, path)), { recursive: true })
    writeFileSync(join(modules, path), text)
  }
  return {
    root,
    refreshBabel: join(modules, 'react-refresh', 'babel.js'),
    refreshRuntime: join(modules, 'react-refresh', 'runtime.js'),
    hmrClient: join(modules, 'metro-runtime', 'src', 'modules', 'HMRClient.js'),
  }
}
