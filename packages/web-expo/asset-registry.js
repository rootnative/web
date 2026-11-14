// Expo's bundler resolves the asset registry of React Native to `react-native-web/asset-registry`
// on the web, for a library that imports it. An image import of the app doesn't come here: on
// the web, Expo gives it a URL.
export { getAssetByID, registerAsset } from '@rootnative/web/assets-registry'
