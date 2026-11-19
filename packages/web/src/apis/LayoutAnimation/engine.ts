import { easingFor } from './curves'
import type { LayoutAnimationAnimationConfig, LayoutAnimationProperty } from './types'

type Kind = Readonly<{
  duration: number
  delay: number
  easing: string
  property: LayoutAnimationProperty | undefined
}>

// `null` for a kind that doesn't animate.
export type ParsedConfig = Readonly<{
  create: Kind | null
  update: Kind | null
  delete: Kind | null
}>

const TYPES = new Set(['spring', 'linear', 'easeInEaseOut', 'easeIn', 'easeOut', 'keyboard'])
const PROPERTIES = new Set(['opacity', 'scaleX', 'scaleY', 'scaleXY'])

// React Native's rules (`ReactCommon/react/renderer/animations/conversions.h`): a missing kind
// doesn't animate, and an empty one is `linear` with the duration of the config. A kind with no
// valid `type`, or a create or delete with no valid `property`, fails the whole config.
const parseKind = (kind: unknown, duration: number, withProperty: boolean): Kind | null | false => {
  if (kind === undefined || kind === null) return null
  if (typeof kind !== 'object' || Object.keys(kind).length === 0) {
    return { duration, delay: 0, easing: 'linear', property: undefined }
  }
  const config = kind as LayoutAnimationAnimationConfig
  const { type, property } = config
  if (type === undefined || !TYPES.has(type)) return false
  if (withProperty && (property === undefined || !PROPERTIES.has(property))) return false
  return {
    duration: typeof config.duration === 'number' ? config.duration : duration,
    delay: typeof config.delay === 'number' ? config.delay : 0,
    easing: easingFor(type, typeof config.springDamping === 'number' ? config.springDamping : 0.5),
    property: withProperty ? property : undefined,
  }
}

// `null` for a config that fails.
export const parseConfig = (config: unknown): ParsedConfig | null => {
  if (typeof config !== 'object' || config === null) return null
  const { duration, create, update, delete: remove } = config as Record<string, unknown>
  if (typeof duration !== 'number') return null
  const parsed = {
    create: parseKind(create, duration, true),
    update: parseKind(update, duration, false),
    delete: parseKind(remove, duration, true),
  }
  if (parsed.create === false || parsed.update === false || parsed.delete === false) return null
  return parsed as ParsedConfig
}

type Offset = Readonly<{ x: number; y: number }>

const NO_OFFSET: Offset = { x: 0, y: 0 }

// A move smaller than this doesn't animate.
const MIN_MOVE = 0.5

let pending: { observer: MutationObserver; lapse: ReturnType<typeof setTimeout> } | null = null

// The layout animations that play now. A new one stops them, and its first boxes are where they
// were, so an element goes on from where it is.
const running = new Set<Animation>()

export const cancelNextLayout = (): void => {
  if (pending === null) return
  pending.observer.disconnect()
  clearTimeout(pending.lapse)
  pending = null
}

// The box of each element that the browser renders, in document order, so each ancestor comes
// before its children.
const measure = (): Map<HTMLElement, DOMRect> => {
  const boxes = new Map<HTMLElement, DOMRect>()
  for (const element of document.body.querySelectorAll('*')) {
    if (!(element instanceof HTMLElement)) continue
    const box = element.getBoundingClientRect()
    if (box.width === 0 && box.height === 0 && element.getClientRects().length === 0) continue
    boxes.set(element, box)
  }
  return boxes
}

// The offset that the moving ancestors give an element at the start: the whole move of the nearest
// one that animates, because each element that animates starts at its first box.
const offsetFromAncestors = (element: HTMLElement, moves: Map<HTMLElement, Offset>): Offset => {
  if (moves.size === 0) return NO_OFFSET
  for (let ancestor = element.parentElement; ancestor !== null; ancestor = ancestor.parentElement) {
    const move = moves.get(ancestor)
    if (move !== undefined) return move
  }
  return NO_OFFSET
}

const isInWindow = (box: DOMRect): boolean =>
  box.bottom > 0 && box.right > 0 && box.top < window.innerHeight && box.left < window.innerWidth

const timingOf = (kind: Kind): KeyframeAnimationOptions => ({
  duration: kind.duration,
  delay: kind.delay,
  easing: kind.easing,
  fill: 'backwards',
})

// The CSS `scale` and `translate` properties apply before `transform`, so the element keeps its
// own transform, such as the one of an `Animated` value.
const createKeyframes = (
  element: HTMLElement,
  property: LayoutAnimationProperty | undefined,
): PropertyIndexedKeyframes | null => {
  switch (property) {
    case 'opacity':
      return { opacity: ['0', getComputedStyle(element).opacity] }
    case 'scaleX':
      return { scale: ['0 1', '1 1'] }
    case 'scaleY':
      return { scale: ['1 0', '1 1'] }
    case 'scaleXY':
      return { scale: ['0 0', '1 1'] }
    default:
      return null
  }
}

const play = (config: ParsedConfig, first: Map<HTMLElement, DOMRect>, onEnd: () => void): void => {
  for (const animation of running) animation.cancel()
  running.clear()
  const last = measure()
  const moves = new Map<HTMLElement, Offset>()
  const animations: Animation[] = []

  for (const [element, box] of last) {
    const before = first.get(element)
    // A long list can move thousands of elements. Those that are out of the window both before and
    // after don't show their move, so they don't animate.
    if (!isInWindow(box) && (before === undefined || !isInWindow(before))) continue
    if (before === undefined) {
      // Only the top element of a new subtree animates. Its children come with it.
      const parent = element.parentElement
      const parentIsNew = parent !== null && last.has(parent) && !first.has(parent)
      if (config.create === null || parentIsNew) continue
      const keyframes = createKeyframes(element, config.create.property)
      if (keyframes !== null) animations.push(element.animate(keyframes, timingOf(config.create)))
      continue
    }

    if (config.update === null) continue
    const move = { x: before.left - box.left, y: before.top - box.top }
    const offset = offsetFromAncestors(element, moves)
    const x = move.x - offset.x
    const y = move.y - offset.y
    if (Math.abs(x) < MIN_MOVE && Math.abs(y) < MIN_MOVE) continue
    moves.set(element, move)
    animations.push(
      element.animate({ translate: [`${x}px ${y}px`, '0px 0px'] }, timingOf(config.update)),
    )
  }

  for (const animation of animations) {
    running.add(animation)
    const forget = (): void => {
      running.delete(animation)
    }
    animation.finished.then(forget, forget)
  }
  Promise.allSettled(animations.map((animation) => animation.finished)).then(onEnd, onEnd)
}

/**
 * Measures each element now, and animates the changes of the next DOM change: React's next
 * commit. The `MutationObserver` runs after the commit and before the next paint, so no frame
 * shows the new layout first. With no change before `lapseAfter` ms, nothing animates.
 */
export const animateNextLayout = (
  config: ParsedConfig,
  lapseAfter: number,
  onEnd: () => void,
): void => {
  cancelNextLayout()
  const first = measure()
  const observer = new MutationObserver(() => {
    cancelNextLayout()
    play(config, first, onEnd)
  })
  observer.observe(document.body, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  })
  pending = { observer, lapse: setTimeout(cancelNextLayout, lapseAfter) }
}
