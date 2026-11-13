import { describe, expect, test } from 'vitest'

import { TurboModuleRegistry } from './index'

describe('TurboModuleRegistry', () => {
  test('get returns null for every module', () => {
    expect(TurboModuleRegistry.get('RNCSafeAreaContext')).toBeNull()
    expect(TurboModuleRegistry.get('ReanimatedModule')).toBeNull()
  })

  test('getEnforcing throws with the module name', () => {
    expect(() => TurboModuleRegistry.getEnforcing('RNCSafeAreaContext')).toThrow(
      "'RNCSafeAreaContext' could not be found",
    )
  })
})
