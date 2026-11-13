import { useCallback, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import {
  StyleSheet,
  Text,
  View,
  usePressability,
  type PressabilityConfig,
  type Role,
} from 'react-native'

type Log = (line: string) => void

export function PressabilityRoute(): ReactElement {
  const [lines, setLines] = useState<ReadonlyArray<{ id: number; text: string }>>([])
  const log = useCallback<Log>((text) => {
    setLines((current) => [{ id: Date.now() + Math.random(), text }, ...current].slice(0, 16))
  }, [])

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        usePressability
      </Text>
      <Text style={styles.hint}>
        Click, hold, or drag out and back in. Press Tab to focus a box, then press Enter or Space.
        Each press event shows in the log.
      </Text>

      <View style={styles.row}>
        <View style={styles.column}>
          <Demo name="box" label="Press me" log={log} />
          <Demo name="long" label="Long press (500 ms)" log={log} longPress />
          <Demo
            name="link"
            label="Link: onPress calls preventDefault"
            role="link"
            href="#nowhere"
            log={log}
            preventDefault
          />
          <Demo name="button" label="Native button" role="button" log={log} />
          <Demo name="outer" label="Outer" log={log}>
            <Demo name="inner" label="Inner" log={log} />
            <Demo
              name="disabled"
              label="Inner, disabled: the outer box presses"
              log={log}
              disabled
            />
          </Demo>
        </View>

        <View style={styles.log} aria-live="polite">
          <Text style={styles.logTitle}>Log, newest first</Text>
          {lines.map((line) => (
            <Text key={line.id} style={styles.logLine}>
              {line.text}
            </Text>
          ))}
        </View>
      </View>
    </>
  )
}

type DemoProps = {
  name: string
  label: string
  log: Log
  role?: Role
  href?: string
  longPress?: boolean
  preventDefault?: boolean
  disabled?: boolean
  children?: ReactNode
}

function Demo(props: DemoProps): ReactElement {
  const { name, log, longPress = false, preventDefault = false, disabled = false } = props
  const [pressed, setPressed] = useState(false)
  const [hovered, setHovered] = useState(false)

  const config = useMemo<PressabilityConfig>(
    () => ({
      disabled,
      onPressIn: (event) => {
        setPressed(true)
        log(`${name}: onPressIn (${event.type})`)
      },
      onPressOut: () => {
        setPressed(false)
        log(`${name}: onPressOut`)
      },
      onPress: (event) => {
        if (preventDefault) event.preventDefault()
        const x = Math.round(event.nativeEvent.locationX)
        const y = Math.round(event.nativeEvent.locationY)
        log(`${name}: onPress (${event.type}, location ${x}, ${y})`)
      },
      onLongPress: longPress ? () => log(`${name}: onLongPress`) : undefined,
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
    }),
    [disabled, log, longPress, name, preventDefault],
  )
  const handlers = usePressability(config)

  return (
    <View
      role={props.role}
      href={props.href}
      focusable={!disabled}
      style={[
        styles.box,
        hovered && styles.hovered,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...handlers}
    >
      <Text style={styles.label}>{props.label}</Text>
      {props.children}
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  hint: { maxWidth: 560, color: '#374151', lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 24 },
  column: { width: 340, gap: 12 },
  box: {
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    userSelect: 'none',
  },
  hovered: { borderColor: '#2563eb' },
  pressed: { backgroundColor: '#dbeafe' },
  disabled: { opacity: 0.5 },
  label: { fontSize: 15 },
  log: {
    width: 380,
    minHeight: 320,
    gap: 4,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  logTitle: { color: '#9ca3af', fontSize: 12, marginBottom: 4 },
  logLine: { color: '#e5e7eb', fontFamily: 'monospace', fontSize: 12 },
})
