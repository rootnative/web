import type { EventSubscription } from '../../events/types'
import { hasDOM } from '../../utils/env'

type LinkingEventDefinitions = {
  url: [{ url: string }]
}

type LinkingEvent = keyof LinkingEventDefinitions

type Registration = { listener: (...args: never[]) => unknown; context: unknown }

const registrations = new Map<string, Set<Registration>>()

const addListener = <K extends LinkingEvent>(
  eventType: K,
  listener: (...args: LinkingEventDefinitions[K]) => unknown,
  context?: unknown,
): EventSubscription => {
  let set = registrations.get(eventType)
  if (set === undefined) {
    set = new Set()
    registrations.set(eventType, set)
  }
  const registration: Registration = { listener, context }
  const owner = set
  owner.add(registration)
  return { remove: () => owner.delete(registration) }
}

const validate = (url: unknown): void => {
  if (typeof url !== 'string') {
    throw new Error(`Invalid URL: should be a string. Was: ${String(url)}`)
  }
  if (url === '') throw new Error('Invalid URL: cannot be empty')
}

// Browsers block a page that opens a data: URL, and a javascript: URL runs code in this page.
const REFUSED_PROTOCOLS = new Set(['javascript:', 'data:'])

type Destination = { href: string; newTab: boolean }

const destination = (url: string): Destination | Error => {
  if (!hasDOM()) return new Error('Linking: there is no browser to open a URL in.')
  let parsed: URL
  try {
    parsed = new URL(url, window.location.href)
  } catch {
    return new Error(`Linking: "${url}" isn't a valid URL.`)
  }
  if (REFUSED_PROTOCOLS.has(parsed.protocol)) {
    return new Error(`Linking: refused to open a ${parsed.protocol} URL.`)
  }
  const web = parsed.protocol === 'http:' || parsed.protocol === 'https:'
  return { href: parsed.href, newTab: web && parsed.origin !== window.location.origin }
}

// The URL of the document load. Unlike `location.href`, it stays the same after `pushState`.
const loadedURL = (): string | null => {
  if (!hasDOM()) return null
  const [entry] = performance.getEntriesByType('navigation')
  return entry?.name || window.location.href
}

/** For tests: `location.assign` can't be replaced, so the tests replace this. */
export const browserNavigation: { assign: (href: string) => void } = {
  assign: (href) => window.location.assign(href),
}

/**
 * Opens URLs and reports the URL that the page loaded with. A URL of this site opens in this tab,
 * a URL of another site in a new tab, and `mailto:`, `tel:`, and other schemes go to the system.
 * The browser never fires `url`: back, forward, and links belong to the router.
 */
export const Linking: {
  addEventListener: <K extends LinkingEvent>(
    eventType: K,
    listener: (...args: LinkingEventDefinitions[K]) => unknown,
  ) => EventSubscription
  addListener: <K extends LinkingEvent>(
    eventType: K,
    listener: (...args: LinkingEventDefinitions[K]) => unknown,
    context?: unknown,
  ) => EventSubscription
  emit: <K extends LinkingEvent>(eventType: K, ...args: LinkingEventDefinitions[K]) => void
  removeAllListeners: <K extends LinkingEvent>(eventType?: K | null) => void
  listenerCount: <K extends LinkingEvent>(eventType: K) => number
  openURL: (url: string) => Promise<void>
  canOpenURL: (url: string) => Promise<boolean>
  openSettings: () => Promise<void>
  getInitialURL: () => Promise<string | null>
  sendIntent: (
    action: string,
    extras?: Array<{ key: string; value: string | number | boolean }>,
  ) => Promise<void>
} = {
  addEventListener: (eventType, listener) => addListener(eventType, listener),

  addListener,

  emit(eventType, ...args) {
    const set = registrations.get(eventType)
    if (set === undefined) return
    // A listener that removes itself or adds another doesn't change this emit, as on native.
    for (const { listener, context } of Array.from(set)) {
      Reflect.apply(listener, context, args)
    }
  },

  removeAllListeners(eventType) {
    if (eventType === undefined || eventType === null) registrations.clear()
    else registrations.delete(eventType)
  },

  listenerCount: (eventType) => registrations.get(eventType)?.size ?? 0,

  openURL(url) {
    validate(url)
    const target = destination(url)
    if (target instanceof Error) return Promise.reject(target)
    if (!target.newTab) {
      browserNavigation.assign(target.href)
      return Promise.resolve()
    }
    const opened = window.open(target.href, '_blank')
    if (opened === null) {
      return Promise.reject(
        new Error(
          `Linking: the browser blocked the new tab for ${target.href}. Call openURL from a press handler.`,
        ),
      )
    }
    // The new page must not reach this one through window.opener.
    opened.opener = null
    return Promise.resolve()
  },

  canOpenURL(url) {
    validate(url)
    return Promise.resolve(!(destination(url) instanceof Error))
  },

  openSettings: () =>
    Promise.reject(new Error('Linking.openSettings: the web has no settings page for an app.')),

  getInitialURL: () => Promise.resolve(loadedURL()),

  // The rejection of iOS.
  sendIntent: () => Promise.reject(new Error('Unsupported')),
}
