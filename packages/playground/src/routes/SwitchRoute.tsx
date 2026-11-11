import { useState, type ReactElement } from 'react'
import { StyleSheet, Switch, Text, View } from 'react-native'

const trackColor = { false: '#fecaca', true: '#bbf7d0' }

export function SwitchRoute(): ReactElement {
  const [on, setOn] = useState(false)
  const [colored, setColored] = useState(true)
  const [large, setLarge] = useState(false)
  const [changes, setChanges] = useState(0)

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        Switch
      </Text>

      <Text>The default look. The switch is {on ? 'on' : 'off'}.</Text>
      <Switch value={on} onValueChange={setOn} accessibilityLabel="Default switch" />

      <Text>trackColor and thumbColor.</Text>
      <Switch
        value={colored}
        onValueChange={setColored}
        trackColor={trackColor}
        thumbColor="#111827"
        accessibilityLabel="Colored switch"
      />

      <Text>A width and a height in style change the size.</Text>
      <Switch
        value={large}
        onValueChange={setLarge}
        style={styles.large}
        accessibilityLabel="Large switch"
      />

      <Text>value never changes, so the switch goes back. Changes: {changes}</Text>
      <Switch
        value={false}
        onValueChange={() => setChanges((n) => n + 1)}
        accessibilityLabel="Switch that goes back"
      />

      <Text>Disabled, off and on.</Text>
      <View style={styles.row}>
        <Switch disabled accessibilityLabel="Disabled switch, off" />
        <Switch disabled value accessibilityLabel="Disabled switch, on" />
      </View>

      <Text>A label element toggles the switch through its id.</Text>
      <View style={styles.row}>
        <label htmlFor="playground-switch">Wi-Fi</label>
        <Switch id="playground-switch" value={on} onValueChange={setOn} />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  large: { width: 64, height: 32 },
})
