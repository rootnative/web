import type { ReactElement } from 'react'
import { Appearance, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native'

const OPTIONS = ['light', 'dark', 'unspecified'] as const

export function AppearanceRoute(): ReactElement {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        Appearance
      </Text>

      <Text>
        Change the OS or browser color scheme. useColorScheme updates on each change. An override
        from setColorScheme wins until you choose "unspecified".
      </Text>

      <View style={[styles.swatch, dark ? styles.dark : styles.light]}>
        <Text style={dark ? styles.onDark : styles.onLight}>useColorScheme: {scheme}</Text>
      </View>

      <View role="group" aria-label="setColorScheme" style={styles.row}>
        {OPTIONS.map((option) => (
          <Pressable
            key={option}
            role="button"
            onPress={() => Appearance.setColorScheme(option)}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>{option}</Text>
          </Pressable>
        ))}
      </View>

      <Text>
        The override also sets color-scheme on the html element, so the form control below follows
        it.
      </Text>
      <input type="checkbox" aria-label="native control" />
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  swatch: { padding: 16, borderRadius: 8, maxWidth: 400 },
  light: { backgroundColor: '#f8f9ff' },
  dark: { backgroundColor: '#111827' },
  onLight: { color: '#111827' },
  onDark: { color: '#f8f9ff' },
  row: { flexDirection: 'row', gap: 8 },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  pressed: { backgroundColor: '#1d4ed8' },
  buttonText: { color: '#fff', fontWeight: '600' },
})
