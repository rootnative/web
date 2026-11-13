import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'

import { Keyboard, type KeyboardEvent, type KeyboardMetrics } from '../../apis/Keyboard'
import { View } from '../View'
import type { LayoutChangeEvent, LayoutRectangle } from '../View/types'
import type { KeyboardAvoidingViewProps } from './types'

export type { KeyboardAvoidingViewInstance, KeyboardAvoidingViewProps } from './types'

/**
 * A view that moves out of the way of the keyboard, with the math of React Native 0.88. As on
 * native, the frame of the view comes from `onLayout`, so its `y` is relative to its parent.
 * `keyboardVerticalOffset` adds the distance to the top of the window.
 */
export function KeyboardAvoidingView(props: KeyboardAvoidingViewProps): ReactElement {
  const {
    behavior,
    children,
    contentContainerStyle,
    enabled = true,
    keyboardVerticalOffset = 0,
    style,
    onLayout,
    ...rest
  } = props

  // `bottom` is the value on screen. It changes only while the view is enabled, as on native.
  const [bottom, setBottom] = useState(0)
  const [initialFrameHeight, setInitialFrameHeight] = useState(0)

  const frame = useRef<LayoutRectangle | null>(null)
  const keyboard = useRef<KeyboardEvent | null>(null)
  const latestBottom = useRef(0)
  const shownBottom = useRef(0)
  const initialHeight = useRef(0)
  const latest = useRef({ behavior, enabled, keyboardVerticalOffset, onLayout })
  useEffect(() => {
    latest.current = { behavior, enabled, keyboardVerticalOffset, onLayout }
  })

  // Made once. They read the latest values from the refs.
  const [handlers] = useState(() => {
    const relativeKeyboardHeight = (keyboardFrame: KeyboardMetrics): number => {
      const layout = frame.current
      if (layout === null) return 0
      const keyboardY = keyboardFrame.screenY - latest.current.keyboardVerticalOffset
      if (latest.current.behavior === 'height') {
        return Math.max(shownBottom.current + layout.y + layout.height - keyboardY, 0)
      }
      // The distance that the view must move so that it no longer overlaps the keyboard.
      return Math.max(layout.y + layout.height - keyboardY, 0)
    }

    const update = (): void => {
      const event = keyboard.current
      const next = event === null ? 0 : relativeKeyboardHeight(event.endCoordinates)
      if (event !== null && latestBottom.current === next) return
      latestBottom.current = next
      if (latest.current.enabled) {
        shownBottom.current = next
        setBottom(next)
      }
    }

    const handleLayout = (event: LayoutChangeEvent): void => {
      const old = frame.current
      frame.current = event.nativeEvent.layout
      if (initialHeight.current === 0) {
        // The height before the keyboard shows.
        initialHeight.current = frame.current.height
        setInitialFrameHeight(frame.current.height)
      }
      if (old === null || old.height !== frame.current.height) update()
      latest.current.onLayout?.(event)
    }

    return { update, handleLayout }
  })

  useEffect(() => {
    const { update } = handlers
    if (!Keyboard.isVisible()) {
      keyboard.current = null
      update()
    }
    const subscriptions = [
      Keyboard.addListener('keyboardDidHide', () => {
        keyboard.current = null
        update()
      }),
      Keyboard.addListener('keyboardDidShow', (event) => {
        keyboard.current = event
        update()
      }),
    ]
    return () => {
      for (const subscription of subscriptions) subscription.remove()
    }
  }, [handlers])

  // A view that is enabled again shows the latest value.
  useEffect(() => {
    if (enabled && shownBottom.current !== latestBottom.current) {
      shownBottom.current = latestBottom.current
      setBottom(latestBottom.current)
    }
  }, [enabled])

  const bottomHeight = enabled ? bottom : 0
  const outerStyle = useMemo(() => {
    if (behavior === 'padding') return [style, { paddingBottom: bottomHeight }]
    // A height change applies only while the keyboard shows, so the view gets its height back.
    // A fixed height needs `flex: 0`.
    if (behavior === 'height' && bottom > 0) {
      return [style, { height: initialFrameHeight - bottomHeight, flex: 0 }]
    }
    return style
  }, [behavior, bottom, bottomHeight, initialFrameHeight, style])
  const innerStyle = useMemo(
    () => [contentContainerStyle, { bottom: bottomHeight }],
    [contentContainerStyle, bottomHeight],
  )
  return (
    <View {...rest} style={outerStyle} onLayout={handlers.handleLayout}>
      {behavior === 'position' ? <View style={innerStyle}>{children}</View> : children}
    </View>
  )
}
