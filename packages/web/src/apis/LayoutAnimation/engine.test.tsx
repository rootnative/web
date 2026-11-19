import type { ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { View } from '../../components/View'
import { installFakeMatchMedia } from '../../test/matchMedia'
import { cleanup, render } from '../../test/render'
import { LayoutAnimation } from './index'

afterEach(() => {
  cleanup()
  LayoutAnimation.setEnabled(true)
})

// The observer of the engine runs in a microtask after React's commit.
const afterCommit = (): Promise<void> => new Promise((resolve) => queueMicrotask(resolve))

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const byTestId = (container: HTMLElement, id: string): HTMLElement =>
  container.querySelector(`[data-testid="${id}"]`) as HTMLElement

// The box of an element at the start of its animations.
const boxAtStart = (element: HTMLElement): DOMRect => {
  for (const animation of element.getAnimations()) {
    animation.pause()
    animation.currentTime = 0
  }
  return element.getBoundingClientRect()
}

const timingOf = (element: HTMLElement): EffectTiming | undefined =>
  element.getAnimations()[0]?.effect?.getTiming()

// A column: a spacer of `gap` px, an optional new block with a child, then a box.
const Column = ({ gap, extra = false }: { gap: number; extra?: boolean }): ReactNode => (
  <View style={{ position: 'absolute', top: 0, left: 0, width: 100 }}>
    <View style={{ height: gap }} />
    {extra ? (
      <View testID="new" style={{ height: 10 }}>
        <View testID="new-child" style={{ height: 5 }} />
      </View>
    ) : null}
    <View testID="group" style={{ transform: [{ translateX: 30 }] }}>
      <View testID="box" style={{ height: 20 }} />
    </View>
  </View>
)

// A box at `top` px.
const Far = ({ top }: { top: number }): ReactNode => (
  <View>
    <View testID="far" style={{ position: 'absolute', top, height: 10, width: 10 }} />
  </View>
)

describe('a move', () => {
  test('starts at the old place, with the duration, easing, and fill of update', async () => {
    const { container, rerender } = render(<Column gap={0} />)
    const group = byTestId(container, 'group')
    const before = group.getBoundingClientRect()

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    rerender(<Column gap={50} />)
    await afterCommit()

    expect(timingOf(group)).toMatchObject({ duration: 300, delay: 0, fill: 'backwards' })
    expect(timingOf(group)?.easing).toContain('linear(')
    expect(boxAtStart(group).top).toBeCloseTo(before.top, 1)

    for (const animation of group.getAnimations()) animation.finish()
    expect(group.getBoundingClientRect().top).toBeCloseTo(before.top + 50, 1)
  })

  test('a child that moves with its parent gets no animation of its own', async () => {
    const { container, rerender } = render(<Column gap={0} />)
    const box = byTestId(container, 'box')
    const before = box.getBoundingClientRect()

    LayoutAnimation.configureNext(LayoutAnimation.Presets.linear)
    rerender(<Column gap={40} />)
    await afterCommit()

    expect(box.getAnimations()).toHaveLength(0)
    expect(byTestId(container, 'group').getAnimations()).toHaveLength(1)
    boxAtStart(byTestId(container, 'group'))
    expect(box.getBoundingClientRect().top).toBeCloseTo(before.top, 1)
  })

  test("keeps the element's own transform", async () => {
    const { container, rerender } = render(<Column gap={0} />)
    const group = byTestId(container, 'group')

    LayoutAnimation.configureNext(LayoutAnimation.Presets.linear)
    rerender(<Column gap={50} />)
    await afterCommit()
    boxAtStart(group)

    expect(getComputedStyle(group).transform).toBe('matrix(1, 0, 0, 1, 30, 0)')
    expect(getComputedStyle(group).translate).toBe('0px -50px')
  })

  test('takes the duration and delay of the kind, and no update kind moves nothing', async () => {
    const { container, rerender } = render(<Column gap={0} />)
    const group = byTestId(container, 'group')

    LayoutAnimation.configureNext({
      duration: 300,
      update: { type: 'linear', duration: 200, delay: 100 },
    })
    rerender(<Column gap={50} />)
    await afterCommit()
    expect(timingOf(group)).toMatchObject({ duration: 200, delay: 100, easing: 'linear' })

    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: 'linear', property: 'opacity' },
    })
    rerender(<Column gap={0} />)
    await afterCommit()
    expect(group.getAnimations()).toHaveLength(0)
  })

  test('an element out of the window before and after gets no animation', async () => {
    const { container, rerender } = render(<Far top={window.innerHeight + 100} />)
    const far = byTestId(container, 'far')

    LayoutAnimation.configureNext(LayoutAnimation.Presets.linear)
    rerender(<Far top={window.innerHeight + 200} />)
    await afterCommit()
    expect(far.getAnimations()).toHaveLength(0)

    LayoutAnimation.configureNext(LayoutAnimation.Presets.linear)
    rerender(<Far top={10} />)
    await afterCommit()
    expect(far.getAnimations()).toHaveLength(1)
  })

  test('a new layout animation goes on from where the element is', async () => {
    const { container, rerender } = render(<Column gap={0} />)
    const group = byTestId(container, 'group')

    LayoutAnimation.configureNext({ duration: 1000, update: { type: 'linear' } })
    rerender(<Column gap={50} />)
    await afterCommit()
    const [old] = group.getAnimations()
    old?.pause()
    if (old) old.currentTime = 500
    const halfway = group.getBoundingClientRect()

    LayoutAnimation.configureNext({ duration: 1000, update: { type: 'linear' } })
    rerender(<Column gap={0} />)
    await afterCommit()

    expect(old?.playState).toBe('idle')
    expect(boxAtStart(group).top).toBeCloseTo(halfway.top, 1)
  })
})

