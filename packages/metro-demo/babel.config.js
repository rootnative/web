module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Reanimated needs the Worklets plugin, as the last entry. React Native's preset doesn't add it.
  plugins: ['react-native-worklets/plugin'],
}
