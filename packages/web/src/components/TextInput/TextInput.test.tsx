import { act, createRef, useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { cleanup, render } from '../../test/render'
import { TextInput } from './index'
import type { TextInputInstance } from './types'

afterEach(cleanup)

type Field = HTMLInputElement | HTMLTextAreaElement

const field = (container: HTMLElement): Field => container.firstElementChild as Field

// Types like a user: sets the value through the native setter, so React sees
// the change, then fires `input`.
const type = (element: Field, text: string): void => {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  act(() => {
    setter?.call(element, text)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const key = (element: Field, name: string, init: KeyboardEventInit = {}): boolean =>
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }),
  )

function Controlled(): React.ReactElement {
  const [text, setText] = useState('x')
  return <TextInput value={text} onChangeText={(next) => setText(next.toUpperCase())} />
}

describe('TextInput', () => {
  test('renders an input with the native reset', () => {
    const { container } = render(<TextInput />)
    const element = field(container)
    expect(element.tagName).toBe('INPUT')
    expect(element.getAttribute('type')).toBe('text')
    expect(element.getAttribute('dir')).toBe('auto')
    const computed = getComputedStyle(element)
    expect(computed.borderWidth).toBe('0px')
    expect(computed.padding).toBe('0px')
    expect(computed.fontSize).toBe('14px')
    expect(computed.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(computed.appearance).toBe('none')
  })

  test('multiline renders a textarea that grows with its text', () => {
    const { container } = render(<TextInput multiline style={{ width: 200 }} />)
    const element = field(container)
    expect(element.tagName).toBe('TEXTAREA')
    expect(element.getAttribute('rows')).toBe('1')
    const oneLine = element.clientHeight

    type(element, 'one\ntwo\nthree\nfour')
    expect(element.clientHeight).toBeGreaterThan(oneLine * 3)
  })

  test('numberOfLines sets the minimum rows of a textarea', () => {
    const { container } = render(<TextInput multiline numberOfLines={4} />)
    expect(field(container).getAttribute('rows')).toBe('4')
  })

  test('style applies over the reset', () => {
    const { container } = render(
      <TextInput style={{ color: 'rgb(255, 0, 0)', fontSize: 20, padding: 8, borderWidth: 1 }} />,
    )
    const computed = getComputedStyle(field(container))
    expect(computed.color).toBe('rgb(255, 0, 0)')
    expect(computed.fontSize).toBe('20px')
    expect(computed.paddingLeft).toBe('8px')
    expect(computed.borderTopWidth).toBe('1px')
  })

  describe('attributes', () => {
    test('secureTextEntry is a password field', () => {
      const { container } = render(<TextInput secureTextEntry />)
      expect(field(container).getAttribute('type')).toBe('password')
    })

    test('keyboardType and returnKeyType map to inputmode and enterkeyhint', () => {
      const { container } = render(<TextInput keyboardType="email-address" returnKeyType="send" />)
      expect(field(container).getAttribute('inputmode')).toBe('email')
      expect(field(container).getAttribute('enterkeyhint')).toBe('send')
    })

    test('autoComplete, autoCapitalize, autoCorrect, spellCheck, maxLength', () => {
      const { container } = render(
        <TextInput
          autoComplete="name-given"
          autoCapitalize="words"
          autoCorrect={false}
          spellCheck={false}
          maxLength={10}
        />,
      )
      const element = field(container)
      expect(element.getAttribute('autocomplete')).toBe('given-name')
      expect(element.getAttribute('autocapitalize')).toBe('words')
      expect(element.getAttribute('autocorrect')).toBe('off')
      expect(element.getAttribute('spellcheck')).toBe('false')
      expect(element.getAttribute('maxlength')).toBe('10')
    })

    test('editable={false} and readOnly are read-only, not disabled', () => {
      const { container, rerender } = render(<TextInput editable={false} />)
      expect((field(container) as HTMLInputElement).readOnly).toBe(true)
      expect((field(container) as HTMLInputElement).disabled).toBe(false)
      rerender(<TextInput readOnly />)
      expect((field(container) as HTMLInputElement).readOnly).toBe(true)
    })

    test('placeholder and placeholderTextColor', () => {
      const { container } = render(
        <TextInput placeholder="Name" placeholderTextColor="rgb(0, 128, 0)" />,
      )
      const element = field(container)
      expect(element.getAttribute('placeholder')).toBe('Name')
      expect(getComputedStyle(element, '::placeholder').color).toBe('rgb(0, 128, 0)')
    })

    test('selectionColor is the caret, caretHidden hides it', () => {
      const { container, rerender } = render(<TextInput selectionColor="rgb(0, 0, 255)" />)
      expect(getComputedStyle(field(container)).caretColor).toBe('rgb(0, 0, 255)')
      rerender(<TextInput caretHidden />)
      expect(getComputedStyle(field(container)).caretColor).toBe('rgba(0, 0, 0, 0)')
    })

    test('textAlign prop', () => {
      const { container } = render(<TextInput textAlign="center" />)
      expect(getComputedStyle(field(container)).textAlign).toBe('center')
    })

    test('accessibility and testID pass through', () => {
      const { container } = render(
        <TextInput accessibilityLabel="Search" testID="search" nativeID="q" />,
      )
      const element = field(container)
      expect(element.getAttribute('aria-label')).toBe('Search')
      expect(element.getAttribute('data-testid')).toBe('search')
      expect(element.id).toBe('q')
    })
  })

  describe('value', () => {
    test('defaultValue starts the text, typing calls onChangeText and onChange', () => {
      const onChangeText = vi.fn()
      const onChange = vi.fn()
      const { container } = render(
        <TextInput defaultValue="a" onChangeText={onChangeText} onChange={onChange} />,
      )
      const element = field(container)
      expect(element.value).toBe('a')

      type(element, 'ab')
      expect(onChangeText).toHaveBeenCalledWith('ab')
      const event = onChange.mock.calls[0]?.[0]
      expect(event.nativeEvent.text).toBe('ab')
      expect(event.nativeEvent.eventCount).toBe(1)
      expect(event.nativeEvent.target).toBe(element)
    })

    test('a controlled value follows the prop', () => {
      const { container } = render(<Controlled />)
      const element = field(container)
      expect(element.value).toBe('x')
      type(element, 'xy')
      expect(element.value).toBe('XY')
    })

    test('a value with no handler stays fixed without a warning', () => {
      const { container } = render(<TextInput value="fixed" />)
      const element = field(container)
      type(element, 'changed')
      expect(element.value).toBe('fixed')
    })
  })

  describe('focus', () => {
    test('onFocus, onBlur, and onEndEditing carry the text', () => {
      const calls: string[] = []
      const { container } = render(
        <TextInput
          defaultValue="hi"
          onFocus={(event) => calls.push(`focus:${event.nativeEvent.text}`)}
          onBlur={(event) => calls.push(`blur:${event.nativeEvent.text}`)}
          onEndEditing={(event) => calls.push(`end:${event.nativeEvent.text}`)}
        />,
      )
      const element = field(container)
      act(() => element.focus())
      act(() => element.blur())
      expect(calls).toEqual(['focus:hi', 'blur:hi', 'end:hi'])
    })

    test('clearTextOnFocus and selectTextOnFocus', () => {
      const onChangeText = vi.fn()
      const { container, rerender } = render(
        <TextInput defaultValue="abc" clearTextOnFocus onChangeText={onChangeText} />,
      )
      const element = field(container)
      act(() => element.focus())
      expect(element.value).toBe('')
      expect(onChangeText).toHaveBeenCalledWith('')
      act(() => element.blur())

      rerender(<TextInput defaultValue="abc" selectTextOnFocus />)
      ;(element as HTMLInputElement).value = 'abc'
      act(() => element.focus())
      expect(element.selectionStart).toBe(0)
      expect(element.selectionEnd).toBe(3)
    })

    test('autoFocus focuses on mount', () => {
      const { container } = render(<TextInput autoFocus />)
      expect(document.activeElement).toBe(field(container))
    })
  })

  describe('keys', () => {
    test('onKeyPress gets the key', () => {
      const onKeyPress = vi.fn()
      const { container } = render(<TextInput onKeyPress={onKeyPress} />)
      key(field(container), 'a')
      expect(onKeyPress.mock.calls[0]?.[0].nativeEvent.key).toBe('a')
    })

    test('Enter on a single line submits and blurs, and keeps the default for a form', () => {
      const onSubmitEditing = vi.fn()
      const { container } = render(
        <TextInput defaultValue="go" onSubmitEditing={onSubmitEditing} />,
      )
      const element = field(container)
      act(() => element.focus())
      const notPrevented = key(element, 'Enter')
      expect(notPrevented).toBe(true)
      expect(onSubmitEditing.mock.calls[0]?.[0].nativeEvent.text).toBe('go')
      expect(document.activeElement).not.toBe(element)
    })

    test('blurOnSubmit={false} keeps the focus', () => {
      const { container } = render(<TextInput blurOnSubmit={false} />)
      const element = field(container)
      act(() => element.focus())
      key(element, 'Enter')
      expect(document.activeElement).toBe(element)
    })

    test('Enter in a multiline input is a newline by default', () => {
      const onSubmitEditing = vi.fn()
      const { container } = render(<TextInput multiline onSubmitEditing={onSubmitEditing} />)
      expect(key(field(container), 'Enter')).toBe(true)
      expect(onSubmitEditing).not.toHaveBeenCalled()
    })

    test('submitBehavior="submit" in a multiline input submits on Enter, Shift+Enter is a newline', () => {
      const onSubmitEditing = vi.fn()
      const { container } = render(
        <TextInput multiline submitBehavior="submit" onSubmitEditing={onSubmitEditing} />,
      )
      const element = field(container)
      act(() => element.focus())
      expect(key(element, 'Enter')).toBe(false)
      expect(onSubmitEditing).toHaveBeenCalledTimes(1)
      expect(document.activeElement).toBe(element)
      expect(key(element, 'Enter', { shiftKey: true })).toBe(true)
      expect(onSubmitEditing).toHaveBeenCalledTimes(1)
    })

    test('contextMenuHidden blocks the context menu', () => {
      const { container } = render(<TextInput contextMenuHidden />)
      const prevented = !field(container).dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
      expect(prevented).toBe(true)
    })
  })

  describe('selection', () => {
    test('the selection prop sets the range', () => {
      const { container, rerender } = render(
        <TextInput defaultValue="hello" selection={{ start: 1, end: 3 }} />,
      )
      const element = field(container)
      expect(element.selectionStart).toBe(1)
      expect(element.selectionEnd).toBe(3)
      rerender(<TextInput defaultValue="hello" selection={{ start: 4 }} />)
      expect(element.selectionStart).toBe(4)
      expect(element.selectionEnd).toBe(4)
    })

    test('onSelectionChange reports a new range once', () => {
      const onSelectionChange = vi.fn()
      const { container } = render(
        <TextInput defaultValue="hello" onSelectionChange={onSelectionChange} />,
      )
      const element = field(container)
      // React's onSelect listens to key and mouse events on the focused field.
      act(() => {
        element.focus()
        element.setSelectionRange(1, 4)
        element.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }))
        element.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }))
      })
      const ranges = onSelectionChange.mock.calls.map((call) => call[0].nativeEvent.selection)
      expect(ranges).toContainEqual({ start: 1, end: 4 })
      expect(ranges.filter((r) => r.start === 1 && r.end === 4)).toHaveLength(1)
    })
  })

  test('onContentSizeChange reports the text size', async () => {
    const onContentSizeChange = vi.fn()
    const { container } = render(
      <TextInput multiline style={{ width: 200 }} onContentSizeChange={onContentSizeChange} />,
    )
    await vi.waitFor(() => expect(onContentSizeChange).toHaveBeenCalled())
    const first = onContentSizeChange.mock.calls[0]?.[0].nativeEvent.contentSize
    expect(first.width).toBeGreaterThan(0)

    type(field(container), 'one\ntwo\nthree\nfour\nfive')
    const last = onContentSizeChange.mock.calls.at(-1)?.[0].nativeEvent.contentSize
    expect(last.height).toBeGreaterThan(first.height)
  })

  describe('ref', () => {
    test('is the element with clear, isFocused, getNativeRef, setNativeProps', () => {
      const ref = createRef<TextInputInstance>()
      const onChangeText = vi.fn()
      const { container } = render(
        <TextInput ref={ref} defaultValue="abc" onChangeText={onChangeText} />,
      )
      const element = field(container)
      expect(ref.current).toBe(element)
      expect(ref.current?.getNativeRef()).toBe(element)
      expect(ref.current?.isFocused()).toBe(false)

      act(() => ref.current?.focus())
      expect(ref.current?.isFocused()).toBe(true)

      ref.current?.setNativeProps({ text: 'xyz' })
      expect(element.value).toBe('xyz')

      ref.current?.clear()
      expect(element.value).toBe('')
      expect(onChangeText).toHaveBeenCalledWith('')
    })
  })

  describe('TextInput.State', () => {
    test('finds, focuses, and blurs the current input', () => {
      const { container } = render(<TextInput />)
      const element = field(container)
      expect(TextInput.State.currentlyFocusedInput()).toBeNull()
      act(() => TextInput.State.focusTextInput(element))
      expect(TextInput.State.currentlyFocusedInput()).toBe(element)
      act(() => TextInput.State.blurTextInput(element))
      expect(TextInput.State.currentlyFocusedInput()).toBeNull()
    })
  })
})
