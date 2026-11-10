import { Platform } from 'react-native'

import { label } from './label'

export const greeting: string = `${label} on ${Platform.OS}`
