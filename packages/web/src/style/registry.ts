import { hasDOM } from '../utils/env'
import type { CSSDeclarations } from './types'

// Two style elements: shorthand rules first, longhand rules after them. With equal
// specificity the later sheet wins, so a longhand always beats a shorthand, as on native.
export const SHORTHAND_STYLE_ID = 'rootnative-style-shorthand'
export const LONGHAND_STYLE_ID = 'rootnative-style-longhand'

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

const hash = (input: string): string => {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

export type StyleSheets = { shorthand: CSSStyleSheet | null; longhand: CSSStyleSheet | null }

export class StyleRegistry {
  private readonly classNames = new Map<string, string>()
  private readonly adopted = new Set<string>()
  private readonly shorthandRules: string[] = []
  private readonly longhandRules: string[] = []
  private readonly sheets: StyleSheets

  constructor(sheets: StyleSheets = { shorthand: null, longhand: null }) {
    this.sheets = sheets
    this.adopt(sheets.shorthand)
    this.adopt(sheets.longhand)
  }

  classFor(property: string, value: string): string {
    const key = `${property}:${value}`
    const known = this.classNames.get(key)
    if (known !== undefined) return known

    const className = `rn-${hash(key)}`
    this.classNames.set(key, className)

    const shorthand = isShorthandProperty(property)
    const rule = `.${className}{${toKebab(property)}:${value}}`
    const rules = shorthand ? this.shorthandRules : this.longhandRules
    rules.push(rule)

    if (!this.adopted.has(className)) {
      const sheet = shorthand ? this.sheets.shorthand : this.sheets.longhand
      sheet?.insertRule(rule, sheet.cssRules.length)
    }
    return className
  }

  classesFor(declarations: CSSDeclarations): string {
    const names: string[] = []
    for (const property in declarations) {
      names.push(this.classFor(property, declarations[property] as string))
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
    return className
  }

  // The rules of each sheet, for server rendering.
  cssText(): { shorthand: string; longhand: string } {
    return { shorthand: this.shorthandRules.join('\n'), longhand: this.longhandRules.join('\n') }
  }

  get ruleCount(): number {
    return this.shorthandRules.length + this.longhandRules.length
  }

  // Remembers the class names the server already rendered, so the client does not insert them again.
  private adopt(sheet: CSSStyleSheet | null): void {
    if (sheet === null) return
    for (const rule of Array.from(sheet.cssRules)) {
      if (rule instanceof CSSStyleRule) this.adopted.add(rule.selectorText.slice(1))
    }
  }
}

let defaultRegistry: StyleRegistry | null = null

export const getStyleRegistry = (): StyleRegistry => {
  if (defaultRegistry !== null) return defaultRegistry
  defaultRegistry = new StyleRegistry(
    hasDOM()
      ? { shorthand: domSheet(SHORTHAND_STYLE_ID), longhand: domSheet(LONGHAND_STYLE_ID) }
      : { shorthand: null, longhand: null },
  )
  return defaultRegistry
}

// For tests, so each file starts with an empty registry.
export const resetStyleRegistry = (): void => {
  defaultRegistry = null
  if (!hasDOM()) return
  document.getElementById(SHORTHAND_STYLE_ID)?.remove()
  document.getElementById(LONGHAND_STYLE_ID)?.remove()
}

const domSheet = (id: string): CSSStyleSheet => {
  let element = document.getElementById(id) as HTMLStyleElement | null
  if (element === null) {
    element = document.createElement('style')
    element.id = id
    document.head.appendChild(element)
  }
  return element.sheet as CSSStyleSheet
}
