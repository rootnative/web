import { getAssetByID, registerAsset } from '@rootnative/web/assets-registry'

// react-native-web's `AssetRegistry` export: the asset registry as one object. The Babel preset
// of Expo sends `import { AssetRegistry } from 'react-native'` here. `expo-asset` imports it, and
// the server render of Expo Router loads `expo-asset`.
export const AssetRegistry = { getAssetByID, registerAsset }
