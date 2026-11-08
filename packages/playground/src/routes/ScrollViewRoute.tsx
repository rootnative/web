import { useRef, useState, type ReactElement } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollEvent,
  type ScrollViewInstance,
} from 'react-native'

const COLORS = ['#fca5a5', '#fcd34d', '#86efac', '#93c5fd', '#c4b5fd', '#f9a8d4']

const rows = (count: number): ReactElement[] =>
  Array.from({ length: count }, (_, i) => (
    <View key={i} style={[styles.row, { backgroundColor: COLORS[i % COLORS.length] }]}>
      <Text>Row {i + 1}</Text>
    </View>
  ))

const pages = (count: number): ReactElement[] =>
  Array.from({ length: count }, (_, i) => (
    <View key={i} style={[styles.page, { backgroundColor: COLORS[i % COLORS.length] }]}>
      <Text style={styles.pageText}>{i + 1}</Text>
    </View>
  ))

export function ScrollViewRoute(): ReactElement {
  const list = useRef<ScrollViewInstance>(null)
  const [offset, setOffset] = useState(0)
  const [log, setLog] = useState<string[]>([])

  const note = (name: string) => (event: ScrollEvent) => {
    const { y } = event.nativeEvent.contentOffset
    setLog((entries) => [`${name} at ${Math.round(y)}`, ...entries].slice(0, 6))
  }

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        ScrollView
      </Text>

      <Text>
        A vertical list with a sticky header that hides on a scroll down. The sequence events log
        below. Offset: {Math.round(offset)}
      </Text>
      <View style={styles.rowGroup}>
        <ScrollView
          ref={list}
          style={styles.list}
          stickyHeaderIndices={[0]}
          stickyHeaderHiddenOnScroll
          onScroll={(event) => setOffset(event.nativeEvent.contentOffset.y)}
          onScrollBeginDrag={note('beginDrag')}
          onScrollEndDrag={note('endDrag')}
          onMomentumScrollBegin={note('momentumBegin')}
          onMomentumScrollEnd={note('momentumEnd')}
        >
          <View style={styles.header}>
            <Text style={styles.headerText}>Sticky header</Text>
          </View>
          {rows(30)}
        </ScrollView>
        <View style={styles.column}>
          <View style={styles.buttons}>
            <Button label="Top" onPress={() => list.current?.scrollTo({ y: 0 })} />
            <Button label="y 500" onPress={() => list.current?.scrollTo({ y: 500 })} />
            <Button label="End" onPress={() => list.current?.scrollToEnd()} />
          </View>
          <View role="log" aria-live="polite" style={styles.log}>
            {log.map((entry, index) => (
              <Text key={index} style={styles.logText}>
                {entry}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <Text>Horizontal with pagingEnabled. Each page is the width of the scroller.</Text>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
      >
        {pages(6)}
      </ScrollView>

      <Text>Horizontal with snapToInterval 110 and snapToAlignment center.</Text>
      <ScrollView horizontal snapToInterval={110} snapToAlignment="center" style={styles.snap}>
        {Array.from({ length: 12 }, (_, i) => (
          <View key={i} style={[styles.card, { backgroundColor: COLORS[i % COLORS.length] }]}>
            <Text>{i + 1}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  )
}

function Button(props: { label: string; onPress: () => void }): ReactElement {
  return (
    <Pressable
      role="button"
      onPress={props.onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.buttonText}>{props.label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  rowGroup: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  column: { gap: 8 },
  list: { height: 240, width: 260, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8 },
  header: { padding: 8, backgroundColor: '#111827' },
  headerText: { color: '#fff', fontWeight: '600' },
  row: { height: 44, justifyContent: 'center', paddingHorizontal: 12 },
  buttons: { flexDirection: 'row', gap: 8 },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  pressed: { backgroundColor: '#1d4ed8' },
  buttonText: { color: '#fff', fontWeight: '600' },
  log: { gap: 2, minHeight: 120 },
  logText: { fontSize: 12, color: '#374151', fontFamily: 'monospace' },
  pager: { height: 120, width: 320, borderRadius: 8 },
  page: { width: 320, height: 120, alignItems: 'center', justifyContent: 'center' },
  pageText: { fontSize: 32, fontWeight: '700' },
  snap: { height: 100, width: 320 },
  card: {
    width: 100,
    height: 100,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
