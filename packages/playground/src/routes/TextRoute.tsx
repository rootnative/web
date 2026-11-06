import { useState, type ReactElement } from 'react'
import { StyleSheet, Text, View } from 'react-native'

const long =
  'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. ' +
  'How vexingly quick daft zebras jump. Sphinx of black quartz, judge my vow.'

export function TextRoute(): ReactElement {
  const [count, setCount] = useState(0)

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        Text
      </Text>

      <Text style={styles.body}>
        Nested text inherits. <Text style={styles.bold}>Bold</Text>,{' '}
        <Text style={styles.red}>red</Text>, and <Text style={styles.underline}>underlined</Text>{' '}
        spans share the parent font.
      </Text>

      <Text>numberOfLines 1</Text>
      <View style={styles.narrow}>
        <Text numberOfLines={1}>{long}</Text>
      </View>

      <Text>numberOfLines 2</Text>
      <View style={styles.narrow}>
        <Text numberOfLines={2}>{long}</Text>
      </View>

      <Text>ellipsizeMode clip</Text>
      <View style={styles.narrow}>
        <Text numberOfLines={1} ellipsizeMode="clip">
          {long}
        </Text>
      </View>

      <Text selectable={false}>This line is not selectable.</Text>
      <Text selectionColor="#fde68a">This line has a yellow selection.</Text>

      <Text onPress={() => setCount((c) => c + 1)} style={styles.press}>
        Pressed {count} times
      </Text>

      <Text href="https://reactnative.dev" target="_blank" rel="noreferrer" style={styles.link}>
        A link with href, target, and rel
      </Text>

      <Text style={styles.mono}>fontFamily monospace, letterSpacing 2</Text>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, maxWidth: 480 },
  bold: { fontWeight: '700' },
  red: { color: '#dc2626' },
  underline: { textDecorationLine: 'underline' },
  narrow: { width: 240, borderWidth: 1, borderColor: '#d1d5db', padding: 8 },
  press: { color: '#2563eb', cursor: 'pointer' },
  link: { color: '#7c3aed', textDecorationLine: 'underline' },
  mono: { fontFamily: 'monospace', letterSpacing: 2 },
})
