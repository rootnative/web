import { afterEach, beforeEach, describe, expect, type MockInstance, test, vi } from 'vitest'

import { stubNavigator } from '../../test/navigator'
import { resetWarnings } from '../../utils/warn'
import { Clipboard } from './index'

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('Clipboard', () => {
  let warn: MockInstance<typeof console.warn>
  let restore: (() => void) | undefined

  beforeEach(() => {
    resetWarnings()
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    restore?.()
    vi.restoreAllMocks()
  })

  const warnings = (): string[] => warn.mock.calls.map((args) => String(args[0]))

  describe('getString', () => {
    test('reads the text on the clipboard', async () => {
      restore = stubNavigator('clipboard', { readText: () => Promise.resolve('hello') })
      await expect(Clipboard.getString()).resolves.toBe('hello')
    })

    test('rejects when the browser refuses the read', async () => {
      const error = new DOMException('Denied', 'NotAllowedError')
      restore = stubNavigator('clipboard', { readText: () => Promise.reject(error) })
      await expect(Clipboard.getString()).rejects.toBe(error)
    })

    test('rejects on a page with no Clipboard API', async () => {
      restore = stubNavigator('clipboard', undefined)
      await expect(Clipboard.getString()).rejects.toThrowError(/https or localhost/)
    })
  })

  describe('setString', () => {
    test('writes the text with the Clipboard API', () => {
      const writeText = vi.fn(() => Promise.resolve())
      restore = stubNavigator('clipboard', { writeText })
      Clipboard.setString('copied')
      expect(writeText).toHaveBeenCalledWith('copied')
    })

    test('logs a warning when the browser refuses the write', async () => {
      restore = stubNavigator('clipboard', {
        writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')),
      })
      Clipboard.setString('copied')
      await flush()
      expect(warnings().some((text) => text.includes('refused the copy'))).toBe(true)
    })

    test('copies through a hidden textarea on a page with no Clipboard API', () => {
      restore = stubNavigator('clipboard', undefined)
      const input = document.createElement('input')
      document.body.append(input)
      input.focus()
      let selected: string | undefined
      const execCommand = vi.spyOn(document, 'execCommand').mockImplementation(() => {
        const textarea = document.querySelector('textarea')
        selected = textarea?.value.slice(textarea.selectionStart, textarea.selectionEnd)
        return true
      })

      Clipboard.setString('copied')

      expect(execCommand).toHaveBeenCalledWith('copy')
      expect(selected).toBe('copied')
      expect(document.querySelector('textarea')).toBeNull()
      expect(document.activeElement).toBe(input)
      input.remove()
    })

    test('logs a warning when the textarea copy fails', () => {
      restore = stubNavigator('clipboard', undefined)
      vi.spyOn(document, 'execCommand').mockReturnValue(false)
      Clipboard.setString('copied')
      expect(warnings().some((text) => text.includes('refused the copy'))).toBe(true)
    })
  })

  test('the first call logs the deprecation warning once', async () => {
    restore = stubNavigator('clipboard', {
      readText: () => Promise.resolve(''),
      writeText: () => Promise.resolve(),
    })
    await Clipboard.getString()
    Clipboard.setString('x')
    expect(warnings().filter((text) => text.includes('deprecated'))).toHaveLength(1)
  })
})
