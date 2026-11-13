import type { Ref } from 'react'

import type { TextStyle } from '../../apis/StyleSheet/types'
import type { NativeSyntheticEvent } from '../../events/types'
import type { StyleProp } from '../../style/types'
import type { NativeScrollEvent } from '../ScrollView/types'
import type {
  AccessibilityProps,
  DOMEventHandlers,
  HostMethods,
  LayoutChangeEvent,
} from '../View/types'

export type TextInputSelection = { start: number; end: number }

export type TextInputChangeEventData = {
  text: string
  eventCount: number
  target: EventTarget | null
}
export type TextInputChangeEvent = NativeSyntheticEvent<TextInputChangeEventData>
export type TextInputFocusEvent = NativeSyntheticEvent<TextInputChangeEventData>
export type TextInputEndEditingEvent = NativeSyntheticEvent<{ text: string }>
export type TextInputSubmitEditingEvent = NativeSyntheticEvent<{ text: string }>
export type TextInputKeyPressEvent = NativeSyntheticEvent<{ key: string }>
export type TextInputSelectionChangeEvent = NativeSyntheticEvent<{ selection: TextInputSelection }>
export type TextInputContentSizeChangeEvent = NativeSyntheticEvent<{
  contentSize: { width: number; height: number }
}>
export type TextInputScrollEvent = NativeSyntheticEvent<NativeScrollEvent>

export type KeyboardType =
  | 'default'
  | 'number-pad'
  | 'decimal-pad'
  | 'numeric'
  | 'email-address'
  | 'phone-pad'
  | 'url'
  | 'ascii-capable'
  | 'numbers-and-punctuation'
  | 'name-phone-pad'
  | 'twitter'
  | 'web-search'
  | 'visible-password'
  | 'ascii-capable-number-pad'

export type InputMode = 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'

export type ReturnKeyType =
  | 'done'
  | 'go'
  | 'next'
  | 'search'
  | 'send'
  | 'none'
  | 'previous'
  | 'default'
  | 'emergency-call'
  | 'google'
  | 'join'
  | 'route'
  | 'yahoo'

export type EnterKeyHint = 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'

export type SubmitBehavior = 'submit' | 'blurAndSubmit' | 'newline'

export type TextInputInstance = HTMLInputElement &
  HTMLTextAreaElement &
  Omit<HostMethods, 'setNativeProps'> & {
    clear: () => void
    isFocused: () => boolean
    getNativeRef: () => HTMLInputElement | HTMLTextAreaElement
    setNativeProps: (props: {
      text?: string | undefined
      style?: StyleProp<TextStyle> | undefined
    }) => void
  }

type ReservedDOMHandlers =
  'onChange' | 'onFocus' | 'onBlur' | 'onKeyPress' | 'onSelect' | 'onScroll' | 'onInput'

export type TextInputProps = AccessibilityProps &
  Omit<DOMEventHandlers<HTMLElement>, ReservedDOMHandlers> & {
    ref?: Ref<TextInputInstance> | undefined
    style?: StyleProp<TextStyle> | undefined
    id?: string | undefined
    nativeID?: string | undefined
    testID?: string | undefined
    value?: string | undefined
    defaultValue?: string | undefined
    placeholder?: string | undefined
    placeholderTextColor?: unknown
    editable?: boolean | undefined
    readOnly?: boolean | undefined
    multiline?: boolean | undefined
    numberOfLines?: number | undefined
    maxLength?: number | undefined
    secureTextEntry?: boolean | undefined
    keyboardType?: KeyboardType | undefined
    inputMode?: InputMode | undefined
    returnKeyType?: ReturnKeyType | undefined
    enterKeyHint?: EnterKeyHint | undefined
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters' | undefined
    autoCorrect?: boolean | undefined
    spellCheck?: boolean | undefined
    autoComplete?: string | undefined
    textContentType?: string | undefined
    autoFocus?: boolean | undefined
    blurOnSubmit?: boolean | undefined
    submitBehavior?: SubmitBehavior | undefined
    selectTextOnFocus?: boolean | undefined
    clearTextOnFocus?: boolean | undefined
    selection?: { start: number; end?: number | undefined } | undefined
    selectionColor?: unknown
    cursorColor?: unknown
    caretHidden?: boolean | undefined
    contextMenuHidden?: boolean | undefined
    showSoftInputOnFocus?: boolean | undefined
    textAlign?: 'left' | 'center' | 'right' | undefined
    onChange?: ((event: TextInputChangeEvent) => void) | undefined
    onChangeText?: ((text: string) => void) | undefined
    onFocus?: ((event: TextInputFocusEvent) => void) | undefined
    onBlur?: ((event: TextInputFocusEvent) => void) | undefined
    onEndEditing?: ((event: TextInputEndEditingEvent) => void) | undefined
    onSubmitEditing?: ((event: TextInputSubmitEditingEvent) => void) | undefined
    onKeyPress?: ((event: TextInputKeyPressEvent) => void) | undefined
    onSelectionChange?: ((event: TextInputSelectionChangeEvent) => void) | undefined
    onContentSizeChange?: ((event: TextInputContentSizeChangeEvent) => void) | undefined
    onScroll?: ((event: TextInputScrollEvent) => void) | undefined
    onLayout?: ((event: LayoutChangeEvent) => void) | undefined
    // Native only. Accepted and ignored.
    allowFontScaling?: boolean | undefined
    clearButtonMode?: 'never' | 'while-editing' | 'unless-editing' | 'always' | undefined
    dataDetectorTypes?: unknown
    disableFullscreenUI?: boolean | undefined
    enablesReturnKeyAutomatically?: boolean | undefined
    importantForAutofill?:
      'auto' | 'no' | 'noExcludeDescendants' | 'yes' | 'yesExcludeDescendants' | undefined
    inlineImageLeft?: string | undefined
    inlineImagePadding?: number | undefined
    keyboardAppearance?: 'default' | 'light' | 'dark' | undefined
    lineBreakStrategyIOS?: 'none' | 'standard' | 'hangul-word' | 'push-out' | undefined
    maxFontSizeMultiplier?: number | null | undefined
    passwordRules?: string | null | undefined
    rejectResponderTermination?: boolean | null | undefined
    returnKeyLabel?: string | undefined
    scrollEnabled?: boolean | undefined
    smartInsertDelete?: boolean | undefined
    textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center' | undefined
    textBreakStrategy?: 'simple' | 'highQuality' | 'balanced' | undefined
    underlineColorAndroid?: unknown
    verticalAlign?: 'auto' | 'top' | 'bottom' | 'middle' | undefined
  }

export type TextInputState = {
  currentlyFocusedInput: () => HTMLInputElement | HTMLTextAreaElement | null
  focusTextInput: (input: HTMLElement | null | undefined) => void
  blurTextInput: (input: HTMLElement | null | undefined) => void
}
