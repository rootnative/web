import { hasDOM, matchesMedia } from '../../utils/env'

export type ColorSchemeName = 'light' | 'dark' | null | undefined

export type AppearancePreferences = { colorScheme: ColorSchemeName }

export type AppearanceListener = (preferences: AppearancePreferences) => void

export type NativeEventSubscription = { remove: () => void }

const DARK_QUERY = '(prefers-color-scheme: dark)'

let override: 'light' | 'dark' | null = null
let last: 'light' | 'dark' | null = null
let mediaList: MediaQueryList | null = null
const listeners = new Set<AppearanceListener>()

// The server has no preference. 'light' keeps the server HTML deterministic.
const system = (): 'light' | 'dark' => (matchesMedia(DARK_QUERY) ? 'dark' : 'light')

const current = (): 'light' | 'dark' => override ?? system()

const notify = (): void => {
  const next = current()
  if (next === last) return
  last = next
  for (const listener of listeners) listener({ colorScheme: next })
}

const listen = (): void => {
  if (mediaList !== null || !hasDOM() || typeof window.matchMedia !== 'function') return
  mediaList = window.matchMedia(DARK_QUERY)
  mediaList.addEventListener('change', notify)
}

export const Appearance: {
  getColorScheme: () => ColorSchemeName
  setColorScheme: (scheme: ColorSchemeName | 'unspecified') => void
  addChangeListener: (listener: AppearanceListener) => NativeEventSubscription
} = {
  getColorScheme() {
    return current()
  },

  // An override also sets `color-scheme` on <html>, so native form controls,
  // scrollbars, and the default background follow it, as the whole app does on native.
  setColorScheme(scheme) {
    override = scheme === 'light' || scheme === 'dark' ? scheme : null
    if (hasDOM()) document.documentElement.style.colorScheme = override ?? ''
    notify()
  },

  addChangeListener(listener) {
    if (listeners.size === 0) last = current()
    listeners.add(listener)
    listen()
    return { remove: () => listeners.delete(listener) }
  },
}

// For tests.
export const resetAppearance = (): void => {
  override = null
  last = null
  listeners.clear()
  if (mediaList !== null) mediaList.removeEventListener('change', notify)
  mediaList = null
  if (hasDOM()) document.documentElement.style.colorScheme = ''
}
