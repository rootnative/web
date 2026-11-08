import { useEffect, useRef } from 'react'

import { toCSSColor } from '../../style/color'
import { hasDOM } from '../../utils/env'

export type StatusBarStyle = 'default' | 'light-content' | 'dark-content'

export type StatusBarAnimation = 'none' | 'fade' | 'slide'

export type StatusBarProps = {
  animated?: boolean | undefined
  backgroundColor?: unknown
  barStyle?: StatusBarStyle | null | undefined
  hidden?: boolean | undefined
  networkActivityIndicatorVisible?: boolean | undefined
  showHideTransition?: StatusBarAnimation | undefined
  translucent?: boolean | undefined
}

type Entry = StatusBarProps

// The browser has one status bar equivalent: the `theme-color` meta, which
// mobile browsers paint around the page. The stack works as on native: the
// last mounted StatusBar wins, and `set*` calls write the base entry.
const stack: Entry[] = []
const base: Entry = {}

const merged = (): Entry => {
  const out: Entry = { ...base }
  for (const entry of stack) {
    for (const key in entry) {
      const value = (entry as Record<string, unknown>)[key]
      if (value !== undefined) (out as Record<string, unknown>)[key] = value
    }
  }
  return out
}

const themeColorMeta = (): HTMLMetaElement | null => {
  if (!hasDOM()) return null
  let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
  if (meta === null) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  return meta
}

let originalThemeColor: string | null | undefined

const apply = (): void => {
  const meta = themeColorMeta()
  if (meta === null) return
  if (originalThemeColor === undefined) originalThemeColor = meta.getAttribute('content')
  const color = toCSSColor(merged().backgroundColor)
  if (color !== undefined) meta.setAttribute('content', color)
  else if (originalThemeColor === null) meta.removeAttribute('content')
  else meta.setAttribute('content', originalThemeColor)
}

const pushStackEntry = (props: StatusBarProps): Entry => {
  const entry: Entry = { ...props }
  stack.push(entry)
  apply()
  return entry
}

const popStackEntry = (entry: Entry): void => {
  const index = stack.indexOf(entry)
  if (index !== -1) stack.splice(index, 1)
  apply()
}

const replaceStackEntry = (entry: Entry, props: StatusBarProps): Entry => {
  const index = stack.indexOf(entry)
  const next: Entry = { ...props }
  if (index === -1) stack.push(next)
  else stack[index] = next
  apply()
  return next
}

function StatusBarComponent(props: StatusBarProps): null {
  const entry = useRef<Entry | null>(null)
  const {
    animated,
    backgroundColor,
    barStyle,
    hidden,
    networkActivityIndicatorVisible,
    showHideTransition,
    translucent,
  } = props

  useEffect(() => {
    const next = {
      animated,
      backgroundColor,
      barStyle,
      hidden,
      networkActivityIndicatorVisible,
      showHideTransition,
      translucent,
    }
    entry.current =
      entry.current === null ? pushStackEntry(next) : replaceStackEntry(entry.current, next)
  }, [
    animated,
    backgroundColor,
    barStyle,
    hidden,
    networkActivityIndicatorVisible,
    showHideTransition,
    translucent,
  ])

  useEffect(() => {
    return () => {
      if (entry.current !== null) popStackEntry(entry.current)
      entry.current = null
    }
  }, [])

  return null
}

export type StatusBarStatics = {
  currentHeight: number | null
  setBarStyle: (style: StatusBarStyle, animated?: boolean) => void
  setBackgroundColor: (color: unknown, animated?: boolean) => void
  setHidden: (hidden: boolean, animation?: StatusBarAnimation) => void
  setTranslucent: (translucent: boolean) => void
  setNetworkActivityIndicatorVisible: (visible: boolean) => void
  pushStackEntry: (props: StatusBarProps) => StatusBarProps
  popStackEntry: (entry: StatusBarProps) => void
  replaceStackEntry: (entry: StatusBarProps, props: StatusBarProps) => StatusBarProps
}

const statics: StatusBarStatics = {
  // The browser has no status bar, so there is no height to offset.
  currentHeight: null,

  setBarStyle: (style: StatusBarStyle, _animated?: boolean): void => {
    base.barStyle = style
    apply()
  },
  setBackgroundColor: (color: unknown, _animated?: boolean): void => {
    base.backgroundColor = color
    apply()
  },
  setHidden: (hidden: boolean, _animation?: StatusBarAnimation): void => {
    base.hidden = hidden
    apply()
  },
  setTranslucent: (translucent: boolean): void => {
    base.translucent = translucent
    apply()
  },
  setNetworkActivityIndicatorVisible: (visible: boolean): void => {
    base.networkActivityIndicatorVisible = visible
    apply()
  },
  pushStackEntry,
  popStackEntry,
  replaceStackEntry,
}

export const StatusBar: typeof StatusBarComponent & StatusBarStatics = Object.assign(
  StatusBarComponent,
  statics,
)

// For tests.
export const resetStatusBar = (): void => {
  stack.length = 0
  for (const key in base) delete (base as Record<string, unknown>)[key]
  if (hasDOM()) {
    document.head.querySelector('meta[name="theme-color"]:not([media])')?.remove()
  }
  originalThemeColor = undefined
}
