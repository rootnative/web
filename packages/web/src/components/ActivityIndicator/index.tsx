import type { ReactElement } from 'react'

import { StyleSheet } from '../../apis/StyleSheet'
import { toCSSColor } from '../../style/color'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import { View } from '../View'
import type { ActivityIndicatorProps } from './types'

export type { ActivityIndicatorProps } from './types'

const GRAY = '#999999'

const SPIN_CLASS = 'rn-activity-indicator'
const SPIN_RULES = [
  '@keyframes rn-activity-indicator-spin{to{transform:rotate(360deg)}}',
  `.${SPIN_CLASS}{animation:rn-activity-indicator-spin .75s linear infinite}`,
]

const pausedStyle = { animationPlayState: 'paused' }

export function ActivityIndicator(props: ActivityIndicatorProps): ReactElement {
  const {
    animating = true,
    color = GRAY,
    hidesWhenStopped = true,
    onLayout,
    ref,
    size = 'small',
    style,
    ...rest
  } = props

  const registry = useStyleRegistry()
  const spinClass = registry.staticClass(SPIN_CLASS, SPIN_RULES)
  const stroke = toCSSColor(color) ?? GRAY

  const sizeStyle =
    size === 'small'
      ? styles.sizeSmall
      : size === 'large'
        ? styles.sizeLarge
        : { width: size, height: size }

  // As on native: the container gets `style` and `onLayout`, the indicator gets the other props
  // and the ref.
  return (
    <View onLayout={onLayout} style={[styles.container, style]}>
      <View
        role="progressbar"
        {...rest}
        ref={ref}
        style={[sizeStyle, !animating && hidesWhenStopped && styles.hidden]}
      >
        <svg
          aria-hidden
          className={spinClass}
          height="100%"
          style={animating ? undefined : pausedStyle}
          viewBox="0 0 32 32"
          width="100%"
        >
          <circle
            cx="16"
            cy="16"
            fill="none"
            opacity="0.2"
            r="14"
            stroke={stroke}
            strokeWidth="4"
          />
          <circle
            cx="16"
            cy="16"
            fill="none"
            r="14"
            stroke={stroke}
            strokeDasharray="80"
            strokeDashoffset="60"
            strokeWidth="4"
          />
        </svg>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  sizeSmall: { width: 20, height: 20 },
  sizeLarge: { width: 36, height: 36 },
  hidden: { visibility: 'hidden' },
})
