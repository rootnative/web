import { useRef, useState, type ReactElement } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native'

export function TextInputRoute(): ReactElement {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [log, setLog] = useState<string[]>([])
  const password = useRef<TextInputInstance>(null)

  const note = (entry: string): void => setLog((entries) => [entry, ...entries].slice(0, 6))

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        TextInput
      </Text>

      <Text>
        A form. Enter in a single-line field submits it, as the browser does. The password manager
        sees real autocomplete tokens.
      </Text>
      <View
        role="form"
        style={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          note(`form submit: ${name}`)
        }}
      >
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#9ca3af"
          autoComplete="name"
          autoCapitalize="words"
          returnKeyType="next"
          style={styles.input}
          onSubmitEditing={() => password.current?.focus()}
          blurOnSubmit={false}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          ref={password}
          secureTextEntry
          autoComplete="current-password"
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          returnKeyType="go"
          style={styles.input}
          onSubmitEditing={(event) =>
            note(`submit editing: ${event.nativeEvent.text.length} chars`)
          }
          onFocus={() => note('password focus')}
          onBlur={() => note('password blur')}
        />
        <Text style={styles.label}>Phone</Text>
        <TextInput
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="On a phone, the keyboard is numeric"
          placeholderTextColor="#9ca3af"
          style={styles.input}
        />
        <Pressable role="button" onPress={() => note(`form submit: ${name}`)} style={styles.button}>
          <Text style={styles.buttonText}>Submit</Text>
        </Pressable>
      </View>

      <Text>Multiline grows with the text. Enter is a newline; submitBehavior changes that.</Text>
      <TextInput
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes"
        placeholderTextColor="#9ca3af"
        style={[styles.input, styles.notes]}
        onContentSizeChange={(event) =>
          note(`content ${Math.round(event.nativeEvent.contentSize.height)} px high`)
        }
      />

      <Text>Selection: blue caret and selection, hidden context menu.</Text>
      <TextInput
        defaultValue="Select some of this text"
        selectionColor="#2563eb"
        contextMenuHidden
        style={styles.input}
        onSelectionChange={(event) => {
          const { start, end } = event.nativeEvent.selection
          note(`selection ${start}–${end}`)
        }}
      />

      <View role="log" aria-live="polite" style={styles.log}>
        {log.map((entry, index) => (
          <Text key={`${index}-${entry}`} style={styles.logText}>
            {entry}
          </Text>
        ))}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  form: { gap: 6, maxWidth: 360 },
  label: { fontSize: 12, color: '#6b7280' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    maxWidth: 360,
  },
  notes: { minHeight: 40 },
  button: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  log: { gap: 2, minHeight: 100 },
  logText: { fontSize: 12, color: '#374151', fontFamily: 'monospace' },
})
