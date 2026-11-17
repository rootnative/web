import { useRouter } from 'expo-router'
import type { ReactElement } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export default function Details(): ReactElement {
  const router = useRouter()
  return (
    <View style={styles.page}>
      <Text testID="details">The second screen of the stack.</Text>
      <Pressable testID="back" onPress={() => router.back()} style={styles.button}>
        <Text style={styles.buttonLabel}>Go back</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 16 },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e11d48',
  },
  buttonLabel: { color: '#ffffff' },
})
