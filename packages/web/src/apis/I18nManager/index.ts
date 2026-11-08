import { hasDOM } from '../../utils/env'

export type I18nManagerConstants = {
  isRTL: boolean
  doLeftAndRightSwapInRTL: boolean
  localeIdentifier: string | undefined
}

let allowed = true
let forced = false
let swapLeftAndRight = true

// The document direction, which the page sets with `dir` or with CSS.
const documentIsRTL = (): boolean =>
  hasDOM() && getComputedStyle(document.documentElement).direction === 'rtl'

const isRTL = (): boolean => forced || (allowed && documentIsRTL())

export const I18nManager: {
  readonly isRTL: boolean
  readonly doLeftAndRightSwapInRTL: boolean
  getConstants: () => I18nManagerConstants
  allowRTL: (allow: boolean) => void
  forceRTL: (force: boolean) => void
  swapLeftAndRightInRTL: (swap: boolean) => void
} = {
  get isRTL() {
    return isRTL()
  },

  get doLeftAndRightSwapInRTL() {
    return swapLeftAndRight
  },

  getConstants: () => ({
    isRTL: isRTL(),
    doLeftAndRightSwapInRTL: swapLeftAndRight,
    localeIdentifier: hasDOM() ? navigator.language : undefined,
  }),

  allowRTL: (allow) => {
    allowed = allow
  },

  // On native this takes effect after a restart. Here it sets the document
  // direction at once, so logical styles and text follow.
  forceRTL: (force) => {
    forced = force
    if (hasDOM()) document.documentElement.dir = force ? 'rtl' : ''
  },

  swapLeftAndRightInRTL: (swap) => {
    swapLeftAndRight = swap
  },
}

// For tests.
export const resetI18nManager = (): void => {
  allowed = true
  forced = false
  swapLeftAndRight = true
  if (hasDOM()) document.documentElement.dir = ''
}
