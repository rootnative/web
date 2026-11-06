import type { ReactNativeVersion } from '../../reactNativeVersion'

export type PlatformOSType = 'ios' | 'android' | 'macos' | 'windows' | 'web' | 'native'

type OptionalPlatformSelectSpec<T> = { [key in PlatformOSType]?: T }

export type PlatformSelectSpec<T> =
  (Omit<OptionalPlatformSelectSpec<T>, 'default'> & { default: T }) | OptionalPlatformSelectSpec<T>

export type PlatformType = {
  OS: 'web'
  get Version(): string
  get constants(): { reactNativeVersion: ReactNativeVersion }
  get isTV(): boolean
  get isTesting(): boolean
  get isDisableAnimations(): boolean
  select: <T>(spec: PlatformSelectSpec<T>) => T
}
