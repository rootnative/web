// Code typed the way a React Native library types it. The app doesn't render it: `tsc` checks
// that it type-checks with the types of the tarball.
import { useRef } from 'react'
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AccessibilityActionEvent,
  type DimensionValue,
  type HostComponent,
  type ImageStyle,
  type MeasureInWindowOnSuccessCallback,
  type NativeSyntheticEvent,
  type PointerEvent,
  type ScrollViewInstance,
  type StyleProp,
  type TargetedEvent,
  type TextInputInstance,
  type TextStyle,
  type TurboModule,
  type ViewInstance,
  type ViewProps,
  type ViewStyle,
} from 'react-native'

type CardProps = {
  style?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
  imageStyle?: StyleProp<ImageStyle>
  width?: DimensionValue
  onFocus?: (event: NativeSyntheticEvent<TargetedEvent>) => void
}

export function Card({ style, labelStyle, imageStyle, width = '100%', onFocus }: CardProps) {
  const view = useRef<ViewInstance>(null)
  const scroller = useRef<ScrollViewInstance>(null)
  const input = useRef<TextInputInstance>(null)
  const place: MeasureInWindowOnSuccessCallback = (x, y, boxWidth, boxHeight) => {
    input.current?.setNativeProps({ text: `${x},${y},${boxWidth},${boxHeight}` })
  }
  const measure = () => {
    view.current?.measureInWindow(place)
    scroller.current?.measure((_x, _y, _width, _height, pageX, pageY) => place(pageX, pageY, 0, 0))
    if (view.current !== null) scroller.current?.measureLayout(view.current, place)
  }
  const handlePointerEnter = (event: PointerEvent) => {
    if (event.nativeEvent.pointerType !== 'touch') view.current?.focus()
  }
  return (
    <View ref={view} style={[styles.card, { width }, style]}>
      <ScrollView ref={scroller}>
        <Text style={[styles.label, labelStyle]}>Card</Text>
        <Image source={{ uri: '/card.png' }} style={[styles.image, imageStyle]} />
        <TextInput ref={input} onFocus={onFocus} onBlur={onFocus} />
        <Pressable onFocus={onFocus} onPointerEnter={handlePointerEnter} onPress={measure} />
      </ScrollView>
    </View>
  )
}

export const actionName = (event: AccessibilityActionEvent): string => event.nativeEvent.actionName

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    transform: [{ scale: 1 }],
    touchAction: 'none',
  },
  label: { fontWeight: '600', textAlign: 'center' },
  image: { width: 40, height: 40, resizeMode: 'cover' },
})

// The two types that a native module spec and a native component spec of a library use.
export interface NativeModuleSpec extends TurboModule {
  getValue: () => number
}

export type NativeViewComponent = HostComponent<ViewProps>
