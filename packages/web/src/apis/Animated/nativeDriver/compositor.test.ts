import type { CDPSession } from '@vitest/browser-playwright'
import { afterEach, describe, expect, test } from 'vitest'
import { cdp, server } from 'vitest/browser'

import { AnimatedProps } from '../nodes/AnimatedProps'
import { AnimatedValue } from '../nodes/AnimatedValue'
import { buildKeyframes } from './keyframes'

type TraceEvent = Readonly<{
  name?: string
  id?: string
  id2?: Readonly<{ local?: string }>
  args?: Readonly<{ data?: Readonly<{ nodeName?: string; compositeFailed?: number }> }>
}>

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()))

const idOf = (event: TraceEvent): string | undefined => event.id2?.local ?? event.id

// The `Animation` events of the Web Animation on the element `tag`, in a Chromium trace of `run`.
// When the compositor of Chromium can't run an animation, Chromium logs an event with the reasons
// in `compositeFailed`. The Performance panel of Chrome reads the same events.
const traceOf = async (tag: string, run: () => Promise<void>): Promise<TraceEvent[]> => {
  const session: CDPSession = cdp()
  const events: TraceEvent[] = []
  const collect = (payload: { value: readonly TraceEvent[] }): void => {
    events.push(...payload.value)
  }
  session.on('Tracing.dataCollected', collect)
  await session.send('Tracing.start', {
    traceConfig: { includedCategories: ['devtools.timeline'] },
    transferMode: 'ReportEvents',
  })
  await run()
  // Not `session.once`: in Vitest 5.0.5, its handler removes a listener that the server dropped
  // already, and that error fails the run after the test.
  const complete = new Promise<void>((resolve) => {
    const done = (): void => {
      session.off('Tracing.tracingComplete', done)
      resolve()
    }
    session.on('Tracing.tracingComplete', done)
  })
  await session.send('Tracing.end')
  await complete
  session.off('Tracing.dataCollected', collect)

  const animations = events.filter((event) => event.name === 'Animation')
  const start = animations.find((event) => event.args?.data?.nodeName === tag.toUpperCase())
  return start === undefined ? [] : animations.filter((event) => idOf(event) === idOf(start))
}

// Runs `keyframes` for two frames on a new box with its own tag name, which the trace logs.
const play = async (tag: string, keyframes: Keyframe[]): Promise<void> => {
  const box = document.createElement(tag)
  Object.assign(box.style, {
    display: 'block',
    width: '40px',
    height: '40px',
    backgroundColor: 'red',
  })
  document.body.append(box)
  const animation = box.animate(keyframes, {
    duration: 500,
    easing: 'linear',
    fill: 'forwards',
  })
  await animation.ready
  await nextFrame()
  await nextFrame()
  animation.cancel()
}

const compositeResults = (events: readonly TraceEvent[]): number[] =>
  events.flatMap((event) => {
    const failed = event.args?.data?.compositeFailed
    return failed === undefined ? [] : [failed]
  })

afterEach(() => {
  document.body.replaceChildren()
})

describe.runIf(server.browser === 'chromium')('in Chromium', () => {
  test('the compositor runs the keyframes of transform and opacity', async () => {
    const value = new AnimatedValue(0)
    const style = {
      opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
      transform: [
        { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }) },
        { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) },
      ],
    }
    const leaf = new AnimatedProps({ style })
    leaf.__attach()
    const keyframes = buildKeyframes(
      leaf,
      style,
      ['transform', 'opacity'],
      [{ value, curve: { duration: 500, valueAt: (time) => Math.min(1, time / 500) } }],
      500,
    )

    const events = await traceOf('track-probe', () => play('track-probe', keyframes))

    expect(events.length).toBeGreaterThan(0)
    expect(compositeResults(events)).toEqual([])
  })

  test('the compositor fails on width, so the test above can fail', async () => {
    const events = await traceOf('width-probe', () =>
      play('width-probe', [{ width: '40px' }, { width: '80px' }]),
    )

    const results = compositeResults(events)
    expect(results).toHaveLength(1)
    expect(results[0]).not.toBe(0)
  })
})
