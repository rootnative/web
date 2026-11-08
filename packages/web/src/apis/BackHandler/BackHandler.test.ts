import { describe, expect, test } from 'vitest'

import { BackHandler, backPressHandlerCount } from './index'

const handler = (): boolean => true

describe('BackHandler', () => {
  test('registers and removes handlers', () => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler)
    expect(backPressHandlerCount()).toBe(1)
    subscription.remove()
    expect(backPressHandlerCount()).toBe(0)

    BackHandler.addEventListener('hardwareBackPress', handler)
    BackHandler.removeEventListener('hardwareBackPress', handler)
    expect(backPressHandlerCount()).toBe(0)
  })

  test('rejects an unknown event', () => {
    expect(() => BackHandler.addEventListener('other' as 'hardwareBackPress', () => true)).toThrow(
      'unknown event',
    )
  })

  test('exitApp does nothing', () => {
    expect(() => BackHandler.exitApp()).not.toThrow()
  })
})