describe('a new element', () => {
  test('animates its property, and its children come with it', async () => {
    const { container, rerender } = render(<Column gap={0} />)

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    rerender(<Column gap={0} extra />)
    await afterCommit()

    const added = byTestId(container, 'new')
    const keyframes = added.getAnimations()[0]?.effect
    expect((keyframes as KeyframeEffect).getKeyframes().map((frame) => frame['opacity'])).toEqual([
      '0',
      '1',
    ])
    expect(byTestId(container, 'new-child').getAnimations()).toHaveLength(0)
    expect(byTestId(container, 'group').getAnimations()).toHaveLength(1)
  })

  test.each([
    ['scaleX', 0, 10],
    ['scaleY', 100, 0],
    ['scaleXY', 0, 0],
  ] as const)(
    'with %s, starts at a width of %i and a height of %i',
    async (property, width, height) => {
      const { container, rerender } = render(<Column gap={0} />)

      LayoutAnimation.configureNext(LayoutAnimation.create(200, 'linear', property))
      rerender(<Column gap={0} extra />)
      await afterCommit()

      const box = boxAtStart(byTestId(container, 'new'))
      expect([box.width, box.height]).toEqual([width, height])
    },
  )
})

describe('the callback and the switches', () => {
  test('onAnimationDidEnd runs once, when the animations end', async () => {
    const { container, rerender } = render(<Column gap={0} />)
    const onEnd = vi.fn()

    LayoutAnimation.configureNext({ duration: 60, update: { type: 'linear' } }, onEnd)
    rerender(<Column gap={50} />)
    await afterCommit()
    expect(onEnd).not.toHaveBeenCalled()

    for (const animation of byTestId(container, 'group').getAnimations()) animation.finish()
    await vi.waitFor(() => expect(onEnd).toHaveBeenCalledOnce())
    await wait(120)
    expect(onEnd).toHaveBeenCalledOnce()
  })

  test('with reduced motion, nothing animates and onAnimationDidEnd still runs', async () => {
    const media = installFakeMatchMedia()
    media.get('(prefers-reduced-motion: reduce)').set(true)
    try {
      const { container, rerender } = render(<Column gap={0} />)
      const onEnd = vi.fn()

      LayoutAnimation.configureNext({ duration: 30, update: { type: 'linear' } }, onEnd)
      rerender(<Column gap={50} />)
      await afterCommit()

      expect(byTestId(container, 'group').getAnimations()).toHaveLength(0)
      await vi.waitFor(() => expect(onEnd).toHaveBeenCalledOnce())
    } finally {
      media.restore()
    }
  })

  test('after setEnabled(false), nothing animates and onAnimationDidEnd still runs', async () => {
    const { container, rerender } = render(<Column gap={0} />)
    const onEnd = vi.fn()

    LayoutAnimation.setEnabled(false)
    LayoutAnimation.configureNext({ duration: 30, update: { type: 'linear' } }, onEnd)
    rerender(<Column gap={50} />)
    await afterCommit()

    expect(byTestId(container, 'group').getAnimations()).toHaveLength(0)
    await vi.waitFor(() => expect(onEnd).toHaveBeenCalledOnce())
  })

  test('setEnabled(false) drops a config that waits for its commit', async () => {
    const { container, rerender } = render(<Column gap={0} />)

    LayoutAnimation.configureNext({ duration: 300, update: { type: 'linear' } })
    LayoutAnimation.setEnabled(false)
    rerender(<Column gap={50} />)
    await afterCommit()

    expect(byTestId(container, 'group').getAnimations()).toHaveLength(0)
  })

  test('a config with no commit before its timer lapses', async () => {
    const { container, rerender } = render(<Column gap={0} />)

    LayoutAnimation.configureNext({ duration: 20, update: { type: 'linear' } })
    await wait(80)
    rerender(<Column gap={50} />)
    await afterCommit()

    expect(byTestId(container, 'group').getAnimations()).toHaveLength(0)
  })

  test('a second configureNext before the commit replaces the config', async () => {
    const { container, rerender } = render(<Column gap={0} />)

    LayoutAnimation.configureNext({ duration: 300, update: { type: 'linear' } })
    LayoutAnimation.configureNext({ duration: 100, update: { type: 'linear' } })
    rerender(<Column gap={50} />)
    await afterCommit()

    expect(timingOf(byTestId(container, 'group'))?.duration).toBe(100)
  })
})
