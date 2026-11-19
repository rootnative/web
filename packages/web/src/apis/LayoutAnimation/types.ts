export type LayoutAnimationType =
  'spring' | 'linear' | 'easeInEaseOut' | 'easeIn' | 'easeOut' | 'keyboard'

export type LayoutAnimationProperty = 'opacity' | 'scaleX' | 'scaleY' | 'scaleXY'

export type LayoutAnimationAnimationConfig = Readonly<{
  duration?: number | undefined
  delay?: number | undefined
  springDamping?: number | undefined
  initialVelocity?: number | undefined
  type?: LayoutAnimationType | undefined
  property?: LayoutAnimationProperty | undefined
}>

export type LayoutAnimationAnim = LayoutAnimationAnimationConfig

export type LayoutAnimationConfig = Readonly<{
  duration: number
  create?: LayoutAnimationAnimationConfig | undefined
  update?: LayoutAnimationAnimationConfig | undefined
  delete?: LayoutAnimationAnimationConfig | undefined
}>

export type LayoutAnimationTypes = Readonly<{ [type in LayoutAnimationType]: type }>

export type LayoutAnimationProperties = Readonly<{ [prop in LayoutAnimationProperty]: prop }>
