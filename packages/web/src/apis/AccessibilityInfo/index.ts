import { hasDOM, matchesMedia } from '../../utils/env'

export type AccessibilityChangeEventName =
  | 'change'
  | 'boldTextChanged'
  | 'grayscaleChanged'
  | 'invertColorsChanged'
  | 'reduceMotionChanged'
  | 'reduceTransparencyChanged'
  | 'highTextContrastChanged'
  | 'darkerSystemColorsChanged'
  | 'screenReaderChanged'
  | 'announcementFinished'

export type AccessibilityChangeEvent = boolean

export type AccessibilityAnnouncementFinishedEvent = {
  announcement: string
  success: boolean
}

export type AccessibilityEventSubscription = { remove: () => void }

type Handler = (value: never) => void

// The media query behind each event. Events with no query never fire.
const mediaQueryOf: Partial<Record<AccessibilityChangeEventName, string>> = {
  reduceMotionChanged: '(prefers-reduced-motion: reduce)',
  reduceTransparencyChanged: '(prefers-reduced-transparency: reduce)',
  invertColorsChanged: '(inverted-colors: inverted)',
  darkerSystemColorsChanged: '(prefers-contrast: more)',
  highTextContrastChanged: '(prefers-contrast: more)',
}

const resolve = <T>(value: T): Promise<T> => Promise.resolve(value)

let liveRegion: HTMLElement | null = null

// One visually hidden live region for every announcement.
const getLiveRegion = (): HTMLElement | null => {
  if (!hasDOM()) return null
  if (liveRegion !== null && liveRegion.isConnected) return liveRegion
  const element = document.createElement('div')
  element.setAttribute('aria-live', 'polite')
  element.setAttribute('aria-atomic', 'true')
  element.setAttribute('data-rn-announcer', '')
  Object.assign(element.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
    border: '0',
  })
  document.body.appendChild(element)
  liveRegion = element
  return element
}

const announcementListeners = new Set<(event: AccessibilityAnnouncementFinishedEvent) => void>()

const announce = (announcement: string, queue: boolean): void => {
  const region = getLiveRegion()
  if (region === null) return
  region.setAttribute('aria-live', queue ? 'polite' : 'assertive')
  // An identical text in a row is not read again. Clear first.
  region.textContent = ''
  requestAnimationFrame(() => {
    region.textContent = announcement
    for (const listener of announcementListeners) listener({ announcement, success: true })
  })
}

export const AccessibilityInfo: {
  isScreenReaderEnabled: () => Promise<boolean>
  isAccessibilityServiceEnabled: () => Promise<boolean>
  isBoldTextEnabled: () => Promise<boolean>
  isGrayscaleEnabled: () => Promise<boolean>
  isInvertColorsEnabled: () => Promise<boolean>
  isReduceMotionEnabled: () => Promise<boolean>
  isReduceTransparencyEnabled: () => Promise<boolean>
  isHighTextContrastEnabled: () => Promise<boolean>
  isDarkerSystemColorsEnabled: () => Promise<boolean>
  prefersCrossFadeTransitions: () => Promise<boolean>
  getRecommendedTimeoutMillis: (originalTimeout: number) => Promise<number>
  addEventListener: (
    eventName: AccessibilityChangeEventName,
    handler: (value: never) => void,
  ) => AccessibilityEventSubscription
  announceForAccessibility: (announcement: string) => void
  announceForAccessibilityWithOptions: (
    announcement: string,
    options: { queue?: boolean | undefined },
  ) => void
  setAccessibilityFocus: (target: HTMLElement | number | null | undefined) => void
  sendAccessibilityEvent: (
    target: HTMLElement | number | null | undefined,
    eventType: string,
  ) => void
} = {
  // The browser does not expose assistive technology.
  isScreenReaderEnabled: () => resolve(false),
  isAccessibilityServiceEnabled: () => resolve(false),
  isBoldTextEnabled: () => resolve(false),
  isGrayscaleEnabled: () => resolve(false),

  isInvertColorsEnabled: () => resolve(matchesMedia('(inverted-colors: inverted)')),
  isReduceMotionEnabled: () => resolve(matchesMedia('(prefers-reduced-motion: reduce)')),
  isReduceTransparencyEnabled: () =>
    resolve(matchesMedia('(prefers-reduced-transparency: reduce)')),
  isHighTextContrastEnabled: () => resolve(matchesMedia('(prefers-contrast: more)')),
  isDarkerSystemColorsEnabled: () => resolve(matchesMedia('(prefers-contrast: more)')),
  prefersCrossFadeTransitions: () => resolve(matchesMedia('(prefers-reduced-motion: reduce)')),

  getRecommendedTimeoutMillis: (originalTimeout) => resolve(originalTimeout),

  addEventListener: (eventName, handler) => {
    if (eventName === 'announcementFinished') {
      const listener = handler as (event: AccessibilityAnnouncementFinishedEvent) => void
      announcementListeners.add(listener)
      return { remove: () => announcementListeners.delete(listener) }
    }
    const query = mediaQueryOf[eventName]
    if (query === undefined || !hasDOM() || typeof window.matchMedia !== 'function') {
      return { remove: () => {} }
    }
    const list = window.matchMedia(query)
    const listener = (): void => (handler as (value: boolean) => void)(list.matches)
    list.addEventListener('change', listener)
    return { remove: () => list.removeEventListener('change', listener) }
  },

  announceForAccessibility: (announcement) => announce(announcement, true),

  announceForAccessibilityWithOptions: (announcement, options) =>
    announce(announcement, options.queue !== false),

  setAccessibilityFocus: (target) => {
    if (target instanceof HTMLElement) target.focus()
  },

  sendAccessibilityEvent: (target, eventType) => {
    if (eventType === 'focus' && target instanceof HTMLElement) target.focus()
  },
}

// For tests.
export const resetAccessibilityInfo = (): void => {
  liveRegion?.remove()
  liveRegion = null
  announcementListeners.clear()
}

export type { Handler as AccessibilityEventHandler }
