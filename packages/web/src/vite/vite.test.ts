import { createServer, resolveConfig } from 'vite'
import type { Alias, InlineConfig, Plugin, ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

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

describe('rootnative() config', () => {
  test('aliases react-native, and only the exact name', async () => {
    const config = await resolveConfig(baseConfig({ plugins: [rootnative()] }), 'serve')
    expect(firstAlias(config.resolve.alias, 'react-native')?.replacement).toBe('@rootnative/web')
    expect(firstAlias(config.resolve.alias, 'react-native/Libraries/Image')).toBeUndefined()
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

  test('replaces Platform.OS after the TypeScript transform', () => {
    expect(code).not.toContain('Platform.OS')
    expect(code).toContain('"web"')
    expect(code).not.toContain(': string')
  })
})
