import { useMemo, useRef, useState, type ReactElement } from 'react'
import { PanResponder, StyleSheet, Text, View } from 'react-native'

export function PanResponderRoute(): ReactElement {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [status, setStatus] = useState('idle')
  const [log, setLog] = useState<string[]>([])
  const start = useRef({ x: 0, y: 0 })

  const note = (entry: string): void => setLog((entries) => [entry, ...entries].slice(0, 6))

  // `start` is where the box rested before this drag. The gesture adds dx and dy.
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setStatus('dragging')
          note('grant')
        },
        onPanResponderMove: (_event, state) => {
          setOffset({ x: start.current.x + state.dx, y: start.current.y + state.dy })
        },
        onPanResponderRelease: (_event, state) => {
          start.current = { x: start.current.x + state.dx, y: start.current.y + state.dy }
          setStatus('idle')
          note(
            `release dx ${Math.round(state.dx)} dy ${Math.round(state.dy)} vx ${state.vx.toFixed(2)}`,
          )
        },
        onPanResponderTerminate: (_event, state) => {
          start.current = { x: start.current.x + state.dx, y: start.current.y + state.dy }
          setStatus('idle')
          note('terminate')
        },
      }),
    [],
  )

  const horizontal = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, state) =>
          Math.abs(state.dx) > 10 && Math.abs(state.dx) > Math.abs(state.dy),
        onPanResponderGrant: () => note('outer took a horizontal drag'),
        onPanResponderRelease: () => note('outer release'),
      }),
    [],
  )

  const inner = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => note('inner grant'),
        onPanResponderTerminate: () => note('inner terminated'),
        onPanResponderRelease: () => note('inner release'),
      }),
    [],
  )

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        PanResponder
      </Text>

      <Text>Drag the box. It follows dx and dy from the gesture state. Status: {status}</Text>
      <View style={styles.area}>
        <View
          {...responder.panHandlers}
          role="img"
          aria-label="Draggable box"
          style={[
            styles.box,
            status === 'dragging' && styles.active,
            { transform: [{ translateX: offset.x }, { translateY: offset.y }] },
          ]}
        />
      </View>

      <Text>
        Nested: the inner box takes every touch. The outer area takes over when the drag turns
        horizontal, through onMoveShouldSetPanResponderCapture and a termination request.
      </Text>
      <View {...horizontal.panHandlers} style={styles.outer}>
        <View {...inner.panHandlers} style={styles.inner}>
          <Text style={styles.innerText}>inner</Text>
        </View>
      </View>

      <View role="log" aria-live="polite" style={styles.log}>
        {log.map((entry, index) => (
          <Text key={`${index}-${entry}`} style={styles.logText}>
            {entry}
          </Text>
        ))}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  area: { height: 200, width: 400, backgroundColor: '#f3f4f6', borderRadius: 8 },
  box: {
    width: 80,
    height: 80,
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#60a5fa',
    // A touch drag must not scroll the page.
    touchAction: 'none',
  },
  active: { backgroundColor: '#2563eb' },
  outer: {
    width: 400,
    height: 120,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    touchAction: 'none',
  },
  inner: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerText: { color: '#fff', fontWeight: '600' },
  log: { gap: 2, minHeight: 100 },
  logText: { fontSize: 12, color: '#374151', fontFamily: 'monospace' },
})
