import { describe, expect, test } from 'vitest'

import { resolveTag } from './resolveTag'

describe('resolveTag', () => {
  test('uses the default tag when there is no role', () => {
    expect(resolveTag({}, 'div')).toEqual({ tag: 'div', role: undefined })
    expect(resolveTag({}, 'span')).toEqual({ tag: 'span', role: undefined })
  })

  describe('heading', () => {
    test('defaults to level 2', () => {
      expect(resolveTag({ role: 'heading' }, 'div')).toEqual({ tag: 'h2', role: undefined })
    })

    test('uses aria-level from 1 to 6', () => {
      for (const level of [1, 2, 3, 4, 5, 6]) {
        expect(resolveTag({ role: 'heading', 'aria-level': level }, 'div').tag).toBe(`h${level}`)
      }
    })

    test('falls back to level 2 for an invalid level', () => {
      expect(resolveTag({ role: 'heading', 'aria-level': 0 }, 'div').tag).toBe('h2')
      expect(resolveTag({ role: 'heading', 'aria-level': 7 }, 'div').tag).toBe('h2')
      expect(resolveTag({ role: 'heading', 'aria-level': 2.5 }, 'div').tag).toBe('h2')
    })

    test('maps the legacy header role', () => {
      expect(resolveTag({ accessibilityRole: 'header' }, 'span').tag).toBe('h2')
    })
  })

  describe('link', () => {
    test('is an anchor when href is set', () => {
      expect(resolveTag({ role: 'link', href: '/a' }, 'span')).toEqual({
        tag: 'a',
        role: undefined,
      })
    })

    test('keeps the default tag with an explicit role when href is missing', () => {
      expect(resolveTag({ role: 'link' }, 'span')).toEqual({ tag: 'span', role: 'link' })
    })

    test('href alone makes an anchor', () => {
      expect(resolveTag({ href: '/a' }, 'span')).toEqual({ tag: 'a', role: undefined })
    })
  })

  describe('roles with an implicit element', () => {
    test.each([
      ['article', 'article'],
      ['banner', 'header'],
      ['button', 'button'],
      ['cell', 'td'],
      ['columnheader', 'th'],
      ['complementary', 'aside'],
      ['contentinfo', 'footer'],
      ['figure', 'figure'],
      ['form', 'form'],
      ['list', 'ul'],
      ['listitem', 'li'],
      ['main', 'main'],
      ['navigation', 'nav'],
      ['row', 'tr'],
      ['rowgroup', 'tbody'],
      ['rowheader', 'th'],
      ['separator', 'hr'],
      ['table', 'table'],
    ])('%s renders <%s> without a role attribute', (role, tag) => {
      expect(resolveTag({ role }, 'div')).toEqual({ tag, role: undefined })
    })
  })

  describe('roles without an implicit element', () => {
    test.each(['img', 'dialog', 'menu', 'tab', 'tabpanel', 'none', 'presentation', 'status'])(
      '%s keeps the default tag and the role attribute',
      (role) => {
        expect(resolveTag({ role }, 'div')).toEqual({ tag: 'div', role })
      },
    )
  })

  describe('legacy accessibilityRole', () => {
    test('role wins over accessibilityRole', () => {
      expect(resolveTag({ role: 'button', accessibilityRole: 'link' }, 'div').tag).toBe('button')
    })

    test.each([
      ['image', 'div', 'img'],
      ['imagebutton', 'button', undefined],
      ['adjustable', 'div', 'slider'],
      ['search', 'div', 'searchbox'],
      ['text', 'span', 'none'],
      ['button', 'button', undefined],
      ['list', 'ul', undefined],
      ['tabbar', 'div', 'tabbar'],
    ])('%s resolves to <%s> with role %s', (legacy, tag, role) => {
      const defaultTag = legacy === 'text' ? 'span' : 'div'
      expect(resolveTag({ accessibilityRole: legacy }, defaultTag)).toEqual({ tag, role })
    })
  })
})
