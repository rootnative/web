import { useState, type ReactElement } from 'react'
import { Button, Modal, StyleSheet, Text, TextInput, View } from 'react-native'

const ROWS = Array.from({ length: 30 }, (_, i) => i + 1)

export function ModalRoute(): ReactElement {
  const [screen, setScreen] = useState(false)
  const [dialog, setDialog] = useState(false)
  const [nested, setNested] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const note = (line: string): void => setLog((current) => [line, ...current].slice(0, 6))

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        Modal
      </Text>

      <Text>
        A full-screen modal, and a transparent one with a card and a nested modal. Escape calls
        onRequestClose. The page under a modal doesn't scroll and can't take the focus.
      </Text>
      <View style={styles.row}>
        <Button title="Full screen" onPress={() => setScreen(true)} />
        <Button title="Transparent card" onPress={() => setDialog(true)} />
      </View>
      <Text style={styles.log}>{log.length === 0 ? 'No events yet.' : log.join('\n')}</Text>
      <View style={styles.rows}>
        {ROWS.map((row) => (
          <Text key={row} style={styles.pageRow}>
            Page row {row}. The page under an open modal keeps its place.
          </Text>
        ))}
      </View>

      <Modal
        visible={screen}
        onShow={() => note('full screen: onShow')}
        onDismiss={() => note('full screen: onDismiss')}
        onRequestClose={() => {
          note('full screen: onRequestClose')
          setScreen(false)
        }}
      >
        <View style={styles.screen}>
          <Text role="heading" aria-level={2} style={styles.title}>
            A full-screen modal
          </Text>
          <TextInput placeholder="The focus starts here" style={styles.input} />
          <Button title="Close" onPress={() => setScreen(false)} />
        </View>
      </Modal>

      <Modal
        transparent
        visible={dialog}
        onShow={() => note('card: onShow')}
        onDismiss={() => note('card: onDismiss')}
        onRequestClose={() => {
          note('card: onRequestClose')
          setDialog(false)
        }}
      >
        <View style={styles.scrim}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Discard the draft?</Text>
            <Text>A transparent modal shows the page under a dimmed layer.</Text>
            <View style={styles.row}>
              <Button title="Nested modal" onPress={() => setNested(true)} />
              <Button title="Close" onPress={() => setDialog(false)} />
            </View>
          </View>
        </View>

        <Modal
          transparent
          visible={nested}
          onRequestClose={() => {
            note('nested: onRequestClose')
            setNested(false)
          }}
        >
          <View style={styles.scrim}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>A nested modal</Text>
              <Text>Escape closes this one first.</Text>
              <Button title="Close" onPress={() => setNested(false)} />
            </View>
          </View>
        </Modal>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  log: { fontFamily: 'monospace', color: '#4b5563' },
  rows: { borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  pageRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  screen: { flex: 1, padding: 24, gap: 16 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 8, maxWidth: 360 },
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  card: {
    gap: 12,
    width: '100%',
    maxWidth: 360,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  cardTitle: { fontSize: 18, fontWeight: '600' },
})
