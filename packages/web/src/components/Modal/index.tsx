import {
  createContext,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type SyntheticEvent,
} from 'react'
import { createPortal } from 'react-dom'

import { StyleSheet } from '../../apis/StyleSheet'
import { claimPress } from '../../events/press/Pressability'
import { toDOMProps } from '../../render/domProps'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import { View } from '../View'
import type { ModalProps } from './types'

export type { ModalEvent, ModalOrientationChangeEvent, ModalProps } from './types'

const MODAL_CLASS = 'rn-modal'
// The dialog fills the viewport, and the content box fills the dialog. The z-index matters only
// where the browser has no top layer.
const RULES = [
  `.${MODAL_CLASS}{position:fixed;inset:0;z-index:2147483647;box-sizing:border-box;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;color:inherit;overflow:hidden}`,
  `.${MODAL_CLASS}[open]{display:flex;flex-direction:column}`,
  `.${MODAL_CLASS}:not([open]){display:none}`,
  `.${MODAL_CLASS}:focus{outline:none}`,
  // A browser without `::backdrop` drops the inner rule, where `insertRule` would throw.
  `@supports selector(::backdrop){.${MODAL_CLASS}::backdrop{background:transparent}}`,
]

// A nested modal shows after its parent, so it's on top, and hides before it.
type Layer = { show: () => void; hide: () => void }
type Host = { add: (child: Layer) => () => void }
const HostContext = createContext<Host | null>(null)

const createHost = (): Host & { showChildren: () => void; hideChildren: () => void } => {
  const children = new Set<Layer>()
  let shown = false
  return {
    add: (child) => {
      children.add(child)
      if (shown) child.show()
      return () => {
        children.delete(child)
      }
    },
    showChildren: () => {
      shown = true
      for (const child of children) child.show()
    },
    hideChildren: () => {
      shown = false
      // Last shown, first hidden. No `toReversed()`: Chrome 95 and Safari 15.1 don't have it.
      const list = Array.from(children)
      for (let index = list.length - 1; index >= 0; index--) list[index]?.hide()
    },
  }
}

// The page under a modal doesn't scroll, as on native.
let scrollLocks = 0
let pageOverflow = ''
const lockScroll = (): void => {
  const root = document.documentElement
  if (scrollLocks++ === 0) {
    pageOverflow = root.style.overflow
    root.style.overflow = 'hidden'
  }
}
const unlockScroll = (): void => {
  if (--scrollLocks === 0) document.documentElement.style.overflow = pageOverflow
}

const subscribeNothing = (): (() => void) => () => {}
// `false` on the server and in the hydration render, so the markup matches, then `true`.
const useIsClient = (): boolean =>
  useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )

/**
 * React Native's `Modal` on a `<dialog>` in the top layer. `showModal()` makes the rest of the
 * page inert, keeps the focus inside, and turns Escape into `onRequestClose`.
 */
export function Modal(props: ModalProps): ReactElement | null {
  const { visible = true, onDismiss } = props
  const shown = useIsClient() && visible

  const dismiss = useRef(onDismiss)
  const wasShown = useRef(false)
  useEffect(() => {
    dismiss.current = onDismiss
  })
  useEffect(() => {
    if (wasShown.current && !shown) dismiss.current?.()
    wasShown.current = shown
  }, [shown])

  return shown ? createPortal(<ModalDialog {...props} />, document.body) : null
}

