import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'

import { label } from './label'

// A library that imports `react-native`. The plugin resolves that name inside the library too.
function Insets() {
  const insets = useSafeAreaInsets()
  return <Text testID="insets">{`Insets ${insets.top} ${insets.bottom}`}</Text>
}

export function App() {
  return (
    <SafeAreaProvider>
      <Screen />
    </SafeAreaProvider>
  )
}

function Screen() {
  const [count, setCount] = useState(0)
  return (
    <View role="main" style={styles.screen}>
      <Text role="heading" aria-level={1}>
        Consumer check
      </Text>
      <Text testID="platform">{Platform.OS}</Text>
      <Text testID="dev">{String(__DEV__)}</Text>
      <Text testID="label">{label}</Text>
      <Insets />
      <Pressable testID="press" onPress={() => setCount((value) => value + 1)}>
        <Text testID="count">{`Pressed ${count}`}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
})
