// `I18nManager.swapLeftAndRightInRTL` sets this. On by default, as on native.
let swap = true

export const getLeftAndRightSwap = (): boolean => swap

export const setLeftAndRightSwap = (value: boolean): void => {
  swap = value
}

/**
 * The logical CSS property of each physical left or right style. Fabric moves these styles to
 * the start and end edges in a right-to-left layout. A logical property does the same in the
 * browser: it is the left edge in a left-to-right layout, and the right edge in a right-to-left
 * one. The class names stay the same in both, so the server render needs no direction.
 */
export const swappedProperties: Readonly<Record<string, string>> = {
  left: 'insetInlineStart',
  right: 'insetInlineEnd',
  marginLeft: 'marginInlineStart',
  marginRight: 'marginInlineEnd',
  paddingLeft: 'paddingInlineStart',
  paddingRight: 'paddingInlineEnd',
  borderLeftWidth: 'borderInlineStartWidth',
  borderRightWidth: 'borderInlineEndWidth',
  borderLeftColor: 'borderInlineStartColor',
  borderRightColor: 'borderInlineEndColor',
  borderLeftStyle: 'borderInlineStartStyle',
  borderRightStyle: 'borderInlineEndStyle',
  borderTopLeftRadius: 'borderStartStartRadius',
  borderTopRightRadius: 'borderStartEndRadius',
  borderBottomLeftRadius: 'borderEndStartRadius',
  borderBottomRightRadius: 'borderEndEndRadius',
}
