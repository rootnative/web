import { hasDOM, isServerRender } from '../utils/env'
import type { CSSDeclarations } from './types'

// Three groups of style elements, and with equal specificity the later group wins:
// - the reset rules of the components, which stand for the defaults of native layout,
// - the shorthand rules of the app's styles,
// - the longhand rules of the app's styles.
// So any style of the app beats a default, and a longhand always beats a shorthand, as on native.
// They are React 19's groups: React puts a `<style href precedence>` element of a server render
// into the group of its `data-precedence`, so the server's elements and the client's rules share
// the same groups.
export const RESET_PRECEDENCE = 'rootnative-reset'
export const SHORTHAND_PRECEDENCE = 'rootnative-shorthand'
export const LONGHAND_PRECEDENCE = 'rootnative-longhand'

export const PRECEDENCE_ORDER: readonly [
  typeof RESET_PRECEDENCE,
  typeof SHORTHAND_PRECEDENCE,
  typeof LONGHAND_PRECEDENCE,
] = [RESET_PRECEDENCE, SHORTHAND_PRECEDENCE, LONGHAND_PRECEDENCE]

const shorthandProperties: ReadonlySet<string> = new Set([
  'border',
  'borderBlock',
  'borderColor',
  'borderInline',
  'borderRadius',
  'borderStyle',
  'borderWidth',
  'flex',
  'flexFlow',
  'gap',
  'inset',
  'insetBlock',
  'insetInline',
  'margin',
  'marginBlock',
  'marginInline',
  'outline',
  'overflow',
  'padding',
  'paddingBlock',
  'paddingInline',
  'textDecoration',
])

export const isShorthandProperty = (name: string): boolean => shorthandProperties.has(name)

const toKebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

const leadingClass = /^\.([\w-]+)/

