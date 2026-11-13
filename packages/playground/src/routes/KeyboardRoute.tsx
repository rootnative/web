import { useEffect, useState, type ReactElement } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardAvoidingViewProps,
} from 'react-native'

type Behavior = NonNullable<KeyboardAvoidingViewProps['behavior']>

const BEHAVIORS: readonly Behavior[] = ['padding', 'height', 'position']
const MESSAGES = Array.from({ length: 24 }, (_, index) => `Message ${index + 1}`)

function KeyboardLog(): ReactElement {
  const [entries, setEntries] = useState<Array<{ id: number; text: string }>>([])

  useEffect(() => {
    let id = 0
    const log = (text: string): void => {
      id += 1
      const entry = { id, text }
      setEntries((previous) => [entry, ...previous].slice(0, 6))
    }
    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', (event) =>
        log(
          `keyboardDidShow: height ${event.endCoordinates.height}, top ${event.endCoordinates.screenY}`,
        ),
      ),
      Keyboard.addListener('keyboardDidHide', () => log('keyboardDidHide')),
    ]
    return () => {
      for (const subscription of subscriptions) subscription.remove()
    }
  }, [])

  return (
    <View testID="log" style={styles.log}>
      {entries.length === 0 ? <Text style={styles.muted}>No keyboard event yet.</Text> : null}
      {entries.map((entry) => (
        <Text key={entry.id}>{entry.text}</Text>
      ))}
    </View>
  )
}

function ChatScreen({ onClose }: { onClose: () => void }): ReactElement {
  const [behavior, setBehavior] = useState<Behavior>('padding')
  const [enabled, setEnabled] = useState(true)

  return (
    <KeyboardAvoidingView
      testID="avoiding"
      behavior={behavior}
      enabled={enabled}
      style={styles.screen}
      contentContainerStyle={styles.screen}
    >
      <View style={styles.header}>
        {BEHAVIORS.map((option) => (
          <Pressable
            key={option}
            testID={`behavior-${option}`}
            onPress={() => setBehavior(option)}
            style={[styles.chip, option === behavior && styles.chipActive]}
          >
            <Text style={option === behavior ? styles.chipActiveLabel : undefined}>{option}</Text>
          </Pressable>
        ))}
        <Pressable
          testID="enabled"
          onPress={() => setEnabled(!enabled)}
          style={[styles.chip, enabled && styles.chipActive]}
        >
          <Text style={enabled ? styles.chipActiveLabel : undefined}>enabled</Text>
        </Pressable>
        <Pressable testID="close" onPress={onClose} style={styles.chip}>
          <Text>Close</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
        <KeyboardLog />
        {MESSAGES.map((message) => (
          <Text key={message} style={styles.message}>
            {message}
          </Text>
        ))}
      </ScrollView>
      <View testID="footer" style={styles.footer}>
        <TextInput testID="field" placeholder="Write a message" style={styles.field} />
        <Pressable testID="dismiss" onPress={() => Keyboard.dismiss()} style={styles.chip}>
          <Text>Keyboard.dismiss()</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

export function KeyboardRoute(): ReactElement {
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.page}>
      <Text>
        Open the chat screen on a phone or a tablet, and tap the text field at the bottom. The field
        should stay above the keyboard with each behavior.
      </Text>
      <Pressable testID="open" onPress={() => setOpen(true)} style={styles.button}>
        <Text style={styles.buttonLabel}>Open the chat screen</Text>
      </Pressable>
      <TextInput placeholder="A field on the page" style={styles.field} />
      <KeyboardLog />
      <Modal visible={open} onRequestClose={() => setOpen(false)}>
        <ChatScreen onClose={() => setOpen(false)} />
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: 12 },
  screen: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
    backgroundColor: '#f3f4f6',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipActiveLabel: { color: '#ffffff' },
  messages: { flex: 1 },
  messagesContent: { padding: 12, gap: 8 },
  message: { padding: 8, borderRadius: 8, backgroundColor: '#e0e7ff', alignSelf: 'flex-start' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  field: {
    flex: 1,
    minWidth: 120,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  log: { gap: 4, padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
  muted: { color: '#6b7280' },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  buttonLabel: { color: '#ffffff' },
})
