import type { ReactElement } from 'react'
import { Dimensions, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native'

export function DimensionsRoute(): ReactElement {
  const window = useWindowDimensions()
  const screen = Dimensions.get('screen')

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        Dimensions and Platform
      </Text>

      <Text>Resize the browser. useWindowDimensions updates on each change.</Text>
      <View role="table" style={styles.table}>
        <Row label="window" value={`${window.width} × ${window.height}`} />
        <Row label="screen" value={`${screen.width} × ${screen.height}`} />
        <Row label="scale" value={String(window.scale)} />
        <Row label="fontScale" value={String(window.fontScale)} />
        <Row label="Platform.OS" value={Platform.OS} />
        <Row label="isTesting" value={String(Platform.isTesting)} />
        <Row label="reduced motion" value={String(Platform.isDisableAnimations)} />
        <Row
          label="select"
          value={Platform.select({ web: 'web branch', default: 'default branch' })}
        />
      </View>
    </>
  )
}

function Row(props: { label: string; value: string }): ReactElement {
  return (
    <View role="row" style={styles.row}>
      <Text role="rowheader" style={styles.label}>
        {props.label}
      </Text>
      <Text role="cell">{props.value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  table: { gap: 4, maxWidth: 400 },
  row: { flexDirection: 'row', gap: 12 },
  label: { width: 140, fontWeight: '600' },
})
