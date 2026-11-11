import { useState, type ReactElement } from 'react'
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native'

export function ActivityIndicatorRoute(): ReactElement {
  const [animating, setAnimating] = useState(true)

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        ActivityIndicator
      </Text>

      <Text>small, large, a number, and a color.</Text>
      <View style={styles.row}>
        <ActivityIndicator accessibilityLabel="Loading, small" />
        <ActivityIndicator size="large" accessibilityLabel="Loading, large" />
        <ActivityIndicator size={56} accessibilityLabel="Loading, 56 pixels" />
        <ActivityIndicator size="large" color="#2563eb" accessibilityLabel="Loading, blue" />
      </View>

      <Text>style goes to the container, which centers the indicator.</Text>
      <ActivityIndicator style={styles.box} accessibilityLabel="Loading, centered" />

      <Text>animating: the first one hides when it stops, the second one stays.</Text>
      <View style={styles.row}>
        <ActivityIndicator animating={animating} size="large" accessibilityLabel="Loading" />
        <ActivityIndicator
          animating={animating}
          hidesWhenStopped={false}
          size="large"
          accessibilityLabel="Loading, stays visible"
        />
        <Button title={animating ? 'Stop' : 'Start'} onPress={() => setAnimating((on) => !on)} />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  box: {
    alignSelf: 'flex-start',
    width: 160,
    height: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
})
