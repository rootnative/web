import { hasDOM } from '../../utils/env'

export type ScaledSize = {
  width: number
  height: number
  scale: number
  fontScale: number
}

export type DimensionsValue = { window: ScaledSize; screen: ScaledSize }

export type DimensionsChangeHandler = (value: DimensionsValue) => void

export type EmitterSubscription = { remove: () => void }

const serverSize: ScaledSize = Object.freeze({ width: 0, height: 0, scale: 1, fontScale: 1 })

const read = (): DimensionsValue => {
  if (!hasDOM()) return { window: serverSize, screen: serverSize }

  const scale = window.devicePixelRatio || 1
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
  const fontScale = Number.isFinite(rootFontSize) && rootFontSize > 0 ? rootFontSize / 16 : 1

  return {
    window: { width: window.innerWidth, height: window.innerHeight, scale, fontScale },
    screen: { width: window.screen.width, height: window.screen.height, scale, fontScale },
  }
}

const sameSize = (a: ScaledSize, b: ScaledSize): boolean =>
  a.width === b.width && a.height === b.height && a.scale === b.scale && a.fontScale === b.fontScale

let current: DimensionsValue | null = null
const handlers = new Set<DimensionsChangeHandler>()
let listening = false

const update = (): void => {
  const next = read()
  if (
    current !== null &&
    sameSize(current.window, next.window) &&
    sameSize(current.screen, next.screen)
  ) {
    return
  }
  current = next
  for (const handler of handlers) handler(next)
}

const listen = (): void => {
  if (listening || !hasDOM()) return
  listening = true
  window.addEventListener('resize', update)
}

export const Dimensions: {
  get: (dimension: 'window' | 'screen') => ScaledSize
  addEventListener: (type: 'change', handler: DimensionsChangeHandler) => EmitterSubscription
} = {
  get(dimension) {
    if (current === null) current = read()
    return current[dimension]
  },

  addEventListener(type, handler) {
    if (type !== 'change') throw new Error(`Dimensions: unknown event "${String(type)}"`)
    if (current === null) current = read()
    handlers.add(handler)
    listen()
    return { remove: () => handlers.delete(handler) }
  },
}

// For tests.
export const resetDimensions = (): void => {
  current = null
  handlers.clear()
  if (listening) window.removeEventListener('resize', update)
  listening = false
}
