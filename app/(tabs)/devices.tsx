// app/(tabs)/devices.tsx — Phase 15: Devices management tab
// Owner/Manager: full device management + primary transfer
// Viewer: read-only device list
// Cashier/Attendant: redirected away (BottomTabBar hides this tab)
import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Smartphone, Star } from 'lucide-react-native'
import { listDevices, approveDevice, revokeDevice, transferPrimary, getPrimaryStatus } from '../src/services/db-devices'
import { DeviceRowComponent, type DeviceRow } from '../src/components/devices/device-row-component'
import type { EmployeeRole } from '@soostori/core'

const DEVICE_ID_KEY = '@soostori:deviceId'

export default function DevicesTab() {
  const [devices, setDevices] = useState<DeviceRow[]>([] as DeviceRow[])
  const [primaryDevice, setPrimaryDevice] = useState<DeviceRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [localDeviceId, setLocalDeviceId] = useState<string | null>(null)
  const [role, setRole] = useState<EmployeeRole | null>(null)

  useEffect(() => {
    ;(async () => {
      const [did, r] = await Promise.all([
        AsyncStorage.getItem(DEVICE_ID_KEY),
        AsyncStorage.getItem('@soostori:employeeRole'),
      ])
      setLocalDeviceId(did)
      setRole(r as EmployeeRole | null)
      await loadData()
    })()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [devs, primary] = await Promise.all([listDevices(), getPrimaryStatus()])
      setDevices(devs as DeviceRow[])
      setPrimaryDevice(primary as DeviceRow | null)
    } catch {
      // Not permissioned — skip silently
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string) {
    setBusy(id)
    try { await approveDevice(id); await loadData() }
    catch (e: unknown) { Alert.alert('Failed', e instanceof Error ? e.message : 'Try again.') }
    finally { setBusy(null) }
  }

  async function handleRevoke(id: string) {
    Alert.alert('Revoke device?', 'This device will lose access.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke', style: 'destructive',
        onPress: async () => {
          setBusy(id)
          try { await revokeDevice(id); await loadData() }
          catch (e: unknown) { Alert.alert('Failed', e instanceof Error ? e.message : 'Try again.') }
          finally { setBusy(null) }
        },
      },
    ])
  }

  async function handleTransferPrimary(toDeviceId: string, deviceName?: string) {
    Alert.alert('Transfer Primary?', `Make ${deviceName ?? 'this device'} the new primary?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Transfer', style: 'destructive',
        onPress: async () => {
          setBusy(toDeviceId)
          try { await transferPrimary(toDeviceId); await loadData() }
          catch (e: unknown) { Alert.alert('Failed', e instanceof Error ? e.message : 'Try again.') }
          finally { setBusy(null) }
        },
      },
    ])
  }

  const canManage = role === 'owner' || role === 'manager'
  const pending = devices.filter((d: DeviceRow) => d.status === 'pending')
  const authorized = devices.filter((d: DeviceRow) => d.status === 'authorized')
  const revoked = devices.filter((d: DeviceRow) => d.status === 'revoked')

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#F97316" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['bottom']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center' }}>
          <Smartphone size={16} color="#fff" />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Devices</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {/* Primary Banner */}
        {primaryDevice && (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center' }}>
                <Star size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>
                  {primaryDevice.deviceName ?? 'Primary Device'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  {primaryDevice.deviceType} — {primaryDevice.lastSeen ? `Last seen ${new Date(primaryDevice.lastSeen).toLocaleTimeString()}` : 'Never seen'}
                </Text>
              </View>
              <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>Primary</Text>
              </View>
            </View>
          </View>
        )}

        {/* Pending */}
        {canManage && pending.length > 0 ? (
          <>
            <Text style={{ fontWeight: '700', fontSize: 13, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Pending Approval ({pending.length})
            </Text>
            {pending.map((d: DeviceRow) => (
              <DeviceRowComponent
                key={d.id}
                device={d}
                canManage={canManage as boolean}
                isLocal={d.id === localDeviceId}
                busy={busy === d.id}
                onApprove={handleApprove}
                onRevoke={handleRevoke}
                onTransferPrimary={handleTransferPrimary}
              />
            ))}
            <View style={{ height: 16 }} />
          </>
        ) : null}

        {/* Active */}
        {authorized.length > 0 ? (
          <>
            <Text style={{ fontWeight: '700', fontSize: 13, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Active Devices
            </Text>
            {authorized.map((d: DeviceRow) => (
              <DeviceRowComponent
                key={d.id}
                device={d}
                canManage={canManage as boolean}
                isLocal={d.id === localDeviceId}
                busy={busy === d.id}
                onApprove={handleApprove}
                onRevoke={handleRevoke}
                onTransferPrimary={handleTransferPrimary}
              />
            ))}
            <View style={{ height: 16 }} />
          </>
        ) : null}

        {/* Revoked */}
        {canManage && revoked.length > 0 ? (
          <>
            <Text style={{ fontWeight: '700', fontSize: 13, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Revoked ({revoked.length})
            </Text>
            {revoked.map((d: DeviceRow) => (
              <DeviceRowComponent
                key={d.id}
                device={d}
                canManage={canManage as boolean}
                isLocal={d.id === localDeviceId}
                busy={busy === d.id}
                onApprove={handleApprove}
                onRevoke={handleRevoke}
                onTransferPrimary={handleTransferPrimary}
              />
            ))}
          </>
        ) : null}

        {devices.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Smartphone size={40} color="#94A3B8" />
            <Text style={{ marginTop: 10, fontWeight: '600', color: '#94A3B8', fontSize: 14 }}>No devices enrolled</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
