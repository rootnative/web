import { describe, expect, test } from 'vitest'

import { createWorkletTransform, WORKLET_CODE } from './worklets'

const root = decodeURIComponent(new URL('../../', import.meta.url).pathname)

// The Worklets plugin opens the file, so each id is a real file.
const script = decodeURIComponent(new URL('./index.ts', import.meta.url).pathname)
const component = decodeURIComponent(
  new URL('../components/View/index.tsx', import.meta.url).pathname,
)

describe('WORKLET_CODE', () => {
  test.each([
    "'worklet'",
    "import Animated from 'react-native-reanimated'",
    "import { useAnimatedStyle } from '@rootnative/inertia/reanimated'",
    'const style = useAnimatedStyle(() => ({}))',
    'x.value = withTiming(1)',
    'scheduleOnUI(() => {})',
  ])('matches %s', (code) => {
    expect(WORKLET_CODE.test(code)).toBe(true)
  })

  test('does not match plain code', () => {
    expect(WORKLET_CODE.test("import { View } from 'react-native'")).toBe(false)
  })
})

describe('createWorkletTransform', () => {
  const transform = createWorkletTransform(root)

  test('makes a worklet from a function with the directive', async () => {
    const result = await transform("export const f = () => {\n  'worklet'\n  return 1\n}\n", script)
    expect(result?.code).toContain('__workletHash')
    expect(result?.map).not.toBeNull()
  })

  test('makes a worklet from the callback of a Reanimated hook', async () => {
    const result = await transform(
      "import { useAnimatedStyle } from 'react-native-reanimated'\nexport const useStyle = () => useAnimatedStyle(() => ({ opacity: 1 }))\n",
      script,
    )
    expect(result?.code).toContain('__workletHash')
  })

  test('reads TypeScript and JSX, and keeps them', async () => {
    const result = await transform(
      "export const f = (value: number): number => {\n  'worklet'\n  return value\n}\nexport const a = <div />\n",
      `${component}?v=1`,
    )
    expect(result?.code).toContain('__workletHash')
    expect(result?.code).toContain('value: number')
    expect(result?.code).toContain('<div />')
  })

  test('skips a file with no worklet, a virtual module, and a file that is not a script', async () => {
    expect(await transform('export const a = 1', '/a.js')).toBeNull()
    expect(await transform("'worklet'", '\0virtual.js')).toBeNull()
    expect(await transform("'worklet'", '/a.css')).toBeNull()
  })
})
