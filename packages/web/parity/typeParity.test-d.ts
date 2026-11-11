// The type parity test. `tsc` runs it, not Vitest: a wrong list is a type error.
// It has its own project, because `react-native` and this package both declare the global
// `__DEV__`. Here the package comes in through its declaration files, and `skipLibCheck` covers it.
//
// Each list below records what `react-native` has and this package doesn't. The check fails when:
// - React Native has an export, a prop, or an API member that isn't here and isn't in the list,
// - the list has a name that this package now has, so the entry is stale,
// - the list has a name that React Native doesn't have: the `extends` constraint rejects it.
//
// The error message is the list of names. To add a prop to a list is a decision: the prop then
// needs a row in the docs, and a dev-mode warning if an app can set it with no effect.

import type * as Native from 'react-native'

import type * as Web from '../src/index'

type None<T extends never> = T
// The names that aren't in the list, and the names in the list that are stale.
type Diff<NativeKeys, OurKeys, Gaps extends NativeKeys> =
  Exclude<NativeKeys, OurKeys | Gaps> | Extract<Gaps, OurKeys>
type PropDiff<NativeProps, OurProps, Gaps extends keyof NativeProps> = Diff<
  keyof NativeProps,
  keyof OurProps,
  Gaps
>

type ExportGaps =
  // Not built yet.
  | 'Alert'
  | 'Animated'
  | 'Easing'
  | 'ImageBackground'
  | 'Keyboard'
  | 'KeyboardAvoidingView'
  | 'LayoutAnimation'
  | 'Modal'
  | 'SafeAreaView'
  | 'SectionList'
  | 'VirtualizedList'
  | 'VirtualizedSectionList'
  | 'findNodeHandle'
  | 'useAnimatedColor'
  | 'useAnimatedValue'
  | 'useAnimatedValueXY'
  // Native platform, native modules, and development tools.
  | 'ActionSheetIOS'
  | 'AppRegistry'
  | 'AssetRegistry'
  | 'DevMenu'
  | 'DevSettings'
  | 'DeviceEventEmitter'
  | 'DeviceInfo'
  | 'DrawerLayoutAndroid'
  | 'DynamicColorIOS'
  | 'EventEmitter'
  | 'InputAccessoryView'
  | 'LogBox'
  | 'NativeAppEventEmitter'
  | 'NativeComponentRegistry'
  | 'NativeEventEmitter'
  | 'NativeModules'
  | 'Networking'
  | 'PermissionsAndroid'
  | 'PlatformColor'
  | 'ProgressBarAndroid'
  | 'PushNotificationIOS'
  | 'ReactNativeVersion'
  | 'RootTagContext'
  | 'Settings'
  | 'Systrace'
  | 'ToastAndroid'
  | 'TurboModuleRegistry'
  | 'UIManager'
  | 'UTFSequence'
  | 'VirtualViewMode'
  | 'codegenNativeCommands'
  | 'codegenNativeComponent'
  | 'experimental_LayoutConformance'
  | 'registerCallableModule'
  | 'requireNativeComponent'
  | 'unstable_DEFAULT_INITIAL_NUM_TO_RENDER'
  | 'unstable_NativeText'
  | 'unstable_NativeView'
  | 'unstable_TextAncestorContext'
  | 'unstable_VirtualArray'
  | 'unstable_VirtualColumn'
  | 'unstable_VirtualColumnGenerator'
  | 'unstable_VirtualRow'
  | 'unstable_VirtualView'
  | 'unstable_batchedUpdates'
  | 'unstable_createVirtualCollectionView'
  | 'unstable_getScrollParent'

// Every component lacks these.
type AccessibilityGaps =
  | 'accessibilityActions'
  | 'accessibilityIgnoresInvertColors'
  | 'accessibilityLanguage'
  | 'accessibilityLargeContentTitle'
  | 'accessibilityRespondsToUserInteraction'
  | 'accessibilityShowsLargeContentViewer'
  | 'onAccessibilityAction'
  | 'screenReaderFocusable'

// `Text` has these seven in React Native. The other responder props are only on `View`.
type TextResponderGaps =
  | 'onMoveShouldSetResponder'
  | 'onResponderGrant'
  | 'onResponderMove'
  | 'onResponderRelease'
  | 'onResponderTerminate'
  | 'onResponderTerminationRequest'
  | 'onStartShouldSetResponder'

type ViewGaps =
  | AccessibilityGaps
  | TextResponderGaps
  | 'hitSlop'
  | 'onMoveShouldSetResponderCapture'
  | 'onPointerEnterCapture'
  | 'onPointerLeaveCapture'
  | 'onResponderEnd'
  | 'onResponderReject'
  | 'onResponderStart'
  | 'onStartShouldSetResponderCapture'
  // iOS, Android, and TV only.
  | 'collapsableChildren'
  | 'experimental_accessibilityOrder'
  | 'hasTVPreferredFocus'
  | 'nativeBackgroundAndroid'
  | 'nativeForegroundAndroid'
  | 'needsOffscreenAlphaCompositing'
  | 'nextFocusDown'
  | 'nextFocusForward'
  | 'nextFocusLeft'
  | 'nextFocusRight'
  | 'nextFocusUp'
  | 'onAccessibilityEscape'
  | 'onAccessibilityTap'
  | 'onMagicTap'
  | 'removeClippedSubviews'
  | 'renderToHardwareTextureAndroid'
  | 'shouldRasterizeIOS'

