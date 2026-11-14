// A library that imports `react-native`. The plugin resolves that name inside the library too.
// This file is JavaScript, so the type check of the app doesn't read the type files of the
// library. They import the real `react-native` package, and its global types don't fit a
// browser program.
import { Text } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'

function InsetsText() {
  const insets = useSafeAreaInsets()
  return <Text testID="insets">{`Insets ${insets.top} ${insets.bottom}`}</Text>
}

export function Insets() {
  return (
    <SafeAreaProvider>
      <InsetsText />
    </SafeAreaProvider>
  )
}
