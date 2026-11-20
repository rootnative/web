// The page of the style delivery benchmark. `bench-styles.mjs` opens a new page for each sample,
// so each sample starts with no style rule, and calls `window.bench.run` one time.

import type { ReactElement, ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { View } from '../../../packages/web/src/components/View'
import type { ViewProps } from '../../../packages/web/src/components/View/types'
import { StyleRegistryContext } from '../../../packages/web/src/style/StyleRegistryContext'
import { HoistedView, hoistingRegistry, StyleOrder } from './HoistedView'

export type Variant = 'registry' | 'hoisted' | 'plain'
export type Scenario = 'mount' | 'mount-unique' | 'rerender' | 'update-new'
// `width` is the computed width of the first view after the sample, so the driver can check that
// the styles reached the page.
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

const components = { registry: View, hoisted: HoistedView, plain: PlainView } as const

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
  if (props.variant !== 'hoisted') return items
  return (
    <StyleRegistryContext value={hoistingRegistry}>
      <StyleOrder />
      {items}
    </StyleRegistryContext>
  )
}

const container = document.getElementById('root') as HTMLElement

// The time of the render and the commit, and the time with the style and layout work that a
// read of `offsetHeight` forces.
const measure = (render: () => void): Sample => {
  const start = performance.now()
  flushSync(render)
  const committed = performance.now()
  void container.offsetHeight
  const total = performance.now() - start
  const first = container.firstElementChild
  const width = first === null ? '' : getComputedStyle(first).width
  return { script: committed - start, total, width }
}

function run(scenario: Scenario, variant: Variant, n: number): Sample {
  const root = createRoot(container)
  const grid = (values: Values, label: string): ReactElement => (
    <Grid n={n} variant={variant} values={values} label={label} />
  )

  // A warm-up with values that no scenario uses, so the code paths run once before the sample.
  flushSync(() => root.render(grid({ kind: 'unique', offset: 5 * n }, 'w')))
  flushSync(() => root.render(null))
  void container.offsetHeight

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
