import { useState } from 'react'
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

export default function App() {
  const [count, setCount] = useState(0)
  const offset = useSharedValue(0)
  const moved = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }))

  const add = () => {
    setCount((value) => value + 1)
    offset.set(withTiming(160, { duration: 100 }))
  }

  return (
    <View style={styles.screen}>
      <Text role="heading" aria-level={1} style={styles.title}>
        Root Native Web on Metro
      </Text>
      <Text testID="platform">Platform.OS is {Platform.OS}</Text>
      <Image testID="logo" source={require('./assets/logo.png')} />
      <Pressable testID="add" role="button" onPress={add} style={styles.button}>
        <Text style={styles.buttonText}>Add</Text>
      </Pressable>
      <Text testID="count">{count}</Text>
      <Animated.View testID="box" style={[styles.box, moved]} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 24 },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
  },
  buttonText: { color: '#ffffff' },
  box: { width: 40, height: 40, backgroundColor: '#f59e0b' },
})
