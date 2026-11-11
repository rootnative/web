import type { ReactElement } from 'react'

import { StyleSheet } from '../../apis/StyleSheet'
import { Text } from '../Text'
import { TouchableOpacity } from '../TouchableOpacity'
import type { ButtonProps } from './types'

export type { ButtonProps } from './types'

export function Button(props: ButtonProps): ReactElement {
  const {
    accessibilityActions: _accessibilityActions,
    accessibilityLanguage,
    accessibilityState,
    'aria-disabled': ariaDisabled,
    color,
    importantForAccessibility,
    onAccessibilityAction: _onAccessibilityAction,
    title,
    ...rest
  } = props

  if (typeof title !== 'string') throw new Error('The title prop of a Button must be a string')

  const disabled = props.disabled ?? ariaDisabled ?? accessibilityState?.disabled
  // As in React Native, the state follows the resolved value, so `disabled={false}` wins.
  const state =
    disabled === accessibilityState?.disabled
      ? accessibilityState
      : { ...accessibilityState, disabled }

  // One element, where React Native has a View inside the touchable: a <button> takes no <div>.
  return (
    <TouchableOpacity
      {...rest}
      {...(accessibilityLanguage !== undefined && { lang: accessibilityLanguage })}
      role="button"
      accessibilityState={state}
      disabled={disabled}
      // As in React Native: `no` also hides the text inside.
      importantForAccessibility={
        importantForAccessibility === 'no' ? 'no-hide-descendants' : importantForAccessibility
      }
      style={[
        styles.button,
        color != null && color !== '' && { backgroundColor: color },
        disabled === true && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.text, disabled === true && styles.textDisabled]}>{title}</Text>
    </TouchableOpacity>
  )
}

// The look of React Native's Button on Android, without the elevation.
const styles = StyleSheet.create({
  button: { backgroundColor: '#2196F3', borderRadius: 2 },
  text: { color: 'white', fontWeight: '500', margin: 8, textAlign: 'center' },
  buttonDisabled: { backgroundColor: '#dfdfdf' },
  textDisabled: { color: '#a1a1a1' },
})
