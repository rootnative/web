import type { ProcessedColorValue } from '../../apis/processColor'
import type {
  TouchableTVProps,
  TouchableWithoutFeedbackProps,
} from '../TouchableWithoutFeedback/types'

export type ThemeAttributeBackgroundPropType = Readonly<{
  type: 'ThemeAttrAndroid'
  attribute: 'selectableItemBackground' | 'selectableItemBackgroundBorderless'
  rippleRadius: number | null | undefined
}>

export type RippleBackgroundPropType = Readonly<{
  type: 'RippleAndroid'
  color: ProcessedColorValue | null | undefined
  borderless: boolean
  rippleRadius: number | null | undefined
}>

export type BackgroundPropType = ThemeAttributeBackgroundPropType | RippleBackgroundPropType

export type TouchableNativeFeedbackProps = TouchableWithoutFeedbackProps &
  TouchableTVProps & {
    // Android only. The web ignores them, as iOS does.
    background?: BackgroundPropType | undefined
    useForeground?: boolean | undefined
  }
