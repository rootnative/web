import { Link } from 'expo-router'
import type { ReactElement } from 'react'
import { StyleSheet, Text, View } from 'react-native'

export default function StackHome(): ReactElement {
  return (
    <View style={styles.page}>
      <Text testID="stack-home">The first screen of the stack.</Text>
      <Link testID="to-details" href="/stack/details" style={styles.link}>
        Open the details
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 16 },
  link: { color: '#e11d48' },
})
