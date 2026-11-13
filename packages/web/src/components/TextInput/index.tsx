import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type RefObject,
  type SyntheticEvent,
  type UIEvent,
} from 'react'

import { toDOMProps } from '../../render/domProps'
import { applyNativeProps, withHostMethods } from '../../render/hostMethods'
import { useElementLayout } from '../../render/useElementLayout'
import { toCSSColor } from '../../style/color'
import { compileReset, compileStyle, flattenStyle, joinClassNames } from '../../style/compile'
import type { StyleRegistry } from '../../style/registry'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import { hasDOM } from '../../utils/env'
import { toEnterKeyHint, toHTMLAutoComplete, toInputMode } from './autocomplete'
import type {
  SubmitBehavior,
  TextInputChangeEvent,
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
} from './types'

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
} from './types'

type Field = HTMLInputElement | HTMLTextAreaElement

// What a native TextInput looks like before any style is applied: the Text
// reset, plus the form-control resets of the browser.
const resetStyle = Object.freeze({
  appearance: 'none',
  backgroundColor: 'transparent',
  border: '0 solid black',
  borderRadius: 0,
  boxSizing: 'border-box',
  color: 'black',
  display: 'block',
  fontFamily: 'System',
  fontSize: 14,
  margin: 0,
  minWidth: 0,
  padding: 0,
  position: 'relative',
  resize: 'none',
  textAlign: 'start',
  textDecoration: 'none',
})

// A multiline input grows with its text, as on iOS.
const textareaStyle = Object.freeze({
  fieldSizing: 'content',
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  wordWrap: 'break-word',
})

const supportsFieldSizing =
  hasDOM() && typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content')

// A short stable class suffix for a color.
const hash = (value: string): string => {
  let h = 5381
  for (let i = 0; i < value.length; i++) h = (h * 33) ^ value.charCodeAt(i)
  return (h >>> 0).toString(36)
}

const placeholderClass = (registry: StyleRegistry, color: unknown): string | undefined => {
  const css = toCSSColor(color)
  if (css === undefined) return undefined
  const name = `rn-ph-${hash(css)}`
  return registry.staticClass(name, [`.${name}::placeholder{color:${css};opacity:1}`])
}

const selectionClass = (registry: StyleRegistry, color: unknown): string | undefined => {
  const css = toCSSColor(color)
  if (css === undefined) return undefined
  const name = `rn-sel-${hash(css)}`
  return registry.staticClass(name, [`.${name}::selection{background-color:${css}}`])
}

const submitBehaviorOf = (
  submitBehavior: SubmitBehavior | undefined,
  blurOnSubmit: boolean | undefined,
  multiline: boolean,
): SubmitBehavior => {
  if (submitBehavior !== undefined) return submitBehavior
  if (multiline) return blurOnSubmit === true ? 'blurAndSubmit' : 'newline'
  return blurOnSubmit === false ? 'submit' : 'blurAndSubmit'
}

const selectionOf = (field: Field): TextInputSelection => ({
  start: field.selectionStart ?? 0,
  end: field.selectionEnd ?? 0,
})

const sameSelection = (a: TextInputSelection | null, b: TextInputSelection): boolean =>
  a !== null && a.start === b.start && a.end === b.end

const isField = (node: Element | null): node is Field =>
  node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement

