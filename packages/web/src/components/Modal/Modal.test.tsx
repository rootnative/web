import { act, createRef, StrictMode, useState, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server.browser'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { cleanup, render } from '../../test/render'
import { Pressable } from '../Pressable'
import { Text } from '../Text'
import { View } from '../View'
import { Modal } from './index'
import type { ModalProps } from './types'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const user = async (action: () => Promise<void>): Promise<void> => {
  await act(action)
}

// With the keyboard, so the opener has the focus in every engine: WebKit doesn't focus a
// clicked button.
const open = async (): Promise<void> => {
  byTestId('opener').focus()
  await user(() => userEvent.keyboard('{Enter}'))
}

const dialogs = (): HTMLDialogElement[] => Array.from(document.querySelectorAll('dialog'))
const dialog = (): HTMLDialogElement => document.querySelector('dialog') as HTMLDialogElement
const content = (element = dialog()): HTMLElement => element.firstElementChild as HTMLElement
const byTestId = (id: string): HTMLElement =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLElement

// A screen with a button that opens the modal; onRequestClose hides it, as apps do.
function Screen(props: Partial<ModalProps> & { initial?: boolean }): ReactElement {
  const { initial = false, ...modal } = props
  const [visible, setVisible] = useState(initial)
  return (
    <View>
      <Pressable role="button" testID="opener" onPress={() => setVisible(true)}>
        <Text>Open</Text>
      </Pressable>
      <Modal visible={visible} onRequestClose={() => setVisible(false)} {...modal}>
        <Pressable role="button" testID="close" onPress={() => setVisible(false)}>
          <Text>Close</Text>
        </Pressable>
      </Modal>
    </View>
  )
}

// A modal in a modal, both shown by one press.
function Nested(): ReactElement {
  const [visible, setVisible] = useState(false)
  return (
    <View>
      <Pressable role="button" testID="opener" onPress={() => setVisible(true)}>
        <Text>Open</Text>
      </Pressable>
      <Modal visible={visible} testID="parent">
        <Modal testID="child">
          <Pressable role="button" testID="close" onPress={() => setVisible(false)}>
            <Text>Close both</Text>
          </Pressable>
        </Modal>
      </Modal>
    </View>
  )
}

describe('Modal', () => {
  test('renders nothing while hidden, and a modal dialog on the body while visible', () => {
    const { rerender } = render(
      <Modal visible={false} testID="modal">
        <Text>Hi</Text>
      </Modal>,
    )
    expect(dialogs()).toHaveLength(0)

    rerender(
      <Modal visible testID="modal">
        <Text>Hi</Text>
      </Modal>,
    )
    expect(dialog().parentElement).toBe(document.body)
    expect(dialog().open).toBe(true)
    expect(dialog().matches(':modal')).toBe(true)
    expect(dialog().dataset['testid']).toBe('modal')
    expect(content().textContent).toBe('Hi')
  })

  test('visible is true by default', () => {
    render(<Modal />)
    expect(dialog().open).toBe(true)
  })

  test('ref and modalRef are the dialog', () => {
    const ref = createRef<HTMLDialogElement>()
    const modalRef = createRef<HTMLDialogElement>()
    const { rerender } = render(<Modal ref={ref} modalRef={modalRef} />)
    expect(ref.current).toBe(dialog())
    expect(modalRef.current).toBe(dialog())

    rerender(<Modal ref={ref} modalRef={modalRef} visible={false} />)
    expect(ref.current).toBeNull()
    expect(modalRef.current).toBeNull()
  })

  test('the content box fills the viewport, white by default', () => {
    render(<Modal />)
    const box = content().getBoundingClientRect()
    expect(box.width).toBe(document.documentElement.clientWidth)
    expect(box.height).toBe(window.innerHeight)
    expect(getComputedStyle(content()).backgroundColor).toBe('rgb(255, 255, 255)')
    expect(getComputedStyle(dialog(), '::backdrop').backgroundColor).toBe('rgba(0, 0, 0, 0)')
  })

  test('backdropColor colors the box over style, and transparent wins over both', () => {
    const { rerender } = render(
      <Modal backdropColor="#ff0000" style={{ backgroundColor: '#00ff00', padding: 8 }} />,
    )
    expect(getComputedStyle(content()).backgroundColor).toBe('rgb(255, 0, 0)')
    expect(getComputedStyle(content()).paddingTop).toBe('8px')

    rerender(<Modal transparent backdropColor="#ff0000" />)
    expect(getComputedStyle(content()).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  })

  test('Escape calls onRequestClose, and the app hides the modal', async () => {
    const onRequestClose = vi.fn()
    const { rerender } = render(<Modal onRequestClose={onRequestClose} />)
    await user(() => userEvent.keyboard('{Escape}'))
    expect(onRequestClose).toHaveBeenCalledWith({ nativeEvent: null })
    expect(dialog().open).toBe(true)

    rerender(<Modal onRequestClose={onRequestClose} visible={false} />)
    expect(dialogs()).toHaveLength(0)
  })

  test('the modal stays open while the app keeps it visible, also after a second Escape', async () => {
    const onRequestClose = vi.fn()
    render(<Modal onRequestClose={onRequestClose} />)
    await user(() => userEvent.keyboard('{Escape}'))
    await user(() => userEvent.keyboard('{Escape}'))
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)))
    expect(onRequestClose).toHaveBeenCalledTimes(2)
    expect(dialog().open).toBe(true)
    expect(dialog().matches(':modal')).toBe(true)
  })

  test('onShow fires when it shows, onDismiss after visible becomes false', () => {
    const onShow = vi.fn()
    const onDismiss = vi.fn()
    const { rerender, unmount } = render(<Modal onShow={onShow} onDismiss={onDismiss} />)
    expect(onShow).toHaveBeenCalledTimes(1)
    expect(onShow).toHaveBeenCalledWith({ nativeEvent: null })
    expect(onDismiss).not.toHaveBeenCalled()

    rerender(<Modal onShow={onShow} onDismiss={onDismiss} visible={false} />)
    expect(onDismiss).toHaveBeenCalledTimes(1)
    rerender(<Modal onShow={onShow} onDismiss={onDismiss} />)
    expect(onShow).toHaveBeenCalledTimes(2)
    // As on iOS, an unmount isn't a dismissal.
    unmount()
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  test('the focus moves into the modal, and back to the opener when it hides', async () => {
    render(<Screen />)
    await open()
    expect(dialog().contains(document.activeElement)).toBe(true)

    await user(() => userEvent.keyboard('{Escape}'))
    expect(dialogs()).toHaveLength(0)
    expect(document.activeElement).toBe(byTestId('opener'))
  })

  test('the page under the modal is inert and does not scroll', async () => {
    render(<Screen />)
    await open()
    expect(document.documentElement.style.overflow).toBe('hidden')
    byTestId('opener').focus()
    expect(document.activeElement).not.toBe(byTestId('opener'))

    await user(() => userEvent.click(byTestId('close')))
    expect(document.documentElement.style.overflow).toBe('')
  })

  test('a press inside does not reach a pressable around the Modal', async () => {
    const outer = vi.fn()
    const inner = vi.fn()
    render(
      <Pressable onPress={outer}>
        <Modal>
          <View testID="area" style={{ height: 50 }} />
          <Pressable testID="inner" onPress={inner} style={{ height: 50 }} />
        </Modal>
      </Pressable>,
    )
    await user(() => userEvent.click(byTestId('area')))
    await user(() => userEvent.click(byTestId('inner')))
    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
  })

  test('a nested modal that shows with its parent is on top, and hides first', async () => {
    render(<Nested />)
    await open()
    const top = document.elementFromPoint(5, 5)
    expect(byTestId('child').contains(top)).toBe(true)
    expect(byTestId('parent').matches(':modal')).toBe(true)

    await user(() => userEvent.click(byTestId('close')))
    expect(dialogs()).toHaveLength(0)
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.activeElement).toBe(byTestId('opener'))
  })

  test('Escape in a nested modal requests to close that one only', async () => {
    const parent = vi.fn()
    const child = vi.fn()
    render(
      <Modal onRequestClose={parent}>
        <Modal onRequestClose={child} />
      </Modal>,
    )
    await user(() => userEvent.keyboard('{Escape}'))
    expect(child).toHaveBeenCalledTimes(1)
    expect(parent).not.toHaveBeenCalled()
  })

  test('onShow fires once under StrictMode', () => {
    const onShow = vi.fn()
    render(
      <StrictMode>
        <Modal onShow={onShow} />
      </StrictMode>,
    )
    expect(onShow).toHaveBeenCalledTimes(1)
    expect(dialog().matches(':modal')).toBe(true)
    expect(document.documentElement.style.overflow).toBe('hidden')
  })

  test('renders nothing on the server, and shows after hydration', async () => {
    const app = (
      <View testID="page">
        <Modal>
          <Text>Hi</Text>
        </Modal>
      </View>
    )
    const html = renderToString(app)
    expect(html).not.toContain('Hi')

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const root = await act(async () => hydrateRoot(container, app))
    expect(dialog().open).toBe(true)
    expect(content().textContent).toBe('Hi')
    act(() => root.unmount())
    container.remove()
  })

  test('without showModal(), the dialog is a box on top, and Escape still requests close', async () => {
    const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: undefined,
    })
    try {
      render(<Screen />)
      await open()
      expect(dialog().hasAttribute('open')).toBe(true)
      expect(getComputedStyle(dialog()).position).toBe('fixed')
      expect(document.activeElement).toBe(dialog())

      await user(() => userEvent.keyboard('{Escape}'))
      expect(dialogs()).toHaveLength(0)
      expect(document.activeElement).toBe(byTestId('opener'))
    } finally {
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal!)
    }
  })
})
