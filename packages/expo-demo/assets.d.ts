// On the web, Expo's bundler gives an image import its URL and its size.
declare module '*.png' {
  const asset: { uri: string; width: number; height: number }
  export default asset
}
