// app/reports/_layout.tsx — Phase 13: reports section layout
import { Stack } from 'expo-router'

export default function ReportsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sales" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="debt" />
      <Stack.Screen name="expense" />
    </Stack>
  )
}
