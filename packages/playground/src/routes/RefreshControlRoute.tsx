import { useState, type ReactElement } from 'react'
import { Button, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'

const ROWS = Array.from({ length: 30 }, (_, i) => i + 1)
const blue = ['#2563eb']

export function RefreshControlRoute(): ReactElement {
  const [refreshing, setRefreshing] = useState(false)
  const [refreshes, setRefreshes] = useState(0)
  const [large, setLarge] = useState(false)

  const onRefresh = (): void => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshes((count) => count + 1)
      setRefreshing(false)
    }, 1500)
  }

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        RefreshControl
      </Text>

      <Text>
        Pull down at the top of the list with touch: on a phone, or with the touch emulation of the
        dev tools. A mouse has no pull, so the button refreshes too.
      </Text>
      <View style={styles.row}>
        <Button title="Refresh" onPress={onRefresh} disabled={refreshing} />
        <Text>size large</Text>
        <Switch value={large} onValueChange={setLarge} accessibilityLabel="Large indicator" />
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={blue}
            size={large ? 'large' : 'default'}
            title="Refreshing the list"
          />
        }
      >
        {ROWS.map((row) => (
          <View key={row} style={styles.item}>
            <Text>
              Row {row}, refreshed {refreshes} times
            </Text>
          </View>
        ))}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  list: {
    height: 360,
    maxWidth: 480,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  item: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
})
