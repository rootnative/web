import type { ViewProps } from '../View/types'

export type ActivityIndicatorProps = ViewProps & {
  // `false` stops the indicator. The default is `true`.
  animating?: boolean | undefined
  // The default is `#999999`, the default of iOS.
  color?: string | undefined
  // With `false`, a stopped indicator stays visible. The default is `true`.
  hidesWhenStopped?: boolean | undefined
  // `small` is 20 px, `large` is 36 px. The default is `small`.
  size?: number | 'small' | 'large' | undefined
}
