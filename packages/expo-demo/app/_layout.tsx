import { Tabs } from 'expo-router'
import type { ReactElement } from 'react'

// Expo Router's tabs, from the React Navigation inside it. The home tab has its own `h1`, so it
// hides the header: a header title is an `h1` too.
export default function Layout(): ReactElement {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', headerShown: false, tabBarButtonTestID: 'tab-home' }}
      />
      <Tabs.Screen
        name="stack"
        options={{ title: 'Stack', headerShown: false, tabBarButtonTestID: 'tab-stack' }}
      />
    </Tabs>
  )
}
