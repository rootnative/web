// Expo's Metro config, with one opt-in. With `ROOTNATIVE_WEB_SOURCE=1`, Metro reads
// `@rootnative/web` from its TypeScript source in place of its built `dist/`, and compiles it in
// memory. So the dev server runs on the current code of the runtime, with no build. CI leaves it
// off: `check:expo` exports the app on the built package, as an app installs it.

const { existsSync } = require('node:fs')
const { join } = require('node:path')

const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

if (process.env.ROOTNATIVE_WEB_SOURCE === '1') {
  const webDir = join(__dirname, '..', 'web')
  const { exports } = require('../web/package.json')
  const name = '@rootnative/web'

  // `./dist/apis/Animated/index.js` is `src/apis/Animated/index.ts`, or `.tsx` for a component.
  const sourceOf = (target) => {
    const base = join(webDir, 'src', target.replace(/^\.\/dist\//, '').replace(/\.js$/, ''))
    return [`${base}.ts`, `${base}.tsx`].find((file) => existsSync(file))
  }

  // The file of an import of the runtime, from the `exports` of its package.json.
  const resolveSource = (moduleName) => {
    if (moduleName !== name && !moduleName.startsWith(`${name}/`)) return undefined
    const subpath = `.${moduleName.slice(name.length)}`
    if (Object.hasOwn(exports, subpath)) return sourceOf(exports[subpath])
    const internal = /^\.\/internal\/(.+)\.js$/.exec(subpath)
    return internal === null ? undefined : sourceOf(`./dist/${internal[1]}.js`)
  }

  const upstream = config.resolver.resolveRequest
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const filePath = resolveSource(moduleName)
    if (filePath !== undefined) return { type: 'sourceFile', filePath }
    return (upstream ?? context.resolveRequest)(context, moduleName, platform)
  }
}

module.exports = config