const hash = (input: string): string => {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

export type StyleSheets = {
  reset: CSSStyleSheet | null
  shorthand: CSSStyleSheet | null
  longhand: CSSStyleSheet | null
}

// The place of a rule in `PRECEDENCE_ORDER`: reset, shorthand, or longhand.
export type StyleLevel = 0 | 1 | 2

export type ClassRules = { level: StyleLevel; css: string }

export class StyleRegistry {
  private readonly classNames = new Map<string, string>()
  private readonly classRules = new Map<string, ClassRules>()
  private readonly adopted = new Set<string>()
  private readonly resetRules: string[] = []
  private readonly shorthandRules: string[] = []
  private readonly longhandRules: string[] = []
  private readonly sheets: StyleSheets
  private readonly madeValues = new Map<string, number>()
  private readonly maxValuesOfProperty: number

  // `adopted` are the sheets whose rules the page already has: by default, the three sheets.
  // `maxValuesOfProperty` is the cap of `classFor`. A registry has none by default, and a server
  // must have none: one registry serves each page of the process, so a count there has nothing
  // to do with the rules that one page gets, and the browser can't make the same decision.
  constructor(
    sheets: StyleSheets = { reset: null, shorthand: null, longhand: null },
    adopted: ReadonlyArray<CSSStyleSheet | null> = [
      sheets.reset,
      sheets.shorthand,
      sheets.longhand,
    ],
    maxValuesOfProperty: number = Infinity,
  ) {
    this.sheets = sheets
    this.maxValuesOfProperty = maxValuesOfProperty
    for (const sheet of adopted) this.adopt(sheet)
  }

  // The atomic class of one declaration. With `inline`, a longhand value past the cap of its
  // property gets no rule: the declaration goes into `inline`, for the `style` attribute.
  classFor(property: string, value: string): string
  classFor(property: string, value: string, inline: CSSDeclarations | undefined): string | undefined
  classFor(property: string, value: string, inline?: CSSDeclarations): string | undefined {
    const key = `${property}:${value}`
    const known = this.classNames.get(key)
    if (known !== undefined) return known

    const className = `rn-${hash(key)}`
    const shorthand = isShorthandProperty(property)
    const adopted = this.adopted.has(className)
    if (!adopted && !shorthand) {
      const made = this.madeValues.get(property) ?? 0
      if (inline !== undefined && made >= this.maxValuesOfProperty) {
        inline[property] = value
        return undefined
      }
      this.madeValues.set(property, made + 1)
    }
    this.classNames.set(key, className)

    const rule = `.${className}{${toKebab(property)}:${value}}`
    const rules = shorthand ? this.shorthandRules : this.longhandRules
    rules.push(rule)
    this.classRules.set(className, { level: shorthand ? 1 : 2, css: rule })

    if (!adopted) {
      const sheet = shorthand ? this.sheets.shorthand : this.sheets.longhand
      sheet?.insertRule(rule, sheet.cssRules.length)
    }
    return className
  }

  classesFor(declarations: CSSDeclarations, inline?: CSSDeclarations): string {
    const names: string[] = []
    for (const property in declarations) {
      const name = this.classFor(property, declarations[property] as string, inline)
      if (name !== undefined) names.push(name)
    }
    return names.join(' ')
  }

  // Inserts a fixed set of rules under one class name, once. For rules an atomic
  // declaration cannot express, for example a child selector.
  staticClass(className: string, rules: ReadonlyArray<string>): string {
    if (this.classNames.has(className)) return className
    this.classNames.set(className, className)
    for (const rule of rules) {
      this.longhandRules.push(rule)
      if (!this.adopted.has(className)) {
        const sheet = this.sheets.longhand
        sheet?.insertRule(rule, sheet.cssRules.length)
      }
    }
    this.classRules.set(className, { level: 2, css: rules.join('') })
    return className
  }

  // True for a class of `staticClass`, `resetClass`, or `resetClassRules` that this registry
  // already has.
  hasClass(className: string): boolean {
    return this.classNames.has(className)
  }

  // Inserts the default style of a component as one rule in the reset sheet, once. Its class
  // name is its own, never an atomic one, so a style of the app with the same declaration
  // still gets an atomic class that beats the default.
  resetClass(className: string, declarations: CSSDeclarations): string {
    return this.resetClassRules(className, [[`.${className}`, declarations]])
  }

  // As `resetClass`, with one rule for each selector, in this order. Each selector starts with
  // the class and adds no weight to it, for example with `:where()`, so the app's styles still
  // win.
  resetClassRules(
    className: string,
    rules: ReadonlyArray<readonly [selector: string, declarations: CSSDeclarations]>,
  ): string {
    if (this.classNames.has(className)) return className
    this.classNames.set(className, className)
    const css: string[] = []
    for (const [selector, declarations] of rules) {
      const body = Object.entries(declarations)
        .map(([property, value]) => `${toKebab(property)}:${value}`)
        .join(';')
      const rule = `${selector}{${body}}`
      css.push(rule)
      this.resetRules.push(rule)
      if (!this.adopted.has(className)) {
        const sheet = this.sheets.reset
        sheet?.insertRule(rule, sheet.cssRules.length)
      }
    }
    this.classRules.set(className, { level: 0, css: css.join('') })
    return className
  }

  // The CSS of a class of this registry and its level, for the style element of a server render.
  rulesOf(className: string): ClassRules | undefined {
    return this.classRules.get(className)
  }

  get size(): number {
    return this.classNames.size
  }

  // The rules of each sheet, for server rendering.
  cssText(): { reset: string; shorthand: string; longhand: string } {
    return {
      reset: this.resetRules.join('\n'),
      shorthand: this.shorthandRules.join('\n'),
      longhand: this.longhandRules.join('\n'),
    }
  }

  get ruleCount(): number {
    return this.resetRules.length + this.shorthandRules.length + this.longhandRules.length
  }

  // Remembers the class names the server already rendered, so the client does not insert them again.
  // The class of a rule is the class at the start of its selector, also for `.a::selection` or
  // `.a:where(.a>*)`.
  private adopt(sheet: CSSStyleSheet | null): void {
    if (sheet === null) return
    for (const rule of Array.from(sheet.cssRules)) {
      if (!(rule instanceof CSSStyleRule)) continue
      const className = leadingClass.exec(rule.selectorText)?.[1]
      if (className !== undefined) this.adopted.add(className)
    }
  }
}

let clientRegistry: StyleRegistry | null = null
let serverRegistry: StyleRegistry | null = null

// On a server, one registry serves each render of the process: a class name is a hash of its
// declaration, so its rule never differs between two renders. Past this many classes it starts
// again, so that a server with many dynamic values doesn't grow without end.
export const MAX_SERVER_CLASSES = 20_000

// In the browser, the rules that the registry makes for one longhand property. A style that
// React state moves through many values, such as the position of a slider thumb, would add a
// rule for each value, and no rule ever goes. Past this number, a new value goes into the
// `style` attribute. A rule from the server doesn't count, and a known value keeps its class.
// A shorthand has no cap: an inline shorthand would beat a longhand class of the same element.
export const MAX_VALUES_OF_PROPERTY = 64

export const getStyleRegistry = (): StyleRegistry => {
  if (isServerRender()) {
    if (serverRegistry === null || serverRegistry.size > MAX_SERVER_CLASSES) {
      serverRegistry = new StyleRegistry()
    }
    return serverRegistry
  }
  clientRegistry ??= domRegistry()
  return clientRegistry
}

const groupElements = (precedence: string): HTMLStyleElement[] =>
  Array.from(document.querySelectorAll<HTMLStyleElement>(`style[data-precedence="${precedence}"]`))

// For tests, so each file starts with empty registries.
export const resetStyleRegistry = (): void => {
  clientRegistry = null
  serverRegistry = null
  if (!hasDOM()) return
  for (const element of PRECEDENCE_ORDER.flatMap(groupElements)) element.remove()
}

// The registry writes into the last element of each group, and adopts the rules of every
// element of the groups. A server render can give a group more than one element. A group that
// the page doesn't have gets a new element after the earlier groups, or before the later ones.
const domRegistry = (): StyleRegistry => {
  const groups = PRECEDENCE_ORDER.map(groupElements)
  const targets: HTMLStyleElement[] = []
  for (const [index, precedence] of PRECEDENCE_ORDER.entries()) {
    let target = groups[index]?.at(-1)
    if (target === undefined) {
      target = document.createElement('style')
      target.dataset['precedence'] = precedence
      const previous = targets[index - 1]
      const next = groups.slice(index + 1).flat()[0]
      if (previous !== undefined) previous.after(target)
      else if (next !== undefined) next.before(target)
      else document.head.appendChild(target)
    }
    targets.push(target)
  }
  const [reset, shorthand, longhand] = targets.map((target) => target.sheet)
  return new StyleRegistry(
    { reset: reset ?? null, shorthand: shorthand ?? null, longhand: longhand ?? null },
    groups.flat().map((element) => element.sheet),
    MAX_VALUES_OF_PROPERTY,
  )
}
