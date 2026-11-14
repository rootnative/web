module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    // Reanimated needs the Worklets plugin, as the last entry.
    plugins: ['react-native-worklets/plugin'],
  }
}
