import { mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, test, vi } from 'vitest'

import { makeApp } from './fixtures/app.mjs'

const require = createRequire(import.meta.url)
const { withRootNative } = require('../metro.cjs')
const TRANSFORMER = require.resolve('../babel-transformer.cjs')
const TRANSFORMER_ENV = 'ROOTNATIVE_WEB_METRO_BABEL_TRANSFORMER'
const DEV_CLIENT = realpathSync(require.resolve('../dev-client.js'))

const projectRoot = '/app'
const appOrigin = join(projectRoot, 'package.json')
const libraryOrigin = '/app/node_modules/some-library/index.js'
const FACADE = '@rootnative/web-metro'
const REGISTRY = '@rootnative/web-metro/asset-registry'

// The context of React Native's defaults, as Metro gives it to a resolver.
const nativeContext = (next) => ({
  originModulePath: libraryOrigin,
  resolveRequest: next,
  preferNativePlatform: true,
  mainFields: ['react-native', 'browser', 'main'],
  unstable_conditionNames: ['react-native'],
})

// Resolves one name through the helper, and returns what reaches the next resolver.
const resolve = (moduleName, platform = 'web', resolveRequest = undefined) => {
  const next = vi.fn(() => ({ type: 'empty' }))
  const config = withRootNative({ projectRoot, resolver: { resolveRequest } })
  const result = config.resolver.resolveRequest(nativeContext(next), moduleName, platform)
  const [context, name, nextPlatform] = (resolveRequest ?? next).mock.calls[0]
  return { result, context, name, platform: nextPlatform }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('withRootNative on the web', () => {
  test.each([
    ['react-native', FACADE],
    ['react-native/index.js', FACADE],
    ['react-native/asset-registry', REGISTRY],
    ['react-native/Libraries/Image/AssetRegistry', REGISTRY],
    ['@react-native/assets-registry/registry', REGISTRY],
    ['react-native-web', FACADE],
    ['react-native-web/dist/index', `${FACADE}/dist/index`],
    ['react-native-web/dist/exports/View', `${FACADE}/dist/exports/View`],
    [
      'react-native-web/dist/cjs/exports/StyleSheet/preprocess',
      `${FACADE}/dist/cjs/exports/StyleSheet/preprocess`,
    ],
  ])('sends %s to %s, resolved from the app', (moduleName, target) => {
    const { name, context, platform } = resolve(moduleName)
    expect(name).toBe(target)
    expect(context.originModulePath).toBe(appOrigin)
    expect(platform).toBe('web')
  })

  test.each(['react', 'react-native-svg', '@rootnative/web'])(
    'passes %s through unchanged',
    (moduleName) => {
      const { name, context } = resolve(moduleName)
      expect(name).toBe(moduleName)
      expect(context.originModulePath).toBe(libraryOrigin)
    },
  )

  test.each(['react-native', 'react'])(
    'resolves %s like Expo: the browser build, no .native file, no react-native condition',
    (moduleName) => {
      const { context } = resolve(moduleName)
      expect(context.preferNativePlatform).toBe(false)
      expect(context.mainFields).toEqual(['browser', 'module', 'main'])
      expect(context.unstable_conditionNames).toEqual([])
    },
  )
})

describe('withRootNative on other platforms', () => {
  test.each(['ios', 'android', null])('changes nothing on %s', (platform) => {
    const { name, context } = resolve('react-native', platform)
    expect(name).toBe('react-native')
    expect(context.originModulePath).toBe(libraryOrigin)
    expect(context.preferNativePlatform).toBe(true)
    expect(context.mainFields).toEqual(['react-native', 'browser', 'main'])
  })
})

describe('withRootNative and the config', () => {
  test('adds web to the platforms once', () => {
    const config = withRootNative({ projectRoot, resolver: { platforms: ['ios', 'android'] } })
    expect(config.resolver.platforms).toEqual(['ios', 'android', 'web'])
    expect(withRootNative(config).resolver.platforms).toEqual(['ios', 'android', 'web'])
    expect(withRootNative({ projectRoot }).resolver.platforms).toEqual(['ios', 'android', 'web'])
  })

  test('calls the resolveRequest that the config already has, and returns its result', () => {
    const upstream = vi.fn(() => ({ type: 'sourceFile', filePath: '/facade/index.js' }))
    const { result, name } = resolve('react-native', 'web', upstream)
    expect(upstream).toHaveBeenCalledOnce()
    expect(name).toBe(FACADE)
    expect(result).toEqual({ type: 'sourceFile', filePath: '/facade/index.js' })
  })

  test('puts its Babel transformer in place of the app transformer, which goes to the env', () => {
    vi.stubEnv(TRANSFORMER_ENV, undefined)
    const config = withRootNative({
      projectRoot,
      transformer: { babelTransformerPath: '/app/svg-transformer.js', minifierPath: 'm' },
    })
    expect(config.transformer).toEqual({ babelTransformerPath: TRANSFORMER, minifierPath: 'm' })
    expect(process.env[TRANSFORMER_ENV]).toBe('/app/svg-transformer.js')
    withRootNative(config)
    expect(process.env[TRANSFORMER_ENV]).toBe('/app/svg-transformer.js')
  })

  test('keeps the other fields of the config', () => {
    const config = withRootNative({
      projectRoot,
      watchFolders: ['/workspace'],
      resolver: { sourceExts: ['ts', 'js'] },
      server: { port: 8082 },
    })
    expect(config.watchFolders).toEqual(['/workspace'])
    expect(config.resolver.sourceExts).toEqual(['ts', 'js'])
    expect(config.server.port).toBe(8082)
  })

  test('throws a clear error without projectRoot', () => {
    expect(() => withRootNative({ resolver: {} })).toThrow(/projectRoot/)
  })
})

// Sends one request through the middleware, and returns the response or the call it passed on.
const request = (config, method, url) => {
  const inner = vi.fn()
  const middleware = config.server.enhanceMiddleware(inner, {})
  const res = { headers: {}, setHeader: vi.fn((k, v) => (res.headers[k] = v)), end: vi.fn() }
  middleware({ method, url }, res, () => {})
  return { inner, res }
}

describe('the page on the dev server', () => {
  test('serves an HTML page at /index.html that loads the web bundle of the index entry', () => {
    const { inner, res } = request(withRootNative({ projectRoot }), 'GET', '/index.html?x=1')
    expect(inner).not.toHaveBeenCalled()
    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8')
    const html = res.end.mock.calls[0][0]
    expect(html).toContain('<div id="root"></div>')
    expect(html).toContain(
      '<script src="/index.bundle?platform=web&amp;dev=true&amp;minify=false"></script>',
    )
    expect(html).toContain('<title>React Native</title>')
  })

  test('takes the title from app.json', () => {
    const root = mkdtempSync(join(tmpdir(), 'web-metro-'))
    writeFileSync(join(root, 'app.json'), JSON.stringify({ name: 'shop', displayName: 'A & B' }))
    const { res } = request(withRootNative({ projectRoot: root }), 'GET', '/index.html')
    expect(res.end.mock.calls[0][0]).toContain('<title>A &amp; B</title>')
  })

  test.each([
    ['GET', '/'],
    ['GET', '/index.bundle?platform=web'],
    ['POST', '/index.html'],
  ])('passes %s %s on to Metro', (method, url) => {
    const { inner, res } = request(withRootNative({ projectRoot }), method, url)
    expect(inner).toHaveBeenCalledOnce()
    expect(res.end).not.toHaveBeenCalled()
  })

  test('runs the enhanceMiddleware that the config already has', () => {
    const own = vi.fn()
    const enhanceMiddleware = vi.fn(() => own)
    const config = withRootNative({ projectRoot, server: { enhanceMiddleware } })
    const metro = vi.fn()
    const middleware = config.server.enhanceMiddleware(metro, { server: true })
    expect(enhanceMiddleware).toHaveBeenCalledWith(metro, { server: true })
    middleware({ method: 'GET', url: '/status' }, {}, () => {})
    expect(own).toHaveBeenCalledOnce()
  })
})

describe('the dev client', () => {
  test('runs before the app, after the run-first modules of the config, once', () => {
    const config = withRootNative({
      projectRoot,
      serializer: { getModulesRunBeforeMainModule: (entry) => [`/rn/setup-env:${entry}`] },
    })
    const first = config.serializer.getModulesRunBeforeMainModule('index.web.js')
    expect(first).toEqual(['/rn/setup-env:index.web.js', DEV_CLIENT])
    expect(withRootNative(config).serializer.getModulesRunBeforeMainModule('index.js')).toEqual([
      '/rn/setup-env:index.js',
      DEV_CLIENT,
    ])
    expect(withRootNative({ projectRoot }).serializer.getModulesRunBeforeMainModule('x')).toEqual([
      DEV_CLIENT,
    ])
  })

  test("takes React Refresh and the HMR client from the app's toolchain", () => {
    const app = makeApp()
    const next = vi.fn()
    const config = withRootNative({ projectRoot: app.root })
    const fromClient = (moduleName) =>
      config.resolver.resolveRequest(
        { ...nativeContext(next), originModulePath: DEV_CLIENT },
        moduleName,
        'web',
      )
    expect(fromClient('react-refresh/runtime')).toEqual({
      type: 'sourceFile',
      filePath: app.refreshRuntime,
    })
    expect(fromClient('metro-runtime/src/modules/HMRClient')).toEqual({
      type: 'sourceFile',
      filePath: app.hmrClient,
    })
    expect(next).not.toHaveBeenCalled()
  })

  test('leaves the same names from another module to Metro', () => {
    const { name, context } = resolve('react-refresh/runtime')
    expect(name).toBe('react-refresh/runtime')
    expect(context.originModulePath).toBe(libraryOrigin)
  })
})
