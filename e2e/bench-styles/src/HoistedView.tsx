// The body of `View` with another style delivery: its classes go to the page as React 19
// `<style href precedence>` elements, not as rules that a registry inserts into its own sheets.
// React moves each element into <head>, keeps one for each href, and keeps the three groups in
// the order that it first meets them.

import type { ReactElement } from 'react'

import { useViewElement } from '../../../packages/web/src/components/View'
import type { ViewProps } from '../../../packages/web/src/components/View/types'
import { isShorthandProperty, StyleRegistry } from '../../../packages/web/src/style/registry'
import type { CSSDeclarations } from '../../../packages/web/src/style/types'

export const PRECEDENCE = [
  'rootnative-reset',
  'rootnative-shorthand',
  'rootnative-longhand',
] as const
type Level = 0 | 1 | 2

const toKebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

const toRule = (selector: string, declarations: CSSDeclarations): string =>
  `${selector}{${Object.entries(declarations)
    .map(([property, value]) => `${toKebab(property)}:${value}`)
    .join(';')}}`

// A registry with no style sheet. It keeps the CSS of each class for its style element.
export class HoistingRegistry extends StyleRegistry {
  readonly rules = new Map<string, { level: Level; css: string }>()

  override classFor(property: string, value: string): string {
    const className = super.classFor(property, value)
    if (!this.rules.has(className)) {
      const level = isShorthandProperty(property) ? 1 : 2
      this.rules.set(className, { level, css: toRule(`.${className}`, { [property]: value }) })
    }
    return className
  }

  override resetClassRules(
    className: string,
    rules: ReadonlyArray<readonly [selector: string, declarations: CSSDeclarations]>,
  ): string {
    if (!this.rules.has(className)) {
      const css = rules.map(([selector, declarations]) => toRule(selector, declarations)).join('')
      this.rules.set(className, { level: 0, css })
    }
    return super.resetClassRules(className, rules)
  }

  override staticClass(className: string, rules: ReadonlyArray<string>): string {
    if (!this.rules.has(className)) this.rules.set(className, { level: 2, css: rules.join('') })
    return super.staticClass(className, rules)
  }
}

export const hoistingRegistry = new HoistingRegistry()

// The same class list gives the same elements, so React skips them on a render that keeps them.
const elementsByClassName = new Map<string, readonly ReactElement[]>()

export const styleElements = (className: string): readonly ReactElement[] => {
  let elements = elementsByClassName.get(className)
  if (elements === undefined) {
    elements = className.split(' ').flatMap((name) => {
      const rule = hoistingRegistry.rules.get(name)
      if (rule === undefined) return []
      return [
        <style key={name} href={name} precedence={PRECEDENCE[rule.level]}>
          {rule.css}
        </style>,
      ]
    })
    elementsByClassName.set(className, elements)
  }
  return elements
}

// React orders the groups by the first time it meets each one, so this renders the three groups
// before any component adds a style.
export function StyleOrder(): ReactElement {
  return (
    <>
      {PRECEDENCE.map((precedence) => (
        <style key={precedence} href={`${precedence}-order`} precedence={precedence}>
          {`/* ${precedence} */`}
        </style>
      ))}
    </>
  )
}

// Needs `hoistingRegistry` in `StyleRegistryContext`, so `useViewElement` compiles with it.
export function HoistedView(props: ViewProps): ReactElement {
  const element = useViewElement(props)
  const { className } = element.props as { className: string }
  return (
    <>
      {styleElements(className)}
      {element}
    </>
  )
}
