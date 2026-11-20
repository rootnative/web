import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { compileReset, compileStyle, MAX_VALUE_NODES } from './compile'
import {
  getStyleRegistry,
  LONGHAND_PRECEDENCE,
  PRECEDENCE_ORDER,
  RESET_PRECEDENCE,
  resetStyleRegistry,
  SHORTHAND_PRECEDENCE,
  StyleRegistry,
} from './registry'

const groupElements = (precedence: string): HTMLStyleElement[] =>
  Array.from(document.querySelectorAll<HTMLStyleElement>(`style[data-precedence="${precedence}"]`))

// The rules of all the elements of a group, in order.
const groupRules = (precedence: string): string[] =>
  groupElements(precedence).flatMap((element) =>
    Array.from((element.sheet as CSSStyleSheet).cssRules).map((r) => r.cssText),
  )

// A group element as a server render gives it.
const serverGroup = (precedence: string, css: string): HTMLStyleElement => {
  const element = document.createElement('style')
  element.dataset['precedence'] = precedence
  element.dataset['href'] = precedence
  element.textContent = css
  document.head.appendChild(element)
  return element
}

const follows = (first: Node, second: Node): boolean =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

// The order of the classes in an attribute has no effect on the style.
const classSet = (classes: string): Set<string> => new Set(classes.split(' '))

const pairRules = [
  ['.rn-pair:where(:not(.rn-pair)>*)', { color: 'black' }],
  ['.rn-pair:where(.rn-pair>*)', { color: 'inherit' }],
] as const

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

  test('writes a reset with selectors as one rule for each selector, in order, once', () => {
    const registry = new StyleRegistry()
    expect(registry.resetClassRules('rn-pair', pairRules)).toBe('rn-pair')
    expect(registry.resetClassRules('rn-pair', pairRules)).toBe('rn-pair')
    expect(registry.cssText().reset).toBe(
      '.rn-pair:where(:not(.rn-pair)>*){color:black}\n.rn-pair:where(.rn-pair>*){color:inherit}',
    )
    expect(registry.ruleCount).toBe(2)
  })

  test('the default registry makes the three groups, in order, and writes into them', () => {
    const registry = getStyleRegistry()
    const opacity = registry.classFor('opacity', '0.5')
    const margin = registry.classFor('margin', '0')
    registry.resetClass('rn-box', { flexShrink: '0' })
    expect(groupRules(RESET_PRECEDENCE)).toEqual(['.rn-box { flex-shrink: 0; }'])
    expect(groupRules(SHORTHAND_PRECEDENCE)).toEqual([`.${margin} { margin: 0px; }`])
    expect(groupRules(LONGHAND_PRECEDENCE)).toEqual([`.${opacity} { opacity: 0.5; }`])

    const [reset, short, long] = PRECEDENCE_ORDER.map(
      (precedence) => groupElements(precedence)[0] as HTMLElement,
    ) as [HTMLElement, HTMLElement, HTMLElement]
    expect(reset.parentElement).toBe(document.head)
    expect(follows(reset, short)).toBe(true)
    expect(follows(short, long)).toBe(true)
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

  test('puts a missing reset group before the groups of a server page', () => {
    const short = serverGroup(SHORTHAND_PRECEDENCE, '')
    serverGroup(LONGHAND_PRECEDENCE, '')
    getStyleRegistry()
    const [reset] = groupElements(RESET_PRECEDENCE)
    expect(follows(reset as HTMLElement, short)).toBe(true)
  })

  test('puts a missing shorthand group between the groups around it', () => {
    const reset = serverGroup(RESET_PRECEDENCE, '')
    const long = serverGroup(LONGHAND_PRECEDENCE, '')
    getStyleRegistry()
    const [short] = groupElements(SHORTHAND_PRECEDENCE)
    expect(follows(reset, short as HTMLElement)).toBe(true)
    expect(follows(short as HTMLElement, long)).toBe(true)
  })

  test('adopts the rules of each element of a group, and writes into the last one', () => {
    const server = new StyleRegistry()
    const first = server.classFor('width', '1px')
    serverGroup(LONGHAND_PRECEDENCE, server.cssText().longhand)
    const second = new StyleRegistry().classFor('height', '2px')
    const last = serverGroup(LONGHAND_PRECEDENCE, `.${second}{height:2px}`)

    const client = getStyleRegistry()
    expect(client.classFor('width', '1px')).toBe(first)
    expect(client.classFor('height', '2px')).toBe(second)
    expect(groupRules(LONGHAND_PRECEDENCE)).toHaveLength(2)

    const third = client.classFor('opacity', '0.5')
    expect(Array.from(last.sheet?.cssRules ?? []).map((r) => r.cssText)).toContain(
      `.${third} { opacity: 0.5; }`,
    )
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
    serverGroup(RESET_PRECEDENCE, server.cssText().reset)
    serverGroup(SHORTHAND_PRECEDENCE, server.cssText().shorthand)
    serverGroup(LONGHAND_PRECEDENCE, server.cssText().longhand)

    const client = getStyleRegistry()
    expect(client.classFor('color', 'rgb(255,0,0)')).toBe(color)
    expect(client.classFor('margin', '0')).toBe(margin)
    expect(client.resetClass('rn-box', { flexShrink: '0' })).toBe('rn-box')
    expect(groupRules(RESET_PRECEDENCE)).toHaveLength(1)
    expect(groupRules(SHORTHAND_PRECEDENCE)).toHaveLength(1)
    expect(groupRules(LONGHAND_PRECEDENCE)).toHaveLength(1)
    expect(document.querySelectorAll('style[data-precedence]')).toHaveLength(3)

    client.classFor('width', '1px')
    expect(groupRules(LONGHAND_PRECEDENCE)).toHaveLength(2)
  })

  test('adopts a server rule by the class at the start of its selector', () => {
    const server = new StyleRegistry()
    const selectionRules = ['.rn-sel::selection{background-color:red}']
    server.resetClassRules('rn-pair', pairRules)
    server.staticClass('rn-sel', selectionRules)
    serverGroup(RESET_PRECEDENCE, server.cssText().reset)
    serverGroup(LONGHAND_PRECEDENCE, server.cssText().longhand)

    const client = getStyleRegistry()
    expect(client.resetClassRules('rn-pair', pairRules)).toBe('rn-pair')
    expect(client.staticClass('rn-sel', selectionRules)).toBe('rn-sel')
    expect(groupRules(RESET_PRECEDENCE)).toHaveLength(2)
    expect(groupRules(LONGHAND_PRECEDENCE)).toHaveLength(1)
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
