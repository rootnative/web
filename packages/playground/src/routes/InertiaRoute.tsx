import {
  Motion,
  Presence,
  useBooleanSpring,
  useInterpolatedStyle,
  useScroll,
  useTransform,
} from '@rootnative/inertia'
import { useState, type ReactElement } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

// `@rootnative/inertia` from npm, with no Worklets Babel plugin. The route covers the entrance,
// a spring from state, a gesture, a value-layer hook, Presence, layout, and a scroll value.
export function InertiaRoute(): ReactElement {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(true)
  const [wide, setWide] = useState(false)

  const progress = useBooleanSpring(open)
  const fill = useInterpolatedStyle(progress, {
    scale: [1, 1.4],
    backgroundColor: ['#2563eb', '#dc2626'],
  })

  const { scrollY, onScroll } = useScroll()
  const headerOpacity = useTransform(scrollY, [0, 120], [1, 0.2])

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Entrance: initial to animate</Text>
      <Motion.View
        testID="entrance"
        initial={{ opacity: 0, translateY: 24 }}
        animate={{ opacity: 1, translateY: 0 }}
        style={[styles.box, styles.green]}
      />

      <Text style={styles.title}>A spring from state</Text>
      <Pressable testID="toggle" onPress={() => setOpen(!open)} style={styles.button}>
        <Text style={styles.buttonLabel}>{open ? 'Move back' : 'Move'}</Text>
      </Pressable>
      <View style={styles.track}>
        <Motion.View
          testID="slide"
          animate={{ translateX: open ? 160 : 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={[styles.box, styles.blue]}
        />
      </View>
      <Motion.View testID="fill" style={[styles.box, fill]} />

      <Text style={styles.title}>Gesture</Text>
      <Motion.Pressable
        testID="gesture"
        role="button"
        onPress={() => {}}
        gesture={{ hovered: { scale: 1.05 }, pressed: { scale: 0.9, opacity: 0.6 } }}
        style={[styles.box, styles.green]}
      />

      <Text style={styles.title}>Presence</Text>
      <Pressable testID="presence-toggle" onPress={() => setShown(!shown)} style={styles.button}>
        <Text style={styles.buttonLabel}>{shown ? 'Remove' : 'Add'}</Text>
      </Pressable>
      <View style={styles.slot}>
        <Presence>
          {shown ? (
            <Motion.View
              key="item"
              testID="presence"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: 'timing', duration: 200 }}
              style={[styles.box, styles.blue]}
            />
          ) : null}
        </Presence>
      </View>

      <Text style={styles.title}>Layout</Text>
      <Pressable testID="layout-toggle" onPress={() => setWide(!wide)} style={styles.button}>
        <Text style={styles.buttonLabel}>{wide ? 'Narrow' : 'Wide'}</Text>
      </Pressable>
      <Motion.View
        testID="layout"
        layout={{ type: 'timing', duration: 300 }}
        style={[styles.box, styles.green, wide && styles.wide]}
      />

      <Text style={styles.title}>A scroll value</Text>
      <Motion.Text testID="header" style={[styles.header, { opacity: headerOpacity }]}>
        This text fades while the list scrolls
      </Motion.Text>
      <Motion.ScrollView
        testID="scroller"
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scroller}
      >
        {Array.from({ length: 20 }, (_, index) => (
          <Text key={index} style={styles.row}>
            Row {index + 1}
          </Text>
        ))}
      </Motion.ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: 12 },
  title: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  box: { width: 48, height: 48, borderRadius: 8 },
  wide: { width: 200 },
  green: { backgroundColor: '#16a34a' },
  blue: { backgroundColor: '#2563eb' },
  track: { width: 220, padding: 4, borderRadius: 8, backgroundColor: '#e2e8f0' },
  slot: { height: 48 },
  header: { fontSize: 14 },
  scroller: { height: 160, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8 },
  row: { padding: 12 },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  buttonLabel: { color: '#ffffff' },
})
