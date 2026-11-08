import { useRef, useState, type ReactElement } from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type FlatListInstance,
  type ListRenderItemInfo,
  type ViewToken,
} from 'react-native'

const COLORS = ['#fca5a5', '#fcd34d', '#86efac', '#93c5fd', '#c4b5fd', '#f9a8d4']

type Item = { id: string; label: string }

const makeItems = (start: number, count: number): Item[] =>
  Array.from({ length: count }, (_, i) => ({ id: `item-${start + i}`, label: `Item ${start + i}` }))

const viewabilityConfig = { itemVisiblePercentThreshold: 50 }

export function FlatListRoute(): ReactElement {
  const list = useRef<FlatListInstance<Item>>(null)
  const [items, setItems] = useState(() => makeItems(0, 30))
  const [viewable, setViewable] = useState<number[]>([])
  const [loads, setLoads] = useState(0)
  const [index, setIndex] = useState('12')

  const renderRow = ({ item, index: i, separators }: ListRenderItemInfo<Item>): ReactElement => (
    <Pressable
      onPressIn={separators.highlight}
      onPressOut={separators.unhighlight}
      style={[styles.row, { backgroundColor: COLORS[i % COLORS.length] }]}
    >
      <Text>{item.label}</Text>
    </Pressable>
  )

  const onViewableItemsChanged = ({ viewableItems }: { viewableItems: ViewToken<Item>[] }) => {
    setViewable(viewableItems.map((token) => token.index ?? -1))
  }

  const onEndReached = () => {
    setLoads((n) => n + 1)
    setItems((current) => [...current, ...makeItems(current.length, 10)])
  }

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        FlatList
      </Text>

      <Text>
        A vertical list with a sticky header, separators that highlight on press, viewability at
        50%, and ten more items on each end reached. Viewable: {viewable.join(', ')}. Loads: {loads}
        . Items: {items.length}.
      </Text>
      <View style={styles.rowGroup}>
        <FlatList
          ref={list}
          data={items}
          renderItem={renderRow}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.headerText}>Sticky header</Text>
            </View>
          }
          ListFooterComponent={<Text style={styles.footer}>End of the list</Text>}
          stickyHeaderIndices={[0]}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          style={styles.list}
        />
        <View style={styles.column}>
          <View style={styles.buttons}>
            <Button label="Top" onPress={() => list.current?.scrollToOffset({ offset: 0 })} />
            <Button
              label={`Index ${index}`}
              onPress={() =>
                list.current?.scrollToIndex({ index: Number(index), viewPosition: 0.5 })
              }
            />
            <Button label="End" onPress={() => list.current?.scrollToEnd()} />
          </View>
          <View style={styles.buttons}>
            <Button label="-" onPress={() => setIndex(String(Math.max(0, Number(index) - 1)))} />
            <Button label="+" onPress={() => setIndex(String(Number(index) + 1))} />
          </View>
        </View>
      </View>

      <Text>numColumns 3 with a columnWrapperStyle gap.</Text>
      <FlatList
        data={items.slice(0, 11)}
        numColumns={3}
        columnWrapperStyle={styles.columns}
        renderItem={({ index: i }) => (
          <View style={[styles.tile, { backgroundColor: COLORS[i % COLORS.length] }]}>
            <Text>{i}</Text>
          </View>
        )}
        style={styles.grid}
      />

      <Text>Horizontal and inverted: the first item sits at the right edge.</Text>
      <FlatList
        horizontal
        inverted
        data={items.slice(0, 8)}
        renderItem={({ index: i }) => (
          <View style={[styles.card, { backgroundColor: COLORS[i % COLORS.length] }]}>
            <Text>{i}</Text>
          </View>
        )}
        style={styles.strip}
      />

      <Text>An empty list shows ListEmptyComponent.</Text>
      <FlatList
        data={[]}
        renderItem={renderRow}
        ListEmptyComponent={<Text style={styles.empty}>Nothing here yet</Text>}
        style={styles.emptyList}
      />
    </>
  )
}

function Separator(props: { highlighted: boolean }): ReactElement {
  return <View style={[styles.separator, props.highlighted && styles.separatorHighlighted]} />
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
  list: { height: 280, width: 260, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8 },
  header: { padding: 8, backgroundColor: '#111827' },
  headerText: { color: '#fff', fontWeight: '600' },
  footer: { padding: 8, textAlign: 'center', color: '#6b7280' },
  row: { height: 44, justifyContent: 'center', paddingHorizontal: 12 },
  separator: { height: 2, backgroundColor: '#e5e7eb' },
  separatorHighlighted: { backgroundColor: '#111827' },
  buttons: { flexDirection: 'row', gap: 8 },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  pressed: { backgroundColor: '#1d4ed8' },
  buttonText: { color: '#fff', fontWeight: '600' },
  grid: { width: 320 },
  columns: { gap: 8, marginBottom: 8 },
  tile: { flex: 1, height: 60, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  strip: { height: 80, width: 320 },
  card: {
    width: 80,
    height: 80,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyList: { height: 60, width: 320, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8 },
  empty: { padding: 16, textAlign: 'center', color: '#6b7280' },
})
