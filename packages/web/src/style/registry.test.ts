import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { compileReset, compileStyle, MAX_VALUE_NODES } from './compile'
import {
  getStyleRegistry,
  LONGHAND_STYLE_ID,
  RESET_STYLE_ID,
  resetStyleRegistry,
  SHORTHAND_STYLE_ID,
  StyleRegistry,
} from './registry'

const domRules = (id: string): string[] => {
  const element = document.getElementById(id) as HTMLStyleElement
  return Array.from((element.sheet as CSSStyleSheet).cssRules).map((r) => r.cssText)
}

// The order of the classes in an attribute has no effect on the style.
const classSet = (classes: string): Set<string> => new Set(classes.split(' '))

describe('StyleRegistry', () => {
  beforeEach(resetStyleRegistry)
  afterEach(resetStyleRegistry)

  test('returns one class per declaration and dedupes', () => {
    const registry = new StyleRegistry()
    const a = registry.classFor('color', 'rgb(255,0,0)')
    const b = registry.classFor('color', 'rgb(255,0,0)')
    const c = registry.classFor('color', 'rgb(0,0,255)')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toMatch(/^rn-[a-z0-9]+$/)
    expect(registry.ruleCount).toBe(2)
  })

  test('class names are stable across registries', () => {
    expect(new StyleRegistry().classFor('width', '10px')).toBe(
      new StyleRegistry().classFor('width', '10px'),
    )
  })

  test('writes kebab-case rules, split by shorthand and longhand', () => {
    const registry = new StyleRegistry()
    const left = registry.classFor('paddingLeft', '8px')
    const all = registry.classFor('padding', '0')
    expect(registry.cssText()).toEqual({
      reset: '',
      shorthand: `.${all}{padding:0}`,
      longhand: `.${left}{padding-left:8px}`,
    })
  })

  test('writes a reset as one rule under its own class name, once', () => {
    const registry = new StyleRegistry()
    const declarations = { display: 'flex', flexShrink: '0' }
    expect(registry.resetClass('rn-box', declarations)).toBe('rn-box')
    expect(registry.resetClass('rn-box', declarations)).toBe('rn-box')
    expect(registry.cssText().reset).toBe('.rn-box{display:flex;flex-shrink:0}')
    expect(registry.ruleCount).toBe(1)
  })

  test('the default registry inserts rules into three style elements: reset, shorthand, longhand', () => {
    const registry = getStyleRegistry()
    const opacity = registry.classFor('opacity', '0.5')
    const margin = registry.classFor('margin', '0')
    registry.resetClass('rn-box', { flexShrink: '0' })
    expect(domRules(RESET_STYLE_ID)).toEqual(['.rn-box { flex-shrink: 0; }'])
    expect(domRules(SHORTHAND_STYLE_ID)).toEqual([`.${margin} { margin: 0px; }`])
    expect(domRules(LONGHAND_STYLE_ID)).toEqual([`.${opacity} { opacity: 0.5; }`])

    const [reset, short, long] = [RESET_STYLE_ID, SHORTHAND_STYLE_ID, LONGHAND_STYLE_ID].map(
      (id) => document.getElementById(id) as HTMLElement,
    ) as [HTMLElement, HTMLElement, HTMLElement]
    expect(reset.compareDocumentPosition(short) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(short.compareDocumentPosition(long) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('a shorthand of the app beats a longhand of a reset', () => {
    const registry = getStyleRegistry()
    const reset = registry.resetClass('rn-box', { flexShrink: '0', flexBasis: 'auto' })
    const flex = registry.classFor('flex', '1 1 0%')

    const element = document.createElement('div')
    element.className = `${reset} ${flex}`
    document.body.appendChild(element)
    const computed = getComputedStyle(element)
    expect(computed.flexShrink).toBe('1')
    expect(computed.flexBasis).toBe('0%')
    element.remove()
  })

  test('puts a new reset sheet before the sheets of an older server page', () => {
    for (const id of [SHORTHAND_STYLE_ID, LONGHAND_STYLE_ID]) {
      const element = document.createElement('style')
      element.id = id
      document.head.appendChild(element)
    }
    getStyleRegistry()
    const reset = document.getElementById(RESET_STYLE_ID) as HTMLElement
    const short = document.getElementById(SHORTHAND_STYLE_ID) as HTMLElement
    expect(reset.compareDocumentPosition(short) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('longhand wins over shorthand in the DOM, whatever the insertion order', () => {
    const registry = getStyleRegistry()
    const left = registry.classFor('marginLeft', '8px')
    const all = registry.classFor('margin', '0px')

    const element = document.createElement('div')
    element.className = `${left} ${all}`
    document.body.appendChild(element)
    expect(getComputedStyle(element).marginLeft).toBe('8px')
    expect(getComputedStyle(element).marginRight).toBe('0px')
    element.remove()
  })

  test('does not insert rules that the server already rendered', () => {
    const server = new StyleRegistry()
    const color = server.classFor('color', 'rgb(255,0,0)')
    const margin = server.classFor('margin', '0')
    server.resetClass('rn-box', { flexShrink: '0' })
    for (const [id, text] of [
      [RESET_STYLE_ID, server.cssText().reset],
      [SHORTHAND_STYLE_ID, server.cssText().shorthand],
      [LONGHAND_STYLE_ID, server.cssText().longhand],
    ] as const) {
      const element = document.createElement('style')
      element.id = id
      element.textContent = text
      document.head.appendChild(element)
    }

    const client = getStyleRegistry()
    expect(client.classFor('color', 'rgb(255,0,0)')).toBe(color)
    expect(client.classFor('margin', '0')).toBe(margin)
    expect(client.resetClass('rn-box', { flexShrink: '0' })).toBe('rn-box')
    expect(domRules(RESET_STYLE_ID)).toHaveLength(1)
    expect(domRules(SHORTHAND_STYLE_ID)).toHaveLength(1)
    expect(domRules(LONGHAND_STYLE_ID)).toHaveLength(1)

    client.classFor('width', '1px')
    expect(domRules(LONGHAND_STYLE_ID)).toHaveLength(2)
  })
})

describe('compileStyle', () => {
  beforeEach(resetStyleRegistry)
  afterEach(resetStyleRegistry)

  test('returns an empty string for no style', () => {
    expect(compileStyle(null)).toBe('')
    expect(compileStyle([false, undefined, ''])).toBe('')
  })

  test('flattens, resolves, and registers', () => {
    const registry = new StyleRegistry()
    const classes = compileStyle([{ width: 10 }, { color: 'red' }], registry)
    expect(classes.split(' ')).toHaveLength(2)
    expect(registry.cssText().longhand).toContain('width:10px')
    expect(registry.cssText().longhand).toContain('color:rgb(255,0,0)')
  })

  test('caches frozen styles by identity', () => {
    const registry = new StyleRegistry()
    const frozen = Object.freeze({ width: 10 })
    expect(compileStyle(frozen, registry)).toBe(compileStyle(frozen, registry))
    expect(registry.ruleCount).toBe(1)
  })

  describe('an array of styles', () => {
    const a = Object.freeze({ width: 10, color: 'red' })
    const b = Object.freeze({ color: 'blue' })

    test('compiles once when each object in it is frozen, also in a new array', () => {
      const registry = new StyleRegistry()
      const compile = vi.spyOn(registry, 'classesFor')
      const classes = compileStyle([a, b], registry)
      expect(compileStyle([a, b], registry)).toBe(classes)
      expect(compileStyle([a, [null, b], false], registry)).toBe(classes)
      expect(compile).toHaveBeenCalledTimes(1)
    })

    test('with one frozen object has the classes of that object, from the same cache', () => {
      const registry = new StyleRegistry()
      const compile = vi.spyOn(registry, 'classesFor')
      const classes = compileStyle(a, registry)
      expect(compileStyle([undefined, a, false], registry)).toBe(classes)
      expect(compile).toHaveBeenCalledTimes(1)
    })

    test('keeps the order: a later object wins', () => {
      const registry = new StyleRegistry()
      expect(classSet(compileStyle([a, b], registry))).toEqual(
        classSet(compileStyle({ width: 10, color: 'blue' })),
      )
      expect(classSet(compileStyle([b, a], registry))).toEqual(
        classSet(compileStyle({ width: 10, color: 'red' })),
      )
    })

    test('reads an object that is not frozen again on each call', () => {
      const registry = new StyleRegistry()
      const compile = vi.spyOn(registry, 'classesFor')
      const dynamic = { height: 1 }
      const first = compileStyle([a, dynamic], registry)
      dynamic.height = 2
      expect(compileStyle([a, dynamic], registry)).not.toBe(first)
      dynamic.height = 1
      expect(compileStyle([a, dynamic], registry)).toBe(first)
      expect(compile).toHaveBeenCalledTimes(2)
    })

    // `Object.isFrozen(1)` is true, and a WeakMap throws on a number key.
    test('skips a number in it, as an old registered style ID', () => {
      expect(compileStyle([a, 1 as never])).toBe(compileStyle(a))
    })

    test('resolves the flattened style, so a legacy shadow can come from two objects', () => {
      const registry = new StyleRegistry()
      const color = Object.freeze({ shadowColor: 'black' })
      const shape = Object.freeze({ shadowOpacity: 0.5, shadowRadius: 4 })
      expect(compileStyle([color, shape], registry)).toBe(
        compileStyle({ shadowColor: 'black', shadowOpacity: 0.5, shadowRadius: 4 }),
      )
      expect(registry.cssText().longhand).toContain('box-shadow')
    })
  })
})

describe('compileStyle with an object that is not frozen', () => {
  const frozen = Object.freeze({ width: 10, color: 'red' })

  test('compiles once for the same declarations in a new object', () => {
    const registry = new StyleRegistry()
    const compile = vi.spyOn(registry, 'classesFor')
    const classes = compileStyle({ height: 4, color: 'blue' }, registry)
    expect(compileStyle({ height: 4, color: 'blue' }, registry)).toBe(classes)
    expect(compileStyle([{ height: 4 }, null, [{ color: 'blue' }]], registry)).toBe(classes)
    expect(compile).toHaveBeenCalledTimes(1)
    expect(classSet(classes)).toEqual(
      classSet(compileStyle(Object.freeze({ height: 4, color: 'blue' }), new StyleRegistry())),
    )
  })

  test('compiles once in an array with frozen objects, in any position', () => {
    const registry = new StyleRegistry()
    const compile = vi.spyOn(registry, 'classesFor')
    const before = compileStyle([{ color: 'blue' }, frozen], registry)
    const after = compileStyle([frozen, { color: 'blue' }], registry)
    expect(compileStyle([{ color: 'blue' }, frozen], registry)).toBe(before)
    expect(compileStyle([frozen, { color: 'blue' }], registry)).toBe(after)
    expect(compile).toHaveBeenCalledTimes(2)
    expect(classSet(before)).toEqual(classSet(compileStyle(frozen, new StyleRegistry())))
    expect(classSet(after)).toEqual(
      classSet(compileStyle({ width: 10, color: 'blue' }, new StyleRegistry())),
    )
  })

  test('a number and a string with the same text are two values', () => {
    const registry = new StyleRegistry()
    expect(compileStyle({ lineHeight: 2 }, registry)).not.toBe(
      compileStyle({ lineHeight: '2' as never }, registry),
    )
    expect(registry.cssText().longhand).toContain('line-height:2px')
  })

  test('a later undefined takes the declaration out', () => {
    const registry = new StyleRegistry()
    expect(compileStyle([{ color: 'blue', height: 4 }, { color: undefined }], registry)).toBe(
      compileStyle({ height: 4 }, registry),
    )
    expect(compileStyle([{ color: 'blue', height: 4 }, { color: undefined }], registry)).not.toBe(
      compileStyle({ color: 'blue', height: 4 }, registry),
    )
  })

  test('compiles a value that is not a primitive on each call, with the right classes', () => {
    const registry = new StyleRegistry()
    const compile = vi.spyOn(registry, 'classesFor')
    expect(compileStyle({ opacity: 0.5, transform: [{ translateX: 4 }] }, registry)).toBe(
      compileStyle({ opacity: 0.5, transform: [{ translateX: 4 }] }, registry),
    )
    expect(compile).toHaveBeenCalledTimes(2)
    expect(registry.cssText().longhand).toContain('transform:translateX(4px)')
  })

  test('starts the cache again past the limit, and still compiles the same classes', () => {
    const registry = new StyleRegistry()
    const first = compileStyle([frozen, { height: 4 }], registry)
    for (let i = 0; i <= MAX_VALUE_NODES; i++) compileStyle({ width: i }, registry)
    const compile = vi.spyOn(registry, 'classesFor')
    expect(compileStyle([frozen, { height: 4 }], registry)).toBe(first)
    expect(compile).toHaveBeenCalledTimes(1)
  })
})

describe('compileReset', () => {
  test('resolves the style once for each registry, not on each call', () => {
    let reads = 0
    const style = {
      get flexShrink(): number {
        reads += 1
        return 0
      },
    }
    const registry = new StyleRegistry()
    expect(compileReset('rn-box', style, registry)).toBe('rn-box')
    expect(compileReset('rn-box', style, registry)).toBe('rn-box')
    expect(compileReset('rn-box', style, registry)).toBe('rn-box')
    expect(reads).toBe(1)
    expect(registry.cssText().reset).toBe('.rn-box{flex-shrink:0}')

    const other = new StyleRegistry()
    expect(compileReset('rn-box', style, other)).toBe('rn-box')
    expect(reads).toBe(2)
    expect(other.cssText().reset).toBe('.rn-box{flex-shrink:0}')
  })
})
