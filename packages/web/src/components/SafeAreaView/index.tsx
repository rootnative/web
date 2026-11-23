import type { ReactElement } from 'react'

import type { ViewStyle } from '../../apis/StyleSheet/types'
import { warnOnce } from '../../utils/warn'
import { View } from '../View'
import type { HostInstance, ViewProps } from '../View/types'

/** The element of the view. */
export type SafeAreaViewInstance = HostInstance

// The insets of the screen are on its physical sides. One `padding` shorthand keeps them there:
// this runtime writes `paddingLeft` as `padding-inline-start`, which moves in a right-to-left
// layout. A shorthand class also loses to each padding longhand of the app, and a `padding` of
// the app replaces it, so a padding in `style` wins.
const insetStyle = Object.freeze({
  padding:
    'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
}) as unknown as ViewStyle

/**
 * @deprecated As in React Native: use `react-native-safe-area-context`.
 *
 * A `View` with padding that keeps its content out of the notch and the home bar, as on iOS. The
 * padding comes from the safe-area insets of the browser, which a page has only with
 * `viewport-fit=cover` in its viewport `<meta>`. Elsewhere they are 0.
 */
export function SafeAreaView(props: ViewProps): ReactElement {
  warnOnce(
    'safe-area-view-deprecated',
    "SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead.",
  )
  const { style, ...rest } = props
  return <View {...rest} style={[insetStyle, style]} />
}
