import { createRequire } from 'node:module'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { makeApp } from './fixtures/app.mjs'

const require = createRequire(import.meta.url)
const transformer = require('../babel-transformer.cjs')
const UPSTREAM = require.resolve('./fixtures/upstream-transformer.cjs')
const REWRITE = require.resolve('babel-plugin-react-native-web')

const app = makeApp()

const args = (platform, { filename = 'App.tsx', dev = true, hot } = {}) => ({
  filename,
  src: "import { View } from 'react-native'",
  options: { platform, projectRoot: app.root, dev, ...(hot === undefined ? {} : { hot }) },
  plugins: ['metro-plugin'],
})

beforeEach(() => {
  vi.stubEnv('ROOTNATIVE_WEB_METRO_BABEL_TRANSFORMER', UPSTREAM)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the Babel transformer on the web', () => {
  test('runs the app transformer with the import rewrite and React Refresh', () => {
    const result = transformer.transform(args('web'))
    expect(result.from).toBe('upstream')
    expect(result.args.plugins).toEqual([
      'metro-plugin',
      REWRITE,
      [app.refreshBabel, { skipEnvCheck: true }],
    ])
    expect(result.args.src).toBe(args('web').src)
  })

  test.each([
    ['a file in node_modules', { filename: 'node_modules/some-library/index.js' }],
    ['a production build', { dev: false }],
    ['a build where Metro sets hot, so the upstream adds it', { hot: true }],
  ])('adds no React Refresh to %s', (_, options) => {
    expect(transformer.transform(args('web', options)).args.plugins).toEqual([
      'metro-plugin',
      REWRITE,
    ])
  })
})

describe('the Babel transformer on other platforms', () => {
  test.each(['ios', 'android'])('runs the app transformer unchanged on %s', (platform) => {
    const result = transformer.transform(args(platform))
    expect(result.args).toEqual(args(platform))
  })
})

describe('the Babel transformer and its cache key', () => {
  test('has the key of the app transformer and the versions of both plugins', () => {
    const key = transformer.getCacheKey({ projectRoot: app.root })
    expect(key).toContain(UPSTREAM)
    expect(key).toContain('upstream-key')
    expect(key).toMatch(/babel-plugin-react-native-web@\d+\.\d+\.\d+/)
    expect(key).toContain('react-refresh@0.14.2')
  })

  test("with no path in the env, finds React Native's transformer through the app", () => {
    delete process.env.ROOTNATIVE_WEB_METRO_BABEL_TRANSFORMER
    expect(transformer.getCacheKey({ projectRoot: app.root })).toContain('react-native-key')
    expect(transformer.transform(args('ios'))).toBe('react-native')
  })
})
