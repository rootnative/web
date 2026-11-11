import type { ChangeEvent, ReactElement } from 'react'

import { StyleSheet } from '../../apis/StyleSheet'
import { toDOMProps } from '../../render/domProps'
import { toCSSColor } from '../../style/color'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import { View } from '../View'
import type { SwitchChangeEvent, SwitchProps } from './types'

export type { SwitchChangeEvent, SwitchChangeEventData, SwitchProps } from './types'

// The colors of React Native's Switch on Android, with the default theme.
const TRACK_OFF = '#939393'
const TRACK_ON = '#A3D3CF'
const THUMB_OFF = '#FAFAFA'
const THUMB_ON = '#009688'

const INPUT_CLASS = 'rn-switch-input'
// The input covers the switch and is transparent, so the browser gives the press, the keyboard,
// the focus, and the label. The elements after it draw the switch from the state of the input.
const RULES = [
  `.${INPUT_CLASS}{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;opacity:0;cursor:pointer;z-index:1}`,
  `.${INPUT_CLASS}:disabled{cursor:default}`,
  '.rn-switch-track{height:70%;border-radius:9999px;transition:background-color .15s}',
  '.rn-switch-row{position:absolute;inset:0;display:flex;border-radius:9999px}',
  // A spacer that grows moves the thumb to the end, in both writing directions and at each size.
  '.rn-switch-spacer{flex-grow:0;transition:flex-grow .15s}',
  '.rn-switch-thumb{height:100%;aspect-ratio:1;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.5);transition:background-color .15s}',
  `.${INPUT_CLASS}:checked~.rn-switch-row>.rn-switch-spacer{flex-grow:1}`,
  `.${INPUT_CLASS}:focus-visible~.rn-switch-row{outline:auto;outline-offset:2px}`,
  '@media (prefers-reduced-motion:reduce){.rn-switch-track,.rn-switch-spacer,.rn-switch-thumb{transition:none}}',
]

export function Switch(props: SwitchProps): ReactElement {
  const {
    accessibilityRole,
    accessibilityState,
    disabled,
    ios_backgroundColor: _iosBackgroundColor,
    onChange,
    onLayout,
    onTintColor: _onTintColor,
    onValueChange,
    pointerEvents,
    ref,
    role,
    style,
    thumbColor,
    thumbTintColor: _thumbTintColor,
    tintColor: _tintColor,
    trackColor,
    value,
    ...rest
  } = props

  const registry = useStyleRegistry()
  const inputClass = registry.staticClass(INPUT_CLASS, RULES)

  const on = value === true
  const resolvedDisabled = disabled ?? accessibilityState?.disabled
  // As in React Native, the state follows the resolved value, so `disabled={false}` wins.
  const state =
    resolvedDisabled === accessibilityState?.disabled
      ? accessibilityState
      : { ...accessibilityState, disabled: resolvedDisabled }

  // `checked` is controlled, so React puts the input back when `value` doesn't follow a press.
  // That's the native behavior: the switch shows `value`.
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const next = event.target.checked
    Object.assign(event.nativeEvent, { value: next })
    onChange?.(event as unknown as SwitchChangeEvent)
    onValueChange?.(next)
  }

  const inputProps = toDOMProps({ ...rest, accessibilityState: state })
  inputProps['role'] = role ?? accessibilityRole ?? 'switch'

  const track = toCSSColor(on ? trackColor?.true : trackColor?.false) ?? (on ? TRACK_ON : TRACK_OFF)
  const thumb = toCSSColor(thumbColor) ?? (on ? THUMB_ON : THUMB_OFF)

  return (
    <View
      onLayout={onLayout}
      pointerEvents={pointerEvents}
      style={[styles.root, style, resolvedDisabled === true && styles.disabled]}
    >
      <input
        {...inputProps}
        checked={on}
        className={inputClass}
        disabled={resolvedDisabled === true}
        onChange={handleChange}
        ref={ref}
        type="checkbox"
      />
      <div className="rn-switch-track" style={{ backgroundColor: track }} />
      <div className="rn-switch-row">
        <div className="rn-switch-spacer" />
        <div className="rn-switch-thumb" style={{ backgroundColor: thumb }} />
      </div>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignSelf: 'flex-start', width: 40, height: 20, justifyContent: 'center' },
  disabled: { opacity: 0.5 },
})