function TextInputComponent(props: TextInputProps): ReactElement {
  const {
    autoCapitalize,
    autoComplete,
    autoCorrect,
    autoFocus,
    blurOnSubmit: _blurOnSubmit,
    caretHidden,
    clearTextOnFocus: _clearTextOnFocus,
    contextMenuHidden: _contextMenuHidden,
    cursorColor,
    defaultValue,
    editable = true,
    enterKeyHint,
    inputMode,
    keyboardType,
    maxLength,
    multiline = false,
    numberOfLines,
    onBlur: _onBlur,
    onChange: _onChange,
    onChangeText: _onChangeText,
    onContentSizeChange,
    onContextMenu: _onContextMenu,
    onEndEditing: _onEndEditing,
    onFocus: _onFocus,
    onKeyDown: _onKeyDown,
    onKeyPress: _onKeyPress,
    onLayout,
    onScroll: _onScroll,
    onSelectionChange: _onSelectionChange,
    onSubmitEditing: _onSubmitEditing,
    placeholder,
    placeholderTextColor,
    readOnly,
    ref,
    returnKeyType,
    secureTextEntry,
    selectTextOnFocus: _selectTextOnFocus,
    selection,
    selectionColor,
    showSoftInputOnFocus,
    spellCheck,
    style,
    submitBehavior: _submitBehavior,
    textAlign,
    textContentType,
    value,
    // Native only.
    allowFontScaling: _allowFontScaling,
    clearButtonMode: _clearButtonMode,
    dataDetectorTypes: _dataDetectorTypes,
    disableFullscreenUI: _disableFullscreenUI,
    enablesReturnKeyAutomatically: _enablesReturnKeyAutomatically,
    importantForAutofill: _importantForAutofill,
    inlineImageLeft: _inlineImageLeft,
    inlineImagePadding: _inlineImagePadding,
    keyboardAppearance: _keyboardAppearance,
    lineBreakStrategyIOS: _lineBreakStrategyIOS,
    maxFontSizeMultiplier: _maxFontSizeMultiplier,
    passwordRules: _passwordRules,
    rejectResponderTermination: _rejectResponderTermination,
    returnKeyLabel: _returnKeyLabel,
    scrollEnabled: _scrollEnabled,
    smartInsertDelete: _smartInsertDelete,
    textAlignVertical: _textAlignVertical,
    textBreakStrategy: _textBreakStrategy,
    underlineColorAndroid: _underlineColorAndroid,
    verticalAlign: _verticalAlign,
    ...rest
  } = props

  const registry = useStyleRegistry()
  const field = useRef<Field | null>(null)
  useElementLayout(field, onLayout)

  // The event handlers read the latest props from here. The `_` props above
  // only stay out of `rest`.
  const handlers = useRef(props)
  useEffect(() => {
    handlers.current = props
  })

  const eventCount = useRef(0)
  const lastSelection = useRef<TextInputSelection | null>(null)
  const lastContentSize = useRef<{ width: number; height: number } | null>(null)

  const reportContentSize = useCallback((element: Field): void => {
    const next = { width: element.scrollWidth, height: element.scrollHeight }
    const last = lastContentSize.current
    if (last !== null && last.width === next.width && last.height === next.height) return
    lastContentSize.current = next
    handlers.current.onContentSizeChange?.({
      nativeEvent: { contentSize: next },
    } as TextInputContentSizeChangeEvent)
  }, [])

  // The fallback for browsers without `field-sizing: content`.
  const grow = useCallback((element: Field): void => {
    if (supportsFieldSizing || !(element instanceof HTMLTextAreaElement)) return
    if (handlers.current.style !== undefined) {
      const flat = flattenStyle(handlers.current.style)
      if (flat?.['height'] !== undefined) return
    }
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [])

  const handleChange = useCallback(
    (event: ChangeEvent<Field>) => {
      const element = event.currentTarget
      const text = element.value
      eventCount.current += 1
      Object.assign(event.nativeEvent, { text, eventCount: eventCount.current })
      handlers.current.onChange?.(event as unknown as TextInputChangeEvent)
      handlers.current.onChangeText?.(text)
      grow(element)
      if (handlers.current.onContentSizeChange !== undefined) reportContentSize(element)
    },
    [grow, reportContentSize],
  )

  const handleFocus = useCallback((event: FocusEvent<Field>) => {
    const element = event.currentTarget
    const current = handlers.current
    if (current.clearTextOnFocus === true && element.value !== '') {
      element.value = ''
      eventCount.current += 1
      current.onChangeText?.('')
    }
    if (current.selectTextOnFocus === true) element.select()
    Object.assign(event.nativeEvent, { text: element.value, eventCount: eventCount.current })
    current.onFocus?.(event as unknown as TextInputFocusEvent)
  }, [])

  const handleBlur = useCallback((event: FocusEvent<Field>) => {
    const element = event.currentTarget
    Object.assign(event.nativeEvent, { text: element.value, eventCount: eventCount.current })
    handlers.current.onBlur?.(event as unknown as TextInputFocusEvent)
    handlers.current.onEndEditing?.(event as unknown as TextInputEndEditingEvent)
  }, [])

  const handleKeyDown = useCallback((event: KeyboardEvent<Field>) => {
    const current = handlers.current
    current.onKeyDown?.(event as unknown as KeyboardEvent<HTMLElement>)
    // The DOM KeyboardEvent already has `key`, and the property is read-only.
    current.onKeyPress?.(event as unknown as TextInputKeyPressEvent)
    if (event.defaultPrevented || event.key !== 'Enter' || event.shiftKey) return

    const isMultiline = current.multiline === true
    const behavior = submitBehaviorOf(current.submitBehavior, current.blurOnSubmit, isMultiline)
    if (behavior === 'newline') return
    // A single-line input keeps the default, so a form submits on Enter.
    if (isMultiline) event.preventDefault()
    const element = event.currentTarget
    Object.assign(event.nativeEvent, { text: element.value })
    current.onSubmitEditing?.(event as unknown as TextInputSubmitEditingEvent)
    if (behavior === 'blurAndSubmit') element.blur()
  }, [])

  const handleSelect = useCallback((event: SyntheticEvent<Field>) => {
    const next = selectionOf(event.currentTarget)
    if (sameSelection(lastSelection.current, next)) return
    lastSelection.current = next
    Object.assign(event.nativeEvent, { selection: next })
    handlers.current.onSelectionChange?.(event as unknown as TextInputSelectionChangeEvent)
  }, [])

  const handleScroll = useCallback((event: UIEvent<Field>) => {
    const element = event.currentTarget
    Object.assign(event.nativeEvent, {
      contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
      contentOffset: { x: element.scrollLeft, y: element.scrollTop },
      contentSize: { width: element.scrollWidth, height: element.scrollHeight },
      layoutMeasurement: { width: element.clientWidth, height: element.clientHeight },
      zoomScale: 1,
    })
    handlers.current.onScroll?.(event as unknown as TextInputScrollEvent)
  }, [])

  const handleContextMenu = useCallback((event: MouseEvent<Field>) => {
    handlers.current.onContextMenu?.(event as unknown as MouseEvent<HTMLElement>)
    if (handlers.current.contextMenuHidden === true) event.preventDefault()
  }, [])

  // The controlled selection.
  const selectionStart = selection?.start
  const selectionEnd = selection?.end ?? selection?.start
  useLayoutEffect(() => {
    const element = field.current
    if (element === null || selectionStart === undefined || selectionEnd === undefined) return
    if (element.selectionStart === selectionStart && element.selectionEnd === selectionEnd) return
    element.setSelectionRange(selectionStart, selectionEnd)
    lastSelection.current = { start: selectionStart, end: selectionEnd }
    // A new value resets the caret in the DOM, so the effect runs on `value` too.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [selectionStart, selectionEnd, value])

  // Size after mount and after an outside value change.
  useLayoutEffect(() => {
    const element = field.current
    if (element === null) return
    grow(element)
    // `value` and `multiline` change the content height, so the effect runs on them.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [grow, value, multiline])

  const wantsContentSize = onContentSizeChange !== undefined
  useEffect(() => {
    const element = field.current
    if (element === null || !wantsContentSize) return
    reportContentSize(element)
    const observer = new ResizeObserver(() => reportContentSize(element))
    observer.observe(element)
    return () => observer.disconnect()
  }, [wantsContentSize, reportContentSize])

  useImperativeHandle(ref, () => {
    const element = field.current as Field
    const methods = {
      clear: () => {
        element.value = ''
        grow(element)
        handlers.current.onChangeText?.('')
      },
      isFocused: () => document.activeElement === element,
      getNativeRef: () => element,
      setNativeProps: ({ text, ...others }: Parameters<TextInputInstance['setNativeProps']>[0]) => {
        if (text !== undefined) element.value = text
        applyNativeProps(element, others)
        grow(element)
      },
    }
    return Object.assign(withHostMethods(element), methods) as TextInputInstance
  }, [grow])

  const flat = flattenStyle(style)
  const colorStyle: Record<string, unknown> = {}
  const caret = cursorColor ?? selectionColor
  if (caretHidden === true) colorStyle['caretColor'] = 'transparent'
  else if (caret !== undefined) colorStyle['caretColor'] = caret
  if (textAlign !== undefined) colorStyle['textAlign'] = textAlign

  let className = joinClassNames(
    compileReset('rn-text-input', resetStyle, registry),
    multiline === true && compileReset('rn-text-input-multiline', textareaStyle, registry),
    compileStyle([flat, colorStyle], registry),
  )
  const placeholderName = placeholderClass(registry, placeholderTextColor)
  if (placeholderName !== undefined) className = `${className} ${placeholderName}`
  const selectionName = selectionClass(registry, selectionColor)
  if (selectionName !== undefined) className = `${className} ${selectionName}`

  const domProps = toDOMProps(rest)
  domProps['className'] = className
  domProps['value'] = value
  domProps['defaultValue'] = defaultValue
  domProps['placeholder'] = placeholder
  domProps['readOnly'] = readOnly === true || !editable ? true : undefined
  domProps['maxLength'] = maxLength
  domProps['autoFocus'] = autoFocus
  domProps['autoCapitalize'] = autoCapitalize
  domProps['autoCorrect'] = autoCorrect === undefined ? undefined : autoCorrect ? 'on' : 'off'
  domProps['spellCheck'] = spellCheck
  domProps['autoComplete'] = toHTMLAutoComplete(autoComplete, textContentType)
  domProps['inputMode'] = toInputMode(inputMode, keyboardType, showSoftInputOnFocus)
  domProps['enterKeyHint'] = toEnterKeyHint(enterKeyHint, returnKeyType)
  domProps['dir'] ??= 'auto'

  domProps['onChange'] = handleChange
  domProps['onFocus'] = handleFocus
  domProps['onBlur'] = handleBlur
  domProps['onKeyDown'] = handleKeyDown
  domProps['onSelect'] = handleSelect
  domProps['onContextMenu'] = handleContextMenu

  if (multiline) {
    domProps['rows'] = numberOfLines ?? 1
    domProps['onScroll'] = handleScroll
    return <textarea {...domProps} ref={field as RefObject<HTMLTextAreaElement | null>} />
  }
  domProps['type'] = secureTextEntry === true ? 'password' : 'text'
  return <input {...domProps} ref={field as RefObject<HTMLInputElement | null>} />
}

const State: TextInputState = {
  currentlyFocusedInput: () => {
    if (!hasDOM()) return null
    const active = document.activeElement
    return isField(active) ? active : null
  },
  focusTextInput: (input) => input?.focus(),
  blurTextInput: (input) => input?.blur(),
}

export const TextInput: typeof TextInputComponent & { State: TextInputState } = Object.assign(
  TextInputComponent,
  { State },
)
