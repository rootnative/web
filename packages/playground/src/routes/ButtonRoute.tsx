import { useState, type ReactElement } from 'react'
import { Button, StyleSheet, Text, View } from 'react-native'

export function ButtonRoute(): ReactElement {
  const [presses, setPresses] = useState(0)

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        Button
      </Text>

      <Text>The default look. In a View, the button takes the full width.</Text>
      <View style={styles.column}>
        <Button title={`Pressed ${presses} times`} onPress={() => setPresses((n) => n + 1)} />
      </View>

      <Text>As wide as the title, in a View with alignItems flex-start.</Text>
      <View style={styles.start}>
        <Button title="Save" onPress={() => setPresses((n) => n + 1)} />
      </View>

      <Text>color sets the background.</Text>
      <View style={styles.start}>
        <Button title="Delete" color="#dc2626" onPress={() => setPresses((n) => n + 1)} />
      </View>

      <Text>Disabled: no press, out of the tab order.</Text>
      <View style={styles.start}>
        <Button title="Disabled" disabled onPress={() => setPresses((n) => n + 1)} />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  column: { width: 240 },
  start: { alignItems: 'flex-start' },
})
