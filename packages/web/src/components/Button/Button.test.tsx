import { act, createRef } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { cleanup, render } from '../../test/render'
import { Button } from './index'
import type { HostInstance } from '../View/types'

afterEach(cleanup)

const button = (): HTMLButtonElement => document.querySelector('button') as HTMLButtonElement

const label = (): HTMLElement => button().querySelector('span') as HTMLElement

// Playwright waits for an element with aria-disabled to become enabled, so a disabled button
// gets a DOM click.
const domClick = (): void => act(() => button().click())

const user = async (action: () => Promise<void>): Promise<void> => {
  await act(action)
}

describe('Button', () => {
  test('renders a button with the title, and ref is the element', () => {
    const ref = createRef<HostInstance>()
    render(<Button ref={ref} title="Save" onPress={() => {}} />)
    expect(button().type).toBe('button')
    expect(button().textContent).toBe('Save')
    expect(button().tabIndex).toBe(0)
    expect(ref.current).toBe(button())
  })

  test('has the default colors, and the title keeps its case', () => {
    render(<Button title="Save" onPress={() => {}} />)
    expect(getComputedStyle(button()).backgroundColor).toBe('rgb(33, 150, 243)')
    expect(getComputedStyle(label()).color).toBe('rgb(255, 255, 255)')
    expect(getComputedStyle(label()).textAlign).toBe('center')
    expect(getComputedStyle(label()).textTransform).toBe('none')
  })

  test('the title has a margin of 8 px on each side', () => {
    render(<Button title="Save" onPress={() => {}} />)
    const outer = button().getBoundingClientRect()
    const inner = label().getBoundingClientRect()
    expect(inner.left - outer.left).toBe(8)
    expect(inner.top - outer.top).toBe(8)
    expect(outer.right - inner.right).toBe(8)
    expect(outer.bottom - inner.bottom).toBe(8)
  })

  test('color sets the background', () => {
    render(<Button title="Delete" color="#dc2626" onPress={() => {}} />)
    expect(getComputedStyle(button()).backgroundColor).toBe('rgb(220, 38, 38)')
  })

  test('a click calls onPress', async () => {
    const onPress = vi.fn()
    render(<Button title="Save" onPress={onPress} />)
    await user(() => userEvent.click(button()))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('Enter and Space press a focused button', async () => {
    const onPress = vi.fn()
    render(<Button title="Save" onPress={onPress} />)
    await user(() => userEvent.tab())
    expect(document.activeElement).toBe(button())
    await user(() => userEvent.keyboard('{Enter}'))
    await user(() => userEvent.keyboard(' '))
    expect(onPress).toHaveBeenCalledTimes(2)
  })

  test('disabled stops the press, and changes the colors', async () => {
    const onPress = vi.fn()
    render(<Button title="Save" color="#dc2626" disabled onPress={onPress} />)
    expect(button().getAttribute('aria-disabled')).toBe('true')
    expect(button().tabIndex).toBe(-1)
    expect(getComputedStyle(button()).backgroundColor).toBe('rgb(223, 223, 223)')
    expect(getComputedStyle(label()).color).toBe('rgb(161, 161, 161)')
    domClick()
    expect(onPress).not.toHaveBeenCalled()
  })

  test('accessibilityState.disabled and aria-disabled disable the button', async () => {
    const onPress = vi.fn()
    const { rerender } = render(
      <Button title="Save" accessibilityState={{ disabled: true }} onPress={onPress} />,
    )
    expect(getComputedStyle(button()).backgroundColor).toBe('rgb(223, 223, 223)')
    domClick()

    rerender(<Button title="Save" aria-disabled onPress={onPress} />)
    expect(getComputedStyle(button()).backgroundColor).toBe('rgb(223, 223, 223)')
    domClick()
    expect(onPress).not.toHaveBeenCalled()
  })

  test('disabled={false} wins over accessibilityState.disabled', async () => {
    const onPress = vi.fn()
    render(
      <Button
        title="Save"
        disabled={false}
        accessibilityState={{ disabled: true }}
        onPress={onPress}
      />,
    )
    expect(button().getAttribute('aria-disabled')).toBe('false')
    await user(() => userEvent.click(button()))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('passes the accessibility props and testID to the button', () => {
    render(
      <Button
        title="Save"
        testID="save"
        accessibilityLabel="Save the file"
        accessibilityHint="Writes the file to disk"
        accessibilityLanguage="en"
        aria-expanded={false}
        onPress={() => {}}
      />,
    )
    expect(button().getAttribute('data-testid')).toBe('save')
    expect(button().getAttribute('aria-label')).toBe('Save the file')
    expect(button().getAttribute('aria-description')).toBe('Writes the file to disk')
    expect(button().getAttribute('lang')).toBe('en')
    expect(button().getAttribute('aria-expanded')).toBe('false')
  })

  test('importantForAccessibility no hides the button and its text', () => {
    render(<Button title="Save" importantForAccessibility="no" onPress={() => {}} />)
    expect(button().getAttribute('aria-hidden')).toBe('true')
  })

  test('throws when the title is not a string', () => {
    expect(() => Button({ title: 1 as unknown as string })).toThrow(
      'The title prop of a Button must be a string',
    )
  })
})
