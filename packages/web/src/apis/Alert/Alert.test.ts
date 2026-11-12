import { afterEach, describe, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { resetWarnings } from '../../utils/warn'
import { Appearance, resetAppearance } from '../Appearance'
import { Alert, resetAlerts } from './index'

afterEach(() => {
  resetAlerts()
  resetAppearance()
  vi.restoreAllMocks()
  document.querySelector('#opener')?.remove()
})

const alerts = (): HTMLDialogElement[] =>
  Array.from(document.querySelectorAll<HTMLDialogElement>('dialog.rn-alert'))

const top = (): HTMLDialogElement => alerts()[alerts().length - 1] as HTMLDialogElement

const labels = (dialog = top()): string[] =>
  Array.from(dialog.querySelectorAll('button')).map((button) => button.textContent ?? '')

const button = (text: string, dialog = top()): HTMLButtonElement =>
  Array.from(dialog.querySelectorAll('button')).find(
    (element) => element.textContent === text,
  ) as HTMLButtonElement

// A button on the page that had the focus before the alert.
const opener = (): HTMLButtonElement => {
  const element = document.createElement('button')
  element.id = 'opener'
  element.textContent = 'Open'
  document.body.append(element)
  element.focus()
  return element
}

const clickOutside = (dialog = top()): void => {
  dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 2, clientY: 2 }))
}

