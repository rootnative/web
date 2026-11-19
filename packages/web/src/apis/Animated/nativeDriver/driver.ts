import { AnimatedDiffClamp } from '../nodes/AnimatedDiffClamp'
import type { AnimatedNode } from '../nodes/AnimatedNode'
import { AnimatedProps } from '../nodes/AnimatedProps'
import type { LeafTrack } from '../nodes/AnimatedProps'
import { AnimatedStyle } from '../nodes/AnimatedStyle'
import type { AnimatedValue } from '../nodes/AnimatedValue'
import { FRAME_MS, sampleTimes } from './curve'
import type { Curve } from './curve'
import { buildKeyframes } from './keyframes'
import type { CompositorProperty } from './keyframes'

// The samples of all leaves of one start: about 10 ms of keyframes in Chromium. Above it, the
// animation runs on the frame loop.
const SAMPLE_BUDGET = 3000

const isCompositorProperty = (key: string | undefined): key is CompositorProperty =>
  key === 'transform' || key === 'opacity'

type Plan = Map<AnimatedProps, Set<CompositorProperty>>

// The mounted leaves that `value` reaches, with the style keys that it changes in each. Null when a
// Web Animation can't play one of them: a key other than `transform` and `opacity`, a prop that
// isn't the style, an element that isn't in the page, or a `diffClamp`, which keeps the last value
// that it read. A leaf with no host isn't mounted, or is on its way out: it gets a track when it
// mounts.
const planOf = (value: AnimatedValue): Plan | null => {
  const plan: Plan = new Map()
  const visit = (node: AnimatedNode, input: AnimatedNode): boolean => {
    if (node instanceof AnimatedDiffClamp) return false
    if (node instanceof AnimatedStyle) {
      const key = node.keyOf(input)
      if (!isCompositorProperty(key)) return false
      return node.__getChildren().every((leaf) => {
        if (!(leaf instanceof AnimatedProps)) return false
        if (leaf.host === null) return true
        const element = leaf.host.element()
        if (element === null || !element.isConnected || !leaf.animatesOnlyStyle()) return false
        const properties = plan.get(leaf) ?? new Set()
        plan.set(leaf, properties.add(key))
        return true
      })
    }
    if ('update' in node) return false
    return node.__getChildren().every((child) => visit(child, node))
  }
  return value.__getChildren().every((child) => visit(child, value)) ? plan : null
}

const fitsBudget = (duration: number, leaves: number): boolean =>
  sampleTimes(duration).length * leaves <= SAMPLE_BUDGET

const hasListeners = (node: AnimatedNode): boolean =>
  node.hasListeners() || node.__getChildren().some(hasListeners)

// The time of the current frame, which the Web Animations of the document read too. Null with no
// Web Animations API, as in jsdom, so the animation runs on the frame loop.
const timelineNow = (): number | null => {
  const timeline: DocumentTimeline | undefined = document.timeline
  const time = timeline?.currentTime
  return typeof time === 'number' ? time : null
}

const runs = new Set<NativeRun>()

class Track implements LeafTrack {
  private animation: Animation | null = null

  constructor(
    private readonly run: NativeRun,
    private readonly leaf: AnimatedProps,
    private readonly properties: readonly CompositorProperty[],
  ) {}

  // The keyframes go from now to the end, so a build in the middle of the run goes on from where
  // the value is.
  build(): void {
    const host = this.leaf.host
    const element = host?.element()
    const now = timelineNow()
    if (host === null || host === undefined || element === null || element === undefined) {
      this.cancel()
      return
    }
    if (now === null) return
    const { curve, value } = this.run
    const elapsed = now - this.run.start
    const remaining = curve.duration - elapsed
    if (remaining <= 0) return
    const keyframes = buildKeyframes(
      this.leaf,
      host.staticStyle(),
      this.properties,
      [{ value, curve: { duration: remaining, valueAt: (time) => curve.valueAt(elapsed + time) } }],
      remaining,
    )
    this.animation?.cancel()
    const animation = element.animate(keyframes, {
      duration: remaining,
      easing: 'linear',
      fill: 'forwards',
    })
    animation.startTime = now
    this.animation = animation
  }

  onUpdate(): void {
    this.run.toFrameLoop()
  }

  rebuild(): void {
    this.build()
  }

