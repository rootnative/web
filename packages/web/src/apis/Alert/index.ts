import { getStyleRegistry } from '../../style/registry'
import { systemFontStack } from '../../style/resolveStyle'
import { hasDOM } from '../../utils/env'
import { lockScroll, unlockScroll } from '../../utils/scrollLock'
import { warnOnce } from '../../utils/warn'
import { Appearance } from '../Appearance'

export type AlertType = 'default' | 'plain-text' | 'secure-text' | 'login-password'

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive'

export type AlertButton = {
  text?: string | undefined
  onPress?: ((value?: string) => unknown) | undefined
  // iOS on native. The web gives it the focus.
  isPreferred?: boolean | undefined
  // `cancel`: Escape presses it. `destructive`: red text.
  style?: AlertButtonStyle | undefined
}

export type AlertOptions = {
  // Escape, the back gesture, and a click outside the alert close it, with no button.
  cancelable?: boolean | undefined
  // `light` or `dark`. The default follows Appearance.
  userInterfaceStyle?: 'unspecified' | 'light' | 'dark' | undefined
  // Called when a cancelable alert closes with no button.
  onDismiss?: (() => void) | undefined
}

const ALERT = 'rn-alert'
// Android's AlertDialog: a white card with a 24 dp shadow over a 60% dim, and text buttons in the
// accent color. The selectors that an older browser doesn't know sit in `@supports`, because
// `insertRule` throws on them.
const RULES = [
  `.${ALERT}{position:fixed;inset:auto;top:50%;left:50%;z-index:2147483647;box-sizing:border-box;min-width:min(280px,calc(100% - 48px));max-width:min(560px,calc(100% - 48px));max-height:calc(100% - 48px);margin:0;padding:24px 24px 8px;overflow:auto;border:0;border-radius:2px;background:#fff;color:rgba(0,0,0,.87);font-family:${systemFontStack};box-shadow:0 11px 15px -7px rgba(0,0,0,.2),0 24px 38px 3px rgba(0,0,0,.14),0 9px 46px 8px rgba(0,0,0,.12);transform:translate(-50%,-50%)}`,
  `.${ALERT}:not([open]){display:none}`,
  `.${ALERT}:focus{outline:none}`,
  `.${ALERT}-title{margin:0;font-size:20px;font-weight:500;line-height:1.3;overflow-wrap:break-word}`,
  `.${ALERT}-message{margin:0;font-size:16px;line-height:1.5;color:rgba(0,0,0,.6);white-space:pre-wrap;overflow-wrap:break-word}`,
  `.${ALERT}-title+.${ALERT}-message{margin-top:16px}`,
  `.${ALERT}-buttons{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;margin:24px -16px 0}`,
  `.${ALERT}-buttons[data-neutral]>:first-child{margin-inline-end:auto}`,
  `.${ALERT}-button{min-width:64px;min-height:36px;padding:0 8px;border:0;border-radius:2px;background:transparent;color:#009688;font:inherit;font-size:14px;font-weight:500;cursor:pointer}`,
  `.${ALERT}-button:hover{background:rgba(0,150,136,.08)}`,
  `.${ALERT}-button[data-style=destructive]{color:#d32f2f}`,
  `.${ALERT}[data-scheme=dark]{background:#424242;color:#fff}`,
  `.${ALERT}[data-scheme=dark] .${ALERT}-message{color:rgba(255,255,255,.7)}`,
  `.${ALERT}[data-scheme=dark] .${ALERT}-button{color:#80cbc4}`,
  `.${ALERT}[data-scheme=dark] .${ALERT}-button[data-style=destructive]{color:#ef9a9a}`,
  `@supports selector(:focus-visible){.${ALERT}-button:focus-visible{outline:2px solid currentColor;outline-offset:-2px}}`,
  `@supports selector(::backdrop){.${ALERT}::backdrop{background:rgba(0,0,0,.6)}}`,
]

type OpenAlert = { close: () => void }
const openAlerts = new Set<OpenAlert>()
let nextId = 0

// No `findLastIndex()`: Chrome 95 and Safari 15.1 don't have it.
const lastIndexOf = (
  list: ReadonlyArray<AlertButton>,
  test: (button: AlertButton) => boolean,
): number => {
  for (let index = list.length - 1; index >= 0; index--) {
    const button = list[index]
    if (button !== undefined && test(button)) return index
  }
  return -1
}

const isOutside = (event: MouseEvent, element: HTMLElement): boolean => {
  const box = element.getBoundingClientRect()
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  )
}

