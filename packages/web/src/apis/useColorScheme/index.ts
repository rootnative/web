import { useSyncExternalStore } from 'react'

import { Appearance, type ColorSchemeName } from '../Appearance'

const subscribe = (onChange: () => void): (() => void) => {
  const subscription = Appearance.addChangeListener(onChange)
  return () => subscription.remove()
}

const getSnapshot = (): ColorSchemeName => Appearance.getColorScheme()

// Hydration adopts the server's 'light', then React renders the real scheme.
const getServerSnapshot = (): ColorSchemeName => 'light'

export const useColorScheme = (): ColorSchemeName =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
