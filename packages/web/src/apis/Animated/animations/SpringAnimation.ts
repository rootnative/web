/**
 * @license MIT
 * A port of `Libraries/Animated/animations/SpringAnimation.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { FRAME_MS } from '../nativeDriver/curve'
import type { Curve } from '../nativeDriver/curve'
import { startNativeRun } from '../nativeDriver/driver'
import type { NativeRun } from '../nativeDriver/driver'
import type { AnimatedValue } from '../nodes/AnimatedValue'
import { Animation, isMotionReduced, now } from './Animation'
import type { AnimationConfig, EndCallback } from './Animation'
import { fromBouncinessAndSpeed, fromOrigamiTensionAndFriction } from './springConfig'

export type SpringAnimationConfigSingle = Readonly<
  AnimationConfig & {
    toValue: number
    overshootClamping?: boolean | undefined
    restDisplacementThreshold?: number | undefined
    restSpeedThreshold?: number | undefined
    velocity?: number | undefined
    bounciness?: number | undefined
    speed?: number | undefined
    tension?: number | undefined
    friction?: number | undefined
    stiffness?: number | undefined
    damping?: number | undefined
    mass?: number | undefined
    delay?: number | undefined
  }
>

export type SpringAnimationInternalState = Readonly<{
  lastPosition: number
  lastVelocity: number
  lastTime: number
}>

const ONE_KIND =
  'You can define one of bounciness/speed, tension/friction, or stiffness/damping/mass, but not more than one'

// A frame after a long pause, such as a hidden tab, moves the spring by 64 ms at most.
const MAX_STEP_MS = 64

const check = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(message)
}

export class SpringAnimation extends Animation {
  private readonly overshootClamping: boolean
  private readonly restDisplacementThreshold: number
  private readonly restSpeedThreshold: number
  private readonly toValue: number
  private readonly stiffness: number
  private readonly damping: number
  private readonly mass: number
  private readonly delay: number
  private initialVelocity: number
  private lastVelocity: number
  private startPosition = 0
  private lastPosition = 0
  private lastTime = 0
  private frameTime = 0
  private setValue: (value: number) => void = () => {}
  private frame: number | undefined
  private timeout: ReturnType<typeof setTimeout> | undefined
  private native: NativeRun | null = null

  constructor(config: SpringAnimationConfigSingle) {
    super(config)
    this.overshootClamping = config.overshootClamping ?? false
    this.restDisplacementThreshold = config.restDisplacementThreshold ?? 0.001
    this.restSpeedThreshold = config.restSpeedThreshold ?? 0.001
    this.initialVelocity = config.velocity ?? 0
    this.lastVelocity = config.velocity ?? 0
    this.toValue = config.toValue
    this.delay = config.delay ?? 0

    if (
      config.stiffness !== undefined ||
      config.damping !== undefined ||
      config.mass !== undefined
    ) {
      check(
        config.bounciness === undefined &&
          config.speed === undefined &&
          config.tension === undefined &&
          config.friction === undefined,
        ONE_KIND,
      )
      this.stiffness = config.stiffness ?? 100
      this.damping = config.damping ?? 10
      this.mass = config.mass ?? 1
    } else if (config.bounciness !== undefined || config.speed !== undefined) {
      check(config.tension === undefined && config.friction === undefined, ONE_KIND)
      const spring = fromBouncinessAndSpeed(config.bounciness ?? 8, config.speed ?? 12)
      this.stiffness = spring.stiffness
      this.damping = spring.damping
      this.mass = 1
    } else {
      const spring = fromOrigamiTensionAndFriction(config.tension ?? 40, config.friction ?? 7)
      this.stiffness = spring.stiffness
      this.damping = spring.damping
      this.mass = 1
    }

    check(this.stiffness > 0, 'Stiffness value must be greater than 0')
    check(this.damping > 0, 'Damping value must be greater than 0')
    check(this.mass > 0, 'Mass value must be greater than 0')
  }

  override start(
    fromValue: number,
    onUpdate: (value: number) => void,
    onEnd: EndCallback | null | undefined,
    previousAnimation: Animation | null | undefined,
    animatedValue?: AnimatedValue,
  ): void {
    super.start(fromValue, onUpdate, onEnd, previousAnimation)
    this.startPosition = fromValue
    this.lastPosition = fromValue
    this.setValue = onUpdate
    this.lastTime = now()
    this.frameTime = 0

    // A spring that takes over from a spring keeps its position and its speed.
    if (previousAnimation instanceof SpringAnimation) {
      const state = previousAnimation.getInternalState()
      this.lastPosition = state.lastPosition
      this.lastVelocity = state.lastVelocity
      this.initialVelocity = state.lastVelocity
      this.lastTime = state.lastTime
    }

    const start = (): void => {
      if (isMotionReduced()) this.finish()
      else if (!this.startNative(animatedValue)) this.onUpdate()
    }
    if (this.delay) this.timeout = setTimeout(start, this.delay)
    else start()
  }

  getInternalState(): SpringAnimationInternalState {
    return {
      lastPosition: this.lastPosition,
      lastVelocity: this.lastVelocity,
      lastTime: this.lastTime,
    }
  }

  // The closed form of a damped harmonic oscillator, x'' + 2ζω₀x' + ω₀²x = 0, with ω₀ = √(k/m) and
  // ζ = c / 2√(mk), at `t` s after the start. It is the model of CASpringAnimation on iOS.
  private stateAt(t: number): Readonly<{ position: number; velocity: number }> {
    const c = this.damping
    const m = this.mass
    const k = this.stiffness
    const v0 = -this.initialVelocity
    const zeta = c / (2 * Math.sqrt(k * m))
    const omega0 = Math.sqrt(k / m)
    const omega1 = omega0 * Math.sqrt(1 - zeta * zeta)
    const x0 = this.toValue - this.startPosition

    if (zeta < 1) {
      const envelope = Math.exp(-zeta * omega0 * t)
      const sin = Math.sin(omega1 * t)
      const cos = Math.cos(omega1 * t)
      return {
        position: this.toValue - envelope * (((v0 + zeta * omega0 * x0) / omega1) * sin + x0 * cos),
        velocity:
          zeta * omega0 * envelope * ((sin * (v0 + zeta * omega0 * x0)) / omega1 + x0 * cos) -
          envelope * (cos * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin),
      }
    }
    const envelope = Math.exp(-omega0 * t)
    return {
      position: this.toValue - envelope * (x0 + (v0 + omega0 * x0) * t),
      velocity: envelope * (v0 * (t * omega0 - 1) + t * x0 * (omega0 * omega0)),
    }
  }

  // At rest, or past `toValue` with `overshootClamping`.
  private isDone(position: number, velocity: number): boolean {
    const isOvershooting =
      this.overshootClamping &&
      (this.startPosition < this.toValue ? position > this.toValue : position < this.toValue)
    const isResting =
      Math.abs(velocity) <= this.restSpeedThreshold &&
      Math.abs(this.toValue - position) <= this.restDisplacementThreshold
    return isOvershooting || isResting
  }

  // For the Web Animations driver, after `start`. The curve ends on the first 60 Hz frame where the
  // spring is done, and the frame loop ends on the same test. Null for a spring that isn't done
  // within `maxDuration` ms. The time starts after the delay.
  curve(maxDuration: number): Curve | null {
    const frames = Math.floor(maxDuration / FRAME_MS)
    for (let frame = 0; frame <= frames; frame++) {
      const end = frame * FRAME_MS
      const { position, velocity } = this.stateAt(end / 1000)
      if (this.isDone(position, velocity)) {
        return {
          duration: end,
          valueAt: (time) => (time >= end ? this.toValue : this.stateAt(time / 1000).position),
        }
      }
    }
    return null
  }

  private startNative(value: AnimatedValue | undefined): boolean {
    if (!this.useNativeDriver || value === undefined) return false
    this.native = startNativeRun(
      value,
      (maxDuration) => this.curve(maxDuration),
      this.setValue,
      () => {
        this.native = null
        this.finish()
      },
    )
    return this.native !== null
  }

  override liveValue(): number | undefined {
    return this.native?.liveValue()
  }

  onUpdate(): void {
    const time = Math.min(now(), this.lastTime + MAX_STEP_MS)
    this.frameTime += (time - this.lastTime) / 1000
    const { position, velocity } = this.stateAt(this.frameTime)

    this.lastTime = time
    this.lastPosition = position
    this.lastVelocity = velocity
    this.setValue(position)
    if (!this.active) return

    if (this.isDone(position, velocity)) {
      this.finish()
      return
    }
    this.frame = requestAnimationFrame(() => this.onUpdate())
  }

  override stop(): void {
    super.stop()
    clearTimeout(this.timeout)
    if (this.frame !== undefined) cancelAnimationFrame(this.frame)
    const run = this.native
    if (run !== null) {
      // A spring that takes over reads the position and the speed at the stop.
      this.native = null
      const { position, velocity } = this.stateAt(run.stop() / 1000)
      this.lastPosition = position
      this.lastVelocity = velocity
      this.lastTime = now()
      this.setValue(position)
    }
    this.notifyAnimationEnd({ finished: false })
  }

  private finish(): void {
    this.lastPosition = this.toValue
    this.lastVelocity = 0
    this.setValue(this.toValue)
    this.notifyAnimationEnd({ finished: true })
  }
}
