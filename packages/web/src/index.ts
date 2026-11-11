export { AccessibilityInfo } from './apis/AccessibilityInfo'
export type {
  AccessibilityAnnouncementFinishedEvent,
  AccessibilityChangeEvent,
  AccessibilityChangeEventName,
  AccessibilityEventSubscription,
} from './apis/AccessibilityInfo'
export { Appearance } from './apis/Appearance'
export type {
  AppearanceListener,
  AppearancePreferences,
  ColorSchemeName,
  NativeEventSubscription,
} from './apis/Appearance'
export { AppState } from './apis/AppState'
export type { AppStateEvent, AppStateStatus } from './apis/AppState'
export { BackHandler } from './apis/BackHandler'
export type { BackHandlerSubscription, BackPressHandler } from './apis/BackHandler'
export { Dimensions } from './apis/Dimensions'
export type {
  DimensionsChangeHandler,
  DimensionsValue,
  EmitterSubscription,
  ScaledSize,
} from './apis/Dimensions'
export { I18nManager } from './apis/I18nManager'
export type { I18nManagerConstants } from './apis/I18nManager'
export { PanResponder } from './apis/PanResponder'
export type {
  GestureResponderHandlers,
  PanResponderCallbacks,
  PanResponderGestureState,
  PanResponderInstance,
} from './apis/PanResponder'
export { PixelRatio } from './apis/PixelRatio'
export { Platform } from './apis/Platform'
export type { PlatformOSType, PlatformSelectSpec, PlatformType } from './apis/Platform'
export { processColor } from './apis/processColor'
export type { ProcessedColorValue } from './apis/processColor'
export { StyleSheet } from './apis/StyleSheet'
export type { AbsoluteFillStyle, StyleProp } from './apis/StyleSheet'
export { useColorScheme } from './apis/useColorScheme'
export { useWindowDimensions } from './apis/useWindowDimensions'
export { ActivityIndicator } from './components/ActivityIndicator'
export type { ActivityIndicatorProps } from './components/ActivityIndicator'
export { Button } from './components/Button'
export type { ButtonProps } from './components/Button'
export { FlatList } from './components/FlatList'
export type {
  CellRendererProps,
  FlatListInstance,
  FlatListProps,
  ListRenderItem,
  ListRenderItemInfo,
  ListSeparatorComponent,
  ListSeparatorProps,
  ListSeparators,
  ScrollToIndexParams,
  ScrollToItemParams,
  ScrollToOffsetParams,
  ViewabilityConfig,
  ViewabilityConfigCallbackPair,
  ViewabilityConfigCallbackPairs,
  ViewableItemsChangedInfo,
  ViewToken,
} from './components/FlatList'
export { Image } from './components/Image'
export type {
  ImageErrorEvent,
  ImageLoadEvent,
  ImageLoadEventData,
  ImageProgressEvent,
  ImageProps,
  ImageResizeMode,
  ImageResolvedAssetSource,
  ImageSize,
  ImageSource,
  ImageStatics,
  ImageURISource,
} from './components/Image'
export { Pressable } from './components/Pressable'
export type {
  PressableAndroidRippleConfig,
  PressableInstance,
  PressableProps,
  PressableStateCallbackType,
} from './components/Pressable'
export { ScrollView } from './components/ScrollView'
export type {
  NativeScrollEvent,
  NativeScrollPoint,
  NativeScrollRectangle,
  NativeScrollSize,
  ScrollEvent,
  ScrollToOptions,
  ScrollViewInstance,
  ScrollViewProps,
} from './components/ScrollView'
export { StatusBar } from './components/StatusBar'
export type {
  StatusBarAnimation,
  StatusBarProps,
  StatusBarStatics,
  StatusBarStyle,
} from './components/StatusBar'
export { Switch } from './components/Switch'
export type { SwitchChangeEvent, SwitchChangeEventData, SwitchProps } from './components/Switch'
export { Text, TextAncestorContext } from './components/Text'
export type { PressEvent, TextProps } from './components/Text'
export { TextInput } from './components/TextInput'
export type {
  EnterKeyHint,
  InputMode,
  KeyboardType,
  ReturnKeyType,
  SubmitBehavior,
  TextInputChangeEvent,
  TextInputChangeEventData,
  TextInputContentSizeChangeEvent,
  TextInputEndEditingEvent,
  TextInputFocusEvent,
  TextInputInstance,
  TextInputKeyPressEvent,
  TextInputProps,
  TextInputScrollEvent,
  TextInputSelection,
  TextInputSelectionChangeEvent,
  TextInputState,
  TextInputSubmitEditingEvent,
} from './components/TextInput'
export { TouchableHighlight } from './components/TouchableHighlight'
export type { TouchableHighlightProps } from './components/TouchableHighlight'
export { TouchableNativeFeedback } from './components/TouchableNativeFeedback'
export type { TouchableNativeFeedbackProps } from './components/TouchableNativeFeedback'
export { TouchableOpacity } from './components/TouchableOpacity'
export type { TouchableOpacityProps } from './components/TouchableOpacity'
export { TouchableWithoutFeedback } from './components/TouchableWithoutFeedback'
export type { TouchableWithoutFeedbackProps } from './components/TouchableWithoutFeedback'
export { View } from './components/View'
export type {
  AccessibilityProps,
  AccessibilityState,
  AccessibilityValue,
  DOMEventHandlers,
  LayoutChangeEvent,
  LayoutRectangle,
  Role,
  ViewProps,
} from './components/View'
export { usePressability } from './events/press'
export type { Insets, PressabilityConfig, PressabilityEventHandlers } from './events/press'
export type {
  BlurEvent,
  EventSubscription,
  FocusEvent,
  GestureResponderEvent,
  MouseEvent,
  NativeSyntheticEvent,
  NativeTouchEvent,
} from './events/types'

declare global {
  /**
   * `true` in a development build and `false` in a production build, as in React Native. The
   * bundler sets it: the plugin from `@rootnative/web/vite` does, or a `define` in your config.
   */
  const __DEV__: boolean
}