const show = (
  title: string | null | undefined,
  message: string | null | undefined,
  buttons: ReadonlyArray<AlertButton> | undefined,
  options: AlertOptions | undefined,
): void => {
  if (!hasDOM()) return
  getStyleRegistry().staticClass(ALERT, RULES)
  const id = `${ALERT}-${++nextId}`

  const dialog = document.createElement('dialog')
  dialog.className = ALERT
  dialog.setAttribute('role', 'alertdialog')
  const style = options?.userInterfaceStyle
  dialog.dataset['scheme'] =
    style === 'light' || style === 'dark' ? style : (Appearance.getColorScheme() ?? 'light')

  if (title) {
    const heading = document.createElement('div')
    heading.className = `${ALERT}-title`
    heading.id = `${id}-title`
    heading.textContent = title
    dialog.append(heading)
    dialog.setAttribute('aria-labelledby', heading.id)
  }
  if (message) {
    const body = document.createElement('div')
    body.className = `${ALERT}-message`
    body.id = `${id}-message`
    body.textContent = message
    dialog.append(body)
    dialog.setAttribute('aria-describedby', body.id)
  }

  // No buttons get an OK button, as on iOS, so the alert can always close.
  const list: ReadonlyArray<AlertButton> =
    buttons === undefined || buttons.length === 0 ? [{ text: 'OK' }] : buttons

  // Firefox before 98 and Safari before 15.4 have no `showModal()`. There the alert is a fixed box
  // on top, with no dim, and Escape comes from keydown.
  const modal = typeof dialog.showModal === 'function'
  const focused = document.activeElement
  let closed = false

  const close = (): void => {
    if (closed) return
    closed = true
    openAlerts.delete(entry)
    // The browser gives the focus back to the element that had it before `showModal()`.
    if (modal) dialog.close()
    else if (focused instanceof HTMLElement && focused.isConnected) focused.focus()
    dialog.remove()
    unlockScroll()
  }
  const entry: OpenAlert = { close }

  // The alert closes first, so a press can open the next one.
  const press = (button: AlertButton): void => {
    close()
    button.onPress?.()
  }

  const dismiss = (): void => {
    close()
    options?.onDismiss?.()
  }

  // Escape presses the cancel button, as on iOS. Without one, it dismisses a cancelable alert, as
  // the back button does on Android.
  const cancel = (): void => {
    const cancelButton = list[lastIndexOf(list, (button) => button.style === 'cancel')]
    if (cancelButton !== undefined) press(cancelButton)
    else if (options?.cancelable === true) dismiss()
  }

  const row = document.createElement('div')
  row.className = `${ALERT}-buttons`
  // Android's neutral button: the first of three sits at the start.
  if (list.length >= 3) row.dataset['neutral'] = ''
  const elements = list.map((button, index) => {
    const element = document.createElement('button')
    element.type = 'button'
    element.className = `${ALERT}-button`
    // As on Android, the last button without text says OK.
    element.textContent = button.text || (index === list.length - 1 ? 'OK' : '')
    if (button.style === 'destructive') element.dataset['style'] = 'destructive'
    element.addEventListener('click', () => press(button))
    row.append(element)
    return element
  })
  dialog.append(row)

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    cancel()
  })
  // Chrome closes a dialog anyway on a second Escape with no other input between. The alert stays.
  dialog.addEventListener('close', () => {
    if (!closed) dialog.showModal()
  })
  // A click on the dim outside the card. Android closes a cancelable alert there.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && isOutside(event, dialog) && options?.cancelable === true) {
      dismiss()
    }
  })
  if (!modal) {
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') cancel()
    })
  }

  document.body.append(dialog)
  if (modal) dialog.showModal()
  else dialog.setAttribute('open', '')
  lockScroll()
  openAlerts.add(entry)

  // The preferred button, else the cancel button, else the first: Enter never confirms by chance.
  const preferred = list.findIndex((button) => button.isPreferred === true)
  const target =
    preferred >= 0 ? preferred : lastIndexOf(list, (button) => button.style === 'cancel')
  elements[target >= 0 ? target : 0]?.focus()
}

/**
 * React Native's `Alert` on a `<dialog role="alertdialog">` with the look of Android's
 * AlertDialog. It isn't part of the React tree, so it works from any handler.
 */
export const Alert: {
  alert: (
    title: string | null | undefined,
    message?: string | null | undefined,
    buttons?: ReadonlyArray<AlertButton>,
    options?: AlertOptions,
  ) => void
  prompt: (
    title: string | null | undefined,
    message?: string | null | undefined,
    callbackOrButtons?: ((text: string) => void) | ReadonlyArray<AlertButton> | null | undefined,
    type?: AlertType | null | undefined,
    defaultValue?: string,
    keyboardType?: string,
    options?: AlertOptions,
  ) => void
} = {
  alert: (title, message, buttons, options) => show(title, message, buttons, options),
  prompt: () => {
    warnOnce('alert-prompt', 'Alert.prompt does nothing on the web yet, as on Android.')
  },
}

// For tests: closes every open alert.
export const resetAlerts = (): void => {
  for (const entry of Array.from(openAlerts)) entry.close()
}