function ModalDialog(props: ModalProps): ReactElement {
  const {
    children,
    style,
    transparent,
    backdropColor,
    onRequestClose,
    onShow,
    ref,
    modalRef,
    // Read by Modal.
    visible: _visible,
    onDismiss: _onDismiss,
    // Not shipped yet.
    animationType: _animationType,
    // Native only.
    allowSwipeDismissal: _allowSwipeDismissal,
    hardwareAccelerated: _hardwareAccelerated,
    navigationBarTranslucent: _navigationBarTranslucent,
    onOrientationChange: _onOrientationChange,
    presentationStyle: _presentationStyle,
    statusBarTranslucent: _statusBarTranslucent,
    supportedOrientations: _supportedOrientations,
    ...rest
  } = props

  const registry = useStyleRegistry()
  const className = registry.staticClass(MODAL_CLASS, RULES)
  const dialog = useRef<HTMLDialogElement>(null)
  const open = useRef(false)
  // Once per show, also when StrictMode runs the effect twice.
  const announced = useRef(false)
  const parent = useContext(HostContext)
  const [host] = useState(createHost)

  const latest = useRef({ onRequestClose, onShow })
  useLayoutEffect(() => {
    latest.current = { onRequestClose, onShow }
  })

  useImperativeHandle(ref, () => dialog.current as HTMLDialogElement, [])
  useImperativeHandle(modalRef, () => dialog.current as HTMLDialogElement, [])

  useLayoutEffect(() => {
    const element = dialog.current
    if (element === null) return
    // Firefox before 98 and Safari before 15.4 have no `showModal()`. There the dialog is a fixed
    // box on top, with the focus moved in and out, and no trap.
    const modal = typeof element.showModal === 'function'
    let focused: Element | null = null

    const layer: Layer = {
      show: () => {
        if (open.current) return
        open.current = true
        if (modal) element.showModal()
        else {
          focused = document.activeElement
          element.setAttribute('open', '')
          element.tabIndex = -1
          element.focus()
        }
        lockScroll()
        host.showChildren()
        if (!announced.current) {
          announced.current = true
          latest.current.onShow?.({ nativeEvent: null })
        }
      },
      hide: () => {
        if (!open.current) return
        open.current = false
        host.hideChildren()
        // The browser gives the focus back to the element that had it before `showModal()`.
        if (modal) element.close()
        else {
          element.removeAttribute('open')
          if (focused instanceof HTMLElement && focused.isConnected) focused.focus()
        }
        unlockScroll()
      },
    }

    let remove: (() => void) | undefined
    if (parent === null) layer.show()
    else remove = parent.add(layer)
    return () => {
      remove?.()
      layer.hide()
    }
  }, [host, parent])

  const requestClose = (): void => {
    latest.current.onRequestClose?.({ nativeEvent: null })
  }

  // React passes the events of a nested dialog up through the portal, so each dialog handles only
  // its own. `visible` decides, so the dialog doesn't close itself.
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>): void => {
    if (event.target !== event.currentTarget) return
    event.preventDefault()
    requestClose()
  }

  // Chrome closes a dialog anyway on a second Escape with no other input between. The app still
  // shows the modal, so it opens again.
  const handleClose = (event: SyntheticEvent<HTMLDialogElement>): void => {
    const element = event.currentTarget
    if (event.target === element && open.current && !element.open) element.showModal()
  }

  const domProps = toDOMProps(rest)
  const appPointerDown = domProps['onPointerDown'] as ((event: PointerEvent) => void) | undefined
  const appClick = domProps['onClick'] as ((event: MouseEvent) => void) | undefined
  const appKeyDown = domProps['onKeyDown'] as ((event: KeyboardEvent) => void) | undefined

  const containerStyle = transparent
    ? styles.transparent
    : backdropColor != null
      ? { backgroundColor: backdropColor }
      : undefined

  return (
    <dialog
      {...domProps}
      ref={dialog}
      className={className}
      onCancel={handleCancel}
      onClose={handleClose}
      // The presses inside stay inside, as the native host claims the responder.
      onPointerDown={(event) => {
        appPointerDown?.(event)
        claimPress(event.nativeEvent)
      }}
      onClick={(event) => {
        appClick?.(event)
        claimPress(event.nativeEvent)
      }}
      onKeyDown={(event) => {
        appKeyDown?.(event)
        const element = event.currentTarget
        if (
          event.key === 'Escape' &&
          typeof element.showModal !== 'function' &&
          (event.target as Element).closest('dialog') === element
        ) {
          requestClose()
        }
      }}
    >
      <HostContext.Provider value={host}>
        <View style={[styles.container, style, containerStyle]}>{children}</View>
      </HostContext.Provider>
    </dialog>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  transparent: { backgroundColor: 'transparent' },
})
