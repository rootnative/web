import type { ViewProps } from '../View/types'

export type RefreshControlProps = ViewProps & {
  // Shows the indicator. The app sets it, also after a pull.
  refreshing: boolean
  // Called after a pull past the target.
  onRefresh?: (() => void | Promise<void>) | undefined
  // The top of the indicator, for a header over the list.
  progressViewOffset?: number | undefined
  // The first color is the arc. Android cycles the colors; the web uses only the first.
  colors?: ReadonlyArray<string> | undefined
  // `false` turns the pull off. The indicator still shows while `refreshing`.
  enabled?: boolean | undefined
  // The disc behind the arc. The default is white.
  progressBackgroundColor?: string | undefined
  // `default` is 40 px, `large` 56 px.
  size?: 'default' | 'large' | undefined
  // iOS. The arc when `colors` is empty.
  tintColor?: string | undefined
  // iOS. The accessible name of the indicator. The web shows no text.
  title?: string | undefined
  // iOS. No web effect.
  titleColor?: string | undefined
}