type TextGaps =
  | AccessibilityGaps
  | TextResponderGaps
  | 'adjustsFontSizeToFit'
  | 'allowFontScaling'
  | 'android_hyphenationFrequency'
  | 'dataDetectorType'
  | 'dynamicTypeRamp'
  | 'lineBreakStrategyIOS'
  | 'maxFontSizeMultiplier'
  | 'minimumFontScale'
  | 'onTextLayout'
  | 'textBreakStrategy'

type ImageGaps =
  | ViewGaps
  | 'capInsets'
  | 'children'
  | 'collapsable'
  | 'focusable'
  | 'internal_analyticTag'
  | 'onPartialLoad'
  | 'pointerEvents'
  | 'resizeMultiplier'
  | 'tabIndex'

type ScrollViewGaps =
  | Exclude<ViewGaps, 'experimental_accessibilityOrder' | 'removeClippedSubviews'>
  | 'StickyHeaderComponent'
  | 'experimental_endDraggingSensitivityMultiplier'
  | 'innerViewRef'
  | 'onKeyboardDidHide'
  | 'onKeyboardDidShow'
  | 'onKeyboardWillHide'
  | 'onKeyboardWillShow'
  | 'scrollViewRef'
  | 'scrollsChildToFocus'

type TextInputGaps =
  | Exclude<ViewGaps, 'experimental_accessibilityOrder'>
  | 'children'
  | 'collapsable'
  | 'disableKeyboardShortcuts'
  | 'experimental_acceptDragAndDropTypes'
  | 'focusable'
  | 'forwardedRef'
  | 'inputAccessoryViewButtonLabel'
  | 'inputAccessoryViewID'
  | 'lineBreakModeIOS'
  | 'onPress'
  | 'onPressIn'
  | 'onPressOut'
  | 'pointerEvents'
  | 'rows'
  | 'selectionHandleColor'
  | 'tabIndex'

export type TypeParity = [
  None<Diff<keyof typeof Native, keyof typeof Web, ExportGaps>>,
  None<PropDiff<Native.ViewProps, Web.ViewProps, ViewGaps>>,
  None<PropDiff<Native.TextProps, Web.TextProps, TextGaps>>,
  None<PropDiff<Native.ImageProps, Web.ImageProps, ImageGaps>>,
  None<PropDiff<Native.PressableProps, Web.PressableProps, Exclude<ViewGaps, 'hitSlop'>>>,
  None<PropDiff<Native.ScrollViewProps, Web.ScrollViewProps, ScrollViewGaps>>,
  None<PropDiff<Native.TextInputProps, Web.TextInputProps, TextInputGaps>>,
  None<
    PropDiff<Native.FlatListProps<unknown>, Web.FlatListProps<unknown>, ScrollViewGaps | 'children'>
  >,
  None<PropDiff<Native.SwitchProps, Web.SwitchProps, ViewGaps | 'children'>>,
  None<PropDiff<Native.RefreshControlProps, Web.RefreshControlProps, ViewGaps>>,
  None<PropDiff<Native.ButtonProps, Web.ButtonProps, never>>,
  None<PropDiff<Native.ActivityIndicatorProps, Web.ActivityIndicatorProps, ViewGaps>>,
  None<
    PropDiff<
      Native.TouchableWithoutFeedbackProps,
      Web.TouchableWithoutFeedbackProps,
      AccessibilityGaps
    >
  >,
  None<
    PropDiff<Native.TouchableOpacityProps, Web.TouchableOpacityProps, AccessibilityGaps | 'hostRef'>
  >,
  None<
    PropDiff<
      Native.TouchableHighlightProps,
      Web.TouchableHighlightProps,
      AccessibilityGaps | 'hostRef'
    >
  >,
  None<
    PropDiff<
      Native.TouchableNativeFeedbackProps,
      Web.TouchableNativeFeedbackProps,
      AccessibilityGaps
    >
  >,
  None<PropDiff<Native.StatusBarProps, Web.StatusBarProps, never>>,
  None<PropDiff<typeof Native.AppState, typeof Web.AppState, never>>,
  None<PropDiff<typeof Native.Linking, typeof Web.Linking, never>>,
  // A class on native, a plain object here.
  None<PropDiff<typeof Native.Share, typeof Web.Share, 'prototype'>>,
  None<PropDiff<typeof Native.Vibration, typeof Web.Vibration, never>>,
  None<PropDiff<typeof Native.Clipboard, typeof Web.Clipboard, never>>,
]
