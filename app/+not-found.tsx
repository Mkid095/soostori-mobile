// expo-router fallback for unmatched routes.
import { Link, Stack } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.body}>The page you are looking for does not exist.</Text>
        <Link href="/(tabs)/pos" style={styles.link}>Go to home</Link>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 24, backgroundColor: '#f8fafc',
  },
  code: { fontSize: 56, fontWeight: '800', color: '#f97316', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  body: { fontSize: 14, color: '#64748b', marginBottom: 16, textAlign: 'center' },
  link: { color: '#f97316', fontSize: 15, fontWeight: '700' },
})