describe('Alert', () => {
  test('shows a modal alertdialog with the title, the message, and an OK button', () => {
    Alert.alert('Saved', 'Your note is saved.')
    const dialog = top()
    expect(dialog.parentElement).toBe(document.body)
    expect(dialog.getAttribute('role')).toBe('alertdialog')
    expect(dialog.matches(':modal')).toBe(true)
    const name = document.getElementById(dialog.getAttribute('aria-labelledby') ?? '')
    const description = document.getElementById(dialog.getAttribute('aria-describedby') ?? '')
    expect(name?.textContent).toBe('Saved')
    expect(description?.textContent).toBe('Your note is saved.')
    expect(labels()).toEqual(['OK'])
    expect(document.documentElement.style.overflow).toBe('hidden')

    button('OK').click()
    expect(alerts()).toHaveLength(0)
    expect(document.documentElement.style.overflow).toBe('')
  })

  test('a press closes the alert, then calls onPress with no argument', () => {
    let open = -1
    const onPress = vi.fn(() => {
      open = alerts().length
    })
    Alert.alert('Delete?', undefined, [{ text: 'Cancel' }, { text: 'Delete', onPress }])
    button('Delete').click()
    expect(onPress).toHaveBeenCalledWith()
    expect(open).toBe(0)
  })

  test('the buttons keep their order, and the first of three sits at the start', () => {
    Alert.alert('Update', 'A new version is ready.', [
      { text: 'Later' },
      { text: 'Cancel' },
      { text: 'Install' },
    ])
    expect(labels()).toEqual(['Later', 'Cancel', 'Install'])
    const [later, cancel] = Array.from(top().querySelectorAll('button'))
    const gap =
      (cancel?.getBoundingClientRect().left ?? 0) - (later?.getBoundingClientRect().right ?? 0)
    expect(gap).toBeGreaterThan(8)
  })

  test('no buttons or an empty list give OK, and a last button without text says OK', () => {
    Alert.alert('One', undefined, [])
    expect(labels()).toEqual(['OK'])
    Alert.alert('Two', undefined, [{ text: 'No' }, {}])
    expect(labels()).toEqual(['No', 'OK'])
  })

  test('the title and the message are text, not HTML', () => {
    Alert.alert('<b>Bold</b>', 'Line 1\nLine 2')
    expect(top().querySelector('b')).toBeNull()
    expect(top().textContent).toContain('<b>Bold</b>')
    expect(getComputedStyle(top().querySelector('.rn-alert-message') as Element).whiteSpace).toBe(
      'pre-wrap',
    )
  })

  test('Escape presses the cancel button', async () => {
    const onCancel = vi.fn()
    const onDelete = vi.fn()
    Alert.alert('Delete?', undefined, [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ])
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onDelete).not.toHaveBeenCalled()
    expect(alerts()).toHaveLength(0)
  })

  test('without a cancel button, Escape and a click outside leave the alert open', async () => {
    const onDismiss = vi.fn()
    Alert.alert('Read this', undefined, [{ text: 'OK' }], { onDismiss })
    await userEvent.keyboard('{Escape}')
    clickOutside()
    expect(alerts()).toHaveLength(1)
    expect(onDismiss).not.toHaveBeenCalled()
  })

  test('a second Escape with no input between keeps the alert open', async () => {
    Alert.alert('Read this')
    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{Escape}')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(top().open).toBe(true)
    expect(top().matches(':modal')).toBe(true)
  })

  test('a cancelable alert closes on Escape or a click outside, and calls onDismiss', async () => {
    const onDismiss = vi.fn()
    const onPress = vi.fn()
    Alert.alert('Tip', undefined, [{ text: 'OK', onPress }], { cancelable: true, onDismiss })
    await userEvent.keyboard('{Escape}')
    expect(alerts()).toHaveLength(0)

    Alert.alert('Tip', undefined, [{ text: 'OK', onPress }], { cancelable: true, onDismiss })
    clickOutside()
    expect(alerts()).toHaveLength(0)
    expect(onDismiss).toHaveBeenCalledTimes(2)
    expect(onPress).not.toHaveBeenCalled()
  })

  test('the focus goes to the preferred button, else cancel, else the first, and back', () => {
    const element = opener()
    Alert.alert('A', undefined, [
      { text: 'One' },
      { text: 'Two', style: 'cancel' },
      { text: 'Three', isPreferred: true },
    ])
    expect(document.activeElement).toBe(button('Three'))
    button('Three').click()
    expect(document.activeElement).toBe(element)

    Alert.alert('B', undefined, [{ text: 'One' }, { text: 'Two', style: 'cancel' }])
    expect(document.activeElement).toBe(button('Two'))
    button('Two').click()

    Alert.alert('C', undefined, [{ text: 'One' }, { text: 'Two' }])
    expect(document.activeElement).toBe(button('One'))
  })

  test('destructive text is red, and the dark scheme follows Appearance', () => {
    Alert.alert('Delete?', undefined, [{ text: 'Delete', style: 'destructive' }])
    expect(getComputedStyle(button('Delete')).color).toBe('rgb(211, 47, 47)')
    expect(top().dataset['scheme']).toBe('light')
    expect(getComputedStyle(top()).backgroundColor).toBe('rgb(255, 255, 255)')
    resetAlerts()

    Appearance.setColorScheme('dark')
    Alert.alert('Dark')
    expect(top().dataset['scheme']).toBe('dark')
    expect(getComputedStyle(top()).backgroundColor).toBe('rgb(66, 66, 66)')
    resetAlerts()

    Alert.alert('Light', undefined, undefined, { userInterfaceStyle: 'light' })
    expect(top().dataset['scheme']).toBe('light')
  })

  test('a second alert goes on top, and Escape closes it first', async () => {
    Alert.alert('First', undefined, [{ text: 'Close', style: 'cancel' }])
    Alert.alert('Second', undefined, [{ text: 'Close', style: 'cancel' }])
    const [first, second] = alerts()
    const box = second?.getBoundingClientRect()
    const hit = document.elementFromPoint(
      (box?.left ?? 0) + (box?.width ?? 0) / 2,
      (box?.top ?? 0) + 30,
    )
    expect(second?.contains(hit)).toBe(true)

    await userEvent.keyboard('{Escape}')
    expect(alerts()).toEqual([first])
  })

  test('Alert.prompt warns once and shows nothing', () => {
    resetWarnings()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    Alert.prompt('Name?')
    Alert.prompt('Name?')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(alerts()).toHaveLength(0)
  })

  test('without showModal(), the alert is a box on top, and Escape still presses cancel', async () => {
    const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: undefined,
    })
    try {
      const element = opener()
      const onCancel = vi.fn()
      Alert.alert('Old browser', undefined, [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
      ])
      expect(top().hasAttribute('open')).toBe(true)
      expect(getComputedStyle(top()).position).toBe('fixed')
      expect(document.activeElement).toBe(button('Cancel'))

      await userEvent.keyboard('{Escape}')
      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(alerts()).toHaveLength(0)
      expect(document.activeElement).toBe(element)
    } finally {
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal!)
    }
  })
})
