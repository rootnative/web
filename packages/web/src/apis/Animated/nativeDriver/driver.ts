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

// False with no Web Animations API, as in jsdom, so the animation runs on the frame loop.
const hasWebAnimations = (): boolean => {
  const timeline: DocumentTimeline | undefined = document.timeline
  return timeline !== undefined
}

// The clock of a run. `performance.now()` and the document timeline have the same origin, so a
// time of one is a time of the other. Not `document.timeline.currentTime`: Firefox gives the time
// of its last refresh tick, which is old after an idle time, so a run would start in the past.
const clock = (): number => performance.now()

const runs = new Set<NativeRun>()

// The runs whose own write of their value is in progress. Their tracks know that write.
const writing = new Set<NativeRun>()

// One Web Animation for each leaf, with each run that reaches the leaf. Two Web Animations of
// `transform` on one element would replace each other, so the `x` and `y` of a `ValueXY`, or a
// translate and a scale in a `parallel`, share one track.
class Track implements LeafTrack {
  private readonly runs = new Map<NativeRun, ReadonlySet<CompositorProperty>>()
  private animation: Animation | null = null

  constructor(private readonly leaf: AnimatedProps) {
    leaf.track = this
  }

  add(run: NativeRun, properties: ReadonlySet<CompositorProperty>): void {
    this.runs.set(run, properties)
    this.build()
  }

  // A track that keeps other runs builds again. The value of `run` is its last one now.
  remove(run: NativeRun): void {
    this.runs.delete(run)
    if (this.runs.size === 0) this.cancel()
    else this.build()
  }

  // The keyframes go from now to the latest end, so a build in the middle of the runs goes on from
  // where the values are. A run that ends first keeps its end value in the later keyframes, until
  // it leaves the track.
  build(): void {
    const element = this.leaf.host?.element()
    const staticStyle = this.leaf.host?.staticStyle()
    if (element === null || element === undefined) return
    const now = clock()
    let end = now
    const properties = new Set<CompositorProperty>()
    for (const [run, keys] of this.runs) {
      end = Math.max(end, run.start + run.curve.duration)
      for (const key of keys) properties.add(key)
    }
    const remaining = end - now
    if (remaining <= 0) return
    // Each run has ended at the last sample. A time sum can round a little short of the end of a
    // run, and a spring there isn't at `toValue` yet, so the last sample takes each end value.
    const curves = [...this.runs.keys()].map((run) => ({
      value: run.value,
      curve: {
        duration: remaining,
        valueAt: (time: number) => (time >= remaining ? run.endValue() : run.valueAt(now + time)),
      },
    }))
    const keyframes = buildKeyframes(this.leaf, staticStyle, [...properties], curves, remaining)
    this.animation?.cancel()
    // `backwards` too: a timeline that is behind `now` shows the first keyframe, not the old inline
    // style.
    const animation = element.animate(keyframes, {
      duration: remaining,
      easing: 'linear',
      fill: 'both',
    })
    animation.startTime = now
    this.animation = animation
  }

  // A change that the runs of this track didn't make: the track can't follow it.
  onUpdate(): void {
    for (const run of writing) if (this.runs.has(run)) return
    const moved = [...this.runs.keys()]
    this.cancel()
    for (const run of moved) run.toFrameLoop()
  }

  rebuild(): void {
    this.build()
  }

  cancel(): void {
    this.animation?.cancel()
    this.animation = null
    if (this.leaf.track === this) this.leaf.track = null
    for (const run of this.runs.keys()) run.forget(this.leaf)
    this.runs.clear()
  }
}

// One `timing` or `spring` on the Web Animations driver. It plays on the track of each leaf, and a
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
    return Math.max(0, clock() - this.start)
  }

  endValue(): number {
    return this.curve.valueAt(this.curve.duration)
  }

  // The value at the time `time` of the clock.
  valueAt(time: number): number {
    return this.curve.valueAt(Math.max(0, time - this.start))
  }

  liveValue(): number | undefined {
    return this.mode === 'ended' ? undefined : this.curve.valueAt(this.elapsed())
  }

  // Joins the track of each new leaf of `plan`, and leaves the tracks of the leaves that left.
  place(plan: Plan): void {
    for (const [leaf, track] of this.tracks) {
      if (plan.has(leaf)) continue
      this.tracks.delete(leaf)
      track.remove(this)
    }
    for (const [leaf, properties] of plan) {
      if (this.tracks.has(leaf)) continue
      const track = leaf.track instanceof Track ? leaf.track : new Track(leaf)
      this.tracks.set(leaf, track)
      track.add(this, properties)
    }
  }

  // A leaf that mounted during the run joins it, or the run moves to the frame loop.
  replan(): void {
    if (this.mode !== 'native') return
    const plan = planOf(this.value)
    if (plan === null || !fitsBudget(this.curve.duration - this.elapsed(), plan.size)) {
      this.toFrameLoop()
    } else {
      this.place(plan)
    }
  }

  forget(leaf: AnimatedProps): void {
    this.tracks.delete(leaf)
  }

  toFrameLoop(): void {
    if (this.mode !== 'native') return
    this.mode = 'frames'
    this.leaveTracks()
  }

  startFrames(): void {
    this.frame = requestAnimationFrame(this.onFrame)
  }

  // Ends the run, writes the value at the time of the stop, and gives that time.
  stop(): number {
    const elapsed = this.elapsed()
    this.end(this.curve.valueAt(elapsed))
    return elapsed
  }

  private readonly onFrame = (): void => {
    const elapsed = this.elapsed()
    if (elapsed >= this.curve.duration) {
      this.end(this.endValue())
      this.onFinish()
      return
    }
    if (this.mode === 'frames') this.write(this.curve.valueAt(elapsed))
    else if (hasListeners(this.value)) this.value.__callListeners(this.value.__getValue())
    this.frame = requestAnimationFrame(this.onFrame)
  }

  // The tracks hold their frame until the value is in the inline style, in the same task, so no
  // frame shows the old inline style. Then a track with other runs builds again from this value.
  private end(value: number): void {
    this.mode = 'ended'
    runs.delete(this)
    if (this.frame !== undefined) cancelAnimationFrame(this.frame)
    this.write(value)
    this.leaveTracks()
  }

  private write(value: number): void {
    writing.add(this)
    try {
      this.setValue(value)
    } finally {
      writing.delete(this)
    }
  }

  private leaveTracks(): void {
    for (const [leaf, track] of this.tracks) {
      this.tracks.delete(leaf)
      track.remove(this)
    }
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
  if (!hasWebAnimations()) return null
  const plan = planOf(value)
  if (plan === null || plan.size === 0) return null
  const maxSamples = Math.floor(SAMPLE_BUDGET / plan.size)
  const curve = makeCurve((maxSamples - 1) * FRAME_MS)
  if (curve === null || curve.duration <= 0 || !fitsBudget(curve.duration, plan.size)) return null
  const run = new NativeRun(value, curve, clock(), setValue, onFinish)
  run.place(plan)
  runs.add(run)
  run.startFrames()
  return run
}

// A leaf that mounts can join a run of a value that it reads.
export const adoptLeaf = (): void => {
  for (const run of runs) run.replan()
}
