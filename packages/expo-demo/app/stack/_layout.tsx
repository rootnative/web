import { Stack } from 'expo-router'
import type { ReactElement } from 'react'

export default function StackLayout(): ReactElement {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Stack' }} />
      <Stack.Screen name="details" options={{ title: 'Details' }} />
    </Stack>
  )
}
