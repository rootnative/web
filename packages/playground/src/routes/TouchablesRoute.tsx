import { useState, type ReactElement } from 'react'
import {
  StyleSheet,
  Text,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'

// Outside the component: the React Compiler lint reads a capitalized call in render as a component.
const ripple = TouchableNativeFeedback.Ripple('#2563eb', false)

export function TouchablesRoute(): ReactElement {
  const [opacityPresses, setOpacityPresses] = useState(0)
  const [longPresses, setLongPresses] = useState(0)
  const [plainPresses, setPlainPresses] = useState(0)
  const [highlightPresses, setHighlightPresses] = useState(0)
  const [nativePresses, setNativePresses] = useState(0)

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        Touchables
      </Text>

      <Text>TouchableOpacity: dims at once on press, fades back over 250 ms.</Text>
      <TouchableOpacity
        role="button"
        style={styles.button}
        onPress={() => setOpacityPresses((n) => n + 1)}
      >
        <Text style={styles.buttonText}>Pressed {opacityPresses} times</Text>
      </TouchableOpacity>

      <Text>activeOpacity 0.6, a resting opacity of 0.8, and a long press.</Text>
      <TouchableOpacity
        activeOpacity={0.6}
        style={[styles.card, styles.faded]}
        onPress={() => {}}
        onLongPress={() => setLongPresses((n) => n + 1)}
      >
        <Text>Press and hold · long presses: {longPresses}</Text>
      </TouchableOpacity>

      <Text>Disabled: no press, out of the tab order.</Text>
      <TouchableOpacity disabled style={[styles.card, styles.disabled]} onPress={() => {}}>
        <Text>Disabled</Text>
      </TouchableOpacity>

      <Text>TouchableWithoutFeedback: no element of its own, no feedback.</Text>
      <TouchableWithoutFeedback role="button" onPress={() => setPlainPresses((n) => n + 1)}>
        <View style={styles.card}>
          <Text>Pressed {plainPresses} times</Text>
        </View>
      </TouchableWithoutFeedback>

      <Text>TouchableHighlight: a dark underlay, and the child at 0.85 while pressed.</Text>
      <TouchableHighlight
        role="button"
        underlayColor="#1e3a8a"
        style={styles.highlight}
        onPress={() => setHighlightPresses((n) => n + 1)}
      >
        <View style={styles.highlightInner}>
          <Text>Pressed {highlightPresses} times</Text>
        </View>
      </TouchableHighlight>

      <Text>TouchableNativeFeedback: no ripple on the web, as on iOS.</Text>
      <TouchableNativeFeedback
        role="button"
        background={ripple}
        onPress={() => setNativePresses((n) => n + 1)}
      >
        <View style={styles.card}>
          <Text>Pressed {nativePresses} times</Text>
        </View>
      </TouchableNativeFeedback>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  buttonText: { color: 'white', fontWeight: '600' },
  card: {
    alignSelf: 'flex-start',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  faded: { opacity: 0.8 },
  highlight: { alignSelf: 'flex-start', borderRadius: 8 },
  highlightInner: { padding: 16, borderRadius: 8, backgroundColor: '#dbeafe' },
  disabled: { opacity: 0.5 },
})
