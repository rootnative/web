import { describe, expect, test } from 'vitest'

import { toEnterKeyHint, toHTMLAutoComplete, toInputMode } from './autocomplete'

describe('toHTMLAutoComplete', () => {
  test('HTML tokens pass through', () => {
    expect(toHTMLAutoComplete('email', undefined)).toBe('email')
    expect(toHTMLAutoComplete('new-password', undefined)).toBe('new-password')
    expect(toHTMLAutoComplete('off', undefined)).toBe('off')
  })

  test('React Native tokens map to HTML', () => {
    expect(toHTMLAutoComplete('name-given', undefined)).toBe('given-name')
    expect(toHTMLAutoComplete('birthdate-full', undefined)).toBe('bday')
    expect(toHTMLAutoComplete('sms-otp', undefined)).toBe('one-time-code')
    expect(toHTMLAutoComplete('postal-address-region', undefined)).toBe('address-level1')
  })

  test('autoComplete wins over textContentType', () => {
    expect(toHTMLAutoComplete('username', 'password')).toBe('username')
  })

  test('textContentType maps alone', () => {
    expect(toHTMLAutoComplete(undefined, 'emailAddress')).toBe('email')
    expect(toHTMLAutoComplete(undefined, 'password')).toBe('current-password')
    expect(toHTMLAutoComplete(undefined, 'oneTimeCode')).toBe('one-time-code')
    expect(toHTMLAutoComplete(undefined, 'none')).toBe('off')
    expect(toHTMLAutoComplete(undefined, undefined)).toBeUndefined()
  })
})

describe('toInputMode', () => {
  test('keyboardType maps to inputmode', () => {
    expect(toInputMode(undefined, 'numeric', undefined)).toBe('numeric')
    expect(toInputMode(undefined, 'decimal-pad', undefined)).toBe('decimal')
    expect(toInputMode(undefined, 'email-address', undefined)).toBe('email')
    expect(toInputMode(undefined, 'phone-pad', undefined)).toBe('tel')
    expect(toInputMode(undefined, 'url', undefined)).toBe('url')
    expect(toInputMode(undefined, 'web-search', undefined)).toBe('search')
    expect(toInputMode(undefined, 'default', undefined)).toBeUndefined()
  })

  test('inputMode wins, showSoftInputOnFocus={false} wins over both', () => {
    expect(toInputMode('tel', 'numeric', undefined)).toBe('tel')
    expect(toInputMode('tel', 'numeric', false)).toBe('none')
  })
})

describe('toEnterKeyHint', () => {
  test('returnKeyType maps to enterkeyhint', () => {
    expect(toEnterKeyHint(undefined, 'done')).toBe('done')
    expect(toEnterKeyHint(undefined, 'search')).toBe('search')
    expect(toEnterKeyHint(undefined, 'default')).toBeUndefined()
    expect(toEnterKeyHint('go', 'done')).toBe('go')
  })
})
