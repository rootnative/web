import { expect, test } from 'vitest'

test('runs in a real browser', () => {
  expect(typeof document).toBe('object')
  // jsdom has "AppleWebKit" in its user agent, but none of these names.
  expect(navigator.userAgent).toMatch(/Chrome|Firefox|Safari/)
  expect(CSS.supports('display', 'contents')).toBe(true)
})