  cancel(): void {
    this.animation?.cancel()
    this.animation = null
    if (this.leaf.track === this) this.leaf.track = null
    this.run.forget(this.leaf)
  }
}

// One `timing` or `spring` on the Web Animations driver. Each leaf plays a Web Animation, and a
// frame callback calls the listeners and ends the run. The callback writes no style. A change that
// the run didn't make moves the run to the frame loop of the JavaScript driver.
export class NativeRun {
  private readonly tracks = new Map<AnimatedProps, Track>()
  private mode: 'native' | 'frames' | 'ended' = 'native'
  private frame: number | undefined

  constructor(
    readonly value: AnimatedValue,
    readonly curve: Curve,
    readonly start: number,
    private readonly setValue: (value: number) => void,
    private readonly onFinish: () => void,
  ) {}

  elapsed(): number {
    return Math.max(0, (timelineNow() ?? this.start) - this.start)
  }

  // The value at the time of the current frame, which the browser shows.
  liveValue(): number | undefined {
    return this.mode === 'ended' ? undefined : this.curve.valueAt(this.elapsed())
  }

  // Gives each new leaf of `plan` a track and drops the tracks of the leaves that left. False when
  // a leaf has the track of another run: one track for each leaf in this step.
  place(plan: Plan): boolean {
    for (const [leaf, track] of this.tracks) if (!plan.has(leaf)) track.cancel()
    for (const [leaf, properties] of plan) {
      if (this.tracks.has(leaf)) continue
      if (leaf.track !== null) return false
      const track = new Track(this, leaf, [...properties])
      this.tracks.set(leaf, track)
      leaf.track = track
      track.build()
    }
    return true
  }

  // A leaf that mounted during the run gets a track, or the run moves to the frame loop.
  replan(): void {
    if (this.mode !== 'native') return
    const plan = planOf(this.value)
    const remaining = this.curve.duration - this.elapsed()
    if (plan === null || !fitsBudget(remaining, plan.size) || !this.place(plan)) {
      this.toFrameLoop()
    }
  }

  forget(leaf: AnimatedProps): void {
    this.tracks.delete(leaf)
  }

  toFrameLoop(): void {
    if (this.mode !== 'native') return
    this.mode = 'frames'
    this.cancelTracks()
  }

  startFrames(): void {
    this.frame = requestAnimationFrame(this.onFrame)
  }

  // Ends the run and gives the time of the stop. The animation then sets the value.
  stop(): number {
    const elapsed = this.elapsed()
    this.end()
    return elapsed
  }

  private readonly onFrame = (): void => {
    const elapsed = this.elapsed()
    if (elapsed >= this.curve.duration) {
      this.end()
      this.onFinish()
      return
    }
    if (this.mode === 'frames') this.setValue(this.curve.valueAt(elapsed))
    else if (hasListeners(this.value)) this.value.__callListeners(this.value.__getValue())
    this.frame = requestAnimationFrame(this.onFrame)
  }

  // The tracks hold their last frame until the animation writes the end value to the inline style,
  // in the same task, so no frame shows the old inline style.
  private end(): void {
    this.mode = 'ended'
    runs.delete(this)
    if (this.frame !== undefined) cancelAnimationFrame(this.frame)
    this.cancelTracks()
  }

  private cancelTracks(): void {
    for (const track of this.tracks.values()) track.cancel()
  }
}

// Starts `value` on the Web Animations driver, or gives null for the frame loop. `makeCurve` gets
// the longest duration that the budget allows for the leaves.
export const startNativeRun = (
  value: AnimatedValue,
  makeCurve: (maxDuration: number) => Curve | null,
  setValue: (value: number) => void,
  onFinish: () => void,
): NativeRun | null => {
  const start = timelineNow()
  const plan = planOf(value)
  if (start === null || plan === null || plan.size === 0) return null
  const maxSamples = Math.floor(SAMPLE_BUDGET / plan.size)
  const curve = makeCurve((maxSamples - 1) * FRAME_MS)
  if (curve === null || curve.duration <= 0 || !fitsBudget(curve.duration, plan.size)) return null
  for (const leaf of plan.keys()) if (leaf.track !== null) return null
  const run = new NativeRun(value, curve, start, setValue, onFinish)
  run.place(plan)
  runs.add(run)
  run.startFrames()
  return run
}

// A leaf that mounts can join a run of a value that it reads.
export const adoptLeaf = (): void => {
  for (const run of runs) run.replan()
}
