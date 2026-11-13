import { useEffect, useState, type ReactElement } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

// The playground has no Worklets Babel plugin, so each hook lists its shared values, as
// Reanimated's guide for the web without the plugin says.
export function ReanimatedRoute(): ReactElement {
  const turn = useSharedValue(0)
  const progress = useSharedValue(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    turn.value = withRepeat(withTiming(360, { duration: 2000, easing: Easing.linear }), -1)
  }, [turn])

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }), [turn])
  const slide = useAnimatedStyle(
    () => ({
      transform: [{ translateX: progress.value * 160 }],
      opacity: 0.4 + progress.value * 0.6,
      backgroundColor: interpolateColor(progress.value, [0, 1], ['#2563eb', '#dc2626']),
    }),
    [progress],
  )

  const toggle = (): void => {
    progress.value = withTiming(open ? 0 : 1, { duration: 300 })
    setOpen(!open)
  }

  return (
    <View style={styles.page}>
      <Text style={styles.title}>withRepeat and withTiming</Text>
      <Animated.View testID="spin" style={[styles.box, styles.spin, spin]} />

      <Text style={styles.title}>A timing on press</Text>
      <Pressable testID="toggle" onPress={toggle} style={styles.button}>
        <Text style={styles.buttonLabel}>{open ? 'Move back' : 'Move'}</Text>
      </Pressable>
      <View style={styles.track}>
        <Animated.View testID="slide" style={[styles.box, slide]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: 12 },
  title: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  box: { width: 48, height: 48, borderRadius: 8 },
  spin: { backgroundColor: '#16a34a' },
  track: { width: 220, padding: 4, borderRadius: 8, backgroundColor: '#e2e8f0' },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  buttonLabel: { color: '#ffffff' },
})
