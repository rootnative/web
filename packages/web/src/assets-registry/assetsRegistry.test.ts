import { describe, expect, test } from 'vitest'

import { getAssetByID, registerAsset } from './index'

describe('assets registry', () => {
  test('returns undefined for an id that nobody registered', () => {
    expect(getAssetByID(1)).toBeUndefined()
    expect(getAssetByID(0)).toBeUndefined()
  })

  test('gives each asset an id from 1, and returns the asset for its id', () => {
    const icon = { httpServerLocation: '/assets', name: 'icon', type: 'png', scales: [1, 2] }
    const logo = { httpServerLocation: '/assets', name: 'logo', type: 'svg', scales: [1] }
    const iconId = registerAsset(icon)
    const logoId = registerAsset(logo)
    expect(iconId).toBe(1)
    expect(logoId).toBe(2)
    expect(getAssetByID(iconId)).toBe(icon)
    expect(getAssetByID(logoId)).toBe(logo)
  })
})
