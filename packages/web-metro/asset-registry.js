// Metro registers each image that the app requires through React Native's asset registry, and
// `withRootNative` sends that registry here on the web. `Image` reads the same registry.
export { getAssetByID, registerAsset } from '@rootnative/web/assets-registry'
