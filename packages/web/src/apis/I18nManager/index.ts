import { getLeftAndRightSwap, setLeftAndRightSwap } from '../../style/direction'
import { hasDOM } from '../../utils/env'

export type I18nManagerConstants = {
  isRTL: boolean
  doLeftAndRightSwapInRTL: boolean
  localeIdentifier: string | undefined
}

let allowed = true
let forced = false

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
    return getLeftAndRightSwap()
  },

  getConstants: () => ({
    isRTL: isRTL(),
    doLeftAndRightSwapInRTL: getLeftAndRightSwap(),
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

  // Call it before the first render. A style that a component compiled before keeps its
  // classes until the component renders again.
  swapLeftAndRightInRTL: (swap) => {
    setLeftAndRightSwap(swap)
  },
}

// For tests.
export const resetI18nManager = (): void => {
  allowed = true
  forced = false
  setLeftAndRightSwap(true)
  if (hasDOM()) document.documentElement.dir = ''
}
