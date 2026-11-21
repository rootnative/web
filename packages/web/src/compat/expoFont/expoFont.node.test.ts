import { expect, test } from 'vitest'

test('throws on import, as a missing module does, with a link to the docs', async () => {
  await expect(import('./index')).rejects.toThrow(
    'https://rootnative.github.io/web/vite-plugin#expo-modules',
  )
})
