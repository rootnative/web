import type { EventSubscription } from '../../events/types'
import { hasDOM } from '../../utils/env'

export type AppStateStatus = 'inactive' | 'background' | 'active' | 'extension' | 'unknown'

type AppStateEventDefinitions = {
  change: [AppStateStatus]
  memoryWarning: []
  blur: []
  focus: []
}

export type AppStateEvent = keyof AppStateEventDefinitions

type Handler = (...args: AppStateStatus[]) => void

const handlers: Record<AppStateEvent, Set<Handler>> = {
  change: new Set(),
  memoryWarning: new Set(),
  blur: new Set(),
  focus: new Set(),
}

// A page can unload with no `visibilitychange` before it, so `pagehide` counts as hidden until
// the page shows again from the back-forward cache.
let pageHidden = false
let last: AppStateStatus | null = null
let listening = false

const read = (): AppStateStatus => {
  if (!hasDOM()) return 'active'
  return pageHidden || document.visibilityState !== 'visible' ? 'background' : 'active'
}

const notify = (): void => {
  const next = read()
  if (next === last) return
  last = next
  for (const handler of handlers.change) handler(next)
}

const onPageHide = (): void => {
  pageHidden = true
  notify()
}

const onPageShow = (): void => {
  pageHidden = false
  notify()
}

// Focus events of elements don't bubble, but a synthetic one can. Only the window counts.
const onWindowFocus = (event: Event): void => {
  if (event.target !== window) return
  for (const handler of handlers[event.type === 'focus' ? 'focus' : 'blur']) handler()
}

const listen = (): void => {
  if (listening || !hasDOM()) return
  listening = true
  last = read()
  document.addEventListener('visibilitychange', notify)
  window.addEventListener('pagehide', onPageHide)
  window.addEventListener('pageshow', onPageShow)
  window.addEventListener('focus', onWindowFocus)
  window.addEventListener('blur', onWindowFocus)
}

/**
 * The app is `active` while its page is visible, and in the `background` while the page is
 * hidden or unloads. A focus change of the window fires `blur` and `focus`, as on Android, and
 * the state stays `active`.
 */
export const AppState: {
  readonly currentState: AppStateStatus
  readonly isAvailable: boolean
  addEventListener: <K extends AppStateEvent>(
    type: K,
    handler: (...args: AppStateEventDefinitions[K]) => void,
  ) => EventSubscription
} = {
  get currentState() {
    return read()
  },

  isAvailable: true,

  addEventListener(type, handler) {
    const set = handlers[type] as Set<Handler> | undefined
    if (set === undefined) {
      throw new Error(`Trying to subscribe to unknown event: ${String(type)}`)
    }
    const entry = handler as Handler
    set.add(entry)
    listen()
    return { remove: () => set.delete(entry) }
  },
}

// For tests.
export const resetAppState = (): void => {
  for (const set of Object.values(handlers)) set.clear()
  pageHidden = false
  last = null
  if (!listening) return
  listening = false
  document.removeEventListener('visibilitychange', notify)
  window.removeEventListener('pagehide', onPageHide)
  window.removeEventListener('pageshow', onPageShow)
  window.removeEventListener('focus', onWindowFocus)
  window.removeEventListener('blur', onWindowFocus)
}
