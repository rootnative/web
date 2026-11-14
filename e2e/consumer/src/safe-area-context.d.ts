// The type check of this app runs with no `skipLibCheck`, to check the types of the tarball.
// The type files of the library read deep files of the real `react-native` package, which this
// app doesn't have. So the app declares the two exports that it uses, and the page check runs
// the real library.
declare module 'react-native-safe-area-context' {
  import type { ReactElement, ReactNode } from 'react'

  export function SafeAreaProvider(props: { children?: ReactNode }): ReactElement
  export function useSafeAreaInsets(): { top: number; right: number; bottom: number; left: number }
}
