/** An asset as a React Native packager registers it. */
export type PackagerAsset = {
  readonly httpServerLocation: string
  readonly name: string
  readonly type: string
  readonly scales: ReadonlyArray<number>
  readonly width?: number | null
  readonly height?: number | null
  readonly hash?: string
}

const assets: PackagerAsset[] = []

/**
 * Compat entry. The Vite plugin points `@react-native/assets-registry/registry` here, because
 * libraries such as `react-native-svg` import that module on the web. A web bundler gives an
 * image import a URL, not a number, so the registry stays empty unless your code fills it.
 */
export const registerAsset = (asset: PackagerAsset): number => assets.push(asset)

export const getAssetByID = (assetId: number): PackagerAsset | undefined => assets[assetId - 1]
