import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const require = createRequire(import.meta.url)
const transformer = require('../babel-transformer.cjs')
const UPSTREAM = require.resolve('./fixtures/upstream-transformer.cjs')
const REWRITE = require.resolve('babel-plugin-react-native-web')

const args = (platform) => ({
  filename: '/app/App.tsx',
  src: "import { View } from 'react-native'",
  options: { platform, projectRoot: '/app', dev: true },
  plugins: ['metro-plugin'],
})

beforeEach(() => {
  vi.stubEnv('ROOTNATIVE_WEB_METRO_BABEL_TRANSFORMER', UPSTREAM)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the Babel transformer', () => {
  test('on the web, runs the app transformer with the import rewrite as the last plugin', () => {
    const result = transformer.transform(args('web'))
    expect(result.from).toBe('upstream')
    expect(result.args.plugins).toEqual(['metro-plugin', REWRITE])
    expect(result.args.src).toBe(args('web').src)
  })

  test.each(['ios', 'android'])('on %s, runs the app transformer unchanged', (platform) => {
    const result = transformer.transform(args(platform))
    expect(result.args).toEqual(args(platform))
  })

  test('has a cache key from the app transformer and the plugin version', () => {
    const key = transformer.getCacheKey({ projectRoot: '/app' })
    expect(key).toContain(UPSTREAM)
    expect(key).toContain('upstream-key')
    expect(key).toMatch(/babel-plugin-react-native-web@\d+\.\d+\.\d+/)
  })

  test("with no path in the env, finds React Native's transformer through the app", () => {
    delete process.env.ROOTNATIVE_WEB_METRO_BABEL_TRANSFORMER
    const app = mkdtempSync(join(tmpdir(), 'web-metro-app-'))
    const scope = join(app, 'node_modules', '@react-native')
    mkdirSync(join(scope, 'metro-config'), { recursive: true })
    writeFileSync(
      join(scope, 'metro-config', 'package.json'),
      '{"name":"@react-native/metro-config"}',
    )
    mkdirSync(join(scope, 'metro-babel-transformer'))
    writeFileSync(
      join(scope, 'metro-babel-transformer', 'index.js'),
      "exports.transform = () => 'react-native'\nexports.getCacheKey = () => 'react-native-key'\n",
    )
    expect(transformer.getCacheKey({ projectRoot: app })).toContain('react-native-key')
    expect(
      transformer.transform({ ...args('web'), options: { platform: 'web', projectRoot: app } }),
    ).toBe('react-native')
  })
})
