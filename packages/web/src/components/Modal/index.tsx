import {
  createContext,
  useCallback,
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

import { Platform } from '../../apis/Platform'
import { StyleSheet } from '../../apis/StyleSheet'
import { claimPress } from '../../events/press/Pressability'
import { toDOMProps } from '../../render/domProps'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import { lockScroll, unlockScroll } from '../../utils/scrollLock'
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
  // A modal on its way out takes no more presses.
  `.${MODAL_CLASS}[data-closing]{pointer-events:none}`,
  // A browser without `::backdrop` drops the inner rule, where `insertRule` would throw.
  `@supports selector(::backdrop){.${MODAL_CLASS}::backdrop{background:transparent}}`,
]

// The window animations of React Native's Android modal: 200 ms (`config_shortAnimTime`). `slide`
// uses the default AccelerateDecelerateInterpolator, (1 - cos(πt)) / 2, and `fade` the
// AccelerateInterpolator, t², which this Bézier draws exactly.
const DURATION_MS = 200
type Motion = { property: 'transform' | 'opacity'; hidden: string; shown: string; easing: string }
const motions: Record<'slide' | 'fade', Motion> = {
  slide: {
    property: 'transform',
    hidden: 'translateY(100%)',
    shown: 'translateY(0)',
    easing: 'cubic-bezier(0.37, 0, 0.63, 1)',
  },
  fade: {
    property: 'opacity',
    hidden: '0',
    shown: '1',
    easing: 'cubic-bezier(0.333, 0, 0.667, 0.333)',
  },
}

const motionOf = (type: ModalProps['animationType']): Motion | null =>
  type === 'slide' || type === 'fade' ? (Platform.isDisableAnimations ? null : motions[type]) : null

// Runs from the end opposite `to`, or from where a running animation is, so a turn doesn't jump.
// The way out holds its last frame until the dialog closes.
const animate = (
  element: HTMLElement,
  motion: Motion,
  to: 'shown' | 'hidden',
  running: Animation | null,
): Animation => {
  const from =
    running === null
      ? motion[to === 'shown' ? 'hidden' : 'shown']
      : getComputedStyle(element)[motion.property]
  running?.cancel()
  return element.animate([{ [motion.property]: from }, { [motion.property]: motion[to] }], {
    duration: DURATION_MS,
    easing: motion.easing,
    fill: to === 'hidden' ? 'forwards' : 'none',
  })
}

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
  const { visible = true, onDismiss, animationType } = props
  const shown = useIsClient() && visible

  // The dialog stays while its exit animation runs, as on iOS.
  const [exiting, setExiting] = useState(false)
  const [lastShown, setLastShown] = useState(shown)
  if (lastShown !== shown) {
    setLastShown(shown)
    setExiting(!shown && animationType != null && animationType !== 'none')
  }
  const mounted = shown || exiting
  const onExited = useCallback(() => setExiting(false), [])

  const dismiss = useRef(onDismiss)
  const wasMounted = useRef(false)
  useEffect(() => {
    dismiss.current = onDismiss
  })
  useEffect(() => {
    if (wasMounted.current && !mounted) dismiss.current?.()
    wasMounted.current = mounted
  }, [mounted])

  return mounted
    ? createPortal(<ModalDialog {...props} closing={!shown} onExited={onExited} />, document.body)
    : null
}

type DialogProps = ModalProps & {
  // `visible` became `false`, and the exit animation runs.
  closing: boolean
  onExited: () => void
}

function ModalDialog(props: DialogProps): ReactElement {
  const {
    children,
    style,
    transparent,
    backdropColor,
    onRequestClose,
    onShow,
    ref,
    modalRef,
    animationType,
    closing,
    onExited,
    // Read by Modal.
    visible: _visible,
    onDismiss: _onDismiss,
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

  const animation = useRef<Animation | null>(null)
  const latest = useRef({ onRequestClose, onShow, onExited, animationType })
  useLayoutEffect(() => {
    latest.current = { onRequestClose, onShow, onExited, animationType }
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
        const announce = (): void => {
          if (announced.current) return
          announced.current = true
          latest.current.onShow?.({ nativeEvent: null })
        }
        const motion = motionOf(latest.current.animationType)
        if (motion === null || typeof element.animate !== 'function') {
          announce()
          return
        }
        const next = animate(element, motion, 'shown', null)
        animation.current = next
        // As on iOS, onShow fires once the modal is in place.
        next.onfinish = () => {
          if (animation.current !== next) return
          animation.current = null
          announce()
        }
      },
      hide: () => {
        if (!open.current) return
        open.current = false
        animation.current?.cancel()
        animation.current = null
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

  // The exit animation when `visible` becomes `false`, and the way back when it turns `true` again
  // before the exit ends.
  const wasClosing = useRef(false)
  useLayoutEffect(() => {
    const element = dialog.current
    if (element === null || closing === wasClosing.current) return
    wasClosing.current = closing
    const motion = motionOf(latest.current.animationType)
    const canAnimate = motion !== null && typeof element.animate === 'function'
    if (closing) {
      // A nested modal goes at once.
      host.hideChildren()
      if (!canAnimate) {
        latest.current.onExited()
        return
      }
      const next = animate(element, motion, 'hidden', animation.current)
      animation.current = next
      next.onfinish = () => {
        if (animation.current === next) latest.current.onExited()
      }
      return
    }
    host.showChildren()
    if (!canAnimate || animation.current === null) return
    const next = animate(element, motion, 'shown', animation.current)
    animation.current = next
    next.onfinish = () => {
      if (animation.current === next) animation.current = null
    }
  }, [closing, host])

  const requestClose = (): void => {
    latest.current.onRequestClose?.({ nativeEvent: null })
  }

  // React passes the events of a nested dialog up through the portal, so each dialog handles only
  // its own. `visible` decides, so the dialog doesn't close itself.
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>): void => {
    if (event.target !== event.currentTarget) return
    event.preventDefault()
    if (!closing) requestClose()
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
      data-closing={closing ? '' : undefined}
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
