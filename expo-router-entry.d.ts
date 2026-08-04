// Ambient module declaration for expo-router/entry.
// expo-router ships entry.js as the side-effect import that registers
// the app with AppRegistry; it has no bundled type definitions.
declare module 'expo-router/entry' {
  const Entry: React.ComponentType
  export default Entry
}
