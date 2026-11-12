import { useState, type ReactElement } from 'react'
import { Alert, Button, StyleSheet, Text, View } from 'react-native'

export function AlertRoute(): ReactElement {
  const [log, setLog] = useState<string[]>([])
  const note = (line: string): void => setLog((current) => [line, ...current].slice(0, 6))

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        Alert
      </Text>

      <Text>
        Each button opens an alert. Escape presses the cancel button, and a cancelable alert also
        closes on a click outside.
      </Text>
      <View style={styles.row}>
        <Button title="OK only" onPress={() => Alert.alert('Saved', 'Your note is saved.')} />
        <Button
          title="Cancel and delete"
          onPress={() =>
            Alert.alert('Delete the note?', "You can't undo this.", [
              { text: 'Cancel', style: 'cancel', onPress: () => note('Cancel') },
              { text: 'Delete', style: 'destructive', onPress: () => note('Delete') },
            ])
          }
        />
        <Button
          title="Three buttons"
          onPress={() =>
            Alert.alert('Update ready', 'A new version is ready to install.', [
              { text: 'Later', onPress: () => note('Later') },
              { text: 'Cancel', style: 'cancel', onPress: () => note('Cancel') },
              { text: 'Install', isPreferred: true, onPress: () => note('Install') },
            ])
          }
        />
        <Button
          title="Cancelable"
          onPress={() =>
            Alert.alert('Tip', 'Press Escape or click outside.', [{ text: 'Got it' }], {
              cancelable: true,
              onDismiss: () => note('onDismiss'),
            })
          }
        />
        <Button
          title="Dark"
          onPress={() =>
            Alert.alert('Dark alert', 'userInterfaceStyle is dark.', undefined, {
              userInterfaceStyle: 'dark',
            })
          }
        />
        <Button
          title="Next alert"
          onPress={() =>
            Alert.alert('Step 1', undefined, [
              {
                text: 'Next',
                onPress: () => Alert.alert('Step 2', 'onPress opened this alert.'),
              },
            ])
          }
        />
      </View>
      <Text style={styles.log}>{log.length === 0 ? 'No presses yet.' : log.join('\n')}</Text>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  log: { fontFamily: 'monospace', color: '#4b5563' },
})
