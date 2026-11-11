import { hasDOM } from '../../utils/env'

export type ShareContent =
  | { title?: string | undefined; url: string; message?: string | undefined }
  | { title?: string | undefined; url?: string | undefined; message: string }

// No web effect. The browser's share sheet has no title, subject, color, or anchor.
export type ShareOptions = {
  dialogTitle?: string | undefined
  excludedActivityTypes?: Array<string> | undefined
  tintColor?: string | undefined
  subject?: string | undefined
  anchor?: number | undefined
}

export type ShareAction = {
  action: 'sharedAction' | 'dismissedAction'
  activityType?: string | null | undefined
}

const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError'

/**
 * Opens the browser's share sheet with `navigator.share`. It shares the title, the message,
 * and the URL. A closed sheet resolves `dismissedAction`, as on iOS.
 */
export const Share: {
  share: (content: ShareContent, options?: ShareOptions) => Promise<ShareAction>
  readonly sharedAction: 'sharedAction'
  readonly dismissedAction: 'dismissedAction'
} = {
  share(content, options = {}) {
    if (typeof content !== 'object' || content === null) {
      throw new Error('Content to share must be a valid object')
    }
    if (typeof content.url !== 'string' && typeof content.message !== 'string') {
      throw new Error('At least one of URL or message is required')
    }
    if (typeof options !== 'object' || options === null) {
      throw new Error('Options must be a valid object')
    }
    if (!hasDOM() || typeof navigator.share !== 'function') {
      return Promise.reject(new Error('Unsupported platform'))
    }

    const data: ShareData = {}
    if (typeof content.title === 'string') data.title = content.title
    if (typeof content.message === 'string') data.text = content.message
    if (typeof content.url === 'string') data.url = content.url

    return navigator.share(data).then(
      (): ShareAction => ({ action: 'sharedAction', activityType: null }),
      (error: unknown): ShareAction => {
        if (isAbort(error)) return { action: 'dismissedAction', activityType: null }
        throw error
      },
    )
  },

  sharedAction: 'sharedAction',
  dismissedAction: 'dismissedAction',
}
