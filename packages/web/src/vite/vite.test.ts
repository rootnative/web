import { createServer, resolveConfig } from 'vite'
import type { Alias, InlineConfig, Plugin, ViteDevServer } from 'vite'
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

import { rootnative } from './index'

const path = (relative: string): string =>
  decodeURIComponent(new URL(relative, import.meta.url).pathname)

const root = path('./__fixtures__/')

const baseConfig = (config: InlineConfig = {}): InlineConfig => ({
  configFile: false,
  root,
  logLevel: 'silent',
  cacheDir: path('../../node_modules/.vite/vite-plugin-test'),
  ...config,
})

const firstAlias = (aliases: readonly Alias[], id: string): Alias | undefined =>
  aliases.find(({ find }) => (typeof find === 'string' ? find === id : find.test(id)))

const devDefines = async (
  config: InlineConfig,
  command: 'build' | 'serve',
): Promise<{ app: unknown; deps: unknown }> => {
  const resolved = await resolveConfig(baseConfig({ plugins: [rootnative()], ...config }), command)
  return {
    app: resolved.define?.['__DEV__'],
    deps: resolved.optimizeDeps.rolldownOptions?.transform?.define?.['__DEV__'],
  }
}

describe('rootnative() config', () => {
  test('aliases react-native, and only the exact name', async () => {
    const config = await resolveConfig(baseConfig({ plugins: [rootnative()] }), 'serve')
    expect(firstAlias(config.resolve.alias, 'react-native')?.replacement).toBe('@rootnative/web')
    expect(firstAlias(config.resolve.alias, 'react-native/Libraries/Image')).toBeUndefined()
    expect(
      firstAlias(config.resolve.alias, '@react-native/assets-registry/registry')?.replacement,
    ).toBe('@rootnative/web/assets-registry')
  })

  test("lets the app's own react-native alias win", async () => {
    const config = await resolveConfig(
      baseConfig({
        plugins: [rootnative()],
        resolve: { alias: { 'react-native': '/src/my-react-native.ts' } },
      }),
      'serve',
    )
    expect(firstAlias(config.resolve.alias, 'react-native')?.replacement).toBe(
      '/src/my-react-native.ts',
    )
  })

  test('puts the .web extensions before the Vite defaults', async () => {
    const config = await resolveConfig(baseConfig({ plugins: [rootnative()] }), 'build')
    expect(config.resolve.extensions).toEqual([
      '.web.mjs',
      '.web.js',
      '.web.mts',
      '.web.ts',
      '.web.jsx',
      '.web.tsx',
      '.web.json',
      '.mjs',
      '.js',
      '.mts',
      '.ts',
      '.jsx',
      '.tsx',
      '.json',
    ])
  })

  test("starts from the app's own extensions", async () => {
    const config = await resolveConfig(
      baseConfig({ plugins: [rootnative()], resolve: { extensions: ['.ts', '.js'] } }),
      'serve',
    )
    expect(config.resolve.extensions).toEqual(['.web.ts', '.web.js', '.ts', '.js'])
  })

  test('gives the dependency optimizer the same extensions', async () => {
    const config = await resolveConfig(
      baseConfig({ plugins: [rootnative()], resolve: { extensions: ['.ts', '.js'] } }),
      'serve',
    )
    expect(config.optimizeDeps.rolldownOptions?.resolve?.extensions).toEqual([
      '.web.ts',
      '.web.js',
      '.ts',
      '.js',
    ])
  })

  test("keeps the app's own optimizer extensions", async () => {
    const config = await resolveConfig(
      baseConfig({
        plugins: [rootnative()],
        optimizeDeps: { rolldownOptions: { resolve: { extensions: ['.js'] } } },
      }),
      'serve',
    )
    expect(config.optimizeDeps.rolldownOptions?.resolve?.extensions).toEqual(['.js'])
  })
})

describe('rootnative() __DEV__', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('is true in development, for the app and the pre-bundled dependencies', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(await devDefines({}, 'serve')).toEqual({ app: 'true', deps: 'true' })
  })

  test('is false in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(await devDefines({}, 'build')).toEqual({ app: 'false', deps: 'false' })
  })

  test("keeps the app's own value", async () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(await devDefines({ define: { __DEV__: false } }, 'serve')).toEqual({
      app: 'false',
      deps: 'false',
    })
  })
})

describe('rootnative() in the dev server', () => {
  // Stands in for the installed package, so the test doesn't depend on a build of it.
  const packageStub: Plugin = {
    name: 'package-stub',
    enforce: 'pre',
    resolveId: (id) => (id === '@rootnative/web' ? '\0@rootnative/web' : null),
  }

  let server: ViteDevServer
  let code = ''

  beforeAll(async () => {
    server = await createServer(
      baseConfig({
        appType: 'custom',
        plugins: [packageStub, rootnative()],
        optimizeDeps: { noDiscovery: true },
        server: { middlewareMode: true, ws: false, watch: null, preTransformRequests: false },
      }),
    )
    code = (await server.transformRequest('/app.ts'))?.code ?? ''
  })

  afterAll(async () => {
    await server.close()
  })

  test('resolves react-native to @rootnative/web', () => {
    expect(code).toContain('__x00__@rootnative/web')
    expect(code).not.toContain("'react-native'")
  })

  test('resolves the .web file first', () => {
    expect(code).toContain('/label.web.ts')
  })

  test('sets the __DEV__ global on the client', async () => {
    const env = (await server.transformRequest('/@vite/env'))?.code ?? ''
    expect(env).toMatch(/"__DEV__": true/)
  })

  test('replaces Platform.OS after the TypeScript transform', () => {
    expect(code).not.toContain('Platform.OS')
    expect(code).toContain('"web"')
    expect(code).not.toContain(': string')
  })
})
