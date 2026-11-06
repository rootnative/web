import { expect, test } from 'vitest'

test('runs in a real browser', () => {
  expect(typeof document).toBe('object')
  expect(navigator.userAgent).toContain('Chrome')
  expect(CSS.supports('display', 'contents')).toBe(true)
})
