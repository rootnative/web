import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import {
  AccessibilityInfo,
  I18nManager,
  PixelRatio,
  Pressable,
  processColor,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea']

export function ApisRoute(): ReactElement {
  const [rtl, setRtl] = useState(I18nManager.isRTL)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [barColor, setBarColor] = useState<string | undefined>(undefined)

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => subscription.remove()
  }, [])

  const toggleRTL = (): void => {
    I18nManager.forceRTL(!I18nManager.isRTL)
    setRtl(I18nManager.isRTL)
  }

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        Small APIs
      </Text>

      <Section title="I18nManager">
        <Text>
          isRTL: {String(rtl)}. forceRTL sets the document direction at once, so marginStart and
          text alignment flip on this whole page.
        </Text>
        <Button label={rtl ? 'forceRTL(false)' : 'forceRTL(true)'} onPress={toggleRTL} />
      </Section>

      <Section title="AccessibilityInfo">
        <Text>
          isReduceMotionEnabled: {String(reduceMotion)} (change the OS setting; it updates live).
          Screen reader state is unknown on the web, so it reports false.
        </Text>
        <Button
          label="announceForAccessibility"
          onPress={() => AccessibilityInfo.announceForAccessibility('Hello from the live region')}
        />
      </Section>

      <Section title="PixelRatio">
        <Row label="get()" value={String(PixelRatio.get())} />
        <Row label="getFontScale()" value={String(PixelRatio.getFontScale())} />
        <Row
          label="getPixelSizeForLayoutSize(10)"
          value={String(PixelRatio.getPixelSizeForLayoutSize(10))}
        />
        <Row label="roundToNearestPixel(8.4)" value={String(PixelRatio.roundToNearestPixel(8.4))} />
      </Section>

      <Section title="processColor">
        {['red', '#336699', 'rgba(0, 0, 0, 0.5)', 'nope'].map((color) => (
          <Row
            key={color}
            label={color}
            value={String(processColor(color)?.toString(16) ?? processColor(color))}
          />
        ))}
      </Section>

      <Section title="StatusBar">
        <Text>
          backgroundColor writes the theme-color meta. On a phone, the browser chrome takes the
          color. currentHeight is {String(StatusBar.currentHeight)}.
        </Text>
        <View style={styles.row}>
          {COLORS.map((color) => (
            <Pressable
              key={color}
              role="button"
              aria-label={`Set ${color}`}
              onPress={() => setBarColor(color)}
              style={[styles.swatch, { backgroundColor: color }]}
            />
          ))}
          <Button label="Clear" onPress={() => setBarColor(undefined)} />
        </View>
        {barColor === undefined ? null : <StatusBar backgroundColor={barColor} />}
      </Section>
    </>
  )
}

function Section(props: { title: string; children: ReactNode }): ReactElement {
  return (
    <View role="region" aria-label={props.title} style={styles.section}>
      <Text role="heading" aria-level={3} style={styles.heading}>
        {props.title}
      </Text>
      {props.children}
    </View>
  )
}

function Row(props: { label: string; value: string }): ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{props.label}</Text>
      <Text style={styles.mono}>{props.value}</Text>
    </View>
  )
}

function Button(props: { label: string; onPress: () => void }): ReactElement {
  return (
    <Pressable
      role="button"
      onPress={props.onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.buttonText}>{props.label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  section: { gap: 8, maxWidth: 560 },
  heading: { fontSize: 18, fontWeight: '600', marginTop: 8 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  label: { width: 240, fontWeight: '600' },
  mono: { fontFamily: 'monospace' },
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  pressed: { backgroundColor: '#1d4ed8' },
  buttonText: { color: '#fff', fontWeight: '600' },
  swatch: { width: 32, height: 32, borderRadius: 16 },
})
