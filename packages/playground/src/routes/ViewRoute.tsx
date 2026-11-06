import { useState, type ReactElement } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'

export function ViewRoute(): ReactElement {
  const [layout, setLayout] = useState('')
  const [wide, setWide] = useState(false)

  const onLayout = (event: LayoutChangeEvent): void => {
    const { x, y, width, height } = event.nativeEvent.layout
    setLayout(`x ${x} y ${y} width ${width} height ${height}`)
  }

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        View
      </Text>

      <Text>Flex row with gap, padding, borders, and a shadow.</Text>
      <View style={styles.row}>
        <View style={[styles.box, { backgroundColor: '#fca5a5' }]} />
        <View style={[styles.box, { backgroundColor: '#86efac' }]} />
        <View style={[styles.box, styles.shadow, { backgroundColor: '#93c5fd' }]} />
      </View>

      <Text>Logical properties follow the writing direction.</Text>
      <View style={[styles.row, { writingDirection: 'rtl' }]}>
        <View style={[styles.box, { marginStart: 40, backgroundColor: '#fcd34d' }]} />
        <View style={[styles.box, { backgroundColor: '#fcd34d' }]} />
      </View>

      <Text>Semantic roles render real elements. Inspect the DOM.</Text>
      <View role="list" style={styles.list}>
        <View role="listitem">
          <Text>One</Text>
        </View>
        <View role="listitem">
          <Text>Two</Text>
        </View>
      </View>

      <Text>onLayout reports the size. Press to resize.</Text>
      <View
        role="button"
        tabIndex={0}
        onClick={() => setWide((w) => !w)}
        onLayout={onLayout}
        style={[styles.layoutBox, wide && styles.layoutBoxWide]}
      >
        <Text>{layout}</Text>
      </View>

      <Text>pointerEvents box-none: the parent ignores the pointer, the child does not.</Text>
      <View pointerEvents="box-none" style={styles.overlay}>
        <View role="button" tabIndex={0} onClick={() => alert('child')} style={styles.chip}>
          <Text>Press me</Text>
        </View>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, padding: 12, borderWidth: 1, borderColor: '#d1d5db' },
  box: { width: 60, height: 60, borderRadius: 8 },
  shadow: { boxShadow: '0 4px 12px rgba(0,0,0,0.25)' },
  list: { gap: 4, paddingLeft: 16 },
  layoutBox: { width: 200, height: 60, padding: 8, backgroundColor: '#e5e7eb', cursor: 'pointer' },
  layoutBoxWide: { width: 320 },
  overlay: {
    height: 80,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: { padding: 8, backgroundColor: 'white', borderRadius: 999, cursor: 'pointer' },
})
