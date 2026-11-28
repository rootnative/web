// The Metro helper of a React Native app with no Expo. On the web, it runs the app on
// `@rootnative/web`. On iOS and Android, it changes nothing.

const { readFileSync, realpathSync } = require('node:fs')
const { dirname, join } = require('node:path')

const FACADE = '@rootnative/web-metro'
const REGISTRY = `${FACADE}/asset-registry`

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

// The resolution of Expo on the web. React Native's defaults load the native source of a
// library: its `react-native` main field and export condition, and its `.native` files.
const webContext = (context) => ({
  ...context,
  preferNativePlatform: false,
  mainFields: ['browser', 'module', 'main'],
  unstable_conditionNames: (context.unstable_conditionNames ?? []).filter(
    (name) => name !== 'react-native',
  ),
})

// `react-native start` answers `/` with a page of its own, before this middleware runs. It also
// serves the files of the app folder, so an `index.html` of the app wins over this page.
const PAGE_PATH = '/index.html'

const escapeHTML = (text) => text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`)

const appTitle = (projectRoot) => {
  try {
    const app = JSON.parse(readFileSync(join(projectRoot, 'app.json'), 'utf8'))
    return String(app.displayName ?? app.name ?? 'React Native')
  } catch {
    return 'React Native'
  }
}

const pageHTML = (title) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHTML(title)}</title>
    <style>
      html, body, #root { height: 100%; margin: 0 }
      #root { display: flex; flex-direction: column }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="/index.bundle?platform=web&amp;dev=true&amp;minify=false"></script>
  </body>
</html>
`

const TRANSFORMER = require.resolve('./babel-transformer.cjs')

// Metro names a module by its real path.
const DEV_CLIENT = realpathSync(require.resolve('./dev-client.js'))

// The dev client takes two modules from the app's own toolchain: React Refresh from its Babel
// preset, whose plugin has the same version, and the HMR client from the Metro of its config.
const TOOLCHAIN = {
  'react-refresh/runtime': '@react-native/babel-preset',
  'metro-runtime/src/modules/HMRClient': '@react-native/metro-config',
}

const toolchainFile = (projectRoot, moduleName) => {
  const owner = require.resolve(`${TOOLCHAIN[moduleName]}/package.json`, { paths: [projectRoot] })
  return require.resolve(moduleName, { paths: [dirname(owner)] })
}

// Metro gives a Babel transformer no config, so the path of the app's own transformer goes to it
// in the environment. Metro starts its workers after it loads the config, and they inherit it.
const TRANSFORMER_ENV = 'ROOTNATIVE_WEB_METRO_BABEL_TRANSFORMER'

exports.withRootNative = (config) => {
  if (typeof config.projectRoot !== 'string') {
    throw new Error(
      'withRootNative needs the projectRoot of the Metro config. Pass it the config from getDefaultConfig of @react-native/metro-config.',
    )
  }
  // A library deep in node_modules can't always see this package. So the helper resolves it from
  // the app.
  const appOrigin = join(config.projectRoot, 'package.json')
  const upstream = config.resolver?.resolveRequest
  const platforms = config.resolver?.platforms ?? ['ios', 'android']
  const enhance = config.server?.enhanceMiddleware
  const runFirst = config.serializer?.getModulesRunBeforeMainModule
  const appTransformer = config.transformer?.babelTransformerPath
  // A second call must not make the transformer run itself.
  if (appTransformer !== undefined && appTransformer !== TRANSFORMER) {
    process.env[TRANSFORMER_ENV] = appTransformer
  }
  const html = pageHTML(appTitle(config.projectRoot))

  return {
    ...config,
    resolver: {
      ...config.resolver,
      platforms: platforms.includes('web') ? platforms : [...platforms, 'web'],
      resolveRequest(context, moduleName, platform) {
        const next = upstream ?? context.resolveRequest
        if (platform !== 'web') return next(context, moduleName, platform)
        if (context.originModulePath === DEV_CLIENT && Object.hasOwn(TOOLCHAIN, moduleName)) {
          return { type: 'sourceFile', filePath: toolchainFile(config.projectRoot, moduleName) }
        }
        const web = webContext(context)
        const target = targetOf(moduleName)
        if (target === undefined) return next(web, moduleName, platform)
        return next({ ...web, originModulePath: appOrigin }, target, platform)
      },
    },
    transformer: { ...config.transformer, babelTransformerPath: TRANSFORMER },
    serializer: {
      ...config.serializer,
      // Metro runs a module of this list before the app only when the graph has it. The dev client
      // is in the graph on the web, in development.
      getModulesRunBeforeMainModule(entryFilePath) {
        const first = runFirst?.(entryFilePath) ?? []
        return first.includes(DEV_CLIENT) ? first : [...first, DEV_CLIENT]
      },
    },
    server: {
      ...config.server,
      enhanceMiddleware(middleware, server) {
        const inner = enhance === undefined ? middleware : enhance(middleware, server)
        return (req, res, next) => {
          if (req.method === 'GET' && new URL(req.url, 'http://localhost').pathname === PAGE_PATH) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(html)
            return
          }
          return inner(req, res, next)
        }
      },
    },
  }
}
