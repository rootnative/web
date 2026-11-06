import { useSyncExternalStore } from 'react'

import { Dimensions, type ScaledSize } from '../Dimensions'

const serverSnapshot: ScaledSize = Object.freeze({ width: 0, height: 0, scale: 1, fontScale: 1 })

const subscribe = (onChange: () => void): (() => void) => {
  const subscription = Dimensions.addEventListener('change', onChange)
  return () => subscription.remove()
}

const getSnapshot = (): ScaledSize => Dimensions.get('window')

const getServerSnapshot = (): ScaledSize => serverSnapshot

export const useWindowDimensions = (): ScaledSize =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
