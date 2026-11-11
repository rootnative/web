import { afterEach, beforeEach, describe, expect, type MockInstance, test, vi } from 'vitest'

import type { EventSubscription } from '../../events/types'
import { browserNavigation, Linking } from './index'

describe('Linking.openURL', () => {
  let assign: MockInstance<(href: string) => void>
  let open: MockInstance<typeof window.open>
  let tab: { opener: unknown }

  beforeEach(() => {
    assign = vi.spyOn(browserNavigation, 'assign').mockImplementation(() => {})
    tab = { opener: window }
    open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('opens a URL of this site in this tab', async () => {
    await expect(Linking.openURL('/profile?id=7')).resolves.toBeUndefined()
    expect(assign).toHaveBeenCalledWith(new URL('/profile?id=7', window.location.href).href)
    expect(open).not.toHaveBeenCalled()
  })

  test('opens a URL of another site in a new tab with no opener', async () => {
    await expect(Linking.openURL('https://example.com/a')).resolves.toBeUndefined()
    expect(open).toHaveBeenCalledWith('https://example.com/a', '_blank')
    expect(tab.opener).toBeNull()
    expect(assign).not.toHaveBeenCalled()
  })

  test('rejects when the browser blocks the new tab', async () => {
    open.mockReturnValue(null)
    await expect(Linking.openURL('https://example.com/')).rejects.toThrowError(
      /blocked the new tab/,
    )
  })

  test.each(['mailto:hello@example.com', 'tel:+15551234567', 'sms:+15551234567', 'myapp://x'])(
    'gives %s to the system from this tab',
    async (url) => {
      await Linking.openURL(url)
      expect(assign).toHaveBeenCalledWith(new URL(url).href)
      expect(open).not.toHaveBeenCalled()
    },
  )

  test.each(['javascript:alert(1)', '  JavaScript:alert(1)', 'data:text/html,<p>hi</p>'])(
    'refuses %s',
    async (url) => {
      await expect(Linking.openURL(url)).rejects.toThrowError(/refused/)
      expect(assign).not.toHaveBeenCalled()
      expect(open).not.toHaveBeenCalled()
    },
  )

  test('rejects a URL that the browser cannot parse', async () => {
    await expect(Linking.openURL('http://')).rejects.toThrowError(/isn't a valid URL/)
  })

  test('throws at once for a URL that is not a string or is empty, as on native', () => {
    expect(() => Linking.openURL(42 as unknown as string)).toThrowError(
      'Invalid URL: should be a string. Was: 42',
    )
    expect(() => Linking.openURL('')).toThrowError('Invalid URL: cannot be empty')
  })
})

describe('Linking.canOpenURL', () => {
  test.each([
    ['https://example.com/', true],
    ['/relative', true],
    ['mailto:hello@example.com', true],
    ['javascript:alert(1)', false],
    ['data:text/plain,hi', false],
    ['http://', false],
  ])('%s → %s', async (url, expected) => {
    await expect(Linking.canOpenURL(url)).resolves.toBe(expected)
  })

  test('throws at once for an empty URL, as on native', () => {
    expect(() => Linking.canOpenURL('')).toThrowError('Invalid URL: cannot be empty')
  })
})

describe('Linking.getInitialURL', () => {
  test('is the URL that the page loaded with, also after the URL changes', async () => {
    const start = window.location.href
    const [entry] = performance.getEntriesByType('navigation')
    try {
      history.replaceState(history.state, '', '?linking-test=1')
      const initial = await Linking.getInitialURL()
      expect(initial).toBe(entry?.name)
      expect(initial).not.toBe(window.location.href)
    } finally {
      history.replaceState(history.state, '', start)
    }
  })
})

describe('Linking events', () => {
  afterEach(() => {
    Linking.removeAllListeners()
  })

  test('url listeners get each emit, and remove stops them', () => {
    const listener = vi.fn()
    const subscription = Linking.addEventListener('url', listener)
    expect(Linking.listenerCount('url')).toBe(1)

    Linking.emit('url', { url: 'myapp://a' })
    subscription.remove()
    Linking.emit('url', { url: 'myapp://b' })

    expect(listener.mock.calls).toEqual([[{ url: 'myapp://a' }]])
    expect(Linking.listenerCount('url')).toBe(0)
  })

  test('addListener calls the listener with its context', () => {
    const context = { name: 'owner' }
    const listener = vi.fn()
    Linking.addListener('url', listener, context)
    Linking.emit('url', { url: 'myapp://a' })
    expect(listener.mock.contexts).toEqual([context])
  })

  test('a listener that removes itself does not stop the others in the same emit', () => {
    const second = vi.fn()
    const first: EventSubscription = Linking.addEventListener('url', () => first.remove())
    Linking.addEventListener('url', second)

    Linking.emit('url', { url: 'myapp://a' })

    expect(second).toHaveBeenCalledTimes(1)
    expect(Linking.listenerCount('url')).toBe(1)
  })

  test('removeAllListeners removes the listeners of one event or of all', () => {
    Linking.addEventListener('url', vi.fn())
    Linking.removeAllListeners('url')
    expect(Linking.listenerCount('url')).toBe(0)

    Linking.addEventListener('url', vi.fn())
    Linking.removeAllListeners()
    expect(Linking.listenerCount('url')).toBe(0)
  })
})

describe('Linking on the web has no', () => {
  test('settings page, so openSettings rejects', async () => {
    await expect(Linking.openSettings()).rejects.toThrowError(/no settings page/)
  })

  test('Android intents, so sendIntent rejects as on iOS', async () => {
    await expect(Linking.sendIntent('android.settings.SETTINGS')).rejects.toThrowError(
      'Unsupported',
    )
  })
})
