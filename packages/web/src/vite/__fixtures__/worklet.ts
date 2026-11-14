import { Platform } from 'react-native'

export const double = (value: number): number => {
  'worklet'
  return value * 2
}

export const os: string = Platform.OS
