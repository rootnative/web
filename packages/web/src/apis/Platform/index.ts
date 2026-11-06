import { reactNativeVersion } from '../../reactNativeVersion'
import { hasDOM, isTestEnv, matchesMedia } from '../../utils/env'
import type { PlatformSelectSpec, PlatformType } from './types'

export type { PlatformOSType, PlatformSelectSpec, PlatformType } from './types'

export const Platform: PlatformType = {
  OS: 'web',

  get Version(): string {
    return hasDOM() ? navigator.userAgent : ''
  },

  get constants() {
    return { reactNativeVersion }
  },

  get isTV(): boolean {
    return false
  },

  get isTesting(): boolean {
    return isTestEnv()
  },

  get isDisableAnimations(): boolean {
    return matchesMedia('(prefers-reduced-motion: reduce)')
  },

  select<T>(spec: PlatformSelectSpec<T>): T {
    if ('web' in spec) return spec.web as T
    if ('default' in spec) return spec.default as T
    return undefined as T
  },
}
