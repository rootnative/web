import { useState, type ReactElement } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export function PressableRoute(): ReactElement {
  const [presses, setPresses] = useState(0)
  const [longPresses, setLongPresses] = useState(0)
  const [slopPresses, setSlopPresses] = useState(0)

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        Pressable
      </Text>

      <Text>Style function: pressed, hovered, and a focus ring for keyboard focus only.</Text>
      <Pressable
        role="button"
        onPress={() => setPresses((n) => n + 1)}
        style={({ pressed, hovered, focused }) => [
          styles.button,
          hovered && styles.hovered,
          pressed && styles.pressed,
          focused && styles.focused,
        ]}
      >
        <Text style={styles.buttonText}>Pressed {presses} times</Text>
      </Pressable>

      <Text>Children function and a long press.</Text>
      <Pressable
        onLongPress={() => setLongPresses((n) => n + 1)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {({ pressed }) => (
          <Text>
            {pressed ? 'Hold it…' : 'Press and hold'} · long presses: {longPresses}
          </Text>
        )}
      </Pressable>

      <Text>hitSlop 20: the dashed square is the hit area of the small target.</Text>
      <View style={styles.slopArea}>
        <Pressable
          hitSlop={20}
          onPress={() => setSlopPresses((n) => n + 1)}
          style={({ pressed }) => [styles.slopTarget, pressed && styles.pressed]}
        />
      </View>
      <Text>Presses: {slopPresses}</Text>

      <Text>Disabled: no press, out of the tab order.</Text>
      <Pressable disabled style={[styles.card, styles.disabled]}>
        <Text>Disabled</Text>
      </Pressable>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    cursor: 'pointer',
  },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  hovered: { backgroundColor: '#1d4ed8' },
  pressed: { opacity: 0.6 },
  focused: { outlineColor: '#f59e0b', outlineStyle: 'solid', outlineWidth: 3, outlineOffset: 2 },
  card: {
    maxWidth: 360,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    cursor: 'pointer',
  },
  disabled: { opacity: 0.5, cursor: 'not-allowed' },
  slopArea: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9ca3af',
  },
  slopTarget: { width: 24, height: 24, borderRadius: 4, backgroundColor: '#10b981' },
})
