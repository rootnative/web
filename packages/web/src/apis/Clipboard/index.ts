import { hasDOM } from '../../utils/env'
import { warnOnce } from '../../utils/warn'

type BrowserClipboard = Navigator['clipboard']

// A page on plain `http` (not localhost) has no `navigator.clipboard`.
const clipboardAPI = (): BrowserClipboard | undefined =>
  hasDOM() ? (navigator.clipboard as BrowserClipboard | undefined) : undefined

const warnDeprecated = (): void =>
  warnOnce(
    'clipboard-deprecated',
    'Clipboard is deprecated in React Native, which will remove it in a future release.',
  )

const warnRefused = (reason: string): void =>
  warnOnce('clipboard-write', `Clipboard.setString: the browser refused the copy. ${reason}`)

// The copy of a page with no Clipboard API, for example a phone on the dev server over the LAN.
const copyWithTextarea = (content: string): void => {
  const focused = document.activeElement
  const textarea = document.createElement('textarea')
  textarea.value = content
  // `readonly` keeps a phone keyboard closed.
  textarea.setAttribute('readonly', '')
  textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  document.body.append(textarea)
  textarea.select()
  textarea.setSelectionRange(0, content.length)
  const copied = document.execCommand('copy')
  textarea.remove()
  if (focused instanceof HTMLElement) focused.focus({ preventScroll: true })
  if (!copied) warnRefused('Call setString from a press handler.')
}

/**
 * Reads and writes text on the clipboard with the async Clipboard API. Deprecated in React
 * Native, so the first call logs a warning.
 */
export const Clipboard: {
  getString: () => Promise<string>
  setString: (content: string) => void
} = {
  getString() {
    warnDeprecated()
    const api = clipboardAPI()
    if (api === undefined || typeof api.readText !== 'function') {
      return Promise.reject(
        new Error(
          "Clipboard.getString: this page can't read the clipboard. Reading needs https or localhost, and a browser with navigator.clipboard.readText.",
        ),
      )
    }
    return api.readText()
  },

  setString(content) {
    warnDeprecated()
    if (!hasDOM()) return
    const api = clipboardAPI()
    if (api === undefined || typeof api.writeText !== 'function') {
      copyWithTextarea(content)
      return
    }
    api.writeText(content).catch((error: unknown) => warnRefused(String(error)))
  },
}
