// The page of the style delivery benchmark. `bench-styles.mjs` opens a new page for each sample,
// so each sample starts with no style rule, and calls `window.bench.run` one time.

import { useLayoutEffect, type ReactElement, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'

import { View } from '../../../packages/web/src/components/View'
import type { ViewProps } from '../../../packages/web/src/components/View/types'
import { StyleRegistryContext } from '../../../packages/web/src/style/StyleRegistryContext'
import { renderAsServer } from '../../../packages/web/src/utils/env'
import { HoistedView, hoistingRegistry, StyleOrder } from './HoistedView'

export type Variant = 'library' | 'hoisted' | 'plain'
export type Scenario = 'mount' | 'mount-unique' | 'rerender' | 'update-new' | 'hydrate' | 'server'
// `width` is the computed width of the first view after the sample, so the driver can check that
// the styles reached the page. For `server`, it is `10px` when the HTML has the rule of the
// first view.
export type Sample = { script: number; total: number; width: string }

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6']

// A pool of values gives a few classes that many views share. A unique value gives each view
// a new class. `offset` keeps the unique values of two renders apart.
type Values = { kind: 'pool' } | { kind: 'unique'; offset: number }

const styleOf = (i: number, values: Values): ViewProps['style'] => ({
  width: values.kind === 'pool' ? 10 + (i % 20) : 1000 + values.offset + i,
  height: 8,
  backgroundColor: COLORS[i % COLORS.length],
  margin: i % 3,
  padding: 2,
})

// The floor: React renders the same elements with a fixed class and no style work.
function PlainView({ children }: ViewProps): ReactElement {
  return <div className="plain">{children}</div>
}

const components = { library: View, hoisted: HoistedView, plain: PlainView } as const

// A hydration is a render that React schedules, so its sample ends in the layout phase of the
// commit, where this calls `onCommit`.
let onCommit: (() => void) | null = null

function Committed(): null {
  useLayoutEffect(() => {
    onCommit?.()
  })
  return null
}

function Grid(props: { n: number; variant: Variant; values: Values; label: string }): ReactNode {
  const Component = components[props.variant]
  const items: ReactElement[] = []
  for (let i = 0; i < props.n; i++) {
    items.push(
      <Component key={i} style={styleOf(i, props.values)}>
        {props.label}
      </Component>,
    )
  }
  items.push(<Committed key="committed" />)
  if (props.variant !== 'hoisted') return items
  return (
    <StyleRegistryContext value={hoistingRegistry}>
      <StyleOrder />
      {items}
    </StyleRegistryContext>
  )
}

const container = document.getElementById('root') as HTMLElement

// A server render can put style elements before the first view.
const firstViewWidth = (): string => {
  const first = container.querySelector(':scope > :not(style)')
  return first === null ? '' : getComputedStyle(first).width
}

// The time of the render and the commit, and the time with the style and layout work that a
// read of `offsetHeight` forces.
const measure = (render: () => void): Sample => {
  const start = performance.now()
  flushSync(render)
  const committed = performance.now()
  void container.offsetHeight
  return { script: committed - start, total: performance.now() - start, width: firstViewWidth() }
}

const measureCommit = (start: () => void): Promise<Sample> =>
  new Promise((resolve) => {
    const begin = performance.now()
    onCommit = () => {
      onCommit = null
      const committed = performance.now()
      void container.offsetHeight
      const total = performance.now() - begin
      resolve({ script: committed - begin, total, width: firstViewWidth() })
    }
    start()
  })

// The HTML that a server sends. The library's `View` takes its server path inside
// `renderAsServer`, and `hoisted` renders its style elements in each render.
const serverHTML = (variant: Variant, element: ReactElement): string =>
  variant === 'library' ? renderAsServer(() => renderToString(element)) : renderToString(element)

async function run(scenario: Scenario, variant: Variant, n: number): Promise<Sample> {
  const grid = (values: Values, label: string): ReactElement => (
    <Grid n={n} variant={variant} values={values} label={label} />
  )
  const warmValues: Values = { kind: 'unique', offset: 5 * n }
  // A warm-up with values that no scenario uses, so the code paths run once before the sample.
  const warmUp = (target: HTMLElement) => {
    const root = createRoot(target)
    flushSync(() => root.render(grid(warmValues, 'w')))
    flushSync(() => root.render(null))
    void target.offsetHeight
    return root
  }

  if (scenario === 'server') {
    serverHTML(variant, grid(warmValues, 'w'))
    const start = performance.now()
    const html = serverHTML(variant, grid({ kind: 'pool' }, 'a'))
    const time = performance.now() - start
    return { script: time, total: time, width: html.includes('{width:10px}') ? '10px' : '' }
  }

  if (scenario === 'hydrate') {
    const element = grid({ kind: 'pool' }, 'a')
    container.innerHTML = serverHTML(variant, element)
    // The warm-up runs in its own element, after the server HTML is in the page, as the client
    // code of a real page starts.
    const other = document.createElement('div')
    document.body.append(other)
    warmUp(other).unmount()
    other.remove()
    return measureCommit(() => hydrateRoot(container, element))
  }

  const root = warmUp(container)
  switch (scenario) {
    case 'mount':
      return measure(() => root.render(grid({ kind: 'pool' }, 'a')))
    case 'mount-unique':
      return measure(() => root.render(grid({ kind: 'unique', offset: 0 }, 'a')))
    case 'rerender':
      flushSync(() => root.render(grid({ kind: 'pool' }, 'a')))
      void container.offsetHeight
      return measure(() => root.render(grid({ kind: 'pool' }, 'b')))
    case 'update-new':
      flushSync(() => root.render(grid({ kind: 'pool' }, 'a')))
      void container.offsetHeight
      return measure(() => root.render(grid({ kind: 'unique', offset: n }, 'a')))
  }
}

declare global {
  interface Window {
    bench: { run: typeof run }
  }
}

window.bench = { run }
