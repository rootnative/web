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

// A move or a growth smaller than this doesn't animate.
const MIN_CHANGE = 0.5

let pending: { observer: MutationObserver; lapse: ReturnType<typeof setTimeout> } | null = null

// The layout animations that play now. A new one stops them, and its first boxes are where they
// were, so an element goes on from where it is. A stopped ghost goes away before the next paint.
const running = new Set<Animation>()

// A ghost is a removed element that the engine put back to animate its `delete`. Its old parent
// keeps its inherited styles. Its removal isn't a commit, so `ghosts` keeps each one. A new layout
// animation removes the ghosts before it measures, so the last boxes have none.
const ghosts = new WeakSet<Element>()

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

// `backwards` holds the first frame during a `delay`. A ghost also holds the last frame until the
// engine removes it.
const timingOf = (kind: Kind, fill: FillMode = 'backwards'): KeyframeAnimationOptions => ({
  duration: kind.duration,
  delay: kind.delay,
  easing: kind.easing,
  fill,
})

// The CSS `scale` and `translate` properties apply before `transform`, so the element keeps its
// own transform, such as the one of an `Animated` value.
const SCALE_FROM = { scaleX: '0 1', scaleY: '1 0', scaleXY: '0 0' } as const

// From nothing to the element for a create, and back for a delete.
const appearKeyframes = (
  element: HTMLElement,
  property: LayoutAnimationProperty,
  appear: boolean,
): PropertyIndexedKeyframes => {
  const [none, full] =
    property === 'opacity'
      ? ['0', getComputedStyle(element).opacity]
      : [SCALE_FROM[property], '1 1']
  return { [property === 'opacity' ? 'opacity' : 'scale']: appear ? [none, full] : [full, none] }
}

// A box that grows shows only its old size at the start, and the clip opens to its new size, so
// the content doesn't stretch. The clip keeps the rounded corners of the box.
const growKeyframes = (
  element: HTMLElement,
  width: number,
  height: number,
): PropertyIndexedKeyframes => {
  const radius = getComputedStyle(element).borderRadius
  const round = radius === '' || radius === '0px' ? '' : ` round ${radius}`
  return {
    clipPath: [`inset(0px ${width}px ${height}px 0px${round})`, `inset(0px 0px 0px 0px${round})`],
  }
}

// Puts a removed element back in its old parent, out of the flow, at its old box. It takes no
// pointer, focus, or screen reader.
const placeGhost = (element: HTMLElement, record: MutationRecord, box: DOMRect): void => {
  ghosts.add(element)
  element.setAttribute('inert', '')
  element.setAttribute('aria-hidden', 'true')
  Object.assign(element.style, {
    position: 'absolute',
    inset: 'auto',
    left: '0px',
    top: '0px',
    margin: '0px',
    boxSizing: 'border-box',
    width: `${box.width}px`,
    height: `${box.height}px`,
    minWidth: '0px',
    minHeight: '0px',
    maxWidth: 'none',
    maxHeight: 'none',
    pointerEvents: 'none',
  })
  const next = record.nextSibling?.parentNode === record.target ? record.nextSibling : null
  record.target.insertBefore(element, next)
  const placed = element.getBoundingClientRect()
  element.style.left = `${box.left - placed.left}px`
  element.style.top = `${box.top - placed.top}px`
}

const isGhostRecord = (record: MutationRecord): boolean =>
  record.type === 'childList' &&
  record.addedNodes.length === 0 &&
  [...record.removedNodes].every((node) => ghosts.has(node as Element))

const play = (
  config: ParsedConfig,
  first: Map<HTMLElement, DOMRect>,
  records: readonly MutationRecord[],
  onEnd: () => void,
): void => {
  for (const animation of running) animation.cancel()
  running.clear()
  const last = measure()
  const moves = new Map<HTMLElement, Offset>()
  const started: [Animation, HTMLElement | null][] = []

  for (const [element, box] of last) {
    const before = first.get(element)
    // A long list can move thousands of elements. Those that are out of the window both before and
    // after don't show their move, so they don't animate.
    if (!isInWindow(box) && (before === undefined || !isInWindow(before))) continue
    if (before === undefined) {
      // Only the top element of a new subtree animates. Its children come with it.
      const parent = element.parentElement
      const parentIsNew = parent !== null && last.has(parent) && !first.has(parent)
      const property = config.create?.property
      if (config.create === null || property === undefined || parentIsNew) continue
      const keyframes = appearKeyframes(element, property, true)
      started.push([element.animate(keyframes, timingOf(config.create)), null])
      continue
    }

    if (config.update === null) continue
    const move = { x: before.left - box.left, y: before.top - box.top }
    const offset = offsetFromAncestors(element, moves)
    const x = move.x - offset.x
    const y = move.y - offset.y
    if (Math.abs(x) >= MIN_CHANGE || Math.abs(y) >= MIN_CHANGE) {
      moves.set(element, move)
      const keyframes = { translate: [`${x}px ${y}px`, '0px 0px'] }
      started.push([element.animate(keyframes, timingOf(config.update)), null])
    }
    // A box that shrinks takes its new size at once.
    const width = Math.max(0, box.width - before.width)
    const height = Math.max(0, box.height - before.height)
    if (width >= MIN_CHANGE || height >= MIN_CHANGE) {
      const keyframes = growKeyframes(element, width, height)
      started.push([element.animate(keyframes, timingOf(config.update)), null])
    }
  }

  // React removed these elements before this point. Only the top element of a removed subtree is
  // in the records, and an element that React moved is still in the page.
  const removal = config.delete
  if (removal !== null && removal.property !== undefined) {
    for (const record of records) {
      if (record.type !== 'childList' || !record.target.isConnected) continue
      for (const node of record.removedNodes) {
        if (!(node instanceof HTMLElement) || node.isConnected || ghosts.has(node)) continue
        const box = first.get(node)
        if (box === undefined || !isInWindow(box)) continue
        placeGhost(node, record, box)
        const keyframes = appearKeyframes(node, removal.property, false)
        started.push([node.animate(keyframes, timingOf(removal, 'both')), node])
      }
    }
  }

  for (const [animation, ghost] of started) {
    running.add(animation)
    const forget = (): void => {
      running.delete(animation)
      ghost?.remove()
    }
    animation.finished.then(forget, forget)
  }
  Promise.allSettled(started.map(([animation]) => animation.finished)).then(onEnd, onEnd)
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
  const observer = new MutationObserver((records) => {
    if (records.every(isGhostRecord)) return
    cancelNextLayout()
    play(config, first, records, onEnd)
  })
  observer.observe(document.body, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  })
  pending = { observer, lapse: setTimeout(cancelNextLayout, lapseAfter) }
}
