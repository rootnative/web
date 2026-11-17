import { UIManager } from './UIManager.js'

// The web has no native modules. A library that looks one up, such as `expo-constants` with
// `NativeModules.EXDevLauncher`, gets `undefined` and takes its path for a missing module. The
// object is the one of react-native-web.
export const NativeModules = { UIManager }
