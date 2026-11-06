export type ReactNativeVersion = {
  major: number
  minor: number
  patch: number
  prerelease: string | undefined
}

// The react-native release whose API this package matches. Update it with the pin.
export const reactNativeVersion: ReactNativeVersion = {
  major: 0,
  minor: 88,
  patch: 1,
  prerelease: undefined,
}
