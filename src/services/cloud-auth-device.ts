// cloud-auth-device.ts — Device registration for cloud auth
import { db, id } from '../lib/instant-client'
import { registerDeviceWithCloud } from './db-cloud-device'
import AsyncStorage from '@react-native-async-storage/async-storage'

export async function resolveOrRegisterDevice(shopId: string): Promise<string> {
  const deviceId = await AsyncStorage.getItem('@soostori:deviceId')
  if (!deviceId) return ''

  const devicesResult = await db.queryOnce({ devices: {} })
  const cloudDevices = devicesResult.data.devices as any[] || []
  const cloudDevice = cloudDevices.find((d: any) => d.deviceId === deviceId)

  if (!cloudDevice) {
    const devId = id()
    await db.transact(db.tx.devices[devId].create({
      id: devId,
      shopId,
      deviceId,
      deviceType: 'mobile',
      status: 'authorized',
      lastSeenAt: new Date().toISOString(),
      authorizedAt: new Date().toISOString(),
      deviceName: 'Mobile Device',
      isLanHost: false,
      isPrimary: false,
      hasPin: false,
      pinSetupAt: '',
    }))
    await registerDeviceWithCloud(devId)
    return devId
  }

  await registerDeviceWithCloud(cloudDevice.id)
  return cloudDevice.id
}
